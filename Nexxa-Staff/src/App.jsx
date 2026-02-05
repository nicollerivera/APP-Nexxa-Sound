import React, { useState, useEffect } from 'react';

import QuotationsView from './components/QuotationsView';

// --- IMPORTS MOVED ---
import { formatPeso, months, getHours, parseFirestoreDate } from './utils/helpers';
import {
  IconArrowLeft, IconEdit, IconPhone, IconLocation, IconNeighborhood,
  IconPDF, IconServices, IconFlow, IconRecaudo, IconCopy,
  IconPayroll, IconCheck, IconUser, IconPlus, IconHistory,
  IconWhatsApp, IconStaff, IconAlertTriangle, IconCalendar, IconInventory,
  IconTrash, IconArrowRight, IconChecklist, IconCamera, IconSettings,
  IconLogout, IconLogoNexxa, IconHome, IconBox, IconIndicator, IconFileText
} from './components/Icons';
import * as pdfService from './services/pdfService';
import { db } from './firebase';
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where, orderBy, getDocs
} from 'firebase/firestore';

// --- HELPERS MOVED TO utils/helpers.js ---
// --- ICONS MOVED TO components/Icons.jsx ---


// --- TIME COMPONENT ---
// --- TIME COMPONENT (NATIVE) ---
const TimeInput = ({ value, onChange, label }) => {
  // Parse HH:mm (24h) to 12h for the UI
  const [hStr, mStr] = (value || "08:00").split(':');
  const h24 = parseInt(hStr || 0);
  const m = mStr || "00";
  const h12 = h24 % 12 || 12;
  const period = h24 >= 12 ? 'PM' : 'AM';

  const updateTime = (newH12, newM, newPeriod) => {
    let h = parseInt(newH12);
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    const finalH = h.toString().padStart(2, '0');
    onChange(`${finalH}:${newM}`);
  };

  const selectStyle = {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: '800',
    outline: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    padding: '2px 4px',
    appearance: 'none',
    WebkitAppearance: 'none',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
        <div style={{ color: '#666', opacity: 0.6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <label style={{ fontSize: '0.75rem', color: '#666' }}>{label}</label>
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid #333',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '48px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <select
            value={h12}
            onChange={e => updateTime(e.target.value, m, period)}
            style={selectStyle}
          >
            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(v => (
              <option key={v} value={parseInt(v)} style={{ background: '#111' }}>{v}</option>
            ))}
          </select>

          <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '900', fontSize: '1.2rem', marginTop: '-2px' }}>:</span>

          <select
            value={m}
            onChange={e => updateTime(h12, e.target.value, period)}
            style={selectStyle}
          >
            {['00', '15', '30', '45'].map(v => (
              <option key={v} value={v} style={{ background: '#111' }}>{v}</option>
            ))}
          </select>

          <select
            value={period}
            onChange={e => updateTime(h12, m, e.target.value)}
            style={{ ...selectStyle, fontSize: '0.85rem', color: 'var(--primary-cyan)', marginLeft: '8px', fontWeight: '900' }}
          >
            <option value="AM" style={{ background: '#111' }}>AM</option>
            <option value="PM" style={{ background: '#111' }}>PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};



