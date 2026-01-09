import React, { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { packages, extras } from './data';

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

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

function App() {
  const packagesContainerRef = useRef(null);

  // Enable horizontal scrolling with mouse wheel
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
      return () => el.removeEventListener('wheel', onWheel);
    }
  }, []); // Empty dependency array is safer here to avoid re-binding

  // STATE MANAGEMENT (v3 keys to ensure 100% clean start)
  const [selectedPackageId, setSelectedPackageId] = useLocalStorage('nexxa_pkg_v3', null);
  const [activeExtras, setActiveExtras] = useLocalStorage('nexxa_extras_v3', {});
  const [guestCount, setGuestCount] = useLocalStorage('nexxa_guests_v3', 10);
  const [makeupCount, setMakeupCount] = useLocalStorage('nexxa_makeup_v3', 1);

  const [clientName, setClientName] = useLocalStorage('nexxa_client_v3', '');
  const [eventDate, setEventDate] = useLocalStorage('nexxa_date_v3', '');
  const [eventStartTime, setEventStartTime] = useLocalStorage('nexxa_start_v3', '');
  const [eventEndTime, setEventEndTime] = useLocalStorage('nexxa_end_v3', '');
  const [startAmPm, setStartAmPm] = useLocalStorage('nexxa_start_ampm_v3', 'PM');
  const [endAmPm, setEndAmPm] = useLocalStorage('nexxa_end_ampm_v3', 'AM');
  const [eventNeighborhood, setEventNeighborhood] = useLocalStorage('nexxa_neighborhood_v3', '');
  const [eventAddress, setEventAddress] = useLocalStorage('nexxa_address_v3', '');
  const [isLocating, setIsLocating] = useState(false);

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1);

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

  // Mouse Parallax Logic
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleExtra = (id) => {
    setActiveExtras(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Auto-calculate recommended makeup artists
  useEffect(() => {
    const recommended = Math.ceil(guestCount / 50) || 1;
    setMakeupCount(recommended);
  }, [guestCount, setMakeupCount]);

  const calculateDuration = () => {
    if (!eventStartTime || !eventEndTime) return 0;
    const [startH, startM] = eventStartTime.split(':').map(Number);
    let startVal = (startH % 12) + (startAmPm === 'PM' ? 12 : 0) + (startM ? startM / 60 : 0);
    const [endH, endM] = eventEndTime.split(':').map(Number);
    let endVal = (endH % 12) + (endAmPm === 'PM' ? 12 : 0) + (endM ? endM / 60 : 0);

    if (endVal < startVal) endVal += 24;
    return Math.max(0, endVal - startVal);
  };

  const eventDuration = useMemo(() => calculateDuration(), [eventStartTime, eventEndTime, startAmPm, endAmPm]);

  const computedPackages = useMemo(() => {
    const extraHours = Math.max(0, Math.ceil(eventDuration - 4));
    return packages.map(pkg => {
      let extraHourPrice = 155000;
      if (pkg.id === 'essential') extraHourPrice = 85000;
      const additionalCost = extraHours * extraHourPrice;
      return {
        ...pkg,
        computedPrice: pkg.price + additionalCost,
        extraHoursInfo: extraHours > 0 ? `Incluye ${extraHours}h extra(s)` : null
      };
    });
  }, [eventDuration]);

  const dynamicExtras = useMemo(() => {
    return extras
      .filter(e => e.id !== 'extra_hour')
      .map(extra => {
        if (!['acc_essential', 'acc_memories', 'acc_celebration'].includes(extra.id)) {
          if (extra.id === 'makeup') {
            const basePrice = 120000;
            return {
              ...extra,
              price: basePrice * makeupCount,
              desc: 'Incluye pinturas y maquillador por 2 horas (Recomendación: 1 maquillador máx. para 50 personas).'
            };
          }
          return extra;
        }

        let newPrice = extra.price;
        let newDesc = extra.desc;

        const COST_FOAM = 20000;
        const COST_BRACELET = 30000 / 50;
        const COST_BLOWOUT = 30000 / 50;
        const COST_MASK = 35000 / 50;
        const COST_NECKLACE = 900;
        const COST_CANNON = 10000;
        const count = guestCount;

        if (extra.id === 'acc_essential') {
          newPrice = COST_FOAM + (count * COST_BRACELET) + (count * COST_BLOWOUT);
          newDesc = `Pack para ${count} personas: 1 Espuma, ${count} Manillas Neón, ${count} Pitos.`;
        } else if (extra.id === 'acc_memories') {
          newPrice = (2 * COST_FOAM) + (2 * COST_CANNON) + (count * COST_BRACELET) + (count * COST_BLOWOUT);
          newDesc = `Pack para ${count} personas: 2 Espumas, ${count} Manillas Neón, ${count} Pitos, 2 Cañones.`;
        } else if (extra.id === 'acc_celebration') {
          newPrice = (3 * COST_FOAM) + (3 * COST_CANNON) + (count * COST_BRACELET) + (count * COST_BLOWOUT) + (count * COST_NECKLACE) + (count * COST_MASK);
          newDesc = `Pack para ${count} personas: 3 Espumas, ${count} Manillas, ${count} Pitos, ${count} Collares, ${count} Antifaces, 3 Cañones.`;
        }

        return { ...extra, price: newPrice, desc: newDesc };
      });
  }, [guestCount, makeupCount]);

  const selectedComputedPackage = computedPackages.find(p => p.id === selectedPackageId);

  const totalPrice = useMemo(() => {
    let total = selectedComputedPackage ? selectedComputedPackage.computedPrice : 0;
    dynamicExtras.forEach(extra => {
      if (activeExtras[extra.id]) total += extra.price;
    });
    return total;
  }, [selectedComputedPackage, activeExtras, dynamicExtras]);

  const generateWhatsappLink = () => {
    const text = `Hola, me interesa una cotización para el evento.\n\nCliente: ${clientName}\nFecha: ${eventDate}\nHorario: ${eventStartTime} ${startAmPm} - ${eventEndTime} ${endAmPm} (${eventDuration.toFixed(1)} hrs)\nUbicación: ${eventNeighborhood}, ${eventAddress}\nInvitados: ${guestCount}\nPaquete: ${selectedComputedPackage ? `${selectedComputedPackage.name} ($${selectedComputedPackage.computedPrice.toLocaleString()})` : 'Ninguno'}\nExtras:\n${dynamicExtras.filter(e => activeExtras[e.id]).map(e => `- ${e.name} (${e.desc}) - $${e.price.toLocaleString()}`).join('\n')}\n\nTotal estimado: $${totalPrice.toLocaleString()}`;
    return `https://wa.me/1234567890?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="app-container">
      <div className="aurora-bg">
        <div className="aurora-blob blob-1" style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}></div>
        <div className="aurora-blob blob-2" style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}></div>
        <div className="aurora-blob blob-3" style={{ transform: `translate(${mousePos.x * -50}px, ${mousePos.y * -50}px)` }}></div>
      </div>

      <nav className="container navbar">
        <div className="brand">NEXXA</div>
        <div className="slogan">Sound Level Productions</div>
      </nav>
      <header className="container hero fade-in">
        {/* Headline removed to save space */}
      </header>

      <main className="container">
        {currentStep === 1 && (
          <section id="block-details" className="event-intake fade-in">
            <h2 className="section-title">Cuéntanos acerca de tu evento</h2>
            <div className="intake-form">
              <div className="form-group">
                <label>Nombre del cliente</label>
                <input type="text" className="input-field" placeholder="Tu nombre completo" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Fecha del evento</label>
                <input type="date" className="input-field" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Franja horaria del evento</label>
                <div className="time-inputs">
                  <div className="time-input-group">
                    <input type="text" className="input-field time-text" placeholder="Inicio (08:00)" value={eventStartTime} onChange={(e) => formatTimeInput(e.target.value, setEventStartTime)} maxLength={5} />
                    <select className="input-field ampm-select" value={startAmPm} onChange={(e) => setStartAmPm(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <span className="time-separator">a</span>
                  <div className="time-input-group">
                    <input type="text" className="input-field time-text" placeholder="Fin (02:00)" value={eventEndTime} onChange={(e) => formatTimeInput(e.target.value, setEventEndTime)} maxLength={5} />
                    <select className="input-field ampm-select" value={endAmPm} onChange={(e) => setEndAmPm(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
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

              <div className="form-group guest-group">
                <label>Cantidad de invitados</label>
                <div className="guest-input-wrapper">
                  <input type="range" min="10" max="300" step="5" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="guest-slider" />
                  <span className="guest-number">{guestCount}</span>
                </div>
              </div>

              <button className="action-btn" style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--brand-gradient)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(157, 78, 221, 0.4)' }} onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Siguiente: Ver Paquetes 👉
              </button>
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section id="block-packages" className="packages-grid-container fade-in">
            <h2 className="section-title">Selecciona tu Paquete</h2>
            <div className="packages-grid" ref={packagesContainerRef}>
              {computedPackages.map((pkg) => (
                <div key={pkg.id} className={`package-card ${selectedPackageId === pkg.id ? 'selected' : ''}`} onClick={() => setSelectedPackageId(pkg.id)}>
                  <h3 className="package-name">{pkg.name}</h3>
                  <ul className="features-list">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: feature }} />
                    ))}
                    {pkg.extraHoursInfo && <li><strong>+ {pkg.extraHoursInfo}</strong></li>}
                  </ul>
                  <div className="package-price">
                    ${pkg.computedPrice.toLocaleString()}
                    {pkg.computedPrice > pkg.price && <span style={{ display: 'block', fontSize: '0.8rem', color: '#888' }}>Incluye horas extra</span>}
                  </div>
                  <button className="select-btn">
                    {selectedPackageId === pkg.id ? 'Seleccionado' : 'Seleccionar'}
                  </button>
                </div>
              ))}
            </div>
            <button className="action-btn" style={{ margin: '30px auto', display: 'block', width: '90%', maxWidth: '400px', padding: '15px', background: 'var(--surface-color)', border: '1px solid var(--primary-color)', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }} onClick={() => { setCurrentStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              Confirmar y Personalizar Extras 👇
            </button>
          </section>
        )}

        {currentStep === 3 && (
          <section id="block-extras" className="customization fade-in">
            <h2 className="section-title">Personaliza tu Experiencia</h2>
            <div className="extras-list">
              {dynamicExtras.map((extra) => (
                <div key={extra.id} className="extra-item">
                  <div className="extra-info">
                    <label htmlFor={`extra-${extra.id}`}>{extra.name}</label>
                    {extra.desc && <span className="extra-desc">{extra.desc}</span>}

                    {extra.id === 'makeup' && activeExtras['makeup'] && (
                      <div className="makeup-counter">
                        <button className="counter-btn" onClick={() => setMakeupCount(c => Math.max(1, c - 1))}>-</button>
                        <span className="counter-value">{makeupCount} Maquilladores</span>
                        <button className="counter-btn" onClick={() => setMakeupCount(c => c + 1)}>+</button>
                      </div>
                    )}
                    <span className="extra-price">+ ${extra.price.toLocaleString()}</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" id={`extra-${extra.id}`} checked={!!activeExtras[extra.id]} onChange={() => toggleExtra(extra.id)} />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="summary-bar">
        <div className="container summary-content">
          <div className="total-container">
            <span className="total-label" onClick={scrollToTop} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#00d4ff', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.2rem' }}>✎</span> Editar
            </span>
            <span className="total-amount">
              ${totalPrice.toLocaleString()}
              {totalPrice > 1000000 && <span className="gift-badge">+ OBSEQUIO 🎁</span>}
            </span>
          </div>
          <a href={generateWhatsappLink()} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
            <span>Cotizar</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.916c-.004 5.45-4.439 9.884-9.896 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <div style={{ position: 'absolute', bottom: '2px', right: '5px', fontSize: '0.8rem', color: '#ff0055', fontWeight: 'bold' }}>v2.1</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
