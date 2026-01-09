import { useState, useMemo, useEffect } from 'react';
import './App.css';
import { packages, extras } from './data';

function App() {
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [activeExtras, setActiveExtras] = useState({});
  const [guestCount, setGuestCount] = useState(10);

  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [startAmPm, setStartAmPm] = useState('PM');
  const [endAmPm, setEndAmPm] = useState('AM');
  const [eventLocation, setEventLocation] = useState('');

  const formatTimeInput = (val, setter) => {
    // Remove non-numbers
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 4) return; // Max 4 digits

    // Auto-add colon
    if (clean.length > 2) {
      setter(`${clean.slice(0, 2)}:${clean.slice(2)}`);
    } else {
      setter(clean);
    }
  };

  // Mouse Parallax Logic
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Normalize mouse -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getRecommendedAccessory = () => {
    if (guestCount <= 50) return 'Essential';
    if (guestCount <= 100) return 'Memories';
    return 'Celebration';
  };

  const toggleExtra = (id) => {
    setActiveExtras(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [makeupCount, setMakeupCount] = useState(1);
  const [extraHourCount, setExtraHourCount] = useState(1);

  // Auto-calculate recommended makeup artists when guests change
  useEffect(() => {
    const recommended = Math.ceil(guestCount / 50) || 1;
    setMakeupCount(recommended);
  }, [guestCount]);

  // No auto-select effect needed anymore as per user request to just update quantities

  const dynamicExtras = useMemo(() => {
    return extras
      .map(extra => {
        // Extra Hour Logic
        if (extra.id === 'extra_hour') {
          let unitPrice = 155000;
          let descText = 'Sonido, Luces, DJ y Foto';

          if (selectedPackageId === 'essential') {
            unitPrice = 85000;
            descText = 'Sonido, Luces y DJ';
          }

          return {
            ...extra,
            price: unitPrice * extraHourCount,
            desc: `Extiende ${descText} (+${extraHourCount} ${extraHourCount === 1 ? 'hora' : 'horas'})`
          };
        }

        if (!['acc_essential', 'acc_memories', 'acc_celebration'].includes(extra.id)) {
          // Dynamic Makeup Logic
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

        // Dynamic calculation based on Tier
        let newPrice = extra.price; // Base price
        let newDesc = extra.desc;

        // Unit Costs (COP)
        const COST_FOAM = 20000;
        const COST_BRACELET = 30000 / 50; // 600
        const COST_BLOWOUT = 30000 / 50; // 600
        const COST_MASK = 35000 / 50; // 700
        const COST_NECKLACE = 900;
        const COST_CANNON = 10000;

        // Base quantity is guestCount
        const count = guestCount;

        if (extra.id === 'acc_essential') {
          // Essential: 1 Foam + Count Bracelets + Count Blowouts
          // Logic: 100% coverage for wearables
          newPrice = COST_FOAM + (count * COST_BRACELET) + (count * COST_BLOWOUT);
          newDesc = `Pack para ${count} personas: 1 Espuma, ${count} Manillas Neón, ${count} Pitos.`;

        } else if (extra.id === 'acc_memories') {
          // Memories: 2 Foams + 2 Cannons + Count Bracelets + Count Blowouts
          newPrice = (2 * COST_FOAM) + (2 * COST_CANNON) + (count * COST_BRACELET) + (count * COST_BLOWOUT);
          newDesc = `Pack para ${count} personas: 2 Espumas, ${count} Manillas Neón, ${count} Pitos, 2 Cañones.`;

        } else if (extra.id === 'acc_celebration') {
          // Celebration: 3 Foams + 3 Cannons + Count Bracelets + Count Blowouts + Count Necklaces + Count Masks
          newPrice = (3 * COST_FOAM) + (3 * COST_CANNON) +
            (count * COST_BRACELET) + (count * COST_BLOWOUT) +
            (count * COST_NECKLACE) + (count * COST_MASK);
          newDesc = `Pack para ${count} personas: 3 Espumas, ${count} Manillas, ${count} Pitos, ${count} Collares, ${count} Antifaces, 3 Cañones.`;
        }

        return {
          ...extra,
          price: newPrice,
          desc: newDesc
        };
      });
  }, [guestCount, selectedPackageId, makeupCount, extraHourCount]);

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  const totalPrice = useMemo(() => {
    let total = selectedPackage ? selectedPackage.price : 0;
    dynamicExtras.forEach(extra => {
      if (activeExtras[extra.id]) {
        total += extra.price;
      }
    });
    return total;
  }, [selectedPackageId, activeExtras, dynamicExtras]);

  const generateWhatsappLink = () => {
    const text = `Hola, me interesa una cotización para el evento.\n\nCliente: ${clientName}\nFecha: ${eventDate}\nHorario: ${eventStartTime} ${startAmPm} - ${eventEndTime} ${endAmPm}\nUbicación: ${eventLocation}\nInvitados: ${guestCount}\nPaquete: ${selectedPackage ? `${selectedPackage.name} ($${selectedPackage.price.toLocaleString()})` : 'Ninguno'}\nExtras:\n${dynamicExtras.filter(e => activeExtras[e.id]).map(e => `- ${e.name} (${e.desc}) - $${e.price.toLocaleString()}`).join('\n')}\n\nTotal estimado: $${totalPrice.toLocaleString()}`;
    return `https://wa.me/1234567890?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="app-container">
      <div className="aurora-bg">
        <div
          className="aurora-blob blob-1"
          style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
        ></div>
        <div
          className="aurora-blob blob-2"
          style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
        ></div>
        <div
          className="aurora-blob blob-3"
          style={{ transform: `translate(${mousePos.x * -50}px, ${mousePos.y * -50}px)` }}
        ></div>
      </div>

      <nav className="container navbar">
        <div className="brand">NEXXA</div>
        <div className="slogan">Sound Level Productions</div>
      </nav>
      <header className="container hero fade-in">
        <h1>Escoge tu paquete y diseña cada detalle </h1>
      </header>


      <main className="container">
        <section className="event-intake fade-in">
          <h2 className="section-title">Cuéntanos acerca de tu evento</h2>
          <div className="intake-form">
            <div className="form-group">
              <label>Nombre del cliente</label>
              <input
                type="text"
                className="input-field"
                placeholder="Tu nombre completo"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Fecha del evento</label>
              <input
                type="date"
                className="input-field"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
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
                    maxLength={5}
                  />
                  <select
                    className="input-field ampm-select"
                    value={startAmPm}
                    onChange={(e) => setStartAmPm(e.target.value)}
                  >
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
                    maxLength={5}
                  />
                  <select
                    className="input-field ampm-select"
                    value={endAmPm}
                    onChange={(e) => setEndAmPm(e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Ciudad y dirección</label>
              <div className="location-input-wrapper">
                <input
                  type="text"
                  className="input-field location-input"
                  placeholder="Ej: Cartagena, Bocagrande..."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
                <span className="location-icon">📍</span>
              </div>
            </div>

            <div className="form-group guest-group">
              <label>Cantidad de invitados</label>
              <div className="guest-input-wrapper">
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="guest-slider"
                />
                <span className="guest-number">{guestCount}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="packages-grid fade-in">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${selectedPackageId === pkg.id ? 'selected' : ''}`}
              onClick={() => setSelectedPackageId(pkg.id)}
            >
              <h3 className="package-name">{pkg.name}</h3>
              <ul className="features-list">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: feature }} />
                ))}
              </ul>
              <div className="package-price">${pkg.price.toLocaleString()}</div>
              <button className="select-btn">
                {selectedPackageId === pkg.id ? 'Seleccionado' : 'Seleccionar'}
              </button>
            </div>
          ))}
        </section>

        <section className="customization fade-in">
          <h2 className="section-title">Personaliza tu Experiencia</h2>
          <div className="extras-list">
            {dynamicExtras.map((extra) => (
              <div key={extra.id} className="extra-item">
                <div className="extra-info">
                  <label htmlFor={`extra-${extra.id}`}>{extra.name}</label>
                  {extra.desc && <span className="extra-desc">{extra.desc}</span>}

                  {extra.id === 'extra_hour' && activeExtras['extra_hour'] && (
                    <div className="makeup-counter">
                      <button className="counter-btn" onClick={() => setExtraHourCount(c => Math.max(1, c - 1))}>-</button>
                      <span className="counter-value">{extraHourCount} Horas</span>
                      <button className="counter-btn" onClick={() => setExtraHourCount(c => c + 1)}>+</button>
                    </div>
                  )}

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
                  <input
                    type="checkbox"
                    id={`extra-${extra.id}`}
                    checked={!!activeExtras[extra.id]}
                    onChange={() => toggleExtra(extra.id)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="summary-bar">
        <div className="container summary-content">
          <div className="total-container">
            <span className="total-label">Total Estimado</span>
            <span className="total-amount">
              ${totalPrice.toLocaleString()}
              {totalPrice > 1000000 && <span className="gift-badge">+ OBSEQUIO 🎁</span>}
            </span>
          </div>
          <a href={generateWhatsappLink()} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
            <span>Cotizar por WhatsApp</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.916c-.004 5.45-4.439 9.884-9.896 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