function App() {
  // --- MAGIC LINK RECEIVER (Auto-fill from URL) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('client')) {
      try {
        const pClient = params.get('client') || '';
        const pPhone = params.get('phone') || '';
        const pDate = params.get('date') || '';
        const pStart = params.get('start') || '';
        const pEnd = params.get('end') || '';
        const pLoc = params.get('loc') || '';
        const pPack = params.get('pack') || '';
        const pExtras = params.get('extras') || '';

        // Map Pack ID to Name
        let finalPack = 'Personalizado';
        if (pPack.toLowerCase().includes('essential')) finalPack = 'Essential';
        if (pPack.toLowerCase().includes('memories')) finalPack = 'Memories';
        if (pPack.toLowerCase().includes('celebration')) finalPack = 'Celebration';

        // Map Extras (comma separated ids)
        const extrasObj = {};
        if (pExtras) {
          pExtras.split(',').forEach(rawId => {
            const id = rawId.trim();
            if (id) {
              if (id.toLowerCase() === 'makeup') extrasObj['extra_makeup'] = true;
              else extrasObj[id] = true;
            }
          });
        }

        const preFilledEvent = {
          clientName: pClient,
          clientPhone: pPhone,
          date: pDate,
          startTime: pStart,
          endTime: pEnd,
          location: pLoc,
          packName: finalPack,
          managerName: '',
          deposit: '',
          totalValue: '', // Recalculate implicitly or manual? Let's leave empty for auto-calc trigger
          selectedExtras: extrasObj
        };

        setNewEvent(preFilledEvent);
        setView('create');

        // Trigger auto-calc manually or let the user edit slightly to trigger it
        // We'll leave it to the user to just review and click 'Confirm'

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Error parsing magic link:', e);
      }
    }
  }, []);

  // --- FIREBASE SYNCHRONIZATION ---
  const [events, setEvents] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [damageReports, setDamageReports] = useState([]);
  const [globalTx, setGlobalTx] = useState([]);

  // 1. SYNC EVENTS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const liveEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Orden cronológico: Los eventos más cercanos a suceder aparecen primero
      setEvents(liveEvents.sort((a, b) => {
        const dateA = a.eventDetails?.date || '';
        const dateB = b.eventDetails?.date || '';
        if (dateA === dateB) return a.id.localeCompare(b.id);
        return dateA.localeCompare(dateB);
      }));
    });
    return () => unsubscribe();
  }, []);

  // 1.5 SYNC QUOTATIONS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotations"), (snapshot) => {
      const liveQuo = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setQuotations(liveQuo.sort((a, b) => {
        // 1. PRIORIDAD: ESTADO 'SENT' (Leads nuevos) ARRIBA
        if (a.status === 'SENT' && b.status !== 'SENT') return -1;
        if (a.status !== 'SENT' && b.status === 'SENT') return 1;

        // 2. ORDEN CRONOLÓGICO: Más reciente primero
        const dateA = parseFirestoreDate(a.createdAt);
        const dateB = parseFirestoreDate(b.createdAt);
        if (dateA.getTime() !== dateB.getTime()) return dateB - dateA;

        // 3. FALLBACK: ID
        return b.id.localeCompare(a.id);
      }));
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNC INVENTORY
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const liveInv = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setInventory(liveInv);
    });
    return () => unsubscribe();
  }, []);

  // 3. SYNC GLOBAL TX
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "globalTx"), (snapshot) => {
      const liveTx = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setGlobalTx(liveTx.sort((a, b) => b.date - a.date)); // Sort mostly for visual
    });
    return () => unsubscribe();
  }, []);

  // 4. SYNC REPORTS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "damageReports"), (snapshot) => {
      const liveRep = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDamageReports(liveRep);
    });
    return () => unsubscribe();
  }, []);


  const [view, setView] = useState('events'); // Default to events instead of dashboard
  const [eventSubTab, setEventSubTab] = useState('list'); // list | inventory | staff
  const [detailTab, setDetailTab] = useState('general');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [showFinanceModal, setShowFinanceModal] = useState(null); // 'IN' | 'OUT' | 'XFER'
  const [finType, setFinType] = useState('GENERAL'); // 'GENERAL' | 'EVENT'
  const [finEventId, setFinEventId] = useState('');
  const [finDesc, setFinDesc] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finMethod, setFinMethod] = useState('');
  const [finCategory, setFinCategory] = useState('LOGISTICA'); // LOGISTICA, EQUIPOS, MARKETING, NOMINA, MANTENIMIENTO, FIJOS, VENTA, OTROS
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [accountingTab, setAccountingTab] = useState('TESORERIA'); // TESORERIA | RESUMEN | METRICAS
  const [tradingTimeframe, setTradingTimeframe] = useState('W'); // H, D, W, M, Y
  const [filterExecution, setFilterExecution] = useState('ALL'); // ALL, PENDING_STAFF, PENDING_WH, PENDING_CLOSURE
  const [staffPayModal, setStaffPayModal] = useState(null);
  const [whatsappModalQuo, setWhatsappModalQuo] = useState(null); // { quo, type }
  const [sectionState, setSectionState] = useState({ s1: true, s2: true, s3: false, s4: true }); // Accordion State
  const toggleSection = (key) => setSectionState(prev => ({ ...prev, [key]: !prev[key] }));

  // --- ESTADO: IDENTIDAD OPERATIVA (PERFIL) ---
  const [userProfile, setUserProfile] = useState({
    businessName: 'Nexxa Sound',
    nit: '',
    fiscalAddress: '',
    whatsapp: '3204863127',
    email: 'contacto@nexxasound.com',
    city: 'Bogotá D.C.',
    signature: 'Atte: El equipo de Nexxa Sound 🎧'
  });

  // --- ESTADO: MOTOR DEL NEGOCIO (AJUSTES) ---
  const [appConfig, setAppConfig] = useState({
    // 1. PRECIOS Y REGLAS
    djBase: 35000,
    djHour: 13000,
    logisticsBase: 25000,
    logisticsHour: 10000,
    photoHour: 13000,
    neonArtist: 120000,
    minEventDuration: 4, // horas
    maxDiscount: 10, // %

    // 2. INVENTARIO
    bufferTime: 2, // horas entre eventos
    overlapPenalty: 50000,

    // 3. EVENTOS
    minDeposit: 50, // %
    overtimePolicy: 'ALWAYS_CHARGE', // ALWAYS_CHARGE | NEGOTIABLE

    // 4. MENSAJES (TEMPLATES)
    msgQuote: '¡Hola {cliente}! 🎧 Adjunto tu cotización personalizada para tu evento en {fecha}.',
    msgAdvisory: '{cliente}, para tu evento de {invitados} pax en {zona}, te sugerimos lo siguiente...',
    msgConfirm: '¡Excelente! Hemos recibido tu abono de {monto}. Tu fecha {fecha} está 100% confirmada. 🔒',
    msgPost: '¡Gracias por confiar en Nexxa! Esperamos que hayas disfrutado tu experiencia. ⭐',

    // 5. FINANZAS
    initialCash: 0,
    expenseCategorias: ['Transporte', 'Alimentación', 'Nómina', 'Mantenimiento', 'Equipos', 'Marketing'],
    defaultPayment: 'Nequi',

    // 7. NOTIFICACIONES
    notifyEvent: true,
    notifyConflict: true,
    notifyPayment: true
  });

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!finAmount || !finDesc) return alert('Datos incompletos');

    try {
      if (finType === 'EVENT' && finEventId) {
        // Link to Event extraExpenses
        const evt = events.find(e => e.id === finEventId);
        if (evt) {
          const newExp = [...(evt.financials.extraExpenses || []), {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            desc: finDesc,
            amount: Number(finAmount)
          }];
          await updateDoc(doc(db, "events", finEventId), { "financials.extraExpenses": newExp });
        }
      } else {
        // Global Transaction
        const txId = `TX-${Date.now()}`;
        await setDoc(doc(collection(db, "globalTx"), txId), {
          id: txId,
          desc: finDesc,
          amount: Number(finAmount),
          method: finMethod,
          category: finCategory,
          type: showFinanceModal, // 'IN' or 'OUT'
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }
      setShowFinanceModal(null);
      setFinDesc('');
      setFinAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  // --- INVENTORY LOGIC ---
  const handleAddInventory = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const category = e.target.category.value;
    const qty = Number(e.target.qty.value);

    const newItem = {
      // id: `inv-${Date.now()}`, // Auto-ID by Firestore is better, or use custom if strictly needed
      // We will let Firestore generate ID or use a custom ID structure if legacy requires it.
      // Ideally Auto. But let's stick to the object shape.
      category,
      name,
      total: qty,
      available: qty, // New items are fully available by default
      status: 'OK'
    };

    // FIRESTORE ADD
    await setDoc(doc(collection(db, "inventory"), `inv-${Date.now()}`), newItem);
    setShowAddModal(false);
  };


  const reportDamage = async (itemId, description) => {
    const newReport = {
      itemId,
      date: new Date().toLocaleDateString(),
      description,
      status: 'PENDING' // PENDING | SOLVED
    };
    await setDoc(doc(collection(db, "damageReports"), `rep-${Date.now()}`), newReport);
    alert('⚠️ Daño reportado correctamente');
  };

  // FORM STATE FOR NEW EVENT (WITH AUTO-SAVE DRAFT - LOCAL ONLY FOR NOW implies per-device draft)
  const [newEvent, setNewEvent] = useState(() => {
    const draft = localStorage.getItem('nexxa_draft_event');
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch (e) {
        console.error("Error parsing draft", e);
      }
    }
    return {
      clientName: '', clientPhone: '', clientPhone2: '',
      date: '', startTime: '', endTime: '',
      location: '', neighborhood: '',
      packName: 'Essential',
      totalValue: '', deposit: '',
      managerName: '', guestCount: '',
      occasion: '',
      extraHourPrice: 85000,
      indications: 'Ninguna',
      warehouseTime: '',
      materialExplanation: '',
      photoStartTime: '',
      photoEndTime: '',
      decorStartTime: '',
      decorEndTime: '',
      paymentMethod: 'Nequi'
    };
  });

  // Auto-Save Draft Effect (Keep Local for privacy/speed until save)
  useEffect(() => {
    localStorage.setItem('nexxa_draft_event', JSON.stringify(newEvent));
  }, [newEvent]);


  const addGlobalTx = async (desc, amount, type) => {
    const newTx = {
      date: new Date().toLocaleDateString(),
      desc,
      amount: Number(amount),
      type // 'IN' | 'OUT'
    };
    await setDoc(doc(collection(db, "globalTx"), `tx-${Date.now()}`), newTx);
  };

  const removeGlobalTx = async (id) => {
    await deleteDoc(doc(db, "globalTx", id));
  };

  // --- QUOTATION LOGIC ---
  const handleCreateQuotation = async (status = 'SENT') => {
    if (!newEvent.clientName || !newEvent.date || !newEvent.totalValue) {
      return alert('Faltan datos para procesar el evento.');
    }

    // Mandatory Roles based on Package
    if (newEvent.packName === 'Memories' || newEvent.packName === 'Celebration') {
      if (!newEvent.photoStartTime || !newEvent.photoEndTime) {
        return alert(`⚠️ EL PAQUETE ${newEvent.packName.toUpperCase()} REQUIERE HORARIO DE FOTOGRAFÍA.`);
      }
    }
    if (newEvent.packName === 'Celebration') {
      if (!newEvent.decorStartTime || !newEvent.decorEndTime) {
        return alert('⚠️ EL PAQUETE CELEBRATION REQUIERE HORARIO DE DECORACIÓN.');
      }
    }

    const total = Number(newEvent.totalValue) || 0;

    // GENERATE QUOTATION ID
    const dateCode = newEvent.date.replace(/-/g, '').slice(2);
    const dailyCount = quotations.filter(q => q.eventDetails?.date === newEvent.date).length + 1;
    const finalQuoId = `QUO-${dateCode}-${String(dailyCount).padStart(2, '0')}`;

    // INITIAL ITEMS (Same logic as handleCreateEvent)
    let defaultItems = [];
    if (newEvent.packName === 'Essential') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 2, status: 'PENDING', area: 'DJ' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, status: 'PENDING', area: 'DJ' },
        { name: 'Luces LED + Soporte Trípode', qty: 1, status: 'PENDING', area: 'DJ' },
        { name: 'Máquina Humo + Control + Líquido', qty: 1, status: 'PENDING', area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, status: 'PENDING', area: 'LOGÍSTICA' }
      ];
    } else if (newEvent.packName === 'Memories') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 2, status: 'PENDING', area: 'DJ' },
        { name: 'Bajos 18" Activos', qty: 2, status: 'PENDING', area: 'DJ' },
        { name: 'Cámara Pro + Lente + Flash', qty: 1, status: 'PENDING', area: 'PHOTO' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, status: 'PENDING', area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, status: 'PENDING', area: 'LOGÍSTICA' }
      ];
    } else if (newEvent.packName === 'Celebration') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 4, status: 'PENDING', area: 'DJ' },
        { name: 'Bajos 18" Activos', qty: 2, status: 'PENDING', area: 'DJ' },
        { name: 'Cámara Pro + Lente + Flash', qty: 1, status: 'PENDING', area: 'PHOTO' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, status: 'PENDING', area: 'LOGÍSTICA' }
      ];
    }

    const eventObj = {
      status: status, // 'SENT'
      createdAt: newEvent.createdAt || serverTimestamp(),
      client: {
        name: newEvent.clientName,
        phone: newEvent.clientPhone,
        phone2: newEvent.clientPhone2 || ''
      },
      eventDetails: {
        date: newEvent.date,
        type: 'Evento Social',
        location: newEvent.location || '',
        neighborhood: newEvent.neighborhood || '',
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        guestCount: newEvent.guestCount,
        photoStartTime: newEvent.photoStartTime || '',
        photoEndTime: newEvent.photoEndTime || '',
        decorStartTime: newEvent.decorStartTime || '',
        decorEndTime: newEvent.decorEndTime || ''
      },
      financials: {
        totalValue: total,
        deposit: Number(newEvent.deposit) || 0,
        balance: total - (Number(newEvent.deposit) || 0)
      },
      logistics: {
        packName: newEvent.packName,
        selectedExtras: newEvent.selectedExtras || {},
        makeupCount: newEvent.makeupCount,
        managerName: newEvent.managerName || 'Por asignar',
        flow: { staffConfirmed: false, equipmentDelivered: false, equipmentReturned: false, staffPaid: false },
        items: defaultItems
      }
    };

    try {
      // 1. SAVE AS QUOTATION
      await setDoc(doc(db, "quotations", finalQuoId), eventObj);

      // 2. GENERATE PDF
      await generateQuotationPDF(eventObj);

      alert('✅ Cotización Guardada y Enviada.');
      setView('quotations');
      setNewEvent({ id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '' });
      localStorage.removeItem('nexxa_draft_event');
    } catch (err) {
      console.error(err);
      alert('Error en la conversión: ' + err.message);
    }
  };

  const [selectedRoleView, setSelectedRoleView] = useState('ALL');

  // --- ACTIONS ---

  const approveQuotation = async (quo) => {
    if (!confirm('¿Aprobar esta cotización y convertarla en evento?')) return;

    // Generate ID: YYYYMMDD-XX
    const dateStr = quo.eventDetails?.date ? quo.eventDetails.date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Check local events state for count (assuming events are synced)
    const todayEvents = events.filter(e => {
      // Check if ID matches pattern EVT-YYYYMMDD
      return e.id && e.id.includes(dateStr);
    });

    const count = todayEvents.length + 1;
    const suffix = count.toString().padStart(2, '0');
    const eventId = `EVT-${dateStr}-${suffix}`;

    const eventObj = {
      status: 'CONFIRMED',
      client: quo.client,
      eventDetails: quo.eventDetails,
      financials: quo.financials,
      logistics: {
        ...quo.logistics,
        managerName: 'Por asignar',
        flow: {
          staffConfirmed: false,
          equipmentDelivered: false,
          equipmentReturned: false,
          staffPaid: false
        },
        items: []
      }
    };

    // Need to generate default items
    let defaultItems = [];
    const packName = quo.logistics.packName;
    const createItem = (name, qty, area) => ({ name, qty, area, status: 'PENDING', deliveredTime: null, returnedTime: null });

    // --- INVENTORY DEFINITIONS (User Specified) ---
    const djItems = [
      createItem('CABINAS ACTIVAS 15 Pulgadas + TRÍPODES', packName === 'Celebration' ? 4 : 2, 'DJ'),
      createItem('PC PORTÁTIL + CARGADOR + CABLE AUDIO 2 a 1', 1, 'DJ'),
      createItem('LUCES LED x4 + SOPORTE TRÍPODE', packName === 'Celebration' ? 2 : 1, 'DJ'),
      createItem('MÁQUINA HUMO + CONTROL + LÍQUIDO', 1, 'DJ'),
      createItem('KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', 1, 'DJ'),
      createItem('MAQUILLAJE NEON (PINTURAS, PINCEL, MAQUILLADOR, 2H)', 1, 'DJ')
    ];

    const photoItems = [
      createItem('CÁMARA', 1, 'PHOTO'),
      createItem('MICRO SD', 1, 'PHOTO')
    ];

    const decorItems = [
      createItem('BOMBAS', 50, 'DECOR'),
      createItem('INFLADOR', 1, 'DECOR')
    ];

    // Assemble List
    if (packName === 'Essential') {
      defaultItems = [...djItems];
    } else if (packName === 'Memories') {
      defaultItems = [...djItems, ...photoItems];
    } else if (packName === 'Celebration') {
      defaultItems = [...djItems, ...photoItems, ...decorItems];
    } else {
      // Personalizado / Fallback
      defaultItems = [...djItems]; // Assume base kit
    }
    eventObj.logistics.items = defaultItems;


    try {
      await setDoc(doc(db, "events", eventId), eventObj);
      await updateDoc(doc(db, "quotations", quo.id), { status: 'APPROVED' });
      alert('✅ Cotización aprobada y convertida en Evento');
      setView('events');
    } catch (err) {
      console.error(err);
      alert('Error al aprobar cotización');
    }
  };

  const updateQuotationStatus = async (id, status) => {
    await updateDoc(doc(db, "quotations", id), { status });
  };

  // --- AUTO-MIGRATION: FIX OLD IDS ---
  useEffect(() => {
    let migrationNeeded = false;

    const migratedEvents = events.map(evt => {
      // Regex: Checks if ID is strictly EVT-YYMMDD-XX
      const isNewFormat = /^EVT-\d{6}-\d{2}$/.test(evt.id); // Strict format check

      if (!isNewFormat && evt.eventDetails?.date) {
        migrationNeeded = true;
        const dateCode = evt.eventDetails.date.replace(/-/g, '').slice(2);
        const sameDayEvents = events.filter(e => e.eventDetails?.date === evt.eventDetails.date);
        const myIndex = sameDayEvents.indexOf(evt);

        const newId = `EVT-${dateCode}-${String(myIndex + 1).padStart(2, '0')}`;
        return { ...evt, id: newId };
      }
      return evt;
    });

    if (migrationNeeded) {
      setEvents(migratedEvents);
    }
    // eslint-disable-next-line
  }, [events.length]); // Only run if event count changes or on mount, basically. 
  // If we depend on [events], we might loop infinitely if objects regenerate. 
  // Ideally just run once on mount? But events might load from localStorage late?
  // But let's check events.length to be safe against deletions/additions triggering check.

  // --- AUTO-CLEANUP: EXPIRED QUOTATIONS ---
  useEffect(() => {
    const cleanupExpired = async () => {
      const today = new Date().toISOString().split('T')[0];
      const expiredLeads = quotations.filter(q => q.status === 'SENT' && q.eventDetails?.date && q.eventDetails.date < today);

      for (const lead of expiredLeads) {
        try {
          await updateDoc(doc(db, "quotations", lead.id), { status: 'LOST' });
        } catch (e) {
          console.error("Error auto-expirando lead:", lead.id, e);
        }
      }
    };
    if (quotations.length > 0) cleanupExpired();
  }, [quotations]);

  // --- EDIT & STATUS HANDLERS ---
  // --- TARIFAS EXACTAS APP NEXXA ---
  const PRICING = {
    'Essential': { base: 450000, extraDJ: 85000, extraPhoto: 0 },
    'Memories': { base: 650000, extraDJ: 85000, extraPhoto: 35000 },
    'Celebration': { base: 850000, extraDJ: 85000, extraPhoto: 35000 },
    'Personalizado': { base: 0, extraDJ: 0, extraPhoto: 0 }
  };

  // --- DATA DINÁMICA DE EXTRAS ---
  const getDynamicExtras = (guests, userMakeupCount) => {
    const g = Math.max(10, Number(guests) || 10);

    // Costos Unitarios (Sync with Client App)
    const C_FOAM = 12000;
    const C_CANNON = 4500;
    const C_BLOWOUT = 200;
    const C_BRACELET = 400;
    const C_NECKLACE = 400;
    const C_MASK = 400;

    // 1. Maquillaje (1 por cada 50 invitados O manual)
    const recommendedMakeup = Math.ceil(g / 50);
    const qty = (typeof userMakeupCount === 'number') ? userMakeupCount : recommendedMakeup;
    const makeupPrice = qty * 120000;

    // 2. Accesorios Essential
    const rawEssential = C_FOAM + (g * (C_BLOWOUT + C_BRACELET));
    const priceEssential = Math.round(rawEssential / 1000) * 1000;

    // 3. Accesorios Memories
    const rawMemories = (2 * C_FOAM) + (2 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET));
    const priceMemories = Math.round(rawMemories / 1000) * 1000;

    // 4. Accesorios Celebration
    const rawCelebration = (3 * C_FOAM) + (3 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET + C_NECKLACE + C_MASK));
    const priceCelebration = Math.round(rawCelebration / 1000) * 1000;

    return [
      {
        id: 'extra_makeup',
        name: `Maquillaje Neón`,
        price: makeupPrice,
        qty: qty,
        isMakeup: true,
        area: 'Photo',
        details: `${qty} Artista(s) (1 por c/50 invitados)`
      },
      {
        id: 'acc_essential',
        name: 'Accesorios Essential',
        price: priceEssential,
        area: 'Decor',
        details: `1 Espuma + (${g} Pitos, ${g} Manillas)`
      },
      {
        id: 'acc_memories',
        name: 'Accesorios Memories',
        price: priceMemories,
        area: 'Decor',
        details: `2 Espumas, 2 Cañones + (${g} Pitos, ${g} Manillas)`
      },
      {
        id: 'acc_celebration',
        name: 'Accesorios Celebration',
        price: priceCelebration,
        area: 'Decor',
        details: `3 Espumas, 3 Cañones + (${g} de: Pitos, Manillas, Collares, Antifaces)`
      }
    ];
  };

  // --- EDIT & STATUS HANDLERS ---
  const handleCreateEvent = async (e, status = 'CONFIRMED') => {
    if (e) e.preventDefault();

    // Validations (Skip for Drafts)
    if (status === 'CONFIRMED' || status === 'SENT') {
      if (!newEvent.clientName || !newEvent.date || !newEvent.totalValue) {
        return alert('Para procesar, necesitas al menos: Cliente, Fecha y Valor Total.');
      }

      // Mandatory Roles based on Package
      if (newEvent.packName === 'Memories' || newEvent.packName === 'Celebration') {
        if (!newEvent.photoStartTime || !newEvent.photoEndTime) {
          return alert(`⚠️ EL PAQUETE ${newEvent.packName.toUpperCase()} REQUIERE HORARIO DE FOTOGRAFÍA.`);
        }
      }
      if (newEvent.packName === 'Celebration') {
        if (!newEvent.decorStartTime || !newEvent.decorEndTime) {
          return alert('⚠️ EL PAQUETE CELEBRATION REQUIERE HORARIO DE DECORACIÓN.');
        }
      }

      // Validate Minimum Duration
      if (newEvent.startTime && newEvent.endTime) {
        const duration = getHours(newEvent.startTime, newEvent.endTime);
        if (duration < appConfig.minEventDuration) {
          if (!confirm(`⚠️ ALERTA DE MÍNIMO:\nLa duración es de ${duration.toFixed(1)} horas.\nEl mínimo operativo es de ${appConfig.minEventDuration} horas.\n\n¿Guardar de todos modos?`)) {
            return;
          }
        }
      }
    } else {
      if (!newEvent.clientName) return alert('El borrador necesita al menos un Nombre de Cliente.');
    }

    const total = Number(newEvent.totalValue) || 0;
    const dep = Number(newEvent.deposit) || 0;

    // 1. DEFINIR ITEMS (Calculated based on Package + Extras?)
    // Note: Currently simple package mapping.
    let defaultItems = [];
    if (newEvent.packName === 'Essential') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 2, checked: false, area: 'DJ' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'Luces LED + Soporte Trípode', qty: 1, checked: false, area: 'DJ' },
        { name: 'Máquina Humo + Control + Líquido', qty: 1, checked: false, area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    } else if (newEvent.packName === 'Memories') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 2, checked: false, area: 'DJ' },
        { name: 'Bajos 18" Activos', qty: 2, checked: false, area: 'DJ' },
        { name: 'Estructura Portería Luces', qty: 1, checked: false, area: 'DJ' },
        { name: 'Cabeza Móvil Beam / Spot', qty: 2, checked: false, area: 'DJ' },
        { name: 'Par LED RGBW', qty: 6, checked: false, area: 'DJ' },
        { name: 'Cámara Pro + Lente + Flash', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'Controladora / Mixer DJ', qty: 1, checked: false, area: 'DJ' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'Máquina Humo + Control + Líquido', qty: 1, checked: false, area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    } else if (newEvent.packName === 'Celebration') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 4, checked: false, area: 'DJ' },
        { name: 'Bajos 18" Activos', qty: 2, checked: false, area: 'DJ' },
        { name: 'Cabina Retorno DJ', qty: 1, checked: false, area: 'DJ' },
        { name: 'Estructura Portería Luces 4m', qty: 1, checked: false, area: 'DJ' },
        { name: 'Cabeza Móvil Beam / Spot', qty: 4, checked: false, area: 'DJ' },
        { name: 'Par LED RGBW', qty: 8, checked: false, area: 'DJ' },
        { name: 'Cámara Pro + Lente + Flash', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'Máquina Humo + Control + Líquido', qty: 1, checked: false, area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    } else {
      defaultItems = [
        { name: 'Kit Sonido Básico Nexxa', qty: 1, checked: false, area: 'DJ' },
        { name: 'Kit Iluminación Básico Nexxa', qty: 1, checked: false, area: 'DJ' },
        { name: 'Cableado y Extensiones AC', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    }

    // 1.1 AÑADIR MATERIALES DE EXTRAS SELECCIONADOS
    const dynamicExtras = getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount);
    dynamicExtras.forEach(ex => {
      if (newEvent.selectedExtras && newEvent.selectedExtras[ex.id]) {
        // Solo añadir si no existe ya para evitar duplicados en ediciones
        if (!defaultItems.some(i => i.name === ex.name)) {
          defaultItems.push({
            name: ex.name,
            qty: ex.qty || 1,
            checked: false,
            area: ex.area || 'Decor'
          });
        }
      }
    });

    // 2. VERIFICACIÓN DE STOCK (Only for CONFIRMED)
    let conflictMsg = '';
    if (status === 'CONFIRMED') {
      const newStart = newEvent.startTime ? parseInt(newEvent.startTime.replace(':', '')) : 0;
      let newEnd = newEvent.endTime ? parseInt(newEvent.endTime.replace(':', '')) : 0;
      if (newEnd < newStart) newEnd += 2400;

      const overlappingEvents = events.filter(evt => {
        if (evt.status === 'FINISHED' || evt.status === 'DRAFT') return false;
        if (evt.id === newEvent.id) return false; // Don't check against self if editing
        if (evt.eventDetails.date !== newEvent.date) return false;

        const evtStart = parseInt(evt.eventDetails.startTime.replace(':', ''));
        let evtEnd = parseInt(evt.eventDetails.endTime.replace(':', ''));
        if (evtEnd < evtStart) evtEnd += 2400;

        return (newStart < evtEnd && newEnd > evtStart);
      });

      defaultItems.forEach(reqItem => {
        let usedQty = 0;
        let conflictDetails = [];
        overlappingEvents.forEach(evt => {
          const found = evt.logistics.items.find(i => i.name === reqItem.name);
          if (found && found.qty > 0) {
            usedQty += found.qty;
            conflictDetails.push(`${evt.id}`);
          }
        });
        const invItem = inventory.find(i => i.name === reqItem.name);
        if (invItem) {
          if ((usedQty + reqItem.qty) > invItem.total) {
            conflictMsg += `\n❌ ${reqItem.name}: Stock ${invItem.total} | Uso: ${usedQty} | Pides: ${reqItem.qty}`;
          }
        }
      });

      if (conflictMsg) {
        const proceed = window.confirm(`⚠️ STOCK INSUFICIENTE:\n${conflictMsg}\n¿Confirmar de todos modos?`);
        if (!proceed) return;
      }
    }

    // GENERATE OR REUSE ID
    let finalId = newEvent.id;
    if (!finalId) {
      const dateCode = newEvent.date ? newEvent.date.replace(/-/g, '').slice(2) : 'XXXXXX';
      const dailyCount = events.filter(e => e.eventDetails.date === newEvent.date).length + 1;
      finalId = `EVT-${dateCode}-${String(dailyCount).padStart(2, '0')}`;
    }

    const eventObj = {
      // id: finalId, // Firestore uses document ID, also redundant but helps
      status: status,
      client: {
        name: newEvent.clientName,
        phone: newEvent.clientPhone,
        phone2: newEvent.clientPhone2 || ''
      },
      eventDetails: {
        date: newEvent.date,
        type: newEvent.occasion || 'Evento Social',
        occasion: newEvent.occasion || 'Evento Social',
        location: newEvent.location ? newEvent.location.replace(/"/g, '') : '',
        neighborhood: newEvent.neighborhood || '',
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        materialsTime: newEvent.materialsTime || '',
        warehouseTime: newEvent.warehouseTime || '',
        indications: newEvent.indications || 'Ninguna',
        photoStartTime: newEvent.photoStartTime || '',
        photoEndTime: newEvent.photoEndTime || '',
        decorStartTime: newEvent.decorStartTime || '',
        decorEndTime: newEvent.decorEndTime || ''
      },
      financials: {
        totalValue: total,
        deposit: dep,
        balance: total - dep,
        extraHourPrice: Number(newEvent.extraHourPrice) || (newEvent.packName === 'Essential' ? 85000 : 135000),
        extraExpenses: newEvent.extraExpenses || [] // Preserve if editing
      },
      logistics: {
        packName: newEvent.packName,
        managerName: newEvent.managerName || 'Por asignar',
        items: newEvent.savedItems || defaultItems, // Preserve items if editing and customized, else default
        flow: newEvent.savedFlow || {
          dj: { confirmed: false, delivered: false, returned: false },
          photo: { confirmed: false, delivered: false, returned: false },
          decor: { confirmed: false, delivered: false, returned: false },
          clientPaid: false,
          staffPaid: false
        },
        selectedExtras: newEvent.selectedExtras || {}, // Save checkboxes
        makeupCount: newEvent.makeupCount // Save manual makeup override
      }
    };

    // FIRESTORE UPSERT
    try {
      await setDoc(doc(db, "events", finalId), eventObj);
      alert(status === 'DRAFT' ? '📝 Borrador Guardado' : (newEvent.id ? '✅ Evento Actualizado' : '✅ Evento Creado'));

      setView('events');
      const emptyState = { id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '' };
      setNewEvent(emptyState);
      localStorage.removeItem('nexxa_draft_event'); // Clear transient draft
    } catch (err) {
      console.error("Error saving event: ", err);
      alert("Error guardando el evento. Revisa la consola.");
    }
  };

  const editEvent = (evt) => {
    // Map Event -> Form State
    const formState = {
      id: evt.id,
      clientName: evt.client.name,
      clientPhone: evt.client.phone || '',
      clientPhone2: evt.client.phone2 || '',
      date: evt.eventDetails.date,
      startTime: evt.eventDetails.startTime,
      endTime: evt.eventDetails.endTime,
      location: evt.eventDetails.location,
      neighborhood: evt.eventDetails.neighborhood || '',
      guestCount: evt.eventDetails.guestCount || '',
      occasion: evt.eventDetails.occasion || evt.eventDetails.type || '',
      indications: evt.eventDetails.indications || 'Ninguna',
      materialsTime: evt.eventDetails.materialsTime || '',
      extraHourPrice: evt.financials.extraHourPrice || 30000,
      packName: evt.logistics.packName,
      managerName: evt.logistics.managerName,
      totalValue: evt.financials.totalValue,
      deposit: evt.financials.deposit,
      selectedExtras: evt.logistics.selectedExtras || {},
      extraExpenses: evt.financials.extraExpenses, // Carry over
      savedItems: evt.logistics.items, // Carry over checklist
      savedFlow: evt.logistics.flow, // Carry over flow
      warehouseTime: evt.eventDetails.warehouseTime || '',
      materialExplanation: evt.eventDetails.materialExplanation || '',
      photoStartTime: evt.eventDetails.photoStartTime || '',
      photoEndTime: evt.eventDetails.photoEndTime || '',
      decorStartTime: evt.eventDetails.decorStartTime || '',
      decorEndTime: evt.eventDetails.decorEndTime || ''
    };
    setNewEvent(formState);
    setView('create');
  };

  const deleteEvent = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de ELIMINAR este evento? No se puede deshacer.')) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const getSelectedEvent = () => events.find(e => e.id === selectedEventId);

  // --- LOGIC HANDLERS ---
  const toggleLogisticsItem = async (evtId, index) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;

    const newItems = [...evt.logistics.items];
    newItems[index].checked = !newItems[index].checked;

    await updateDoc(doc(db, "events", evtId), {
      "logistics.items": newItems
    });
  };

  const toggleFlowStep = async (evtId, area, step) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;

    // SI ES PAGO DE STAFF, ABRIR MODAL PARA SELECCIONAR MÉTODO
    if (area === 'staffPaid') {
      if (evt.logistics?.flow?.staffPaid) {
        // Si ya estaba pagado, simplemente desmarcarlo
        await updateDoc(doc(db, "events", evtId), { "logistics.flow.staffPaid": false });
      } else {
        setStaffPayModal(evt);
      }
      return;
    }

    if (step) {
      const current = evt.logistics?.flow?.[area]?.[step] || false;
      await updateDoc(doc(db, "events", evtId), {
        [`logistics.flow.${area}.${step}`]: !current
      });
    } else {
      const current = evt.logistics?.flow?.[area] || false;
      await updateDoc(doc(db, "events", evtId), {
        [`logistics.flow.${area}`]: !current
      });
    }
  };

  const addExpense = async (evtId, paramDesc, paramAmount) => {
    if (!paramDesc || !paramAmount) return;
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;

    const newExpenses = [...evt.financials.extraExpenses, {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      desc: paramDesc,
      amount: Number(paramAmount)
    }];

    await updateDoc(doc(db, "events", evtId), {
      "financials.extraExpenses": newExpenses
    });
  };

  const removeExpense = async (evtId, expenseId) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;

    const newExpenses = evt.financials.extraExpenses.filter(e => e.id !== expenseId);

    await updateDoc(doc(db, "events", evtId), {
      "financials.extraExpenses": newExpenses
    });
  };


  const generateMissionPDF = async (evt, role = 'GENERAL') => {
    alert(`Generando PDF: ${role}`); // Temporary debug alert
    try {
      if (role !== 'GENERAL') {
        const stepRole = role === 'FOTO' ? 'PHOTO' : role;
        toggleFlowStep(evt.id, 'misionSent', stepRole).catch(err => {
          console.error("Error actualizando status:", err);
        });
      }
      await pdfService.generateMissionPDF(evt, role, events, getCollectionResponsibility);
    } catch (err) {
      console.error("Error en generateMissionPDF:", err);
      alert("Error: " + err.message);
    }
  };



  const generateQuotationPDF = async (quo) => {
    return pdfService.generateQuotationPDF(quo, getDynamicExtras);
  };


  // Helper function to determine collection responsibility
  const getCollectionResponsibility = (evt) => {
    const times = [
      { role: 'DJ / OPERADOR', time: evt.eventDetails?.startTime || '23:59' }, // Default late if not present
      { role: 'FOTÓGRAFO', time: evt.eventDetails?.photoStartTime || '23:59' },
      { role: 'DECORADOR', time: evt.eventDetails?.decorStartTime || '23:59' } // Decorator usually finishes last
    ].filter(t => t.time !== '23:59'); // Filter out roles that don't have a time

    if (times.length === 0) {
      return { responsibleRole: 'N/A', isTieBreak: false };
    }

    // Sort by time to find the earliest
    times.sort((a, b) => a.time.localeCompare(b.time));

    const earliestTime = times[0].time;
    const earliestRoles = times.filter(t => t.time === earliestTime);

    if (earliestRoles.length > 1) {
      // Tie-breaker logic: DJ > FOTÓGRAFO > DECORADOR
      const roleOrder = ['DJ / OPERADOR', 'FOTÓGRAFO', 'DECORADOR'];
      const responsible = earliestRoles.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))[0];
      return { responsibleRole: responsible.role, isTieBreak: true };
    } else {
      return { responsibleRole: earliestRoles[0].role, isTieBreak: false };
    }
  };

  // --- VIEW: CENTER HUB (ACCIONES RÁPIDAS) ---
  const renderHomeHub = () => {
    return (
      <div className="fade-in container" style={{ paddingBottom: '140px' }}>
        <header className="main-header" style={{ padding: '60px 0 30px 0' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, lineHeight: '1.1' }}>¿Qué hacemos<br /><span style={{ opacity: 0.3 }}>ahora?</span></h2>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            onClick={() => setView('create')}
            style={{
              background: 'linear-gradient(135deg, var(--brand-gradient), #6a00ff)',
              borderRadius: '35px',
              padding: '30px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(138, 43, 226, 0.4)'
            }}
          >
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.2)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                  <IconPlus size={24} color="#fff" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Crear Cotización</h3>
                <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem', fontWeight: '600' }}>Nuevo cliente o evento.</p>
              </div>
              <div style={{ background: '#fff', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconArrowRight />
              </div>
            </div>
          </div>

          <div
            onClick={() => alert('Generador de mensajes disponible pronto')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '35px',
              padding: '30px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(0, 255, 157, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-green)' }}>
                <IconWhatsApp size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>Generar Mensaje</h3>
                <p style={{ margin: '3px 0 0 0', opacity: 0.4, fontSize: '0.8rem', fontWeight: '600' }}>Para WhatsApp.</p>
              </div>
            </div>
            <IconArrowRight style={{ opacity: 0.3 }} />
          </div>
        </div>
      </div>
    );
  };

  // --- VIEW: DECISIÓN (FINANZAS) ---
  // --- VIEW: BALANCE (FINANZAS) ---
  const renderAccounting = () => {
    // --- LÓGICA DE FILTRADO Y MÉTRICAS ---
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Filtrar transacciones por mes seleccionado
    const filteredGlobalTx = globalTx.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const filteredEvents = events.filter(e => {
      // Asumimos que la fecha del evento es el punto de contabilidad de su abono
      const d = new Date(e.eventDetails.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // Mes Anterior para Comparativa
    const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

    const prevTx = globalTx.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === prevMonthIdx && d.getFullYear() === prevYear;
    });

    const getMonthStats = (txs, evts) => {
      const totalIn = evts.reduce((acc, e) => acc + (e.financials?.deposit || 0), 0) + txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
      const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
      return { income: totalIn, expense: totalOut, balance: totalIn - totalOut };
    };

    const stats = getMonthStats(filteredGlobalTx, filteredEvents);
    const currentIncome = stats.income;
    const currentBalance = stats.balance;

    const prevStats = getMonthStats(prevTx, events.filter(e => {
      const d = new Date(e.eventDetails.date);
      return d.getMonth() === prevMonthIdx && d.getFullYear() === prevYear;
    }));
    const lastMonthBalance = prevStats.balance;

    const diff = lastMonthBalance === 0 ? 0 : ((currentBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100;

    // Estadísticas de categorías para el mes seleccionado
    const expenseByCat = filteredGlobalTx.filter(t => t.type === 'OUT').reduce((acc, t) => {
      const cat = t.category || 'VARIOS';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

    const topExpenseCat = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

    // --- LÓGICA DE COMPROMISOS (CONEXIÓN CON TESORERÍA) ---
    const commitments = [
      { day: '05', title: 'Mantenimiento Equipos', amount: 150000, category: 'EQUIPOS' },
      { day: '10', title: 'Arriendo Bodega', amount: 850000, category: 'LOCAL' },
      { day: '15', title: 'Servicios Públicos', amount: 220000, category: 'VARIOS' },
      { day: '28', title: 'Antigravity (Software)', amount: 90000, category: 'MARKETING' }
    ];

    const processedAgenda = commitments.map(c => {
      // Buscar si hay un gasto en el historial que coincida con la categoría o descripción
      const isPaid = filteredGlobalTx.some(tx =>
        tx.type === 'OUT' && (tx.category === c.category || tx.desc.toLowerCase().includes(c.title.toLowerCase()))
      );

      const dayNum = parseInt(c.day);
      const isOverdue = dayNum < new Date().getDate() && !isPaid && selectedMonth === new Date().getMonth();

      return {
        ...c,
        status: isPaid ? 'PAGADO' : (isOverdue ? 'VENCIDO' : 'PENDIENTE'),
        color: isPaid ? 'var(--success-green)' : (isOverdue ? 'var(--danger-red)' : 'rgba(255,255,255,0.2)')
      };
    });

    // --- LÓGICA DE GRÁFICA SEMANAL ---
    const weeklyIncome = [0, 0, 0, 0]; // 4 semanas
    filteredEvents.forEach(e => {
      const day = new Date(e.eventDetails.date).getDate();
      const week = Math.min(Math.floor((day - 1) / 7), 3);
      weeklyIncome[week] += (e.financials?.deposit || 0);
    });
    filteredGlobalTx.filter(t => t.type === 'IN').forEach(t => {
      const day = new Date(t.createdAt).getDate();
      const week = Math.min(Math.floor((day - 1) / 7), 3);
      weeklyIncome[week] += t.amount;
    });
    const maxWeekly = Math.max(...weeklyIncome, 1);

    // --- LÓGICA DE VELAS JAPONESAS REALISTAS (CONECTADAS A TESORERÍA) ---
    const getRealCandles = () => {
      // Tomamos los últimos 10-15 movimientos o periodos
      const txs = [...filteredGlobalTx].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Use createdAt for sorting
      if (txs.length === 0) return Array(10).fill({ open: 100, close: 100, high: 105, low: 95, isUp: true });

      let currentAccountBalance = 0;
      const candles = [];

      // Agrupamos txs para crear velas (usamos bloques de transacciones para simular periodos)
      const chunkSize = Math.max(Math.ceil(txs.length / 12), 1);

      for (let i = 0; i < txs.length; i += chunkSize) {
        const chunk = txs.slice(i, i + chunkSize);
        const open = currentAccountBalance;
        let high = open;
        let low = open;

        chunk.forEach(t => {
          currentAccountBalance += (t.type === 'IN' ? t.amount : -t.amount);
          if (currentAccountBalance > high) high = currentAccountBalance;
          if (currentAccountBalance < low) low = currentAccountBalance;
        });

        const close = currentAccountBalance;
        // Pequeño ajuste para que las mechas siempre sean visibles
        const adjustedHigh = Math.max(high, open, close) * 1.05;
        const adjustedLow = Math.min(low, open, close) * 0.95;

        candles.push({
          open,
          close,
          high: adjustedHigh,
          low: adjustedLow,
          isUp: close >= open
        });
      }

      // Si hay pocas velas, rellenamos con las últimas para que no se vea vacío
      while (candles.length < 12) {
        const last = candles[candles.length - 1] || { open: 0, close: 0, high: 100, low: 0, isUp: true };
        candles.push({ ...last });
      }

      return candles.slice(-12); // Mostramos las últimas 12
    };

    const realCandles = getRealCandles();
    const maxVal = Math.max(...realCandles.map(c => c.high), 1);
    const minVal = Math.min(...realCandles.map(c => c.low), 0);
    const range = maxVal - minVal || 1;

    // Bandas de Bollinger Reales (Basadas en el flujo real)
    const realBands = realCandles.map((c, i) => {
      const dev = range * 0.15;
      return {
        mid: (c.open + c.close) / 2,
        top: Math.max(c.open, c.close) + dev,
        bot: Math.min(c.open, c.close) - dev
      };
    });

    // Cálculo de balances por cuenta para el periodo
    const getAccountBalance = (method) => {
      const txBal = filteredGlobalTx.filter(t => t.method === method).reduce((acc, t) => acc + (t.type === 'IN' ? t.amount : -t.amount), 0);
      const evtBal = filteredEvents.filter(e => e.financials?.paymentMethod === method).reduce((acc, e) => acc + (e.financials?.deposit || 0), 0);
      return txBal + evtBal;
    };

    return (
      <div className="fade-in container" style={{ paddingBottom: '160px' }}>
        {/* HEADER EJECUTIVO (FIJO) */}
        <header style={{ margin: '20px 0 15px 0' }}>
          <button onClick={() => setView('dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--primary-cyan)', padding: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '950', fontSize: '0.65rem', cursor: 'pointer', opacity: 0.6 }}>
            <IconArrowLeft size={14} /> DASHBOARD
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '950', letterSpacing: '-1px' }}>Finance <span style={{ opacity: 0.3 }}>Nexxa</span></h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowMonthSelector(true)}
                style={{ background: 'var(--brand-gradient)', border: 'none', color: '#000', padding: '10px 18px', borderRadius: '14px', fontSize: '0.7rem', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}
              >
                {months[selectedMonth].toUpperCase()} {selectedYear}
              </button>
              <button
                onClick={() => setView('settings')}
                style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IconUser size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN DE PESTAÑAS INTERNAS */}
        <nav style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['TESORERIA', 'RESUMEN', 'METRICAS'].map(tab => (
            <button
              key={tab}
              onClick={() => setAccountingTab(tab)}
              style={{ flex: 1, padding: '12px 5px', borderRadius: '14px', border: 'none', background: accountingTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent', color: accountingTab === tab ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '1px', transition: 'all 0.3s' }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* CONTENIDO DÍNAMICO SEGÚN PESTAÑA */}
        {accountingTab === 'RESUMEN' && (
          <div className="fade-in">
            {/* CARD MAESTRA (LA MARCA) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(188, 111, 241, 0.1) 100%)',
              border: '1px solid rgba(0, 242, 255, 0.2)',
              padding: '30px 25px',
              borderRadius: '35px',
              marginBottom: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
                <IconLogoNexxa size={160} />
              </div>
              <small style={{ color: 'var(--primary-cyan)', fontWeight: '950', letterSpacing: '3px', fontSize: '0.55rem' }}>PROFIT NETO {months[selectedMonth].toUpperCase()}</small>
              <div style={{ fontSize: '2.8rem', fontWeight: '950', letterSpacing: '-2px', color: '#fff', marginTop: '8px' }}>
                {formatPeso(currentBalance)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <div style={{ background: diff >= 0 ? 'var(--success-green)' : 'var(--danger-red)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '950', color: '#000' }}>
                    {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.3 }}>VS MES PASADO</span>
              </div>
            </div>

            {/* REPARTICIÓN DE ACTIVOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {[
                { label: 'NEXXA CORP (50%)', val: currentBalance * 0.5, color: 'var(--primary-cyan)', icon: '🏛️' },
                { label: 'OPERATIVO JULI (20%)', val: currentBalance * 0.2, color: 'var(--primary-purple)', icon: '🟣' },
                { label: 'PATRIMONIO YO (30%)', val: currentBalance * 0.3, color: 'var(--primary-pink)', icon: '💎' }
              ].map(p => (
                <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '1.2rem' }}>{p.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff' }}>{p.label}</div>
                      <div style={{ width: '40px', height: '3px', background: p.color, borderRadius: '10px', marginTop: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '950', color: '#fff' }}>{formatPeso(p.val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accountingTab === 'TESORERIA' && (
          <div className="fade-in">
            {/* CUENTAS Y BILLETERAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { name: 'Nequi', color: '#ff007a', val: getAccountBalance('Nequi') },
                { name: 'Daviplata', color: '#ff4d4d', val: getAccountBalance('Daviplata') },
                { name: 'Efectivo', color: '#4dff88', val: getAccountBalance('Efectivo') }
              ].map(bank => (
                <div key={bank.name} style={{ background: 'var(--glass-bg)', padding: '15px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '950', color: bank.val >= 0 ? '#fff' : 'var(--danger-red)' }}>{formatPeso(bank.val)}</div>
                  <small style={{ fontSize: '0.45rem', fontWeight: '900', opacity: 0.3, letterSpacing: '1px' }}>{bank.name.toUpperCase()}</small>
                </div>
              ))}
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA (INTEGRADOS PARA NO ESTORBAR) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => { setFinType('GENERAL'); setShowFinanceModal('IN'); }}
                style={{ background: 'var(--success-green)', color: '#000', padding: '15px', borderRadius: '18px', fontWeight: '950', border: 'none', fontSize: '0.75rem', letterSpacing: '1px' }}
              >
                + INGRESO
              </button>
              <button
                onClick={() => { setFinType('GENERAL'); setShowFinanceModal('OUT'); }}
                style={{ background: '#fff', color: '#000', padding: '15px', borderRadius: '18px', fontWeight: '950', border: 'none', fontSize: '0.75rem', letterSpacing: '1px' }}
              >
                - GASTO
              </button>
            </div>

            {/* CONTROL DE MOVIMIENTOS (LISTADO ESTilo EXCEL ROBUSTO) */}
            <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ fontWeight: '950', opacity: 0.3, letterSpacing: '1px' }}>HISTORIAL DE FLUJO</small>
                <small style={{ color: 'var(--primary-cyan)', fontWeight: '900' }}>{filteredGlobalTx.length} items</small>
              </div>
              {filteredGlobalTx.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.2, fontSize: '0.8rem' }}>Sin movimientos este mes</div>
              ) : (
                filteredGlobalTx.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((tx, idx) => (
                  <div key={tx.id} style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx === filteredGlobalTx.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: tx.type === 'IN' ? 'rgba(0,255,163,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {tx.type === 'IN' ? <IconPlus size={14} color="var(--success-green)" /> : <IconArrowLeft size={14} color="#fff" style={{ transform: 'rotate(-45deg)' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '900' }}>{tx.desc}</div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <small style={{ fontSize: '0.55rem', opacity: 0.3, textTransform: 'uppercase' }}>{tx.category}</small>
                          <small style={{ fontSize: '0.55rem', opacity: 0.3 }}>•</small>
                          <small style={{ fontSize: '0.55rem', opacity: 0.3 }}>{tx.method}</small>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '950', color: tx.type === 'IN' ? 'var(--success-green)' : '#fff' }}>{tx.type === 'IN' ? '+' : '-'} {formatPeso(tx.amount)}</div>
                      <small style={{ fontSize: '0.5rem', opacity: 0.2 }}>{new Date(tx.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {accountingTab === 'METRICAS' && (
          <div className="fade-in" style={{ paddingBottom: '20px' }}>

            {/* TERMINAL DE TRADING NEXXA (CANDLESTICK VIEW) */}
            <div style={{ background: '#020202', borderRadius: '20px', border: '1px solid rgba(0, 242, 255, 0.2)', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>

              {/* SELECTOR DE TEMPORALIDAD */}
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['H', 'D', 'W', 'M', 'Y'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTradingTimeframe(tf)}
                      style={{ background: tradingTimeframe === tf ? 'var(--primary-cyan)' : 'transparent', border: 'none', color: tradingTimeframe === tf ? '#000' : 'rgba(255,255,255,0.4)', fontSize: '0.55rem', fontWeight: '950', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <small style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: 'var(--success-green)', fontWeight: '950' }}>● LIVE_FEED</small>
              </div>

              {/* ÁREA DE VELAS REALISTAS CONEXAS (90PX) */}
              <div style={{ height: '90px', position: 'relative', background: '#020202', padding: '5px' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'relative', zIndex: 2, overflow: 'visible' }}>
                  {(() => {
                    const step = 100 / (realCandles.length - 1);
                    const getY = (val) => 90 - ((val - minVal) / range) * 80;

                    // Trazado de Bandas de Bollinger Reales
                    const topPath = realBands.map((b, i) => `${i * step},${getY(b.top)}`).join(' L ');
                    const midPath = realBands.map((b, i) => `${i * step},${getY(b.mid)}`).join(' L ');
                    const botPath = realBands.map((b, i) => `${i * step},${getY(b.bot)}`).join(' L ');

                    return (
                      <>
                        {/* Bandas Conectadas */}
                        <path d={`M ${topPath}`} fill="none" stroke="rgba(255, 165, 0, 0.2)" strokeWidth="0.5" strokeDasharray="1,1" />
                        <path d={`M ${midPath}`} fill="none" stroke="rgba(255, 165, 0, 0.4)" strokeWidth="0.5" />
                        <path d={`M ${botPath}`} fill="none" stroke="rgba(255, 165, 0, 0.2)" strokeWidth="0.5" strokeDasharray="1,1" />

                        {/* Velas Conectadas (Open[n] = Close[n-1]) */}
                        {realCandles.map((c, i) => {
                          const x = i * step;
                          const yOpen = getY(c.open);
                          const yClose = getY(c.close);
                          const yHigh = getY(c.high);
                          const yLow = getY(c.low);
                          const color = c.isUp ? '#00ffa3' : '#ff385c';

                          return (
                            <g key={i}>
                              {/* Mecha Real */}
                              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="0.2" />
                              {/* Cuerpo Real */}
                              <rect
                                x={x - 1.5}
                                y={Math.min(yOpen, yClose)}
                                width="3"
                                height={Math.max(Math.abs(yOpen - yClose), 1)}
                                fill={color}
                                style={{ filter: `drop-shadow(0 0 1px ${color}aa)` }}
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* TICKER DE VALORES */}
              <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <small style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>VOL: <span style={{ color: '#fff' }}>{formatPeso(currentIncome)}</span></small>
                  <small style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>P/L: <span style={{ color: 'var(--success-green)' }}>+{((currentBalance / (currentIncome || 1)) * 100).toFixed(1)}%</span></small>
                </div>
                <small style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>NEXXA_FIN_OS_v2.0</small>
              </div>
            </div>

            {/* AGENDA NEXXA OPERATIVA (ESPACIO RESTAURADO) */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '400px' }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <small style={{ fontWeight: '950', fontSize: '0.65rem', opacity: 0.6, letterSpacing: '1px' }}>AGENDA OPERATIVA</small>
                <small style={{ color: 'var(--primary-cyan)', fontWeight: '950', fontSize: '0.6rem', background: 'rgba(0,242,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>{months[selectedMonth].toUpperCase()}</small>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 15px' }} className="custom-scroll">
                {processedAgenda.sort((a, b) => parseInt(a.day) - parseInt(b.day)).map((p, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '12px 18px',
                    borderRadius: '18px',
                    background: p.status === 'PAGADO' ? 'rgba(0,255,163,0.02)' : 'rgba(255,255,255,0.03)',
                    marginBottom: '8px',
                    border: '1px solid',
                    borderColor: p.status === 'PAGADO' ? 'rgba(0,255,163,0.08)' : 'rgba(255,255,255,0.02)',
                    opacity: p.status === 'PAGADO' ? 0.5 : 1
                  }}>
                    <div style={{ minWidth: '35px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '950', color: p.color }}>{p.day}</div>
                      <small style={{ fontSize: '0.45rem', opacity: 0.3, display: 'block' }}>DÍA</small>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff', textDecoration: p.status === 'PAGADO' ? 'line-through' : 'none' }}>{p.title}</div>
                      <small style={{ fontSize: '0.55rem', color: p.color, fontWeight: '950' }}>{p.status}</small>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '950', fontSize: '0.9rem' }}>
                      {formatPeso(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE SELECTOR DE MES (ADN NEXXA) */}
        {showMonthSelector && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '35px', padding: '30px', width: '100%', maxWidth: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontWeight: '950' }}>Periodo</h3>
                <button onClick={() => setShowMonthSelector(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '12px' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {months.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(i); setShowMonthSelector(false); }}
                    style={{ padding: '12px 5px', borderRadius: '14px', border: '1.5px solid', borderColor: selectedMonth === i ? 'var(--primary-cyan)' : 'transparent', background: selectedMonth === i ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '0.65rem', fontWeight: '950' }}
                  >
                    {m.substring(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                {[2024, 2025, 2026].map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} style={{ flex: 1, padding: '12px', borderRadius: '15px', border: 'none', background: selectedYear === y ? 'var(--brand-gradient)' : 'rgba(255,255,255,0.05)', color: selectedYear === y ? '#000' : '#fff', fontWeight: '950' }}>{y}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EL PANEL FLOTANTE HA SIDO ELIMINADO PARA DESPEJAR LA NAVEGACIÓN */}
      </div>
    );
  };

  // --- VIEW: INVENTORY (CONTROL) ---
  const renderInventory = () => {
    return (
      <div className="fade-in container" style={{ paddingBottom: '30px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px', flexDirection: 'column', gap: '15px' }}>
          <button onClick={() => setView('dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--primary-cyan)', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer' }}>
            <IconArrowLeft size={18} /> VOLVER
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>Control <span style={{ opacity: 0.3 }}>Bodega</span></h2>
            <button
              className="primary-btn"
              onClick={() => setShowAddModal(true)}
              style={{ margin: 0, padding: '12px 24px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px' }}
            >
              + STOCK
            </button>
          </div>
        </header>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '15px 25px', marginBottom: '35px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <IconHistory size={18} style={{ opacity: 0.3 }} />
          <input
            placeholder="Buscar equipo o categoría..."
            style={{ margin: 0, background: 'transparent', border: 'none', padding: '10px 0', fontSize: '1rem', color: '#fff', outline: 'none', width: '100%' }}
          />
        </div>

        <div className="control-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {inventory.length === 0 ? (
            <div className="empty-state" style={{ opacity: 0.2 }}>No hay items en inventario.</div>
          ) : inventory.map(item => (
            <div key={item.id} className="control-item">
              <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBox size={24} style={{ opacity: 0.4 }} />
              </div>
              <div style={{ paddingLeft: '20px', flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{item.name}</h4>
                <small style={{ opacity: 0.3, fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.8px', marginTop: '4px', display: 'block' }}>{item.category}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: item.available < 3 ? 'var(--danger-red)' : 'var(--primary-cyan)', lineHeight: 1 }}>{item.available}</div>
                <small style={{ opacity: 0.3, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.5px' }}>DISP DE {item.total}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const deleteInventoryItem = (id) => {
    if (confirm('¿Eliminar?')) setInventory(inventory.filter(i => i.id !== id));
  };
  const [editingItem, setEditingItem] = useState(null);
  const handleEditInventory = (e) => {
    e.preventDefault();
    const { name, category, total, available } = e.target;
    setInventory(inventory.map(i => i.id === editingItem.id ? { ...i, name: name.value, category: category.value, total: Number(total.value), available: Number(available.value) } : i));
    setEditingItem(null);
  };


  // --- VIEWS ---

  const renderCreate = () => {
    try {
      // --- TARIFAS EXACTAS APP NEXXA (Used locally for logic) ---
      // (Note: PRICING moved to App scope for shared use)



      // --- PARSER DE WHATSAPP ---
      const handlePasteFromWhatsApp = async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (!text) return alert('Portapapeles vacío');

          const newData = { ...newEvent };

          // Regex Parser V4 (Super Robust Header Support)
          // Identifica el inicio de cualquier sección común
          // Regex Parser V5 (Stricter Newline Logic & Synonyms)
          // Identifica el inicio de cualquier sección común
          const sectionStartRegex = /(?:👤|📅|⏰|📍|👥|📦|➕|🎉|💰|📝|🚚|Cliente|Ofrece|Fecha|Horario|Ubicación|Dirección|Lugar|Invitados|Paquete|Extras|Adicionales|Ocasión|Valor|Total|Costo|Indicaciones|Recibir|Material|Nombre|Titular|Servicios|Incluye)/i;

          const getSection = (startPattern, text) => {
            // Updated V6: Allow content before the key on the same line (e.g. timestamps "[10:00] ", bullets "- ", etc)
            // Remove strict lookahead newline requirement for better single-line compatibility, but keep preference for distinct sections.
            const r = new RegExp(`(?:^|\\n|\\r)(?:[^:\\n]{0,50})[\\*\\s]*${startPattern.source}[\\*\\s]*(?::|\\s+)\\s*([\\s\\S]*?)(?=(?:\\n|\\s+)[*_]*${sectionStartRegex.source}|$)`, 'i');
            const m = text.match(r);
            return m ? m[1].trim() : null;
          };

          const rawClient = getSection(/(?:👤|Cliente|Nombre|Titular|Quien reserva)/, text);
          const rawDate = getSection(/(?:📅|Fecha|Día)/, text);
          const rawTime = getSection(/(?:⏰|Horario|Hora)/, text);
          const rawLoc = getSection(/(?:📍|Ubicación|Dirección|Lugar)/, text);
          const rawGuests = getSection(/(?:👥|Invitados|Personas)/, text);
          const rawPack = getSection(/(?:📦|Paquete|Servicio)/, text);
          const rawExtras = getSection(/(?:➕|Extras|Adicionales|Incluye|Servicios)/, text);
          const rawOccasion = getSection(/(?:🎉|Ocasión|Motivo)/, text);
          const rawExtraRate = getSection(/(?:💰|Valor Hora Extra|Total|Valor|Costo)/, text);
          const rawIndications = getSection(/(?:📝|Indicaciones|Notas|Observaciones)/, text);
          const rawMaterials = getSection(/(?:🚚|Recibir material)/, text);

          if (rawClient) newData.clientName = rawClient.split('\n')[0].trim();
          if (rawDate) newData.date = rawDate.split('\n')[0].trim();

          if (rawTime) {
            const tMatch = rawTime.match(/(\d{1,2}:\d{2})\s?(AM|PM).*?(\d{1,2}:\d{2})\s?(AM|PM)/i);
            if (tMatch) {
              const parseTime = (t, ap) => {
                let [h, m] = t.split(':').map(Number);
                if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              }
              newData.startTime = parseTime(tMatch[1], tMatch[2]);
              newData.endTime = parseTime(tMatch[3], tMatch[4]);
            }
          }

          if (rawLoc) newData.location = rawLoc.replace(/\n/g, ', ').trim();
          if (rawGuests) newData.guestCount = rawGuests.match(/\d+/)?.[0] || '10';

          if (rawPack) {
            const pName = rawPack.toLowerCase();
            if (pName.includes('essential')) newData.packName = 'Essential';
            else if (pName.includes('memories')) newData.packName = 'Memories';
            else if (pName.includes('celebration')) newData.packName = 'Celebration';
            else newData.packName = 'Personalizado';
          }

          if (rawOccasion) newData.occasion = rawOccasion.trim();
          if (rawExtraRate) newData.extraHourPrice = rawExtraRate.replace(/[$.]/g, '').trim();
          if (rawIndications) newData.indications = rawIndications.trim();

          if (rawMaterials) {
            const mMatch = rawMaterials.match(/(\d{1,2}:\d{2})\s?(AM|PM)/i);
            if (mMatch) {
              const parseTime = (t, ap) => {
                let [h, m] = t.split(':').map(Number);
                if (ap) {
                  if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                  if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
                }
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              }
              newData.materialsTime = parseTime(mMatch[1], mMatch[2]);
            }
          }

          // Parse Extras (Enhanced Keywords & Technical IDs)
          const newExtras = {};
          if (rawExtras) {
            const exText = rawExtras.toLowerCase();

            // Debugging Regex
            const hasMakeup = /makeup|maquillaje|neon|artista/i.test(exText);
            const hasEssential = /acc_essential|essential/i.test(exText) && exText.includes('accesorios');
            const hasMemories = /acc_memories|memories/i.test(exText) && exText.includes('accesorios');
            const hasCelebration = /acc_celebration|celebration|full/i.test(exText) && exText.includes('accesorios');

            // Direct Technical ID check (ignores 'accesorios' prefix requirement)
            const idEssential = exText.includes('acc_essential');
            const idMemories = exText.includes('acc_memories');
            const idCelebration = exText.includes('acc_celebration');

            if (hasMakeup) {
              newExtras['extra_makeup'] = true;
            }
            if (hasEssential || idEssential) {
              newExtras['acc_essential'] = true;
            }
            if (hasMemories || idMemories) {
              newExtras['acc_memories'] = true;
            }
            if (hasCelebration || idCelebration) {
              newExtras['acc_celebration'] = true;
            }
          }
          newData.selectedExtras = newExtras;

          if (!newData.clientName) alert(`⚠️ Advertencia: No se detectó el nombre del Cliente.\n\nContenido detectado (Inicio): "${text.substring(0, 50)}..."\n\nRevise que el mensaje tenga el formato "Cliente: [Nombre]"`);
          alert(`✅ Datos Importados:\nCliente: ${newData.clientName || 'No detectado'}\nPaquete: ${newData.packName || 'No detectado'}\nExtras Detectados: ${Object.keys(newExtras).length}\nTexto Extras: "${rawExtras || 'No encontrado'}"`);

          setNewEvent(newData);
          setTimeout(() => updateEvent('recalc', null), 100); // Trigger recalc

        } catch (err) {
          console.error(err);
          alert('No se pudo leer el portapapeles. Asegúrate de dar permiso.');
        }
      };

      // --- DATA DINÁMICA DE EXTRAS (Moved to App Scope as getDynamicExtras) ---
      // Kept here as reference or we just use the scoped one. 
      // Since we moved it to App scope, we don't need to redefine it, but we need to ensure renderCreate uses it.
      // We already moved it up, so we can delete this block.


      // Smart Updater
      // Smart Updater
      const updateEvent = (field, value) => {
        let updated = { ...newEvent };

        if (field === 'toggleExtra') {
          const currentExtras = { ...updated.selectedExtras };
          currentExtras[value] = !currentExtras[value];
          updated.selectedExtras = currentExtras;
        } else if (field === 'changeMakeupCount') {
          updated.makeupCount = value;
        } else if (field === 'guestCount') {
          updated.guestCount = value;
          updated.makeupCount = null;
        } else if (field === 'packName') {
          updated.packName = value;
        } else {
          updated[field] = value;
        }

        // 1. STRICT SYNC: PHOTO DURATION
        // Always recalculate if start/end times exist.
        if (updated.photoStartTime && updated.photoEndTime) {
          const autoDur = getHours(updated.photoStartTime, updated.photoEndTime);
          updated.photoDuration = parseFloat(autoDur.toFixed(1));
        }

        // Auto-Calc Logic
        const pack = updated.packName;
        const start = updated.startTime;
        const end = updated.endTime;
        const guests = Number(updated.guestCount) || 10;
        const selExtras = updated.selectedExtras || {};
        const pDuration = Number(updated.photoDuration) || 0;

        const currentExtrasList = getDynamicExtras(guests, updated.makeupCount);

        if (PRICING[pack] && start && end && pack !== 'Personalizado') {
          const conf = PRICING[pack];

          // Duration Calc
          const duration = getHours(start, end);
          const extraEventHours = Math.max(0, Math.ceil(duration - 4));

          // Pricing Components
          const basePrice = conf.base;
          const djExtraPrice = conf.extraDJ || 0;
          const photoExtraPrice = conf.extraPhoto || 0;

          let totalExtrasValue = 0;

          // 1. DJ / Event Extra Hours
          totalExtrasValue += extraEventHours * djExtraPrice;

          // 2. Photo Extra Hours
          const hasPhoto = (pack === 'Memories' || pack === 'Celebration');
          if (hasPhoto) {
            if (pDuration > 0) {
              const extraPhotoHours = Math.max(0, Math.ceil(pDuration - 4));
              totalExtrasValue += extraPhotoHours * photoExtraPrice;
            } else {
              totalExtrasValue += extraEventHours * photoExtraPrice;
            }
          }

          let calculatedTotal = basePrice + totalExtrasValue;

          // Sumar Extras Seleccionados
          currentExtrasList.forEach(ex => {
            if (selExtras[ex.id]) calculatedTotal += ex.price;
          });

          // Debug Alert Verify Fix (Remove later)
          if (pDuration > 8 && totalExtrasValue === 0 && !alertShown) {
            // Safe guard to check why logic might fail
            console.warn("Pricing logic mismatch", { pDuration, totalExtrasValue, photoExtraPrice });
          }

          updated.totalValue = calculatedTotal;

          // Update Extra Hour Price Display
          if (pDuration > 0 && hasPhoto) {
            updated.extraHourPrice = djExtraPrice;
          } else {
            updated.extraHourPrice = djExtraPrice + (hasPhoto ? photoExtraPrice : 0);
          }

        } else if (pack === 'Personalizado') {
          if (!updated.totalValue && !newEvent.id) {
            let sum = 0;
            currentExtrasList.forEach(ex => { if (selExtras[ex.id]) sum += ex.price; });
            updated.totalValue = sum;
          }
        }

        // Auto-calc Deposit (ALWAYS SYNC 30%)
        if (updated.totalValue > 0) {
          updated.deposit = updated.totalValue * 0.3;
        }

        setNewEvent(updated);
      };

      // Helper state for debugging limit (MOVED TO APP SCOPE)
      // const [alertShown, setAlertShown] = useState(false);

      // --- LOGIC: Constant Sync for Extra Hour Price ---
      // This ensures that even if loaded from a quote, the UI always shows the correct rate for the package.
      if (newEvent.packName && PRICING[newEvent.packName]) {
        const correctRate = (PRICING[newEvent.packName].extraDJ || 0) + (PRICING[newEvent.packName].extraPhoto || 0) || 85000;
        if (Number(newEvent.extraHourPrice) !== correctRate && !newEvent.id) {
          // Only auto-correct for NEW/DRAFT events, respect saved IDs if they have special pricing
          setNewEvent(prev => ({ ...prev, extraHourPrice: correctRate }));
        }
      }

      const currentConf = PRICING[newEvent.packName] || {};
      const duration = newEvent.startTime && newEvent.endTime ? getHours(newEvent.startTime, newEvent.endTime) : 0;
      const extrasKy = Math.max(0, Math.ceil(duration - 4));
      const isEventMode = newEvent.id?.startsWith('EVT');

      return (
        <div className="fade-in container">
          <div className="header-row" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setView(newEvent.id?.startsWith('EVT') ? 'events' : newEvent.id?.startsWith('QUO') ? 'quotations' : 'home')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '10px 15px',
                  color: 'var(--primary-cyan)',
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                <IconArrowLeft size={16} /> Volver
              </button>



              <button
                onClick={() => {
                  try {
                    if (!newEvent.clientPhone) return alert('Se requiere número de WhatsApp');

                    const hours = newEvent.startTime && newEvent.endTime ? getHours(newEvent.startTime, newEvent.endTime).toFixed(1) : '0';

                    // Calculate dynamic details for extras
                    const dynamicExtras = getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount);

                    // Construct Message (Premium Format + Details)
                    const extrasList = [];
                    const selExtras = newEvent.selectedExtras || {};

                    Object.keys(selExtras).forEach(k => {
                      if (selExtras[k]) {
                        // Find definition in dynamic list
                        const def = dynamicExtras.find(d => d.id === k);

                        if (def) {
                          extrasList.push(`- ${def.name}: ${def.details}`);
                        } else {
                          // Fallback for manually added or legacy keys
                          if (k === 'makeup' || k === 'extra_makeup') extrasList.push(`- Maquillaje Neón (x${newEvent.makeupCount || 1})`);
                          else extrasList.push(`- ${k}`);
                        }
                      }
                    });

                    const msg =
                      `🎧 *NEXXA SOUND - RESUMEN DE TU EVENTO* 🎧
                      
¡Hola *${newEvent.clientName.split(' ')[0]}*! 👋 Es un gusto saludarte. Aquí tienes el resumen actualizado de tu experiencia musical:

━━━━━━━━━━━━━━━━━━
👤 *CLIENTE:* ${newEvent.clientName}
📅 *FECHA:* ${newEvent.date}
⏰ *HORARIO:* ${newEvent.startTime} a ${newEvent.endTime} (${hours} horas)
📍 *LUGAR:* ${newEvent.location}
👥 *INVITADOS:* ${newEvent.guestCount} pax
🎉 *MOTIVO:* ${newEvent.occasion || 'Evento Social'}
━━━━━━━━━━━━━━━━━━

📦 *PAQUETE:* 【 ${newEvent.packName?.toUpperCase()} 】

💎 *SERVICIOS ADICIONALES:*
${extrasList.length > 0 ? extrasList.join('\n') : '✨ _Sin extras seleccionados_'}

💰 *VALOR TOTAL:* *${formatPeso(newEvent.totalValue)}*
🎟️ *RESERVA:* ${formatPeso(newEvent.deposit || (newEvent.totalValue * 0.3))}

━━━━━━━━━━━━━━━━━━
📝 *NOTAS:* ${newEvent.indications || 'Ninguna'}

🚀 *¿Confirmamos la reserva ahora mismo?* 
¡Quedo atento para asegurar tu fecha! 🎧🔥`;

                    let phone = newEvent.clientPhone.replace(/\D/g, '');
                    // Smart append 57 if missing (assuming colombian numbers are 10 digits approx)
                    if (!phone.startsWith('57') && phone.length <= 10) phone = '57' + phone;

                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                  } catch (err) {
                    alert('Error generando link de WhatsApp: ' + err.message);
                    console.error(err);
                  }
                }}
                className="action-btn"
                style={{ padding: '8px 14px', fontSize: '0.8rem', background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
              >
                <IconWhatsApp /> Enviar Resumen
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Descartar cambios y limpiar formulario?')) {
                    const emptyState = { id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '' };
                    setNewEvent(emptyState);
                    localStorage.removeItem('nexxa_draft_event');
                  }
                }}
                className="action-btn"
                style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconTrash /> Limpiar
              </button>
            </div>

            <div style={{ textAlign: 'right', flex: 1 }}>
              <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold' }}>{isEventMode ? 'EDITANDO EVENTO' : 'NUEVA COTIZACIÓN'}</span>
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="create-form">

            {/* SECCIÓN 1: HORARIOS DEL PERSONAL (ACCORDION) */}
            <div className="form-section">
              <div
                onClick={() => toggleSection('s1')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s1 ? '15px' : '0' }}
              >
                <h3>1. Paquete y Horarios</h3>
                <span style={{ fontSize: '1rem', color: '#00d4ff' }}>{sectionState.s1 ? '▼' : '▶'}</span>
              </div>
              {sectionState.s1 && (
                <>
                  {/* Row 0: Package & Manager */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <select style={{ flex: 1 }} value={newEvent.packName} onChange={e => updateEvent('packName', e.target.value)}>
                      <option value="Essential">Essential ($450k)</option>
                      <option value="Memories">Memories ($650k)</option>
                      <option value="Celebration">Celebration ($850k)</option>
                      <option value="Personalizado">Personalizado</option>
                    </select>
                    <input style={{ flex: 1 }} placeholder="Nombre Gestor" value={newEvent.managerName} onChange={e => updateEvent('managerName', e.target.value)} />
                  </div>

                  {/* Row 1: Date & Occasion */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px', display: 'block' }}>Fecha</label>
                      <input required type="date" value={newEvent.date} onChange={e => updateEvent('date', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px', display: 'block' }}>Ocasión</label>
                      <input placeholder="Ej: Cumpleaños" value={newEvent.occasion} onChange={e => updateEvent('occasion', e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Row 2: Guests & Price */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px', display: 'block' }}>Invitados</label>
                      <input type="tel" inputMode="numeric" placeholder="#" value={newEvent.guestCount || ''} onChange={e => updateEvent('guestCount', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px', display: 'block' }}>Valor Hora Extra ($)</label>
                      <input type="tel" inputMode="numeric" value={newEvent.extraHourPrice} onChange={e => updateEvent('extraHourPrice', e.target.value)} style={{ width: '100%', color: '#facc15', fontWeight: 'bold' }} />
                    </div>
                  </div>

                  {/* Event Time Inputs */}
                  {isEventMode ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                      <TimeInput label="Hora Inicio" value={newEvent.startTime} onChange={(val) => updateEvent('startTime', val)} />
                      <TimeInput label="Hora Fin" value={newEvent.endTime} onChange={(val) => updateEvent('endTime', val)} />
                      <TimeInput label="Bodega" value={newEvent.warehouseTime} onChange={(val) => updateEvent('warehouseTime', val)} />
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <TimeInput label="Hora Inicio" value={newEvent.startTime} onChange={(val) => updateEvent('startTime', val)} />
                      <TimeInput label="Hora Fin" value={newEvent.endTime} onChange={(val) => updateEvent('endTime', val)} />
                    </div>
                  )}

                  {duration > 0 && (
                    <div style={{ marginBottom: '10px', padding: '4px 8px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '14px', fontSize: '0.75rem', textAlign: 'center', color: '#00d4ff' }}>
                      ⏱ <strong>{duration.toFixed(1)}h</strong> (DJ/Sonido)
                      {extrasKy > 0 && <span style={{ color: '#facc15', marginLeft: '5px' }}> (+{extrasKy}h extra)</span>}
                    </div>
                  )}

                  {/* SECCIÓN 2.1: ASIGNACIÓN OPERATIVA (Visibilidad Global) */}
                  <div style={{ marginTop: '15px' }}>
                    {(newEvent.packName === 'Memories' || newEvent.packName === 'Celebration') && (
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>1.1 Asignación Operativa</h4>
                    )}
                    {/* SEPARATE SCHEDULING FOR PHOTOGRAPHY */}
                    {(newEvent.packName === 'Memories' || newEvent.packName === 'Celebration') && (
                      <div style={{ padding: '15px', background: 'rgba(255, 150, 0, 0.05)', borderRadius: '15px', border: '1px solid rgba(255, 150, 0, 0.2)', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#facc15' }}>
                          <IconCalendar size={14} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Fotografía (OBLIGATORIO)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <TimeInput label="Inicio Foto" value={newEvent.photoStartTime} onChange={(val) => updateEvent('photoStartTime', val)} />
                          <TimeInput label="Fin Foto" value={newEvent.photoEndTime} onChange={(val) => updateEvent('photoEndTime', val)} />
                        </div>
                        {newEvent.photoDuration > 0 && (
                          <div style={{ marginTop: '10px', padding: '5px 10px', background: 'rgba(255, 200, 0, 0.1)', borderRadius: '10px', fontSize: '0.75rem', textAlign: 'center', color: '#facc15' }}>
                            📸 <strong>{newEvent.photoDuration}h</strong> Fotografía
                          </div>
                        )}
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.65rem', opacity: 0.6, color: '#fff' }}>
                          * El fotógrafo suele ir por una franja de horas distinta a la del DJ.
                        </p>
                      </div>
                    )}
                    {/* SEPARATE SCHEDULING FOR DECORATION */}
                    {(newEvent.packName === 'Celebration') && (
                      <div style={{ padding: '15px', background: 'rgba(188, 111, 241, 0.05)', borderRadius: '15px', border: '1px solid rgba(188, 111, 241, 0.2)', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary-purple)' }}>
                          <IconFlow size={14} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Decoración (OBLIGATORIO)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <TimeInput label="Inicio Decor" value={newEvent.decorStartTime} onChange={(val) => updateEvent('decorStartTime', val)} />
                          <TimeInput label="Fin Decor" value={newEvent.decorEndTime} onChange={(val) => updateEvent('decorEndTime', val)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Location */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                    <input required placeholder="Barrio" value={newEvent.neighborhood || ''} onChange={e => updateEvent('neighborhood', e.target.value)} />
                    <input required placeholder="Dirección Exacta" value={newEvent.location} onChange={e => updateEvent('location', e.target.value)} />
                  </div>
                </>
              )}
            </div>

            {/* SECCIÓN 2: EXTRAS (ACCORDION) */}
            <div className="form-section">
              <div
                onClick={() => toggleSection('s2')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s2 ? '15px' : '0' }}
              >
                <h3>2. Extras</h3>
                <span style={{ fontSize: '1rem', color: '#00d4ff' }}>{sectionState.s2 ? '▼' : '▶'}</span>
              </div>

              {sectionState.s2 && (
                <>
                  {/* EXTRAS LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '4px' }}>Adicionales Disponibles:</label>
                    {getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount).map(extra => {
                      const isActive = !!(newEvent.selectedExtras && newEvent.selectedExtras[extra.id]);
                      return (
                        <div
                          key={extra.id}
                          onClick={() => updateEvent('toggleExtra', extra.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px',
                            background: isActive ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: '1px solid', borderColor: isActive ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '8px', cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#fff' : '#ccc' }}>{extra.name}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{extra.details}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? 'var(--primary-cyan)' : '#666' }}>
                              + ${extra.price.toLocaleString()}
                            </span>
                            {extra.isMakeup && isActive && (
                              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '2px 5px' }}>
                                <small onClick={() => updateEvent('changeMakeupCount', Math.max(1, (extra.qty || 1) - 1))} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>-</small>
                                <span style={{ fontSize: '0.8rem' }}>{extra.qty}</span>
                                <small onClick={() => updateEvent('changeMakeupCount', (extra.qty || 1) + 1)} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>+</small>
                              </div>
                            )}
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: isActive ? 'var(--primary-cyan)' : '#444', background: isActive ? 'var(--primary-cyan)' : 'transparent' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>



            {/* SECCIÓN 3: CLIENTE (ACCORDION - COLLAPSED DEFAULT) */}
            <div className="form-section">
              <div
                onClick={() => toggleSection('s3')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s3 ? '15px' : '0' }}
              >
                <h3>3. Datos del Cliente</h3>
                <span style={{ fontSize: '1.2rem', color: '#00d4ff' }}>{sectionState.s3 ? '▼' : '▶'}</span>
              </div>

              {sectionState.s3 && (
                <>
                  <input required placeholder="Nombre Cliente" value={newEvent.clientName} onChange={e => updateEvent('clientName', e.target.value)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                    <input placeholder="WhatsApp P." value={newEvent.clientPhone} onChange={e => updateEvent('clientPhone', e.target.value)} type="tel" />
                    <input placeholder="WhatsApp S." value={newEvent.clientPhone2} onChange={e => updateEvent('clientPhone2', e.target.value)} type="tel" />
                  </div>
                </>
              )}
            </div>

            {/* SECCIÓN 4: DETALLES DE MISION (SOLO MODO EVENTO) */}
            {
              isEventMode && (
                <div className="form-section">
                  <h3>4. Detalles de la Misión</h3>
                  <label style={{ fontSize: '0.75rem', color: '#666' }}>Indicaciones Especiales (Venue/Acceso)</label>
                  <textarea
                    placeholder="Ej: Ingreso por sótano, llevar mantel blanco, etc."
                    value={newEvent.indications}
                    onChange={e => updateEvent('indications', e.target.value)}
                    style={{ width: '100%', minHeight: '60px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', padding: '10px', fontSize: '0.9rem', marginBottom: '10px' }}
                  />
                  <label style={{ fontSize: '0.75rem', color: '#666' }}>Explicación del Material (Inventario/Uso)</label>
                  <textarea
                    placeholder="Notas sobre el material asignado o uso específico..."
                    value={newEvent.materialExplanation}
                    onChange={e => updateEvent('materialExplanation', e.target.value)}
                    style={{ width: '100%', minHeight: '60px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', padding: '10px', fontSize: '0.9rem' }}
                  />
                </div>
              )
            }

            {/* SECCIÓN 5: COTIZACIÓN FINAL */}



            {/* SECCIÓN 5: COTIZACIÓN (TOTAL) */}
            <div className="form-section" style={{ borderColor: '#00d4ff', borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 style={{ color: '#00d4ff' }}>5. Cotización Final</h3>

              <div className="money-row">
                <div style={{ flex: 1, fontSize: '0.8rem', color: '#ccc', background: '#222', padding: '10px', borderRadius: '8px', marginRight: '10px' }}>
                  {newEvent.packName !== 'Personalizado' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {/* BASE */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>Paquete Base (4h):</span>
                        <strong>${(currentConf.base || 0).toLocaleString()}</strong>
                      </div>

                      {/* HORAS EXTRAS */}
                      {extrasKy > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', alignItems: 'center' }}>
                          <span>+ {extrasKy} Horas Extras (${(Number(newEvent.extraHourPrice) || 0).toLocaleString()} c/u):</span>
                          <strong>${(extrasKy * (Number(newEvent.extraHourPrice) || 0)).toLocaleString()}</strong>
                        </div>
                      )}
                      {/* ADICIONALES SELECCIONADOS */}
                      {(() => {
                        const activeExtras = getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount).filter(
                          ex => newEvent.selectedExtras?.[ex.id]
                        );
                        if (activeExtras.length === 0) return null;
                        return activeExtras.map(ex => (
                          <div key={ex.id} style={{ marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bc6ff1' }}>
                              <span>+ {ex.name}:</span>
                              <strong>${ex.price.toLocaleString()}</strong>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#999', paddingLeft: '10px', fontStyle: 'italic' }}>
                              {ex.details}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : <div>Tarifa Manual</div>}
                </div>

                <div style={{ flex: 1 }}>
                  <small style={{ color: '#888', marginBottom: '2px' }}>Valor Total (Calculado):</small>
                  <input
                    required
                    placeholder="$ 0"
                    type="text"
                    value={newEvent.totalValue ? Number(newEvent.totalValue).toLocaleString('es-CO') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                      if (!isNaN(raw)) {
                        updateEvent('totalValue', raw);
                      }
                    }}
                    style={{ fontWeight: 'bold', color: '#00d4ff', fontSize: '1.4rem', height: '50px' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'flex-end', overflow: 'visible' }}>
                <div style={{ width: '40% !important', position: 'relative', minWidth: '120px' }}>

                  <div style={{ position: 'relative', width: '100%' }}>

                    <input
                      key="input_money_icon_force"
                      required
                      placeholder="0"
                      type="tel"
                      inputMode="numeric"
                      value={newEvent.deposit}
                      onChange={e => updateEvent('deposit', e.target.value)}
                      style={{
                        paddingLeft: '12px !important',
                        paddingRight: '10px !important',
                        width: '100% !important',
                        fontSize: '1.1rem',
                        fontWeight: '900',
                        color: 'var(--primary-cyan)',
                        height: '42px',
                        margin: 0,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Canal</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                    {[
                      { id: 'Nequi', color: '#ff007a' },
                      { id: 'Davi', color: '#ff4d4d' },
                      { id: 'Efect', color: '#4dff88' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateEvent('paymentMethod', m.id.replace('Davi', 'Daviplata').replace('Efect', 'Efectivo'))}
                        style={{
                          padding: '12px 2px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.1)',
                          background: newEvent.paymentMethod?.includes(m.id) ? `${m.color}22` : 'rgba(255,255,255,0.03)',
                          color: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.3)',
                          fontSize: '0.6rem',
                          fontWeight: '800',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {m.id.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="action-buttons-row" style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button type="button" className="action-btn secondary-btn" style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handleCreateQuotation('SENT')}>
                <IconServices /> Cotizar
              </button>
              <button type="button" className="action-btn primary-btn" style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handleCreateEvent(null, 'CONFIRMED')}>
                <IconCheck /> {newEvent.id ? 'Actualizar' : 'Confirmar'}
              </button>
            </div >
          </form >
        </div >
      )
    } catch (error) {
      console.error("Critical error in renderCreate:", error);
      return (
        <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--primary-cyan)', marginBottom: '16px' }}>⚠️ Error de Visualización</h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Hubo un problema al procesar los datos de esta cotización/evento.</p>
            <pre style={{
              background: 'rgba(12, 12, 12, 0.5)',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '0.7rem',
              color: '#ff6b6b',
              marginTop: '15px',
              whiteSpace: 'pre-wrap',
              textAlign: 'left'
            }}>
              {error.stack || error.message}
            </pre>
            <button
              onClick={() => {
                setNewEvent({ id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 30000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '' });
                setView('quotations');
              }}
              style={{
                marginTop: '25px',
                padding: '12px 24px',
                background: 'var(--primary-cyan)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                fontWeight: '800',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Regresar a Cotizaciones
            </button>
          </div>
        </div>
      );
    }
  };



  const addStaffMember = async (evtId, name, role) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;
    const newStaff = [...(evt.staff || []), { name, role, id: Date.now() }];
    await updateDoc(doc(db, "events", evtId), { staff: newStaff });
  };

  const updateExtraHours = async (evtId, hours) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;
    const newHours = Math.max(0, hours);
    await updateDoc(doc(db, "events", evtId), { "financials.reportedExtraHours": newHours });
  };

  const toggleItemStatus = async (evt, itemIndex) => {
    const newItems = [...(evt.logistics?.items || [])];
    const item = newItems[itemIndex];
    if (!item) return;

    // Cycle: PENDING -> DELIVERED -> RETURNED -> PENDING
    // Visual logic: PENDING (Gris) -> DELIVERED (Entregado/Naranja) -> RETURNED (Devuelto/Verde)
    let nextStatus = 'PENDING';
    if (!item.status || item.status === 'PENDING') nextStatus = 'DELIVERED';
    else if (item.status === 'DELIVERED') nextStatus = 'RETURNED';
    else nextStatus = 'PENDING'; // Allow reset in case of error

    newItems[itemIndex] = {
      ...item,
      status: nextStatus,
      deliveredTime: nextStatus === 'DELIVERED' ? new Date().toISOString() : item.deliveredTime,
      returnedTime: nextStatus === 'RETURNED' ? new Date().toISOString() : item.returnedTime
    };

    try {
      await updateDoc(doc(db, "events", evt.id), {
        "logistics.items": newItems
      });
    } catch (err) {
      console.error("Error updating item status:", err);
      alert("Error al actualizar estado del ítem");
    }
  };

  /* --- VIRTUAL INVENTORY LOGIC (MOVED UP FOR SCOPE ACCESS) --- */
  const getVirtualItems = (role, packName) => {
    // Definición estricta de ítems por rol (según solicitud)
    const dj = [
      { name: 'CABINAS ACTIVAS 15 Pulgadas + TRÍPODES', qty: packName === 'Celebration' ? 4 : 2 },
      { name: 'PC PORTÁTIL + CARGADOR + CABLE AUDIO 2 a 1', qty: 1 },
      { name: 'LUCES LED x4 + SOPORTE TRÍPODE', qty: 1 },
      { name: 'MÁQUINA HUMO + CONTROL + LÍQUIDO', qty: 1 },
      { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1 },
      { name: 'MAQUILLAJE NEON (PINTURAS, PINCEL, MAQUILLADOR, 2H)', qty: 1 }
    ];
    const photo = [
      { name: 'CÁMARA', qty: 1 },
      { name: 'MICRO SD', qty: 1 }
    ];
    const decor = [
      { name: 'BOMBAS', qty: 50 },
      { name: 'INFLADOR', qty: 1 }
    ];

    if (role === 'DJ') return dj;
    if (role === 'PHOTO') return photo;
    if (role === 'DECOR') return decor;
    return [];
  };

  const closeEvent = async (evt) => {
    // Validation: Check that ALL virtual items for the pack are marked as RETURNED
    // We check against the strict definition for the pack, not just what's in DB
    const packName = evt.logistics?.packName;
    const allExpectedItems = [
      ...getVirtualItems('DJ', packName),
      ...getVirtualItems('PHOTO', packName),
      ...getVirtualItems('DECOR', packName)
    ];

    const dbItems = evt.logistics?.items || [];

    const unreturned = dbItems.filter(i => i.status !== 'RETURNED');

    // Also check if there are items in the expected list that haven't been touched (missing in DB is effectively PENDING)
    const missingItems = allExpectedItems.filter(exp => !dbItems.find(dbI => dbI.name === exp.name));

    if (unreturned.length > 0 || missingItems.length > 0) {
      alert(`⚠️ NO SE PUEDE CERRAR EL EVENTO\n\nTodos los materiales deben estar en estado 'RECIBIDO'.\n\nPendientes de retorno:\n${unreturned.map(i => `- ${i.name}`).join('\n')}\n${missingItems.map(i => `- ${i.name} (No registrado)`).join('\n')}`);
      return;
    }

    if (!confirm('¿Confirmar cierre operativo y financiero del evento?')) return;

    try {
      await updateDoc(doc(db, "events", evt.id), { status: 'CLOSED' });
      alert('✅ Evento CERRADO exitosamente.');
      setView('events');
    } catch (err) {
      console.error(err);
      alert('Error al cerrar evento');
    }
  };



  const updateVirtualItemStatus = async (evt, itemName, role, newStatus) => {
    const currentItems = [...(evt.logistics?.items || [])];
    const existingIndex = currentItems.findIndex(i => i.name === itemName);

    if (existingIndex >= 0) {
      // Update existing
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        status: newStatus
      };
    } else {
      // Initialize new item
      currentItems.push({
        name: itemName,
        area: role,
        qty: 1,
        status: newStatus
      });
    }

    try {
      await updateDoc(doc(db, "events", evt.id), { "logistics.items": currentItems });
    } catch (err) { console.error(err); }
  };

  const renderDetail = () => {
    try {
      const evt = getSelectedEvent();
      if (!evt) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Evento no encontrado</div>;

      const duration = (() => {
        if (!evt.eventDetails?.startTime || !evt.eventDetails?.endTime) return 0;
        const [h1, m1] = evt.eventDetails.startTime.split(':').map(Number);
        const [h2, m2] = evt.eventDetails.endTime.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        return diff / 60;
      })();

      const formatT = (t) => {
        if (!t || !t.includes(':')) return '--:--';
        let [h, m] = t.split(':').map(Number);
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ap}`;
      };

      const payrollValue = 35000 + (duration * 13000) + ((evt.financials?.reportedExtraHours || 0) * 15000);

      // FORCE VISUAL RESET: Use Virtual List, ignore DB list for structure
      // Default to DJ if 'ALL' or invalid
      const effectiveRole = (selectedRoleView === 'ALL' || !selectedRoleView) ? 'DJ' : selectedRoleView;
      const virtualList = getVirtualItems(effectiveRole, evt.logistics?.packName);

      return (
        <div className="fade-in container detail-view" style={{ paddingBottom: '140px', background: '#050505', color: '#fff', fontSize: '13px' }}>
          {/* HEADER OPERATIVO */}
          <header style={{ padding: '20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setView('events')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
              <IconArrowLeft /> VOLVER
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary-cyan)' }}>Hoja de Misión Operativa v3.0</h2>
            </div>
            <button onClick={() => editEvent(evt)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '12px', color: '#fff' }}>
              <IconEdit />
            </button>
          </header>

          {/* 1. PERSONAL ASIGNADO Y RECAUDO (PRIORIDAD) */}
          <section style={{ padding: '0 15px 25px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', margin: 0, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>PERSONAL OPERATIVO</h4>
              {(() => {
                const { responsibleRole } = getCollectionResponsibility(evt);
                const totalVal = evt.financials?.totalValue || 0;
                const balanceToCollect = totalVal * 0.7; // Business Rule: Staff collects 70%

                if (!responsibleRole || responsibleRole === 'N/A' || balanceToCollect <= 0) return null;
                const assignedPerson = (evt.staff || []).find(s => s.role === responsibleRole);
                const displayName = assignedPerson ? assignedPerson.name.split(' ')[0] : (responsibleRole === 'DJ / OPERADOR' ? 'DJ' : responsibleRole);
                return (
                  <span style={{ color: '#ff3860', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                    ⚠️ {displayName.toUpperCase()} COBRA {formatPeso(balanceToCollect)}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              {[
                { label: 'DJ / OP', role: 'DJ / OPERADOR', icon: <IconStaff size={12} /> },
                { label: 'FOTO', role: 'FOTÓGRAFO', icon: <IconCamera size={12} /> },
                { label: 'DECOR', role: 'DECORADOR', icon: <IconPlus size={12} /> }
              ].map(st => {
                const assigned = (evt.staff || []).find(s => s.role === st.role);
                return (
                  <div key={st.role} style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    border: assigned ? '1px solid var(--primary-cyan)' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <span style={{ fontSize: '0.45rem', fontWeight: '900', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: '0.5px' }}>
                      {st.icon} {st.label}
                    </span>
                    <input
                      type="text"
                      placeholder="Asignar..."
                      defaultValue={assigned?.name || ''}
                      onBlur={async (e) => {
                        const name = e.target.value;
                        if (!name && !assigned) return;
                        let newStaff = [...(evt.staff || [])];
                        if (assigned) {
                          if (name) newStaff = newStaff.map(s => s.role === st.role ? { ...s, name } : s);
                          else newStaff = newStaff.filter(s => s.role !== st.role);
                        } else {
                          newStaff.push({ name, role: st.role, id: Date.now() });
                        }
                        await updateDoc(doc(db, "events", evt.id), { staff: newStaff });
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.65rem', fontWeight: '800', outline: 'none', width: '100%' }}
                    />
                  </div>
                );
              })}
            </div>

            {/* BOTONES DE PDF CON INDICADOR DE ENTREGA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => generateMissionPDF(evt, 'DJ')}
                style={{
                  padding: '12px', borderRadius: '12px',
                  background: evt.logistics?.flow?.misionSent?.DJ ? 'rgba(34, 197, 94, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                  border: `1px solid ${evt.logistics?.flow?.misionSent?.DJ ? '#22c55e' : 'rgba(250, 204, 21, 0.2)'}`,
                  color: evt.logistics?.flow?.misionSent?.DJ ? '#22c55e' : '#facc15',
                  fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                {evt.logistics?.flow?.misionSent?.DJ ? <IconCheck size={12} /> : <IconPDF size={12} />} PDF DJ
              </button>

              <button
                onClick={() => generateMissionPDF(evt, 'PHOTO')}
                style={{
                  padding: '12px', borderRadius: '12px',
                  background: evt.logistics?.flow?.misionSent?.PHOTO ? 'rgba(34, 197, 94, 0.1)' : 'rgba(188, 111, 241, 0.1)',
                  border: `1px solid ${evt.logistics?.flow?.misionSent?.PHOTO ? '#22c55e' : 'rgba(188, 111, 241, 0.2)'}`,
                  color: evt.logistics?.flow?.misionSent?.PHOTO ? '#22c55e' : '#bc6ff1',
                  fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                {evt.logistics?.flow?.misionSent?.PHOTO ? <IconCheck size={12} /> : <IconPDF size={12} />} PDF FOTO
              </button>

              <button
                onClick={() => generateMissionPDF(evt, 'DECOR')}
                style={{
                  padding: '12px', borderRadius: '12px',
                  background: evt.logistics?.flow?.misionSent?.DECOR ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 242, 255, 0.1)',
                  border: `1px solid ${evt.logistics?.flow?.misionSent?.DECOR ? '#22c55e' : 'rgba(0, 242, 255, 0.2)'}`,
                  color: evt.logistics?.flow?.misionSent?.DECOR ? '#22c55e' : 'var(--primary-cyan)',
                  fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                {evt.logistics?.flow?.misionSent?.DECOR ? <IconCheck size={12} /> : <IconPDF size={12} />} PDF DECOR
              </button>
            </div>

            <button
              onClick={() => generateQuotationPDF(evt)}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.65rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px'
              }}
            >
              <IconFileText size={14} /> VER COTIZACIÓN ORIGINAL (CONTRATO)
            </button>
          </section>

          {/* 2. INFO DEL EVENTO (HORARIO, FECHA, LUGAR) */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', margin: 0, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                {evt.client?.name?.toUpperCase()} • <span style={{ color: 'var(--primary-purple)' }}>{evt.eventDetails?.occasion?.toUpperCase()}</span>
              </h4>
              <span style={{ color: 'var(--primary-cyan)', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                WP-{evt.id?.split('-').slice(1).join('-') || '000000-00'}
              </span>
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '25px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--brand-gradient)' }}></div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '3px' }}>FECHA</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff' }}>{evt.eventDetails?.date}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '3px' }}>HORARIO</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff', whiteSpace: 'nowrap' }}>
                    {formatT(evt.eventDetails?.startTime)} - {formatT(evt.eventDetails?.endTime)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '3px' }}>BODEGA (-2.5H)</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>
                    {(() => {
                      if (!evt.eventDetails?.startTime) return '00:00';
                      try {
                        let [h, m] = evt.eventDetails.startTime.split(':').map(Number);
                        let totalMinutes = h * 60 + m - 150; // 2h 30m = 150 min
                        if (totalMinutes < 0) totalMinutes += 1440; // Wrap around midnight
                        const rh = Math.floor(totalMinutes / 60);
                        const rm = totalMinutes % 60;
                        return formatT(`${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`);
                      } catch (e) { return '00:00'; }
                    })()}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '3px' }}>DURACIÓN</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff' }}>{duration.toFixed(1)}H</span>
                </div>
              </div>

              {/* BOTON PARA VER CRONOGRAMA POR ROLES */}
              {(evt.eventDetails?.photoStartTime || evt.eventDetails?.decorStartTime) && (
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={(e) => {
                      const section = e.currentTarget.nextElementSibling;
                      section.style.display = section.style.display === 'none' ? 'block' : 'none';
                    }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '14px',
                      background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.2)',
                      color: 'var(--primary-cyan)', fontSize: '0.7rem', fontWeight: '900',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <IconCalendar size={14} /> VER CRONOGRAMA POR ROLES
                  </button>
                  <div style={{ display: 'none', marginTop: '12px', padding: '15px', background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.15)', borderRadius: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {evt.eventDetails?.photoStartTime && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#facc15' }}>📸 FOTOGRAFÍA</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>{formatT(evt.eventDetails.photoStartTime)} - {formatT(evt.eventDetails.photoEndTime)}</span>
                        </div>
                      )}
                      {evt.eventDetails?.decorStartTime && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-purple)' }}>✨ DECORACIÓN</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>{formatT(evt.eventDetails.decorStartTime)} - {formatT(evt.eventDetails.decorEndTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* FINANZAS COMPACTAS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <div>
                  <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>VALOR TOTAL</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff' }}>{formatPeso(evt.financials?.totalValue || 0)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>SEPARACIÓN (30%)</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary-purple)' }}>{formatPeso((evt.financials?.totalValue || 0) * 0.3)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>SALDO (70%)</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '950', color: '#ff3860' }}>{formatPeso((evt.financials?.totalValue || 0) * 0.7)}</span>
                </div>
              </div>

              {/* SERVICIOS Y NOTAS COMPACTOS */}
              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '4px', letterSpacing: '1px' }}>SERVICIOS EXTRAS</span>
                  {(() => {
                    const dynamicExtras = getDynamicExtras(Number(evt.eventDetails?.guestCount) || 10, evt.makeupCount);
                    const selExtras = evt.logistics?.selectedExtras || {};
                    const active = Object.keys(selExtras).filter(k => selExtras[k]);
                    if (active.length === 0) return <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: '700' }}>Ninguno</span>;
                    return (
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#ccc', letterSpacing: '0.3px' }}>
                        {active.map(k => dynamicExtras.find(d => d.id === k)?.name || k).join(' • ').toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '4px', letterSpacing: '1px' }}>OBSERVACIONES</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#999', lineHeight: '1.2' }}>
                    {evt.eventDetails?.indications || 'Sin notas'}
                  </span>
                </div>
              </div>

              {/* LOCALIZACIÓN COMPACTA */}
              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <IconLocation size={14} color="var(--primary-cyan)" style={{ marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fff', display: 'block' }}>{evt.eventDetails?.location?.toUpperCase()}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: '750', opacity: 0.4, display: 'block' }}>{evt.eventDetails?.neighborhood?.toUpperCase()}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evt.eventDetails?.location || ''} ${evt.eventDetails?.neighborhood || ''}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--primary-cyan)', textDecoration: 'none', fontSize: '0.6rem', fontWeight: '950', display: 'inline-block', marginTop: '5px', letterSpacing: '0.5px' }}
                    >BRÚJULA NEXXA (GOOGLE MAPS) →</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. MATERIAL ASIGNADO (CONTROL DE INVENTARIO) */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', marginBottom: '15px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>CONTROL DE INVENTARIO</h4>

            {/* Segmented Control (NO 'ALL') */}
            <div style={{ display: 'flex', background: '#0a0a0a', borderRadius: '12px', padding: '4px', marginBottom: '15px', border: '1px solid #222' }}>
              {['DJ', 'PHOTO', 'DECOR'].map(role => {
                const isActive = (selectedRoleView === role) || (selectedRoleView === 'ALL' && role === 'DJ'); // Default to DJ if 'ALL' was selected
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleView(role)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                      background: isActive ? 'var(--primary-cyan)' : 'transparent',
                      color: isActive ? '#000' : '#666',
                      fontSize: '0.65rem', fontWeight: '950', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>

            <div style={{ border: '1px solid #1a1a1a', borderRadius: '15px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'left', width: '50%' }}>ITEM / EQUIPO</th>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'center', borderLeft: '1px solid #222' }}>CANT</th>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'center', borderLeft: '1px solid #222' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {virtualList.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>Seleccione una pestaña</td></tr>
                  ) : virtualList.map((vItem, idx) => {
                    const dbItem = (evt.logistics?.items || []).find(i => i.name === vItem.name);
                    const status = dbItem?.status || 'PENDING';
                    const getStatusColor = (s) => {
                      if (s === 'PENDING') return '#ef4444'; // Red
                      if (s === 'DELIVERED') return '#3b82f6'; // Blue
                      if (s === 'RETURNED') return '#22c55e'; // Green
                      return '#666';
                    };
                    const currentColor = getStatusColor(status);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #111', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          {vItem.name.toUpperCase()}
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '0.75rem', textAlign: 'center', opacity: 0.8, borderLeft: '1px solid #111', fontWeight: '900' }}>{vItem.qty}</td>
                        <td style={{ padding: '8px', textAlign: 'center', borderLeft: '1px solid #111' }}>
                          <select
                            value={status}
                            onChange={(e) => updateVirtualItemStatus(evt, vItem.name, effectiveRole, e.target.value)}
                            style={{
                              background: `${currentColor}22`, color: currentColor, border: `1px solid ${currentColor}44`,
                              borderRadius: '8px', padding: '8px 5px', fontSize: '0.6rem', fontWeight: '950',
                              outline: 'none', cursor: 'pointer', width: '100%', textAlign: 'center', textTransform: 'uppercase'
                            }}
                          >
                            <option value="PENDING" style={{ background: '#111', color: '#ef4444' }}>PENDIENTE</option>
                            <option value="DELIVERED" style={{ background: '#111', color: '#3b82f6' }}>ENTREGADO</option>
                            <option value="RETURNED" style={{ background: '#111', color: '#22c55e' }}>RECIBIDO</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. INDICATIONS */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', marginBottom: '8px' }}>INDICACIONES Y OBSERVACIONES</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.5' }}>
              {evt.eventDetails?.indications || "Sin observaciones adicionales."}
            </p>
          </section>

          {/* 6. FOOTER CARDS (2 COLUMNS) */}
          <section style={{ padding: '0 15px 40px 15px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
            {/* PAYROLL CARD */}
            <div style={{ border: '2px solid var(--primary-cyan)', borderRadius: '15px', padding: '20px', background: 'rgba(0, 242, 255, 0.03)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-cyan)', display: 'block', marginBottom: '15px' }}>COSTEO DE SERVICIO (NÓMINA)</span>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontSize: '1rem', fontWeight: '950', display: 'block' }}>BASE + VARIABLE: {formatPeso(payrollValue)}</span>
                <span style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '5px', display: 'block' }}>Cálculo por duración operativa.</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(0, 242, 255, 0.1)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, display: 'block', marginBottom: '5px' }}>STAFF ASIGNADO:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {(evt.staff || []).map((s, i) => (
                    <span key={i} style={{ fontSize: '0.65rem', fontWeight: '800', background: 'rgba(0, 242, 255, 0.1)', padding: '3px 8px', borderRadius: '5px' }}>{s.name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* COLLECTION CARD */}
            <div style={{ border: '1.5px solid var(--primary-purple)', borderRadius: '15px', padding: '20px', background: 'rgba(157, 78, 221, 0.03)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-purple)', display: 'block', marginBottom: '15px' }}>OBJETIVO DE RECAUDO CLIENTE</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '950', display: 'block', marginBottom: '12px', letterSpacing: '-1px' }}>{formatPeso(evt.financials?.balance || 0)}</span>
              <div style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.6 }}>
                <div style={{ marginBottom: '4px' }}>NEQUI / DAVIPLATA: 300 259 6935</div>
                <div>BANCOLOMBIA: 912 046312 30</div>
              </div>
            </div>
          </section>

          {/* ACTION BUTTONS */}
          <div style={{ padding: '10px 15px 40px 15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => toggleFlowStep(evt.id, 'clientPaid')} style={{ padding: '18px', borderRadius: '15px', background: evt.logistics?.flow?.clientPaid ? '#22c55e' : 'var(--primary-purple)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: '950', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', width: '100%' }}>
              {evt.logistics?.flow?.clientPaid ? 'COBRO CONFIRMADO' : 'CONFIRMAR RECAUDO'}
            </button>

            <button onClick={() => closeEvent(evt)} style={{ padding: '18px', borderRadius: '15px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid rgba(255, 56, 96, 0.3)', color: '#ff3860', fontSize: '0.8rem', fontWeight: '950', width: '100%', display: evt.status === 'CLOSED' ? 'none' : 'block' }}>
              FINALIZAR EVENTO
            </button>
          </div>
        </div>
      );
    } catch (err) {
      console.error("Error in renderDetail:", err);
      return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Error fatal: {err.message}</div>;
    }
  };



  // --- VIEW: DASHBOARD (VISIÓN) ---
  // --- VIEW: DASHBOARD (VISIÓN 20s) ---
  const renderDashboard = () => {
    try {
      // Usamos el mes y año seleccionados globalmente para que sea consistente
      const currentMonth = selectedMonth;
      const currentYear = selectedYear;

      // 1. Ingresos Confirmados Mes (Tx IN + Abonos Eventos)
      const monthTxIn = globalTx
        .filter(t => {
          const d = new Date(t.createdAt);
          return t.type === 'IN' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

      const monthEventsDeposit = events
        .filter(e => {
          const d = new Date(e.eventDetails?.date);
          return e.status === 'CONFIRMED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, e) => acc + (Number(e.financials?.deposit) || 0), 0);

      const totalIncome = monthTxIn + monthEventsDeposit;

      // 2. Gastos Mes
      const monthExpenses = globalTx
        .filter(t => {
          const d = new Date(t.createdAt);
          return t.type === 'OUT' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

      // 3. Conteos
      const openQuotes = quotations.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length;
      const confirmedEventsCount = events.filter(e => {
        const d = new Date(e.eventDetails?.date);
        return e.status === 'CONFIRMED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      // 4. Próximos Eventos (Top 3) - Mirando hacia adelante desde hoy
      const upcomingEvents = events
        .filter(e => e.status === 'CONFIRMED' && e.eventDetails?.date && new Date(e.eventDetails.date) >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => new Date(a.eventDetails.date) - new Date(b.eventDetails.date))
        .slice(0, 3);

      // 5. Alertas (Ej: Eventos próximos sin staff)
      const alerts = upcomingEvents.filter(e => !e.staff || e.staff.length === 0);

      return (
        <div className="fade-in container" style={{ paddingBottom: '140px' }}>
          <header style={{ padding: '30px 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>Visión <span style={{ opacity: 0.3 }}>Global</span></h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '5px' }} onClick={() => setShowMonthSelector(true)}>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, fontWeight: '800', color: 'var(--primary-cyan)' }}>
                  {months[selectedMonth].toUpperCase()} {selectedYear}
                </p>
                <IconIndicator size={8} style={{ color: 'var(--primary-cyan)', opacity: 0.5 }} />
              </div>
            </div>
            <button
              onClick={() => setView('settings')}
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <IconUser size={18} />
            </button>
          </header>

          {/* A. MÉTRICA PRINCIPAL (HÉROE) */}
          <div style={{ background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.05) 0%, rgba(188, 111, 241, 0.05) 100%)', borderRadius: '32px', padding: '30px', border: '1px solid rgba(0, 242, 255, 0.2)', marginBottom: '25px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', background: 'radial-gradient(circle, var(--primary-cyan) 0%, transparent 70%)', opacity: 0.15, filter: 'blur(40px)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '10px' }}>PROFIT ESTIMADO</span>
            <div style={{ fontSize: '3.2rem', fontWeight: '900', letterSpacing: '-1px', color: '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {formatPeso(totalIncome - monthExpenses)}
            </div>
            <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--success-green)', background: 'rgba(0, 255, 157, 0.1)', padding: '6px 12px', borderRadius: '10px' }}>
                INGRESOS: {formatPeso(totalIncome)}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ff3860', background: 'rgba(255, 56, 96, 0.1)', padding: '6px 12px', borderRadius: '10px' }}>
                GASTOS Mes: {formatPeso(monthExpenses)}
              </span>
            </div>
          </div>

          {/* B. MÉTRICAS SECUNDARIAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => setView('quotations')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <IconPDF size={20} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{openQuotes}</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.5 }}>COTIZACIONES ABIERTAS</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => setView('events')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <IconCalendar size={20} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{confirmedEventsCount}</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.5 }}>EVENTOS ESTE MES</span>
            </div>
          </div>

          {/* C. ALERTAS */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffcc00' }}>
                <IconAlertTriangle size={16} /> ATENCIÓN REQUERIDA
              </h3>
              {alerts.map(a => (
                <div key={a.id} style={{ background: 'rgba(255, 204, 0, 0.05)', border: '1px solid rgba(255, 204, 0, 0.2)', borderRadius: '20px', padding: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 204, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcc00' }}>
                    <IconStaff size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem', display: 'block', color: '#ffcc00' }}>Falta Staff</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{a.client?.name || 'Evento'} • {a.eventDetails?.date || 'Sin fecha'}</span>
                  </div>
                  <button onClick={() => { setSelectedEventId(a.id); setView('detail'); }} style={{ background: '#ffcc00', border: 'none', color: '#000', padding: '8px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '900' }}>ASIGNAR</button>
                </div>
              ))}
            </div>
          )}

          {/* D. PRÓXIMOS EVENTOS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>PRÓXIMOS EVENTOS</h3>
              <button onClick={() => setView('events')} style={{ background: 'none', border: 'none', color: 'var(--primary-cyan)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>VER TODO</button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', opacity: 0.4 }}>
                <small>No hay eventos próximos confirmados.</small>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {upcomingEvents.map(e => (
                  <div
                    key={e.id}
                    onClick={() => { setSelectedEventId(e.id); setView('detail'); }}
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}
                    className="dashboard-card"
                  >
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '14px', minWidth: '55px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{e.eventDetails?.date ? new Date(e.eventDetails.date).getDate() : '?'}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase' }}>{e.eventDetails?.date ? new Date(e.eventDetails.date).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '') : '---'}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: '900', fontSize: '1rem', display: 'block', color: '#fff' }}>{e.client?.name || 'Cliente'}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: '600' }}>{e.logistics?.packName || 'Especial'} • {e.eventDetails?.neighborhood || e.eventDetails?.location || 'Por definir'}</span>
                      </div>
                    </div>
                    <IconArrowRight />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error("Crash en renderDashboard:", error);
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <IconAlertTriangle size={40} color="#ff3860" />
          <h3 style={{ marginTop: '20px' }}>Error al cargar Dashboard</h3>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{error.message}</p>
          <button onClick={() => setView('accounting')} className="primary-btn">Ir a Balance</button>
        </div>
      );
    }
  };

  // --- VIEW: EVENTS (EJECUCIÓN) ---
  const renderEventsList = () => {
    // Solo eventos confirmados, orden cronológico
    const confirmedEvents = events
      .filter(e => e.status === 'CONFIRMED' || e.status === 'SENT')
      .sort((a, b) => new Date(a.eventDetails?.date) - new Date(b.eventDetails?.date));

    return (
      <div className="fade-in container" style={{ paddingBottom: '140px' }}>
        <header style={{ padding: '30px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Eventos <span style={{ opacity: 0.3 }}>Logistics</span></h2>
            <small style={{ color: 'var(--primary-cyan)', fontWeight: '800', letterSpacing: '1px', fontSize: '0.6rem' }}>GESTIÓN OPERATIVA</small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                setNewEvent({ clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', paymentMethod: 'Nequi' });
                setView('create');
              }}
              style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--brand-gradient)', border: 'none', color: '#000', fontSize: '0.7rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <IconPlus size={14} /> NUEVO
            </button>
            <button
              onClick={() => setView('settings')}
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <IconUser size={18} />
            </button>
          </div>
        </header>

        {/* PROGRESS BAR: META MENSUAL */}
        {(() => {
          const monthEvents = events.filter(e => {
            if (e.status !== 'CONFIRMED' || !e.eventDetails?.date) return false;
            const d = new Date(e.eventDetails.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
          });
          const total = monthEvents.length;
          const completed = monthEvents.filter(e => e.logistics?.flow?.equipmentReturned).length;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div style={{ marginBottom: '30px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '1.5px', opacity: 0.4, display: 'block', marginBottom: '4px' }}>META OPERATIVA {months[selectedMonth].toUpperCase()}</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff' }}>
                    {completed} <span style={{ opacity: 0.3, fontSize: '0.8rem' }}>/ {total} EVENTOS COMPLETADOS</span>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '950', color: percent === 100 ? 'var(--success-green)' : 'var(--primary-cyan)' }}>{percent}%</div>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: percent === 100 ? 'var(--success-green)' : 'var(--brand-gradient)',
                  borderRadius: '10px',
                  boxShadow: `0 0 15px ${percent === 100 ? 'var(--success-green)' : 'var(--primary-cyan)'}44`,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }}></div>
              </div>
            </div>
          );
        })()}

        <div style={{
          display: 'flex',
          gap: '12px',
          margin: '25px 0 35px 0',
          background: 'rgba(255,255,255,0.03)',
          padding: '6px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {[
            { id: 'list', label: 'EVENTOS' },
            { id: 'inventory', label: 'INVENTARIO' },
            { id: 'documents', label: 'DOCUMENTOS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setEventSubTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '16px',
                background: eventSubTab === tab.id ? 'var(--primary-cyan)' : 'transparent',
                border: 'none',
                color: eventSubTab === tab.id ? '#000' : 'rgba(255,255,255,0.4)',
                fontWeight: '900',
                fontSize: '0.7rem',
                letterSpacing: '1px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: eventSubTab === tab.id ? '0 5px 15px rgba(0, 242, 255, 0.2)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {eventSubTab === 'list' && (
          <div style={{ marginBottom: '25px', overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '10px' }}>
            {[
              { id: 'ALL', label: 'TODOS', color: 'rgba(255,255,255,0.1)' },
              { id: 'PENDING_STAFF', label: 'SIN STAFF', color: 'rgba(188, 111, 241, 0.2)' },
              { id: 'PENDING_WH', label: 'POR SALIR', color: 'rgba(0, 242, 255, 0.2)' },
              { id: 'PENDING_CLOSURE', label: 'SIN CERRAR', color: 'rgba(255, 56, 96, 0.2)' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterExecution(f.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: filterExecution === f.id ? '1px solid currentColor' : '1px solid transparent',
                  background: filterExecution === f.id ? f.color : 'rgba(255,255,255,0.02)',
                  color: filterExecution === f.id ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: '0.6rem',
                  fontWeight: '900',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {
          eventSubTab === 'list' && (
            <div className="execution-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {(() => {
                let filtered = confirmedEvents;
                if (filterExecution === 'PENDING_STAFF') {
                  filtered = filtered.filter(e => !e.logistics?.flow?.staffConfirmed);
                } else if (filterExecution === 'PENDING_WH') {
                  filtered = filtered.filter(e => !e.logistics?.flow?.equipmentDelivered);
                } else if (filterExecution === 'PENDING_CLOSURE') {
                  filtered = filtered.filter(e => !e.logistics?.flow?.equipmentReturned);
                }

                if (filtered.length === 0) {
                  return <div className="empty-state" style={{ padding: '100px 0', opacity: 0.2, textAlign: 'center', fontWeight: '800', letterSpacing: '2px' }}>NO HAY EVENTOS QUE COINCIDAN</div>;
                }

                return filtered.map(evt => {
                  const flow = evt.logistics?.flow || {};
                  return (
                    <div key={evt.id} className="execution-card" onClick={() => { setSelectedEventId(evt.id); setView('detail'); }} style={{
                      padding: '30px',
                      borderRadius: '38px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.01)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: evt.status === 'SENT' ? 'var(--primary-purple)' : (flow.equipmentReturned ? 'var(--success-green)' : 'var(--brand-gradient)') }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: '900', color: evt.status === 'SENT' ? 'var(--primary-purple)' : 'var(--primary-cyan)', background: evt.status === 'SENT' ? 'rgba(188, 111, 241, 0.1)' : 'rgba(0, 242, 255, 0.08)', padding: '4px 10px', borderRadius: '8px', letterSpacing: '1px' }}>
                              {evt.status === 'SENT' ? 'COTIZACIÓN' : evt.id}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.25 }}>{evt.eventDetails?.date}</span>
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#fff' }}>{evt.client.name} {evt.status === 'SENT' && '⏳'}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', opacity: 0.4, fontSize: '0.8rem', fontWeight: '600' }}>
                            <IconLocation size={14} />
                            <span>{evt.eventDetails?.location || 'Por definir'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{evt.eventDetails?.startTime}</div>
                          <div style={{ fontSize: '0.6rem', fontWeight: '800', opacity: 0.2, letterSpacing: '1px', marginTop: '4px', marginBottom: '8px' }}>START TIME</div>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt); }}
                              style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                            >
                              <IconPDF size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); pdfService.generateQuotationPDF(evt); }}
                              style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                            >
                              <IconFileText size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '35px' }}>
                        {[
                          { label: 'STAFF', done: flow.staffConfirmed, color: 'var(--primary-purple)' },
                          { label: 'SALIDA', done: flow.equipmentDelivered, color: 'var(--primary-cyan)' },
                          { label: 'SHOW', done: flow.equipmentDelivered && !flow.equipmentReturned, color: '#fff' },
                          { label: 'CIERRE', done: flow.equipmentReturned, color: 'var(--success-green)' }
                        ].map((step) => {
                          const isActive = step.done;
                          return (
                            <div key={step.label} style={{ flex: 1 }}>
                              <div style={{
                                height: '3px',
                                borderRadius: '10px',
                                background: isActive ? step.color : 'rgba(255,255,255,0.05)',
                                marginBottom: '10px',
                                boxShadow: isActive ? `0 0 10px ${step.color}66` : 'none',
                                transition: 'all 0.3s ease'
                              }}></div>
                              <div style={{ fontSize: '0.55rem', fontWeight: isActive ? '900' : '700', opacity: isActive ? 1 : 0.2, letterSpacing: '0.5px', textAlign: 'center', textTransform: 'uppercase' }}>{step.label}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )
        }

        {
          eventSubTab === 'inventory' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '900', color: 'var(--success-green)' }}>100%</h3>
                  <small style={{ opacity: 0.5, fontWeight: '800', letterSpacing: '1px' }}>DISPONIBILIDAD GLOBAL</small>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '900', color: 'var(--primary-purple)' }}>0</h3>
                  <small style={{ opacity: 0.5, fontWeight: '800', letterSpacing: '1px' }}>EQUIPOS FUERA</small>
                </div>
              </div>
              <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3, marginTop: '20px' }}>
                <IconInventory size={40} />
                <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>Inventario detallado próximamente.</p>
              </div>
            </div>
          )
        }

        {
          eventSubTab === 'documents' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {confirmedEvents.map(evt => (
                <div key={evt.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1rem', color: '#fff' }}>{evt.client?.name}</h4>
                    <small style={{ opacity: 0.5, fontWeight: '600' }}>{evt.eventDetails?.date}</small>
                  </div>

                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt, 'GENERAL'); }}
                      style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.2)', color: 'var(--primary-cyan)', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                    >
                      <IconPDF size={12} /> GRAL
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt, 'DJ'); }}
                      style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', color: '#facc15', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                    >
                      DJ
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt, 'PHOTO'); }}
                      style={{ background: 'rgba(188, 111, 241, 0.1)', border: '1px solid rgba(188, 111, 241, 0.2)', color: '#bc6ff1', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                    >
                      FOTO
                    </button>
                  </div>
                </div>
              ))}
              {confirmedEvents.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3 }}>
                  <p style={{ fontWeight: '700' }}>No hay eventos para generar documentos.</p>
                </div>
              )}
            </div>
          )
        }
      </div >
    );
  };

  // --- HELPER: INPUT MONEDA ---
  const MoneyInput = ({ label, value, onChange }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1rem', color: 'var(--success-green)', fontWeight: '900' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={new Intl.NumberFormat('es-CO').format(value)}
          onChange={(e) => {
            const rawValue = e.target.value.replace(/\./g, '');
            if (!isNaN(rawValue)) onChange(Number(rawValue));
          }}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: '900', width: '100%', outline: 'none', fontFamily: 'monospace' }}
        />
      </div>
    </div>
  );

  // --- HELPER: TEXT INPUT ---
  const TextInput = ({ label, value, onChange, placeholder }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: '700', width: '100%', outline: 'none' }}
      />
    </div>
  );

  // --- VIEW: PERFIL (IDENTIDAD) ---
  const renderProfile = () => {
    return (
      <div className="fade-in container" style={{ paddingBottom: '140px' }}>
        <header className="main-header" style={{ padding: '30px 0 20px 0' }}>
          <button onClick={() => setView('settings')} className="nav-btn" style={{ background: 'transparent', border: 'none', paddingLeft: 0, fontWeight: '900', fontSize: '0.8rem', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
            <IconArrowLeft size={14} /> CENTRO DE CONTROL
          </button>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>Identidad <span style={{ opacity: 0.3 }}>Operativa</span></h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', opacity: 0.4, fontWeight: '600' }}>Así te ven tus clientes.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--primary-purple)' }}>DATOS DE CONTACTO</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <TextInput label="Nombre Comercial" value={userProfile.businessName} onChange={(val) => setUserProfile({ ...userProfile, businessName: val })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <TextInput label="NIT / Documento" value={userProfile.nit} onChange={(val) => setUserProfile({ ...userProfile, nit: val })} />
                <TextInput label="Dirección Fiscal" value={userProfile.fiscalAddress} onChange={(val) => setUserProfile({ ...userProfile, fiscalAddress: val })} />
              </div>
              <TextInput label="WhatsApp Principal" value={userProfile.whatsapp} onChange={(val) => setUserProfile({ ...userProfile, whatsapp: val })} />
              <TextInput label="Correo Electrónico" value={userProfile.email} onChange={(val) => setUserProfile({ ...userProfile, email: val })} />
              <TextInput label="Ciudad / Zona" value={userProfile.city} onChange={(val) => setUserProfile({ ...userProfile, city: val })} />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--primary-cyan)' }}>FIRMA AUTOMÁTICA</h3>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <textarea
                value={userProfile.signature}
                onChange={(e) => setUserProfile({ ...userProfile, signature: e.target.value })}
                rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
              />
            </div>
          </section>

          <button onClick={() => { alert('Perfil actualizado.'); setView('settings'); }} className="primary-btn" style={{ marginTop: '10px', width: '100%', padding: '20px', fontSize: '1rem' }}>GUARDAR PERFIL</button>
        </div>
      </div>
    );
  };

  // --- VIEW: CONFIGURACIÓN GLOBAL (AJUSTES) ---
  const renderConfig = () => {
    return (
      <div className="fade-in container" style={{ paddingBottom: '140px' }}>
        <header className="main-header" style={{ padding: '30px 0 20px 0' }}>
          <button onClick={() => setView('settings')} className="nav-btn" style={{ background: 'transparent', border: 'none', paddingLeft: 0, fontWeight: '900', fontSize: '0.8rem', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
            <IconArrowLeft size={14} /> CENTRO DE CONTROL
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>Motor del <span style={{ opacity: 0.3 }}>Negocio</span></h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', opacity: 0.4, fontWeight: '600' }}>Reglas, precios y automatización.</p>
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>

          {/* 1. PRECIOS Y REGLAS */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div style={{ width: '4px', height: '18px', background: 'var(--primary-purple)', borderRadius: '4px' }}></div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>1. PRECIOS Y REGLAS</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <MoneyInput label="Base DJ (x Evento)" value={appConfig.djBase} onChange={(val) => setAppConfig({ ...appConfig, djBase: val })} />
                <MoneyInput label="Hora Extra DJ" value={appConfig.djHour} onChange={(val) => setAppConfig({ ...appConfig, djHour: val })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <MoneyInput label="Hora Fotografía" value={appConfig.photoHour} onChange={(val) => setAppConfig({ ...appConfig, photoHour: val })} />
                <MoneyInput label="Artista Neón (U)" value={appConfig.neonArtist} onChange={(val) => setAppConfig({ ...appConfig, neonArtist: val })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <TextInput label="Desc. Máximo (%)" value={appConfig.maxDiscount} onChange={(val) => setAppConfig({ ...appConfig, maxDiscount: val })} />
                <TextInput label="Min. Horas Evento" value={appConfig.minEventDuration} onChange={(val) => setAppConfig({ ...appConfig, minEventDuration: val })} />
              </div>
            </div>
          </section>

          {/* 2. INVENTARIO & EVENTOS */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div style={{ width: '4px', height: '18px', background: '#fff', borderRadius: '4px' }}></div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>2. OPERATIVA</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <TextInput label="Buffer Inventario (h)" value={appConfig.bufferTime} onChange={(val) => setAppConfig({ ...appConfig, bufferTime: val })} />
              <MoneyInput label="Penalidad Solapé" value={appConfig.overlapPenalty} onChange={(val) => setAppConfig({ ...appConfig, overlapPenalty: val })} />
              <TextInput label="Abono Mínimo (%)" value={appConfig.minDeposit} onChange={(val) => setAppConfig({ ...appConfig, minDeposit: val })} />
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>COBRAR EXTRA SIEMPRE</span>
                <input type="checkbox" checked={appConfig.overtimePolicy === 'ALWAYS_CHARGE'} onChange={() => { }} />
              </div>
            </div>
          </section>

          {/* 4. MENSAJES */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div style={{ width: '4px', height: '18px', background: 'var(--success-green)', borderRadius: '4px' }}></div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>4. MENSAJES AUTOMÁTICOS</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[
                { k: 'msgQuote', l: 'Plantilla Cotización' },
                { k: 'msgAdvisory', l: 'Plantilla Asesoría' },
                { k: 'msgConfirm', l: 'Confirmación Abono' }
              ].map(t => (
                <div key={t.k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>{t.l}</label>
                  <textarea
                    value={appConfig[t.k]}
                    onChange={(e) => setAppConfig({ ...appConfig, [t.k]: e.target.value })}
                    rows={2}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={() => { alert('Motor de negocio actualizado.'); setView('settings'); }}
            className="primary-btn"
            style={{ marginTop: '10px', padding: '22px', fontSize: '1rem', width: '100%', textTransform: 'uppercase', letterSpacing: '2px' }}
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    );
  };

  // --- VIEW: COTIZACIONES ---
  const renderQuotations = () => {
    try {
      const sentQuotations = quotations.filter(q => q && q.status === 'SENT');

      return (
        <div className="fade-in container" style={{ paddingBottom: '140px' }}>
          <header style={{ padding: '30px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Cotizaciones <span style={{ opacity: 0.3 }}>Activas</span> <small style={{ fontSize: '0.6rem', opacity: 0.5 }}>v2.2</small></h2>
              <small style={{ color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '1px', fontSize: '0.6rem' }}>GESTIÓN COMERCIAL</small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => {
                  setNewEvent({ clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', paymentMethod: 'Nequi' });
                  setView('create');
                }}
                style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--brand-gradient)', border: 'none', color: '#000', fontSize: '0.7rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              >
                <IconPlus size={14} /> CREAR
              </button>
              <button
                onClick={() => setView('settings')}
                style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IconUser size={18} />
              </button>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '35px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>LEADS {(months[selectedMonth] || 'Mes').toUpperCase()}</small>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary-cyan)' }}>
                {quotations.filter(q => {
                  if (!q || !q.createdAt) return false;
                  const d = parseFirestoreDate(q.createdAt);
                  return d && d.getMonth && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                }).length}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>CIERRES (VENTAS)</small>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--success-green)' }}>
                {quotations.filter(q => {
                  if (!q || !q.createdAt || !q.status) return false;
                  const d = parseFirestoreDate(q.createdAt);
                  return d && d.getMonth && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && q.status === 'APPROVED';
                }).length}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>EFECTIVIDAD</small>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>
                {(() => {
                  const monthLeads = quotations.filter(q => {
                    if (!q || !q.createdAt) return false;
                    const d = parseFirestoreDate(q.createdAt);
                    return d && d.getMonth && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                  }).length;
                  const monthWon = quotations.filter(q => {
                    if (!q || !q.createdAt || !q.status) return false;
                    const d = parseFirestoreDate(q.createdAt);
                    return d && d.getMonth && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && q.status === 'APPROVED';
                  }).length;
                  return monthLeads > 0 ? Math.round((monthWon / monthLeads) * 100) : 0;
                })()}%
              </div>
            </div>
          </div>

          <div className="sales-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {quotations.filter(q => q && q.client && q.client.name).map(quo => (
              <div key={quo.id} className="sales-list-item" onClick={() => {
                setNewEvent({
                  id: quo.id,
                  clientName: quo.client?.name || '',
                  clientPhone: quo.client?.phone || '',
                  clientPhone2: quo.client?.phone2 || '',
                  date: quo.eventDetails?.date || '',
                  startTime: quo.eventDetails?.startTime || '',
                  endTime: quo.eventDetails?.endTime || '',
                  location: quo.eventDetails?.location || '',
                  neighborhood: quo.eventDetails?.neighborhood || '',
                  packName: (() => {
                    const p = (quo.logistics?.packName || '').toLowerCase();
                    if (p.includes('memories')) return 'Memories';
                    if (p.includes('celebration')) return 'Celebration';
                    return 'Essential';
                  })(),
                  totalValue: quo.financials?.totalValue || 0,
                  deposit: (() => {
                    const total = Number(quo.financials?.totalValue) || 0;
                    const savedDep = quo.financials?.deposit;
                    if (savedDep) return savedDep;
                    // Auto-calc 30% if not saved
                    return total > 0 ? Math.round((total * 0.3) / 1000) * 1000 : '';
                  })(),
                  managerName: '',
                  guestCount: quo.eventDetails?.guestCount || 0,
                  selectedExtras: (() => {
                    const raw = quo.logistics?.selectedExtras || {};
                    const clean = {};
                    Object.keys(raw).forEach(k => {
                      if (raw[k]) {
                        const lowerK = k.toLowerCase();
                        if (lowerK === 'makeup' || lowerK === 'neon' || lowerK.includes('maquillaje')) clean['extra_makeup'] = true;
                        else clean[k] = true;
                      }
                    });
                    return clean;
                  })(),
                  makeupCount: quo.logistics?.makeupCount || 1,
                  occasion: quo.eventDetails?.occasion || '',
                  extraHourPrice: quo.financials?.extraHourPrice || (() => {
                    const p = (quo.logistics?.packName || '').toLowerCase();
                    if (p.includes('memories') || p.includes('celebration')) return 120000;
                    return 85000;
                  })(),
                  indications: quo.eventDetails?.indications || 'Ninguna',
                  materialsTime: '',
                  warehouseTime: '',
                  materialExplanation: ''
                });
                setView('create');
              }} style={{
                padding: '28px',
                borderRadius: '38px',
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {/* CORNER RIBBON INDICATOR */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '-35px',
                  width: '120px',
                  height: '30px',
                  background: quo.status === 'APPROVED' ? 'var(--success-green)' : (quo.status === 'LOST' ? '#ff3860' : 'var(--primary-cyan)'),
                  transform: 'rotate(45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                  zIndex: 1
                }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: '950', color: '#000', letterSpacing: '1px' }}>{quo.status}</span>
                </div>
                {/* HEADER: NAME AND PRICE */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '40px', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px', lineHeight: '1.2' }}>{quo.client?.name || 'Cliente sin nombre'}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.5, fontWeight: '500' }}>
                      📅 {quo.eventDetails?.date} • {quo.logistics?.packName || 'Personalizado'}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: 'var(--primary-cyan)', textAlign: 'right' }}>{formatPeso(quo.financials?.totalValue || 0)}</div>
                  </div>
                </div>

                {/* BADGES ROW */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                  {Object.keys(quo.logistics?.selectedExtras || {}).length > 0 && (
                    <span style={{ fontSize: '0.6rem', background: 'rgba(188, 111, 241, 0.1)', color: 'var(--primary-purple)', padding: '4px 10px', borderRadius: '8px', fontWeight: '800' }}>
                      +{Object.keys(quo.logistics?.selectedExtras || {}).length} Extras
                    </span>
                  )}

                  {quo.status === 'SENT' && quo.createdAt && (
                    <span style={{
                      fontSize: '0.6rem',
                      background: 'rgba(255,255,255,0.05)',
                      color: (new Date() - parseFirestoreDate(quo.createdAt)) / (1000 * 60 * 60 * 24) > 15 ? '#ffcc00' : '#aaa',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: '700'
                    }}>
                      ⏱ {Math.floor((new Date() - parseFirestoreDate(quo.createdAt)) / (1000 * 60 * 60 * 24))} DÍAS ABIERTO
                    </span>
                  )}
                </div>

                {/* ACTION BUTTONS WRAP ROW (Mobile Optimized) */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  width: '100%'
                }}>
                  {/* CONFIRM BUTTON */}
                  {quo.status === 'SENT' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveQuotation(quo); }}
                        style={{
                          padding: '12px',
                          fontSize: '1.2rem',
                          background: '#ff0000',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: '50px'
                        }}
                        title="Registrar Abono"
                      >
                        💰 PAGO
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Marcar este lead como Venta Perdida?')) updateQuotationStatus(quo.id, 'LOST'); }}
                        style={{
                          padding: '12px',
                          background: 'rgba(255, 56, 96, 0.1)',
                          color: '#ff3860',
                          border: '1px solid rgba(255, 56, 96, 0.2)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <IconTrash size={16} />
                      </button>
                    </>
                  )}

                  {/* TOOLS */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setWhatsappModalQuo(quo); }}
                    style={{
                      flex: '1',
                      whiteSpace: 'nowrap',
                      padding: '12px',
                      background: 'rgba(37, 211, 102, 0.1)',
                      color: '#25d366',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '0.65rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <IconWhatsApp size={14} /> SEGUIMIENTO
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); generateQuotationPDF(quo); }}
                    style={{
                      flex: '1',
                      whiteSpace: 'nowrap',
                      padding: '12px',
                      fontSize: '0.65rem',
                      background: 'rgba(0, 242, 255, 0.1)',
                      color: 'var(--primary-cyan)',
                      border: '1px solid var(--primary-cyan)',
                      borderRadius: '12px',
                      fontWeight: '800',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <IconFileText size={14} /> COTIZAR
                  </button>


                </div>

                {quo.status === 'APPROVED' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-cyan)', opacity: 0.8, marginTop: '10px' }}>
                    <IconCheck size={14} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Misionado</span>
                  </div>
                )}
              </div>
            ))
            }
            {quotations.length === 0 && <div className="empty-state" style={{ padding: '80px 0', opacity: 0.3 }}>No hay cotizaciones registradas.</div>}
          </div >
        </div >
      );
    } catch (error) {
      console.error("Crash en renderQuotations:", error);
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <IconAlertTriangle size={40} color="#ff3860" />
          <h3 style={{ marginTop: '20px' }}>Error al cargar Cotizaciones</h3>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{error.message}</p>
          <code style={{ display: 'block', marginTop: '10px', opacity: 0.3, fontSize: '0.6rem' }}>{error.stack?.split('\n')[0]}</code>
          <button onClick={() => setView('events')} className="primary-btn" style={{ marginTop: '20px' }}>Volver a Eventos</button>
        </div>
      );
    }
  };

  const renderWhatsAppFollowUpModal = () => {
    if (!whatsappModalQuo) return null;
    const quo = whatsappModalQuo;
    const clientName = quo.client?.name || 'Cliente';
    const clientFirstName = clientName.split(' ')[0];
    const eventDate = quo.eventDetails?.date || 'tu evento';
    const occasion = quo.eventDetails?.occasion || 'evento especial';
    const packName = quo.logistics?.packName || 'Plan Nexxa';
    const phone = quo.client?.phone ? quo.client.phone.replace(/\D/g, '') : '';

    const templates = [
      {
        title: 'El Súper-Abridor (RECOMENDADO)',
        msg: `¡Hola ${clientFirstName}! 👋 Qué nota de *${occasion}* el ${eventDate} 🎧✨. Ya revisé tu configuración del paquete ${packName} en la App y la base está muy bien planteada.\n\nPodemos optimizar servicios para que se ajusten 100% a tu idea y presupuesto. ¡La meta es que sea impecable! ¿Qué tal te parece la propuesta o quieres que miremos algún cambio?`,
        icon: '💎',
        recommend: true
      },
      {
        title: 'Prueba de Calidad (Portafolio)',
        msg: `¡Hola ${clientFirstName}! 🎧 Estaba organizando el portafolio de eventos recientes y encontré unos videos geniales de un montaje con el paquete ${packName}. ¿Te gustaría que te los comparta para que visualices cómo se vería tu *${occasion}* con nuestro equipo? ¡Quedo atento!`,
        icon: '📸'
      },
      {
        title: 'Gestión de Agenda (Urgencia)',
        msg: `¡Hola de nuevo ${clientFirstName}! 🎧 Paso a comentarte que nos escribieron consultando precisamente por la fecha del ${eventDate}. Como ya tenemos tu propuesta avanzada, quería confirmarlo contigo primero por prioridad. ¿Te gustaría que reservemos el espacio para asegurar tu evento? 🔒`,
        icon: '🗓️'
      },
      {
        title: 'Diseño Musical (The Vibe)',
        msg: `${clientFirstName}, ¡qué nota de *${occasion}* estamos proyectando! 🎧✨ En Nexxa nos apasiona el diseño musical de cada fiesta. Si deseas, cuéntame qué géneros o canciones son infaltables para ti y planeamos un set que mantenga la energía al máximo. ¿Cómo te suena la idea?`,
        icon: '🔥'
      }
    ];

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 10001, backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setWhatsappModalQuo(null)}>
        <div className="glass-card" onClick={e => e.stopPropagation()} style={{
          width: '100%',
          maxWidth: '450px',
          maxHeight: '85vh',
          padding: '30px',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontWeight: '950', fontSize: '1.2rem' }}>Estrategia de Cierre</h3>
            <button onClick={() => setWhatsappModalQuo(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          <p style={{ opacity: 0.5, fontSize: '0.8rem', marginBottom: '20px', flexShrink: 0 }}>Selecciona el paso según el estado de la negociación:</p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            overflowY: 'auto',
            paddingRight: '5px',
            paddingBottom: '30px',
            flex: 1
          }}>
            {templates.map((t, idx) => (
              <div key={idx} style={{
                background: t.recommend ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255,255,255,0.03)',
                border: t.recommend ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '18px',
                position: 'relative',
                flexShrink: 0
              }}>
                {t.recommend && (
                  <div style={{ position: 'absolute', top: '10px', right: '15px', background: 'var(--primary-cyan)', color: '#000', fontSize: '0.55rem', fontWeight: '950', padding: '2px 8px', borderRadius: '10px' }}>PASO 1</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{t.icon}</span>
                  <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: t.recommend ? 'var(--primary-cyan)' : '#fff' }}>{t.title}</strong>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', opacity: 0.6, lineHeight: '1.4' }}>{t.msg}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (!phone) return alert('No hay teléfono.');
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(t.msg)}`, '_blank');
                    }}
                    style={{ flex: 1, padding: '10px', background: t.recommend ? 'var(--primary-cyan)' : 'white', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    WHATSAPP
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(t.msg);
                      alert('¡Copiado! 📋');
                    }}
                    style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    COPIAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBottomNav = () => (
    <nav className="bottom-nav" style={{
      background: 'rgba(10, 10, 10, 0.98)',
      backdropFilter: 'blur(30px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 15px 20px 15px',
      height: '80px'
    }}>


      <button className={`nav-item ${view === 'quotations' ? 'active' : ''}`} onClick={() => setView('quotations')}>
        <IconPDF size={18} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '6px' }}>Cotizaciones</span>
      </button>

      <button className={`nav-item ${view === 'events' || view === 'detail' ? 'active' : ''}`} onClick={() => setView('events')}>
        <IconCalendar size={18} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '6px' }}>Eventos</span>
      </button>

      <button className={`nav-item ${view === 'accounting' ? 'active' : ''}`} onClick={() => setView('accounting')}>
        <IconRecaudo size={18} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '6px' }}>Balance</span>
      </button>

    </nav>
  );

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div className="aurora-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' }}>
        <div className="aurora-blob blob-1" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1), transparent 70%)', filter: 'blur(80px)' }}></div>
        <div className="aurora-blob blob-2" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(188, 111, 241, 0.1), transparent 70%)', filter: 'blur(80px)' }}></div>
      </div>

      <main className="main-content" style={{ paddingBottom: '120px' }}>
        {view === 'dashboard' && renderDashboard()}
        {view === 'home' && renderHomeHub()}
        {(view === 'events' || view === 'detail') && (view === 'detail' ? renderDetail() : renderEventsList())}
        {view === 'create' && renderCreate()}
        {view === 'inventory' && renderInventory()}
        {view === 'accounting' && renderAccounting()}
        {view === 'config' && renderConfig()}
        {view === 'profile' && renderProfile()}
        {view === 'quotations' && (
          <QuotationsView
            quotations={quotations}
            onCreate={() => {
              setNewEvent({ clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', paymentMethod: 'Nequi' });
              setView('create');
            }}
            onEdit={(quo) => {
              setNewEvent({
                id: quo.id,
                createdAt: quo.createdAt || null,
                clientName: quo.client?.name || '',
                clientPhone: quo.client?.phone || '',
                clientPhone2: quo.client?.phone2 || '',
                date: quo.eventDetails?.date || '',
                startTime: quo.eventDetails?.startTime || '',
                endTime: quo.eventDetails?.endTime || '',
                location: quo.eventDetails?.location || '',
                neighborhood: quo.eventDetails?.neighborhood || '',
                packName: (() => {
                  const p = (quo.logistics?.packName || '').toLowerCase();
                  if (p.includes('memories')) return 'Memories';
                  if (p.includes('celebration')) return 'Celebration';
                  return 'Essential';
                })(),
                totalValue: quo.financials?.totalValue || 0,
                deposit: (() => {
                  const total = Number(quo.financials?.totalValue) || 0;
                  const savedDep = quo.financials?.deposit;
                  if (savedDep) return savedDep;
                  return total > 0 ? Math.round((total * 0.3) / 1000) * 1000 : '';
                })(),
                managerName: '',
                guestCount: quo.eventDetails?.guestCount || 0,
                selectedExtras: (() => {
                  const raw = quo.logistics?.selectedExtras || {};
                  const clean = {};
                  Object.keys(raw).forEach(k => {
                    if (raw[k]) {
                      const lowerK = k.toLowerCase();
                      if (lowerK === 'makeup' || lowerK === 'neon' || lowerK.includes('maquillaje')) clean['extra_makeup'] = true;
                      else clean[k] = true;
                    }
                  });
                  return clean;
                })(),
                makeupCount: quo.logistics?.makeupCount || 1,
                occasion: quo.eventDetails?.occasion || '',
                extraHourPrice: quo.financials?.extraHourPrice || (() => {
                  const p = (quo.logistics?.packName || '').toLowerCase();
                  if (p.includes('memories') || p.includes('celebration')) return 120000;
                  return 85000;
                })(),
                indications: quo.eventDetails?.indications || 'Ninguna',
                materialsTime: '',
                warehouseTime: '',
                materialExplanation: ''
              });
              setView('create');
            }}
            onApprove={(quo) => approveQuotation(quo)}
            onMarkLost={(quo) => updateQuotationStatus(quo.id, 'LOST')}
            onOpenWhatsApp={(quo) => setWhatsappModalQuo(quo)}
            onGeneratePDF={(quo) => generateQuotationPDF(quo)}
            onSettings={() => setView('settings')}
          />
        )}
        {view === 'settings' && (
          <div className="fade-in container" style={{ paddingBottom: '140px' }}>
            <header className="main-header" style={{ padding: '40px 0 20px 0' }}>
              <button onClick={() => setView('events')} className="nav-btn" style={{ background: 'transparent', border: 'none', paddingLeft: 0, fontWeight: '900', fontSize: '0.8rem', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px' }}>
                <IconArrowLeft size={14} /> VOLVER A EVENTOS
              </button>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>Centro de <span style={{ opacity: 0.3 }}>Control</span></h2>
              <small style={{ color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '2px', fontSize: '0.65rem' }}>GESTIÓN DE PERFIL Y APP</small>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* PERFIL */}
              <div
                className="sales-list-item"
                onClick={() => setView('profile')}
                style={{ padding: '25px', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-cyan)' }}>
                    <IconUser size={22} />
                  </div>
                  <div>
                    <span style={{ fontWeight: '900', fontSize: '1.1rem', display: 'block' }}>Perfil</span>
                    <small style={{ opacity: 0.4, fontWeight: '700' }}>Identidad operativa</small>
                  </div>
                </div>
                <IconArrowRight size={18} style={{ opacity: 0.3 }} />
              </div>

              {/* AJUSTES */}
              <div
                className="sales-list-item"
                onClick={() => setView('config')}
                style={{ padding: '25px', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconSettings size={22} />
                  </div>
                  <div>
                    <span style={{ fontWeight: '900', fontSize: '1.1rem', display: 'block' }}>Ajustes</span>
                    <small style={{ opacity: 0.4, fontWeight: '700' }}>Variables globales y tarifas</small>
                  </div>
                </div>
                <IconArrowRight size={18} style={{ opacity: 0.3 }} />
              </div>

              {/* ROLES / STAFF */}
              <div
                className="sales-list-item"
                onClick={() => alert('Gestión de nómina próximamente')}
                style={{ padding: '25px', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'rgba(188, 111, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-purple)' }}>
                    <IconStaff size={22} />
                  </div>
                  <div>
                    <span style={{ fontWeight: '900', fontSize: '1.1rem', display: 'block' }}>Roles / Staff</span>
                    <small style={{ opacity: 0.4, fontWeight: '700' }}>Nómina y jerarquías</small>
                  </div>
                </div>
                <IconArrowRight size={18} style={{ opacity: 0.3 }} />
              </div>

              {/* CERRAR SESIÓN */}
              <button
                className="sales-list-item"
                style={{
                  marginTop: '20px',
                  padding: '25px',
                  borderRadius: '28px',
                  background: 'rgba(255, 56, 96, 0.05)',
                  border: '1px solid rgba(255, 56, 96, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  color: '#ff3860',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left'
                }}
                onClick={() => alert('Cerrando sesión...')}
              >
                <IconLogout size={20} />
                <span style={{ fontWeight: '950', letterSpacing: '1px', fontSize: '0.9rem' }}>CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {!(view === 'create' || view === 'detail') && renderBottomNav()}
      {renderWhatsAppFollowUpModal()}

      {showFinanceModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 30px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px', background: '#080808', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#fff', textAlign: 'center' }}>Registro de <span style={{ color: showFinanceModal === 'IN' ? 'var(--success-green)' : 'var(--danger-red)' }}>{showFinanceModal === 'IN' ? 'Ingreso' : 'Egreso'}</span></h3>

            <div style={{ marginTop: '30px', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '18px' }}>
              <button
                type="button"
                onClick={() => { setFinType('GENERAL'); setFinEventId(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: finType === 'GENERAL' ? 'rgba(255,255,255,0.1)' : 'transparent', color: finType === 'GENERAL' ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '1px' }}
              >
                GENERAL
              </button>
              <button
                type="button"
                onClick={() => setFinType('EVENT')}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: finType === 'EVENT' ? 'var(--primary-purple)' : 'transparent', color: '#fff', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '1px' }}
              >
                POR EVENTO
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {finType === 'EVENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>Seleccionar o Escribir Evento</label>
                  <input
                    list="events-list"
                    value={finEventId}
                    onChange={e => setFinEventId(e.target.value)}
                    placeholder="Escribe el nombre o ID del evento..."
                    style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '700' }}
                    required
                  />
                  <datalist id="events-list">
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.client.name} (ID: {ev.id})</option>
                    ))}
                  </datalist>
                </div>
              )}
              <input
                placeholder="Descripción..."
                value={finDesc}
                onChange={e => setFinDesc(e.target.value)}
                required
                style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '700' }}
              />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Monto total ($)"
                value={finAmount}
                onChange={e => setFinAmount(e.target.value)}
                required
                style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '900', fontSize: '1.2rem', color: 'var(--primary-cyan)' }}
              />

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '12px', display: 'block', fontWeight: '800', letterSpacing: '1px' }}>CANAL DE DINERO</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'Nequi', color: '#ff007a' },
                    { id: 'Daviplata', color: '#ff4d4d' },
                    { id: 'Efectivo', color: '#4dff88' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFinMethod(m.id)}
                      style={{
                        padding: '15px 5px',
                        borderRadius: '16px',
                        border: '1.5px solid',
                        borderColor: finMethod === m.id ? m.color : 'rgba(255,255,255,0.08)',
                        background: finMethod === m.id ? `${m.color}22` : 'rgba(255,255,255,0.02)',
                        color: finMethod === m.id ? '#fff' : 'rgba(255,255,255,0.3)',
                        fontSize: '0.7rem',
                        fontWeight: '950',
                        letterSpacing: '0.5px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: finMethod === m.id ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: finMethod === m.id ? `0 10px 20px ${m.color}15` : 'none'
                      }}
                    >
                      {m.id.toUpperCase()}
                    </button>
                  ))}
                </div>
                {/* Hidden input to maintain 'required' validation if needed, or handle in handleSaveTransaction */}
                <input type="hidden" value={finMethod} required name="hiddenMethod" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowFinanceModal(null)} style={{ flex: 1, padding: '18px', borderRadius: '18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontWeight: '900' }}>CANCELAR</button>
                <button type="submit" style={{ flex: 1, padding: '18px', borderRadius: '18px', background: '#fff', border: 'none', color: '#000', fontWeight: '900' }}>REGISTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAGO DE STAFF */}
      {staffPayModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-in" style={{ width: '90%', maxWidth: '400px', background: '#111', padding: '35px', borderRadius: '40px', border: '1px solid rgba(188, 111, 241, 0.3)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', fontWeight: '950', color: 'var(--primary-purple)' }}>Liquidar Nómina</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Selecciona el canal de dinero para pagar a <strong>{staffPayModal.client?.name}</strong>.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Nequi', 'Daviplata', 'Efectivo'].map(method => (
                <button
                  key={method}
                  onClick={async () => {
                    const dur = getHours(staffPayModal.eventDetails.startTime, staffPayModal.eventDetails.endTime);
                    const djPay = 35000 + (dur * 13000);
                    const pDur = staffPayModal.eventDetails.photoStartTime ? getHours(staffPayModal.eventDetails.photoStartTime, staffPayModal.eventDetails.photoEndTime) : 0;
                    const photoPay = pDur * 13000;
                    const decorPay = (staffPayModal.eventDetails.decorStartTime || staffPayModal.logistics.packName === 'Celebration') ? 40000 : 0;
                    const managerPay = (dur * 10000) + 25000;
                    const totalPay = djPay + photoPay + decorPay + managerPay;

                    // 1. Crear Transacción Goblal (OUT)
                    const txId = `TX-STAFF-${Date.now()}`;
                    await setDoc(doc(collection(db, "globalTx"), txId), {
                      id: txId,
                      desc: `Nómina Evento: ${staffPayModal.client.name}`,
                      amount: totalPay,
                      method: method,
                      type: 'OUT',
                      date: new Date().toISOString().split('T')[0],
                      createdAt: new Date().toISOString()
                    });

                    // 2. Marcar como pagado en Firebase
                    await updateDoc(doc(db, "events", staffPayModal.id), { "logistics.flow.staffPaid": true });

                    setStaffPayModal(null);
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontWeight: '900',
                    fontSize: '1rem',
                    textAlign: 'left'
                  }}
                >
                  💳 Pagar por {method}
                </button>
              ))}
              <button onClick={() => setStaffPayModal(null)} style={{ marginTop: '10px', padding: '15px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', fontWeight: '800' }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export default App;
