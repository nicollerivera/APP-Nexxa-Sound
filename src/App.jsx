import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AuroraBackground } from './AuroraBackground';
import './App.css';
import './ValueProps.css';
import { packages, extras } from './data';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

// Custom hook for local storage persistence
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue((currentValue) => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

function App() {
  // --- DYNAMIC CONFIGURATION ---
  const [catalog, setCatalog] = useState(null);
  const [appRules, setAppRules] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Subscribe to Rules
    const unsubRules = onSnapshot(doc(db, 'app_config', 'pricing_rules'), (snap) => {
      if (snap.exists()) setAppRules(snap.data());
    });
    // Subscribe to Catalog
    const unsubCatalog = onSnapshot(doc(db, 'app_config', 'catalog'), (snap) => {
      if (snap.exists()) {
        setCatalog(snap.data());
        setIsReady(true);
      }
    });

    return () => {
      unsubRules();
      unsubCatalog();
    };
  }, []);

  const packagesList = catalog?.packages || packages;
  const extrasList = catalog?.extras || extras;

  const packagesContainerRef = useRef(null);

  // STATE MANAGEMENT (v6 keys to ensure clean start)
  const [selectedPackageId, setSelectedPackageId] = useLocalStorage('nexxa_pkg_v6', null);
  const [activeExtras, setActiveExtras] = useLocalStorage('nexxa_extras_v6', {});
  const [guestCount, setGuestCount] = useLocalStorage('nexxa_guests_v6', 10);
  const [makeupCount, setMakeupCount] = useLocalStorage('nexxa_makeup_v6', 1);

  const [clientName, setClientName] = useLocalStorage('nexxa_client_v6', '');
  const [clientPhone, setClientPhone] = useLocalStorage('nexxa_phone_v6', '');
  const [eventOccasion, setEventOccasion] = useLocalStorage('nexxa_occasion_v6', '');
  const [eventDate, setEventDate] = useLocalStorage('nexxa_date_v6', '');
  const [eventStartTime, setEventStartTime] = useLocalStorage('nexxa_start_v6', '');
  const [eventEndTime, setEventEndTime] = useLocalStorage('nexxa_end_v6', '');
  const [startAmPm, setStartAmPm] = useLocalStorage('nexxa_start_ampm_v6', 'PM');
  const [endAmPm, setEndAmPm] = useLocalStorage('nexxa_end_ampm_v6', 'AM');

  const [locationMethod, setLocationMethod] = useLocalStorage('nexxa_loc_method_v6', 'address');
  const [eventNeighborhood, setEventNeighborhood] = useLocalStorage('nexxa_hood_v6', '');
  const [eventAddress, setEventAddress] = useLocalStorage('nexxa_address_v6', '');
  const [isLocating, setIsLocating] = useState(false);
  const [centeredPkgId, setCenteredPkgId] = useState(null);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { src: '/party_hero.png', label: 'DJ Crossover' },
    { src: '/lights_hero.png', label: 'Set de Luces' },
    { src: '/decor_hero_v2.png', label: 'Decoración' }
  ];

  // Touch handlers for carousel swipe
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
    if (isRightSwipe) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Packages Carousel State
  const [currentPkgSlide, setCurrentPkgSlide] = useState(0);

  // Touch handlers for packages carousel
  const [pkgTouchStart, setPkgTouchStart] = useState(null);
  const [pkgTouchEnd, setPkgTouchEnd] = useState(null);

  const onPkgTouchStart = (e) => {
    setPkgTouchEnd(null);
    setPkgTouchStart(e.targetTouches[0].clientX);
  };

  const onPkgTouchMove = (e) => {
    setPkgTouchEnd(e.targetTouches[0].clientX);
  };

  const onPkgTouchEnd = () => {
    if (!pkgTouchStart || !pkgTouchEnd) return;
    const distance = pkgTouchStart - pkgTouchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentPkgSlide((prev) => (prev + 1) % computedPackages.length);
    }
    if (isRightSwipe) {
      setCurrentPkgSlide((prev) => (prev - 1 + computedPackages.length) % computedPackages.length);
    }
  };

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep(1); // Reset to first step on edit
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();

        if (data && data.address) {
          const road = data.address.road || '';
          const houseNumber = data.address.house_number || '';
          const suburb = data.address.suburb || data.address.neighbourhood || data.address.quarter || '';

          if (road) setEventAddress(`${road} ${houseNumber}`.trim());
          if (suburb) setEventNeighborhood(suburb);
        } else {
          setEventAddress(`${latitude}, ${longitude}`); // Fallback
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        setEventAddress(`${latitude}, ${longitude}`);
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      console.error(error);
      setIsLocating(false);
      alert('No pudimos acceder a tu ubicación. Por favor ingrésala manualmente.');
    });
  };

  const formatTimeInput = (val, setter) => {
    const clean = val.replace(/[^0-9:]/g, '');
    if ((clean.match(/:/g) || []).length > 1) return;
    if (clean.length > 5) return;

    if (clean.includes(':')) {
      setter(clean);
      return;
    }

    if (clean.length === 2) {
      const num = parseInt(clean);
      if (num > 12) {
        setter(`${clean[0]}:${clean[1]}`);
        return;
      }
    } else if (clean.length > 2) {
      const firstTwo = parseInt(clean.slice(0, 2));
      if (firstTwo >= 10 && firstTwo <= 12) {
        setter(`${clean.slice(0, 2)}:${clean.slice(2)}`);
      } else {
        setter(`${clean[0]}:${clean.slice(1)}`);
      }
      return;
    }
    setter(clean);
  };

  // Mouse Parallax Logic moved to AuroraBackground component


  const toggleExtra = (id) => {
    setActiveExtras(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Auto-calculate recommended makeup artists based on guest count
  useEffect(() => {
    const recommended = Math.ceil(guestCount / 50) || 1;
    setMakeupCount(recommended);
  }, [guestCount, setMakeupCount]);


  const calculateDuration = () => {
    if (!eventStartTime || !eventEndTime) return 0;
    const [startHStr, startMStr] = String(eventStartTime).includes(':') ? String(eventStartTime).split(':') : [String(eventStartTime), '0'];
    const [endHStr, endMStr] = String(eventEndTime).includes(':') ? String(eventEndTime).split(':') : [String(eventEndTime), '0'];

    let startH = parseInt(startHStr || '0', 10);
    let startM = parseInt(startMStr || '0', 10);
    if (isNaN(startH)) startH = 0;
    if (isNaN(startM)) startM = 0;
    let startVal = (startH % 12) + (startAmPm === 'PM' ? 12 : 0) + (startM / 60);

    let endH = parseInt(endHStr || '0', 10);
    let endM = parseInt(endMStr || '0', 10);
    if (isNaN(endH)) endH = 0;
    if (isNaN(endM)) endM = 0;
    let endVal = (endH % 12) + (endAmPm === 'PM' ? 12 : 0) + (endM / 60);

    if (isNaN(startVal) || isNaN(endVal)) return 0;
    if (endVal < startVal) endVal += 24;
    return Math.max(0, endVal - startVal);
  };

  const eventDuration = useMemo(() => calculateDuration(), [eventStartTime, eventEndTime, startAmPm, endAmPm]);

  const computedPackages = useMemo(() => {
    const rules = appRules || { baseHours: 4, djHour: 85000, photoHour: 50000 };
    const extraHours = Math.max(0, Math.ceil(eventDuration - rules.baseHours));

    return packagesList.map(pkg => {
      let extraHourPrice = pkg.extraHourOverride || (rules.djHour + (pkg.id !== 'essential' ? rules.photoHour : 0));
      const additionalCost = extraHours * extraHourPrice;
      return {
        ...pkg,
        computedPrice: pkg.price + additionalCost,
        extraHoursInfo: extraHours > 0 ? `Incluye ${extraHours}h extra(s)` : null
      };
    });
  }, [eventDuration, packagesList, appRules]);

  // Enable horizontal scrolling with mouse wheel (Moved here to avoid ReferenceError)
  useEffect(() => {
    const el = packagesContainerRef.current;
    if (el) {
      const onWheel = (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollTo({
          left: el.scrollLeft + e.deltaY,
          behavior: 'smooth'
        });
      };
      el.addEventListener('wheel', onWheel);

      const onScroll = () => {
        if (!el) return;
        const containerCenter = el.scrollLeft + el.clientWidth / 2;
        let closestId = null;
        let minDistance = Infinity;

        Array.from(el.children).forEach(child => {
          const cardCenter = child.offsetLeft + child.offsetWidth / 2;
          const distance = Math.abs(containerCenter - cardCenter);
          if (distance < minDistance) {
            minDistance = distance;
            if (child.dataset.id) closestId = child.dataset.id;
          }
        });

        setCenteredPkgId(closestId);
      };

      el.addEventListener('scroll', onScroll);
      onScroll();

      return () => {
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('scroll', onScroll);
      };
    }
  }, [currentStep, computedPackages]);

  const dynamicExtras = useMemo(() => {
    return extrasList
      .filter(e => e.id !== 'extra_hour')
      .map(extra => {
        if (!['acc_essential', 'acc_memories', 'acc_celebration'].includes(extra.id)) {
          if (extra.id === 'makeup') {
            const basePrice = extra.price || 120000;
            return {
              ...extra,
              price: basePrice * makeupCount,
              desc: `Incluye ${makeupCount} maquillador(es) profesionales por 2 horas.`
            };
          }
          return extra;
        }

        let newPrice = extra.price;
        let newDesc = extra.desc;

        const count = guestCount;
        let rawPrice = 0;

        // Note: These costs could also be dynamic, but for now we keep the logic
        const COST_FOAM = 13000;
        const COST_CANNON = 5000;
        const COST_BLOWOUT = 200;
        const COST_BRACELET = 400;
        const COST_MASK = 400;
        const COST_NECKLACE = 400;

        if (extra.id === 'acc_essential') {
          rawPrice = COST_FOAM + (count * (COST_BLOWOUT + COST_BRACELET));
          newDesc = `Pack para ${count} personas: 1 Espuma, ${count} Manillas Neón, ${count} Pitos.`;
        } else if (extra.id === 'acc_memories') {
          rawPrice = (2 * COST_FOAM) + (count * COST_NECKLACE) + (count * (COST_BLOWOUT + COST_BRACELET));
          newDesc = `Pack para ${count} personas: 2 Espuma(s), ${count} Collares Hawaianos, ${count} Manillas Neón, ${count} Pitos.`;
        } else if (extra.id === 'acc_celebration') {
          rawPrice = (3 * COST_FOAM) + (3 * COST_CANNON) + (count * (COST_BLOWOUT + COST_BRACELET + COST_MASK + COST_NECKLACE));
          newDesc = `Pack para ${count} personas: 3 Espuma(s), 3 Cañon(es), ${count} Manillas, ${count} Pitos, ${count} Collares, ${count} Antifaces.`;
        }

        newPrice = rawPrice;
        return { ...extra, price: newPrice, desc: newDesc };
      });
  }, [guestCount, makeupCount, extrasList]);

  const selectedComputedPackage = computedPackages.find(p => p.id === selectedPackageId);

  const totalPrice = useMemo(() => {
    let total = selectedComputedPackage ? selectedComputedPackage.computedPrice : 0;
    dynamicExtras.forEach(extra => {
      if (activeExtras[extra.id]) total += extra.price;
    });
    return total;
  }, [selectedComputedPackage, activeExtras, dynamicExtras]);

  // Helper to format 24h time for URL
  const to24h = (time, ampm) => {
    if (!time) return '';
    // If user typed '8', treat as '8:00'
    const parts = time.includes(':') ? time.split(':') : [time, '00'];
    let h = parseInt(parts[0] || 0, 10);
    let m = parseInt(parts[1] || 0, 10);

    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;

    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const generateWhatsappLink = () => {
    const activeIds = Object.keys(activeExtras).filter(k => activeExtras[k]);

    // BUILD EXACT MESSAGE FORMAT REQUESTED
    const text = `✨ NUEVA SOLICITUD DE COTIZACIÓN - NEXXA SOUND ✨\n\n` +
      `¡Hola! He generado esta cotización desde la App y me gustaría recibir más información:\n\n` +
      `👤 Cliente: ${clientName}\n` +
      `📅 Fecha: ${eventDate}\n` +
      `⏰ Horario: ${eventStartTime} ${startAmPm} - ${eventEndTime} ${endAmPm} (${eventDuration.toFixed(1)} hrs)\n` +
      `📍 Ubicación: ${eventNeighborhood}, ${eventAddress}\n` +
      `🎉 Ocasión: ${eventOccasion}\n` +
      `👥 Invitados: ${guestCount}\n` +
      `📦 Paquete: ${selectedComputedPackage ? selectedComputedPackage.name : 'Personalizado'}\n` +
      `➕ Extras: ${activeIds.length ? activeIds.join(', ') : 'Ninguno'}\n\n` +
      `💰 Total Estimado: $${totalPrice.toLocaleString()}\n` +
      `(El valor puede ajustarse según las necesidades reales del evento)\n\n` +
      `👉 Quedo atento(a) para recibir recomendaciones y posibles ajustes.`;

    const TARGET_PHONE = "573204863127";
    return `https://wa.me/${TARGET_PHONE}?text=${encodeURIComponent(text)}`;
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendQuotation = async () => {
    if (isSending) return;
    if (!clientName.trim()) {
      alert("Por favor ingresa tu nombre para continuar.");
      return;
    }
    setIsSending(true);

    try {
      // 1. Prepare Object for Firestore
      const activeIds = Object.keys(activeExtras).filter(k => activeExtras[k]);
      const selectedExtrasObj = {};
      activeIds.forEach(id => {
        selectedExtrasObj[id] = true;
      });

      // Determine roles based on package
      const roles = {
        dj: true, // Always included
        photographer: selectedPackageId === 'memories' || selectedPackageId === 'celebration',
        decorator: selectedPackageId === 'celebration'
      };

      const quotationData = {
        status: 'SENT',
        createdAt: serverTimestamp(),
        client: {
          name: clientName.trim(), // Ensure trimmed
          phone: clientPhone || '',
          phone2: ''
        },
        clientName: clientName.trim(), // DOUBLE SAVE for compatibility
        eventDetails: {
          date: eventDate || '',
          occasion: eventOccasion || '',
          startTime: to24h(eventStartTime, startAmPm) || '',
          endTime: to24h(eventEndTime, endAmPm) || '',
          location: eventAddress || '',
          neighborhood: eventNeighborhood || '',
          guestCount: Number(guestCount) || 10
        },
        financials: {
          totalValue: Number(totalPrice) || 0,
          deposit: 0,
          balance: Number(totalPrice) || 0
        },
        logistics: {
          packName: selectedComputedPackage ? selectedComputedPackage.name : 'Personalizado',
          selectedExtras: selectedExtrasObj,
          makeupCount: Number(makeupCount) || 1,
          rolesSchedule: roles,
          materials: `Paquete ${selectedComputedPackage ? selectedComputedPackage.name : 'Personalizado'} + ${activeIds.length} extras`
        }
      };

      // 2. SAVE TO FIREBASE (MANDATORY)
      console.log("PREPARING TO SAVE QUOTATION:", JSON.stringify(quotationData, null, 2));

      const docRef = await addDoc(collection(db, "quotations"), quotationData);
      console.log("FIREBASE SUCCESS - DOCUMENT ID:", docRef.id);

      // Verify write (Optional, but good for debugging)
      // await getDoc(docRef); 

      // 3. GENERATE WHATSAPP LINK
      const waLink = generateWhatsappLink();

      // Notify user of success before jumping to WhatsApp
      alert("✅ ¡ÉXITO! Cotización enviada a sistema.\nID: " + docRef.id + "\n\nAhora abriendo WhatsApp...");

      // 4. OPEN WHATSAPP
      window.location.href = waLink;

    } catch (error) {
      console.error("FIREBASE ERROR:", error);
      alert("❌ ERROR AL GUARDAR EN BASE DE DATOS:\n\n" + (error.message || "Error desconocido") + "\n\nPor favor, verifica tu conexión o intenta más tarde.");
    } finally {
      setTimeout(() => setIsSending(false), 2000);
    }
  };

  // Admin Mode State (Hidden)
  const [isAdmin, setIsAdmin] = useLocalStorage('nexxa_admin_mode', false);
  const [clickCount, setClickCount] = useState(0);

  // Hidden Trigger: 5 clicks on logo toggles Admin Mode
  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5) {
      const newState = !isAdmin;
      setIsAdmin(newState);
      alert(newState ? "👑 MODO ADMIN ACTIVADO: Validación desactivada" : "🔒 MODO ADMIN DESACTIVADO");
      setClickCount(0);
    }
  };

  const handleValidationStep1 = () => {
    // Check Client Details -> Go to Step 4 (Summary)
    if (isAdmin) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!clientName || !clientPhone || !eventOccasion || !eventDate || !eventStartTime || !eventEndTime || !eventNeighborhood || !eventAddress) {
      alert("Por favor completa todos los campos del evento para continuar.");
      return;
    }

    // VALIDACIÓN DE FECHA (No permitir fechas pasadas)
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (eventDate < today) {
      alert("⚠️ LA FECHA ES INVÁLIDA\n\nNo puedes seleccionar una fecha anterior a hoy. Por favor, selecciona la fecha correcta de tu evento.");
      return;
    }

    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleValidationStep2 = () => {
    // Check Package Selection -> Go to Step 2 (Details)
    if (isAdmin) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedPackageId) {
      alert("Debes seleccionar un paquete para continuar.");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isReady) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
        <img src="/logo_disco_futurista.png" alt="Loading..." style={{ width: '80px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
        <h2 style={{ fontWeight: '300', letterSpacing: '2px', opacity: 0.8 }}>PREPARANDO TU FIESTA...</h2>
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AuroraBackground />

      {currentStep > 0 && (
        <nav className="container navbar navbar-row">
          <img
            src="/logo_disco_futurista.png"
            alt="NEXXA Sound Level Productions"
            className="brand-logo"
            onClick={() => {
              handleLogoClick();
              setCurrentStep(prev => Math.max(0, prev - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          {currentStep === 1 && (
            <span className="navbar-section-title">Selecciona tu Paquete</span>
          )}
          {currentStep === 2 && (
            <span className="navbar-section-title" style={{ fontSize: '0.95rem' }}>Personaliza tu Experiencia</span>
          )}
          {currentStep === 3 && (
            <span className="navbar-section-title" style={{ fontSize: '0.95rem' }}>Detalles del Evento</span>
          )}
        </nav>
      )}


      <main className="container">
        {currentStep === 0 && (
          <section className="landing-screen fade-in">
            <div className="landing-content">
              <div className="landing-brand-area">
                <img
                  src="/logo_disco_futurista.png"
                  alt="NEXXA Sound Level Productions"
                  className="landing-logo-img"
                  onClick={handleLogoClick}
                />
              </div>

              <div
                className="carousel-3d-scene"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <button
                  className="carousel-nav prev"
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length); }}
                >
                  &#10094;
                </button>

                <div className="carousel-3d-spinner" style={{ transform: `rotateY(${currentSlide * -120}deg)` }}>
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`carousel-3d-item ${index === currentSlide ? 'active' : ''}`}
                      style={{
                        transform: `rotateY(${index * 120}deg) translateZ(var(--carousel-tz))`
                      }}
                      onClick={() => setCurrentSlide(index)}
                    >
                      <img
                        src={slide.src}
                        alt={slide.label}
                        className="carousel-img"
                      />
                      <div className="carousel-label">{slide.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="carousel-nav next"
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % slides.length); }}
                >
                  &#10095;
                </button>
              </div>


              <div className="value-props-container">
                <h3 className="value-props-header" style={{ color: 'var(--primary-cyan)', textTransform: 'uppercase', fontSize: '1rem', marginBottom: '10px' }}>NEXXA TE OFRECE:</h3>
                <ul className="value-props" style={{ gap: '15px' }}>
                  <li>⏱️ Cotización en 60 segundos</li>
                  <li>💰 Cotiza y negocia con un asesor al instante</li>
                  <li>🎧 DJ + sonido + luces en un solo lugar</li>
                </ul>
              </div>
              <button
                className="action-btn landing-btn"
                style={{ width: '100%', maxWidth: '400px', padding: '18px', background: 'linear-gradient(90deg, #00d4ff 0%, #9d4edd 100%)', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '4px' }}
                onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                COTIZAR MI EVENTO
              </button>
            </div>
          </section>
        )}

        {/* STEP 1: PACKAGE SELECTION (Moved from Step 2) */}
        {currentStep === 1 && (
          <section id="block-packages" className="packages-grid-container fade-in">

            <div
              className="carousel-3d-scene packages-scene"
              onTouchStart={onPkgTouchStart}
              onTouchMove={onPkgTouchMove}
              onTouchEnd={onPkgTouchEnd}
            >
              <button
                className="carousel-nav prev"
                onClick={(e) => { e.stopPropagation(); setCurrentPkgSlide((prev) => (prev - 1 + computedPackages.length) % computedPackages.length); }}
              >
                &#10094;
              </button>

              <div className="packages-focus-container">
                {computedPackages.map((pkg, index) => {
                  const length = computedPackages.length;
                  let position = 'hidden';
                  if (index === currentPkgSlide) position = 'active';
                  else if (index === (currentPkgSlide - 1 + length) % length) position = 'left';
                  else if (index === (currentPkgSlide + 1) % length) position = 'right';

                  return (
                    <div
                      key={pkg.id}
                      className={`package-item-focus ${position}`}
                      onClick={() => setCurrentPkgSlide(index)}
                    >
                      <div className={`package-card-3d ${selectedPackageId === pkg.id ? 'selected-3d' : ''} ${pkg.highlight ? 'recommended-card' : ''}`}>
                        <h3 className="package-name">{pkg.name}</h3>
                        <div className="package-price-row">
                          {pkg.id !== 'celebration' && <span className="package-price-label">Desde</span>}
                          <span className="package-price-value">${pkg.price.toLocaleString()}</span>
                        </div>

                        {pkg.imageUrl && (
                          <img
                            src={pkg.imageUrl}
                            alt={pkg.name}
                            style={{
                              width: '100%',
                              height: '140px',
                              objectFit: 'cover',
                              objectPosition: 'center',
                              borderRadius: '16px',
                              marginBottom: '15px',
                              background: 'rgba(0,0,0,0.4)',
                              boxShadow: pkg.highlight 
                                ? '0 8px 32px rgba(157, 78, 221, 0.3)' 
                                : '0 8px 32px rgba(0, 212, 255, 0.2)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              transition: 'transform 0.3s ease'
                            }}
                            className="package-card-image"
                          />
                        )}

                        <ul className="features-list">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx} dangerouslySetInnerHTML={{ __html: feature }} />
                          ))}
                        </ul>
                        <button
                          className="select-btn"
                          style={{
                            background: 'transparent',
                            border: '2px solid var(--primary-cyan)',
                            color: 'white',
                            marginTop: 'auto' // Push to bottom
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackageId(pkg.id);
                            setCurrentPkgSlide(index);
                            // Verify selection and move to next step (CLIENT DETAILS) immediately
                            setTimeout(() => {
                              setCurrentStep(2);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 200);
                          }}
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="carousel-nav next"
                onClick={(e) => { e.stopPropagation(); setCurrentPkgSlide((prev) => (prev + 1) % computedPackages.length); }}
              >
                &#10095;
              </button>
            </div>

            <p className="package-disclaimer" style={{
              textAlign: 'center',
              color: '#aaa',
              fontSize: '0.85rem',
              marginTop: '20px',
              maxWidth: '90%',
              marginLeft: 'auto',
              marginRight: 'auto',
              fontStyle: 'italic'
            }}>
              El precio final se ajusta según duración del evento, número de invitados y servicios adicionales.
            </p>

            {isAdmin && (
              <button className="action-btn" style={{ margin: '20px auto', display: 'block', width: '90%', maxWidth: '400px', padding: '15px', background: 'var(--surface-color)', border: '1px solid var(--primary-color)', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }} onClick={handleValidationStep2}>
                Siguiente (Modo Admin 🔓) 👉
              </button>
            )}
          </section>
        )}

        {/* STEP 2: EXTRAS */}
        {currentStep === 2 && (
          <section id="block-extras" className="customization fade-in">
            
            <div className="form-group guest-group" style={{ marginBottom: '20px', padding: '0 20px' }}>
              <label style={{ color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>¿Cuántos invitados esperas?</label>
              <div className="guest-input-wrapper" style={{ marginTop: '10px' }}>
                <input type="range" min="10" max="300" step="5" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="guest-slider" />
                <span className="guest-number">{guestCount}</span>
              </div>
            </div>

            <div className="extras-list">
              {dynamicExtras.map((extra) => {
                const isActive = !!activeExtras[extra.id];
                return (
                  <div
                    key={extra.id}
                    className={`extra-item ${isActive ? 'selected-extra' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
                    onClick={() => toggleExtra(extra.id)}
                  >

                    {/* Header: Title + Switch */}
                    <div className="extra-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: extra.imageUrl ? '10px' : '0' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', flex: 1 }}>
                        {extra.name}
                      </span>
                      {/* Switch: purely visual, state controlled by parent click */}
                      <div className="switch" style={{ pointerEvents: 'none' }}>
                        <input
                          type="checkbox"
                          checked={isActive}
                          readOnly
                        />
                        <span className="slider"></span>
                      </div>
                    </div>

                    {extra.imageUrl && (
                      <div className="extra-image-container" style={{ width: '100%', height: '100px', overflow: 'hidden', borderRadius: '12px', marginBottom: '10px' }}>
                        <img 
                          src={extra.imageUrl} 
                          alt={extra.name} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', 
                            filter: isActive ? 'brightness(1.1)' : 'brightness(0.7) grayscale(0.5)',
                            transition: 'all 0.4s ease'
                          }} 
                        />
                      </div>
                    )}

                    {/* Body: Desc, Price, Counter */}
                    <div className="extra-body" style={{ marginTop: '5px' }}>
                      {extra.desc && <p className="extra-desc" style={{ margin: '5px 0', fontSize: '0.9rem', color: '#ccc' }}>{extra.desc}</p>}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span className="extra-price" style={{ color: isActive ? 'var(--primary-cyan)' : 'var(--text-secondary)', fontWeight: 'bold', transition: '0.3s' }}>
                          + ${extra.price.toLocaleString()}
                        </span>

                        {extra.id === 'makeup' && (
                          <div
                            className="makeup-counter fade-in-fast"
                            onClick={(e) => e.stopPropagation()} // Prevent row toggle when interacting with counter
                            style={{ cursor: 'default', pointerEvents: 'auto' }}
                          >
                            <button type="button" className="counter-btn" onClick={(e) => { e.stopPropagation(); setMakeupCount(c => Math.max(1, Number(c) - 1)); }}>-</button>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                              <span className="counter-value">{makeupCount}</span>
                              <span style={{ fontSize: '0.6rem', color: '#aaa' }}>Artistas</span>
                            </div>
                            <button type="button" className="counter-btn" onClick={(e) => { e.stopPropagation(); setMakeupCount(c => Number(c) + 1); }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: '25px', marginBottom: '25px' }}>
              <button className="action-btn" style={{ width: '90%', maxWidth: '400px', fontSize: '1.2rem' }} onClick={() => { setCurrentStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Continuar a Detalles del Evento
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: CLIENT DETAILS (Event Intake) */}
        {currentStep === 3 && (
          <section id="block-details" className="event-intake fade-in">
            <div className="intake-form">
              <div className="form-group">
                <label>Nombre del cliente</label>
                <input type="text" className="input-field" placeholder="Tu nombre completo" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Número de celular</label>
                <input type="tel" className="input-field" placeholder="Ej: 3204863127" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>

              <div className="form-group">
                <label>¿Qué ocasión celebras?</label>
                <input type="text" className="input-field" placeholder="Ej: Cumpleaños, Boda, Fiesta de integración" value={eventOccasion} onChange={(e) => setEventOccasion(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Fecha del evento</label>
                <input
                  type="date"
                  className="input-field"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                />
              </div>

              <div className="form-group">
                <label>Franja horaria del evento</label>
                <div className="time-inputs">
                  <div className="time-input-group">
                    <input
                      type="text"
                      className="input-field time-text"
                      placeholder="Inicio (08:00)"
                      value={eventStartTime}
                      onChange={(e) => formatTimeInput(e.target.value, setEventStartTime)}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val && !val.includes(':')) {
                          setEventStartTime(`${val}:00`);
                        }
                      }}
                      maxLength={5}
                    />
                    <select className="input-field ampm-select" value={startAmPm} onChange={(e) => setStartAmPm(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <span className="time-separator">a</span>
                  <div className="time-input-group">
                    <input
                      type="text"
                      className="input-field time-text"
                      placeholder="Fin (02:00)"
                      value={eventEndTime}
                      onChange={(e) => formatTimeInput(e.target.value, setEventEndTime)}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val && !val.includes(':')) {
                          setEventEndTime(`${val}:00`);
                        }
                      }}
                      maxLength={5}
                    />
                    <select className="input-field ampm-select" value={endAmPm} onChange={(e) => setEndAmPm(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <p className="input-hint">Duración mínima 4 horas. Las horas adicionales se calculan automáticamente.</p>
              </div>

              <div className="form-group">
                <label>Barrio</label>
                <div className="location-input-wrapper">
                  <input type="text" className="input-field location-input" placeholder="Ej: Bocagrande, Manga..." value={eventNeighborhood} onChange={(e) => setEventNeighborhood(e.target.value)} />
                  <span className="location-icon">📍</span>
                </div>
              </div>

              <div className="form-group">
                <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Dirección</label>
                  <button className="location-btn" onClick={handleUseCurrentLocation} disabled={isLocating} style={{ background: 'transparent', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                    {isLocating ? '📍 Buscando...' : '📍 Usar ubicación actual'}
                  </button>
                </div>
                <div className="location-input-wrapper">
                  <input type="text" className="input-field location-input" placeholder="Ej: Calle 5 # 4-32 Edificio..." value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} />
                  <span className="location-icon">🏠</span>
                </div>
              </div>



              <button className="action-btn" style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--brand-gradient)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(157, 78, 221, 0.4)' }} onClick={handleValidationStep1}>
                {isAdmin ? 'Ver Resumen (Modo Admin 🔓) 👇' : 'Ver Resumen de Cotización 👇'}
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: SUMMARY */}
        {currentStep === 4 && (
          <div className="summary-page">
            <div className="summary-title-container">
              <h2 className="summary-title">Resumen de tu Cotización</h2>
              <p className="summary-subtitle">Revisa los detalles finales de tu evento</p>
            </div>

            <div className="summary-card">

              {/* Event Details Section */}
              <div className="summary-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Detalles del Evento
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Cliente</span>
                  <span className="summary-value">{clientName || 'Cliente'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Celular</span>
                  <span className="summary-value">{clientPhone || '---'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Fecha</span>
                  <span className="summary-value">{eventDate || 'Por definir'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Duración</span>
                  <span className="summary-value">
                    {Math.floor(eventDuration)} Horas
                    {Math.ceil(eventDuration - 4) > 0 && <span style={{ color: 'var(--primary-cyan)', fontSize: '0.8rem', marginLeft: '5px' }}> (+{Math.ceil(eventDuration - 4)}h Extra)</span>}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Invitados</span>
                  <span className="summary-value">{guestCount} Personas</span>
                </div>
              </div>

              {/* Package Section */}
              <div className="summary-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                Paquete Seleccionado
              </div>

              {selectedPackageId && (
                <div className="package-highlight">
                  <div className="package-name-large">{packages.find(p => p.id === selectedPackageId)?.name}</div>
                  <div className="package-price-large">${packages.find(p => p.id === selectedPackageId)?.price.toLocaleString()}</div>
                  {Math.max(0, Math.ceil(eventDuration - 4)) > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#ddd', marginTop: '5px' }}>
                      + {Math.ceil(eventDuration - 4)} Hora(s) Extra: ${(Math.ceil(eventDuration - 4) * (selectedPackageId === 'essential' ? 85000 : 135000)).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Extras Section */}
              {Object.keys(activeExtras).filter(k => activeExtras[k]).length > 0 && (
                <>
                  <div className="summary-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Extras
                  </div>
                  <div className="summary-extras-list">
                    {dynamicExtras.filter(e => activeExtras[e.id]).map(extra => (
                      <div className="summary-extra-row" key={extra.id}>
                        <span className="summary-extra-name">{extra.name} {extra.id === 'makeup' ? `(${makeupCount})` : ''}</span>
                        <span style={{ fontWeight: 'bold' }}>${extra.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Total Section */}
              <div className="summary-total-section">
                <p className="summary-disclaimer" style={{ marginBottom: '15px' }}>
                  Este valor es un estimado base. Nuestros asesores pueden optimizar el presupuesto contigo ajustando tiempos y detalles para que se adapte perfectamente a tu bolsillo y necesidades
                </p>
                <span className="total-label-large">TOTAL ESTIMADO</span>
                <span className="total-amount-huge">${totalPrice.toLocaleString()}</span>
                {totalPrice > 1000000 && <span className="gift-badge-styled">¡Incluye OBSEQUIO Sorpresa! 🎁</span>}
              </div>

            </div>

            <div className="summary-footer">
              <button className="btn-secondary" onClick={() => setCurrentStep(3)}>Editar</button>
              <button
                onClick={handleSendQuotation}
                className="action-btn"
                disabled={isSending}
                style={{
                  border: 'none',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isSending ? 0.7 : 1
                }}
              >
                {isSending ? 'Procesando...' : 'Enviar a WhatsApp'}
                {!isSending && (
                  <svg style={{ marginLeft: '8px' }} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.916c-.004 5.45-4.439 9.884-9.896 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default App;
