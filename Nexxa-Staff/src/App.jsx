import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './accounting_styles.css';
import './index.css';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- HELPERS ---
const formatPeso = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// --- TIME COMPONENT ---
// --- TIME COMPONENT (NATIVE) ---
const TimeInput = ({ value, onChange, label }) => {
  return (
    <div style={{ flex: 1, background: '#222', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
      <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>{label}</label>
      <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid #00d4ff',
            color: 'white',
            fontSize: '1.4rem',
            textAlign: 'center',
            fontWeight: 'bold',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none' // Some browsers need this for styling
          }}
          className="native-time-input"
        />
        {/* Fallback Icon for clarity usually not needed as clickable area is full */}
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
        console.log('🔗 Magic Link Detected! Parsing data...');
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
          pExtras.split(',').forEach(exId => {
            if (exId) extrasObj[exId] = true;
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
  const [inventory, setInventory] = useState([]);
  const [damageReports, setDamageReports] = useState([]);
  const [globalTx, setGlobalTx] = useState([]);

  // 1. SYNC EVENTS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const liveEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })); // Ensure ID from doc
      // Sort by date (descending or accordingly) could happen here
      setEvents(liveEvents.sort((a, b) => b.id.localeCompare(a.id)));
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


  const [view, setView] = useState('menu'); // menu | events | create | detail | accounting | inventory
  const [detailTab, setDetailTab] = useState('general'); // general | logistics | financials
  const [selectedEventId, setSelectedEventId] = useState(null);

  // --- INVENTORY VIEW STATE (Moved to top level) ---
  const [filterCat, setFilterCat] = useState('Todo');
  const [showReportModal, setShowReportModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); // NEW: Add Modal State

  // --- INVENTORY LOGIC ---
  const handleAddInventory = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const category = e.target.category.value;
    const qty = Number(e.target.qty.value);

    const newItem = {
      // id: `inv-${Date.now()}`, // Auto-ID by Firestore is better, or use custom if strictly needed
      // We will let Firestore generate ID or use a custom ID structure if legacy requires it.
      // Let's use custom ID for consistency with legacy data format if we want, or just Auto.
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
      clientName: '', clientPhone: '',
      date: '', startTime: '', endTime: '',
      location: '', packName: 'Essential',
      totalValue: '', deposit: '',
      managerName: ''
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

  // --- AUTO-MIGRATION: FIX OLD IDS ---
  useEffect(() => {
    let migrationNeeded = false;

    const migratedEvents = events.map(evt => {
      // Regex: Checks if ID is strictly EVT-YYMMDD-XX
      const isNewFormat = /^EVT-\d{6}-\d{2}$/.test(evt.id); // Strict format check

      if (!isNewFormat) {
        migrationNeeded = true;
        const dateCode = evt.eventDetails.date.replace(/-/g, '').slice(2);
        const sameDayEvents = events.filter(e => e.eventDetails.date === evt.eventDetails.date);
        const myIndex = sameDayEvents.indexOf(evt);

        const newId = `EVT-${dateCode}-${String(myIndex + 1).padStart(2, '0')}`;
        return { ...evt, id: newId };
      }
      return evt;
    });

    if (migrationNeeded) {
      console.log('🔧 Auto-fixing Legacy Event IDs...');
      setEvents(migratedEvents);
    }
    // eslint-disable-next-line
  }, [events.length]); // Only run if event count changes or on mount, basically. 
  // If we depend on [events], we might loop infinitely if objects regenerate. 
  // Ideally just run once on mount? But events might load from localStorage late?
  // Our useState loads from localStorage synchronously, so [] is usually fine.
  // But let's check events.length to be safe against deletions/additions triggering check.

  // --- EDIT & STATUS HANDLERS ---
  // --- TARIFAS EXACTAS APP NEXXA ---
  const PRICING = {
    'Essential': { base: 450000, extra: 85000 },
    'Memories': { base: 650000, extra: 135000 },
    'Celebration': { base: 850000, extra: 135000 },
    'Personalizado': { base: 0, extra: 0 }
  };

  // --- DATA DINÁMICA DE EXTRAS ---
  const getDynamicExtras = (guests, userMakeupCount) => {
    const g = Math.max(10, Number(guests) || 10);

    // Costos Unitarios
    const C_FOAM = 13000;
    const C_CANNON = 5000;
    const C_BLOWOUT = 200;
    const C_BRACELET = 500;
    const C_NECKLACE = 500;
    const C_MASK = 500;

    // 1. Maquillaje (1 por cada 50 invitados O manual)
    const recommendedMakeup = Math.ceil(g / 50);
    const qty = (typeof userMakeupCount === 'number') ? userMakeupCount : recommendedMakeup;
    const makeupPrice = qty * 120000;

    // 2. Accesorios Essential
    const rawEssential = C_FOAM + (g * (C_BLOWOUT + C_BRACELET));
    const priceEssential = Math.ceil(rawEssential / 5000) * 5000;

    // 3. Accesorios Memories
    const rawMemories = (2 * C_FOAM) + (2 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET));
    const priceMemories = Math.ceil(rawMemories / 5000) * 5000;

    // 4. Accesorios Celebration
    const rawCelebration = (3 * C_FOAM) + (3 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET + C_NECKLACE + C_MASK));
    const priceCelebration = Math.ceil(rawCelebration / 5000) * 5000;

    return [
      {
        id: 'extra_makeup',
        name: `Maquillaje Neón`,
        price: makeupPrice,
        qty: qty,
        isMakeup: true,
        details: `${qty} Artista(s) (1 por c/50 invitados)`
      },
      {
        id: 'acc_essential',
        name: 'Accesorios Essential',
        price: priceEssential,
        details: `1 Espuma + (${g} Pitos, ${g} Manillas)`
      },
      {
        id: 'acc_memories',
        name: 'Accesorios Memories',
        price: priceMemories,
        details: `2 Espumas, 2 Cañones + (${g} Pitos, ${g} Manillas)`
      },
      {
        id: 'acc_celebration',
        name: 'Accesorios Celebration',
        price: priceCelebration,
        details: `3 Espumas, 3 Cañones + (${g} de: Pitos, Manillas, Collares, Antifaces)`
      }
    ];
  };

  // --- EDIT & STATUS HANDLERS ---
  const handleCreateEvent = async (e, status = 'CONFIRMED') => {
    if (e) e.preventDefault();

    // Validations (Skip for Drafts)
    if (status === 'CONFIRMED') {
      if (!newEvent.clientName || !newEvent.date || !newEvent.totalValue) {
        return alert('Para confirmar, necesitas al menos: Cliente, Fecha y Valor Total.');
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
        { name: 'Cabina Activa 15"', qty: 2, checked: false },
        { name: 'Par LED 54x3', qty: 4, checked: false }
      ];
    } else if (newEvent.packName === 'Memories') {
      defaultItems = [
        { name: 'Cabina Activa 15"', qty: 2, checked: false },
        { name: 'Bajos 18"', qty: 2, checked: false },
        { name: 'Par LED 54x3', qty: 6, checked: false },
        { name: 'Cabeza Móvil Beam', qty: 2, checked: false }
      ];
    } else if (newEvent.packName === 'Celebration') {
      defaultItems = [
        { name: 'Cabina Activa 15"', qty: 4, checked: false },
        { name: 'Bajos 18"', qty: 2, checked: false },
        { name: 'Par LED 54x3', qty: 8, checked: false },
        { name: 'Cabeza Móvil Beam', qty: 4, checked: false }
      ];
    } else {
      defaultItems = [
        { name: 'Cabina Activa 15"', qty: 2, checked: false },
        { name: 'Par LED 54x3', qty: 2, checked: false }
      ];
    }

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
      client: { name: newEvent.clientName, phone: newEvent.clientPhone },
      eventDetails: {
        date: newEvent.date,
        type: 'Evento Social',
        location: newEvent.location ? newEvent.location.replace(/"/g, '') : '',
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        guestCount: newEvent.guestCount // Preserve guests
      },
      financials: {
        totalValue: total,
        deposit: dep,
        balance: total - dep,
        extraExpenses: newEvent.extraExpenses || [] // Preserve if editing
      },
      logistics: {
        packName: newEvent.packName,
        managerName: newEvent.managerName || 'Por asignar',
        items: newEvent.savedItems || defaultItems, // Preserve items if editing and customized, else default
        flow: newEvent.savedFlow || {
          staffConfirmed: false,
          equipmentDelivered: false,
          equipmentReturned: false,
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
      const emptyState = { id: null, clientName: '', clientPhone: '', date: '', startTime: '', endTime: '', location: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '' };
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
      date: evt.eventDetails.date,
      startTime: evt.eventDetails.startTime,
      endTime: evt.eventDetails.endTime,
      location: evt.eventDetails.location,
      guestCount: evt.eventDetails.guestCount || '',
      packName: evt.logistics.packName,
      managerName: evt.logistics.managerName,
      totalValue: evt.financials.totalValue,
      deposit: evt.financials.deposit,
      selectedExtras: evt.logistics.selectedExtras || {},
      extraExpenses: evt.financials.extraExpenses, // Carry over
      savedItems: evt.logistics.items, // Carry over checklist
      savedFlow: evt.logistics.flow // Carry over flow
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

  const toggleFlowStep = async (evtId, step) => {
    const evt = events.find(e => e.id === evtId);
    if (!evt) return;

    await updateDoc(doc(db, "events", evtId), {
      [`logistics.flow.${step}`]: !evt.logistics.flow[step]
    });
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

  // --- PDF GENERATOR (LOGISTICS MISSION) ---
  // --- PDF GENERATOR (REDISEÑADO - ESTILO GESTOR) ---
  const generateMissionPDF = (evt) => {
    try {
      const doc = new jsPDF();
      const pageWidth = 210;
      const margin = 15;
      let y = 20;

      // Colores de Marca (Aproximados al Morado/Neon)
      const PURPLE = [98, 0, 234];
      const LIGHT_PURPLE = [240, 235, 255];
      const TEXT_GRAY = [60, 60, 60];

      // 1. HEADER
      // Logo (Placeholder Circle con Texto si no hay imagen)
      doc.setFillColor(...PURPLE);
      doc.circle(25, 25, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NEXXA', 19, 24);
      doc.text('SOUND', 19, 28);

      // Título y Datos Header
      doc.setTextColor(...PURPLE);
      doc.setFontSize(16);
      doc.text('INFORMACIÓN DEL SERVICIO', pageWidth - margin, 24, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const today = new Date().toLocaleDateString();
      doc.text(`Fecha Emisión: ${today}`, pageWidth - margin, 31, { align: 'right' });
      doc.text(`Evento: #${evt.id}`, pageWidth - margin, 36, { align: 'right' });

      // Línea divisora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 42, pageWidth - margin, 42);
      y = 52;

      // 2. BOX: ROL Y GESTOR
      doc.setFillColor(...LIGHT_PURPLE);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 3, 3, 'F');

      doc.setFontSize(11);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text(`ROL: MANAGER / STAFF`, margin + 6, y + 8);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`GESTOR: ${(evt.logistics.managerName || 'POR ASIGNAR').toUpperCase()}`, margin + 6, y + 16);
      y += 35;

      // 3. DATOS DEL SERVICIO
      doc.setFontSize(11);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL SERVICIO', margin, y);
      y += 10;

      const addRow = (label, val) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const valStr = val ? String(val) : '---';
        doc.text(valStr, margin + 50, y);
        y += 7;
      };

      addRow('CLIENTE:', evt.client.name.toUpperCase());
      addRow('CELULAR:', evt.client.phone);
      addRow('FECHA:', evt.eventDetails.date);
      addRow('UBICACIÓN:', evt.eventDetails.location);
      addRow('HORARIO:', `${evt.eventDetails.startTime} - ${evt.eventDetails.endTime}`);
      addRow('PAQUETE:', evt.logistics.packName.toUpperCase());

      const guests = evt.eventDetails.guestCount || '0';
      addRow('INVITADOS:', `${guests} Personas`);

      // Link Contacto
      y += 5;
      doc.setTextColor(0, 180, 50); // Verde
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      // Limpiar telefono para link
      const rawPhone = evt.client.phone ? evt.client.phone.replace(/\D/g, '') : '';
      if (rawPhone) {
        doc.textWithLink('>> CLIC AQUÍ PARA CONTACTAR AL CLIENTE <<', margin, y, { url: `https://wa.me/57${rawPhone}` });
      } else {
        doc.text('>> SIN TELÉFONO PARA CONTACTO <<', margin, y);
      }
      y += 15;

      // 4. ITEMS A CARGO (Lista compacta)
      doc.setFontSize(11);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEMS A CARGO', margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // Crear string de items
      const itemsList = evt.logistics.items
        .filter(i => i.qty > 0)
        .map(i => `${i.name} (${i.qty})`)
        .join(', ');

      const splitItems = doc.splitTextToSize(itemsList || 'Sin equipos asignados.', pageWidth - (margin * 2));
      doc.text(splitItems, margin, y);
      y += (splitItems.length * 5) + 8;

      // 5. MATERIALES & CONSUMIBLES (Desglose Extras)
      const activeExtras = getDynamicExtras(evt.eventDetails.guestCount, evt.logistics.makeupCount)
        .filter(ex => evt.logistics.selectedExtras && evt.logistics.selectedExtras[ex.id]);

      if (activeExtras.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(...PURPLE);
        doc.setFont('helvetica', 'bold');
        doc.text('MATERIALES A CARGO (CONSUMIBLES)', margin, y);
        y += 7;

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        // Formato párrafo detallado
        const materialsList = activeExtras.map(ex => `${ex.name}: [${ex.details}]`).join(', ');
        const splitMat = doc.splitTextToSize(materialsList, pageWidth - (margin * 2));
        doc.text(splitMat, margin, y);
        y += (splitMat.length * 5) + 10;
      }

      // 6. INFORMACIÓN DE PAGO (Footer Box)
      // Forzar pie de página si hay poco espacio, o ponerlo donde caiga
      if (y > 240) { doc.addPage(); y = 20; }
      else y += 10;

      if (evt.financials.balance > 0) {
        doc.setDrawColor(...PURPLE);
        doc.setFillColor(250, 245, 255);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 2, 2, 'FD');

        doc.setFontSize(11);
        doc.setTextColor(...PURPLE);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN DE PAGO:', margin + 5, y + 8);

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`Eres el encargado de cobrar el valor pendiente del servicio.`, margin + 5, y + 15);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 0, 0); // Rojo para el valor
        doc.text(`PENDIENTE A COBRAR: ${formatPeso(evt.financials.balance)}`, margin + 5, y + 20);

        // --- CUENTAS DE RECAUDO (BOX DENTRO DE BOX) ---
        const boxY = y + 25;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(margin + 5, boxY, pageWidth - (margin * 2) - 10, 35, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(...PURPLE);
        doc.text('CUENTAS AUTORIZADAS:', margin + 10, boxY + 6);

        // Columnas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        const col1X = margin + 10;
        const col2X = margin + 80;

        doc.text('NEQUI: 300 XXX XXXX', col1X, boxY + 14);
        doc.text('DAVIPLATA: 300 XXX XXXX', col1X, boxY + 22);

        doc.text('BANCOLOMBIA: AH - 123456789', col2X, boxY + 14);
        doc.text('EFECTIVO: Contra Entrega', col2X, boxY + 22);
      }

      // --- SAVE (Explicit Binary Blob Strategy) ---
      const pdfData = doc.output('arraybuffer');
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Orden_${evt.id}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 500);

    } catch (error) {
      console.error(error);
      alert('Error generando PDF: ' + error.message);
    }
  };


  // --- VIEW: ACCOUNTING (CAJA GENERAL) ---
  const renderAccounting = () => {
    // 1. Calculate Event Stats
    const totalDeposits = events.reduce((acc, evt) => acc + evt.financials.deposit, 0);

    const eventExpenses = events.reduce((acc, evt) => {
      const costs = evt.financials.extraExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return acc + costs;
    }, 0);

    // 2. Global Stats
    const globalIncome = globalTx.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const globalExpenses = globalTx.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);

    const totalIn = totalDeposits + globalIncome;
    const totalOut = eventExpenses + globalExpenses;
    const finalBalance = totalIn - totalOut;

    // 3. UNIFY TRANSACTIONS
    const allEventExpenses = [];
    events.forEach(evt => {
      evt.financials.extraExpenses.forEach(exp => {
        allEventExpenses.push({
          id: exp.id || Math.random(),
          realId: exp.id,
          eventId: evt.id,
          clientName: evt.client.name,
          date: exp.date || '---',
          desc: exp.desc,
          amount: exp.amount,
          type: 'OUT',
          isEvent: true
        });
      });
    });

    const normalizeGlobal = globalTx.map(t => ({ ...t, isEvent: false }));
    const combinedHistory = [...normalizeGlobal, ...allEventExpenses].sort((a, b) => (b.id || 0) - (a.id || 0));

    return (
      <div className="fade-in container">
        <div className="header-row">
          <button onClick={() => setView('menu')} className="icon-btn">← Menú</button>
          <h2>Caja General & Contabilidad</h2>
        </div>

        {/* SUMMARY CARDS */}
        <div className="stats-strip">
          <div className="stat">
            <span className="label">Ingresos Totales</span>
            <span className="value text-success">{formatPeso(totalIn)}</span>
            <small>Depositos: {formatPeso(totalDeposits)}</small>
          </div>
          <div className="stat">
            <span className="label">Gastos Totales</span>
            <span className="value text-danger">{formatPeso(totalOut)}</span>
            <small>Eventos: {formatPeso(eventExpenses)}</small>
          </div>
          <div className="stat main">
            <span className="label">Balance Neto</span>
            <span className="value text-primary">{formatPeso(finalBalance)}</span>
          </div>
        </div>

        {/* ADD TRANSACTION FORM */}
        <div className="card">
          <h3>Registrar Movimiento / Gasto</h3>
          <form
            className="create-form"
            onSubmit={(e) => {
              e.preventDefault();
              const type = e.target.type.value;
              let inputValue = e.target.linkTo.value.trim();
              const desc = e.target.desc.value;
              const amount = e.target.amount.value;

              let targetEventId = 'GENERAL';

              if (inputValue && inputValue.toUpperCase() !== 'GENERAL') {
                // 1. Try exact ID match
                let evt = events.find(e => e.id === inputValue);

                // 2. Try Composite String match
                if (!evt) {
                  evt = events.find(e => `${e.client.name} | ${e.eventDetails.date} [${e.id}]` === inputValue);
                }

                // 3. Try extracting ID from [brackets]
                if (!evt) {
                  const match = inputValue.match(/\[(EVT-.*?)\]/);
                  if (match) evt = events.find(e => e.id === match[1]);
                }

                if (evt) {
                  targetEventId = evt.id;
                } else {
                  alert('⚠️ Evento no reconocido. Por favor selecciona una opción de la lista.');
                  return;
                }
              }

              if (targetEventId === 'GENERAL') {
                addGlobalTx(desc, amount, type);
              } else {
                if (type === 'OUT') {
                  addExpense(targetEventId, desc, amount);
                } else {
                  alert('Solo se pueden registrar GASTOS a eventos específicos.');
                  return;
                }
              }
              e.target.reset();
              // e.target.linkTo.value = 'GENERAL'; 
            }}
          >
            <div className="form-section">
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px', display: 'block' }}>Asociar a (ID o Cliente):</label>

              <input
                name="linkTo"
                list="events-datalist"
                placeholder="🔍 Escribe ID, Cliente (o deja vacío para GENERAL)"
                style={{ fontWeight: 'bold', color: '#00d4ff', marginBottom: '10px' }}
              />
              <datalist id="events-datalist">
                <option value="GENERAL">Caja General (Sin Evento)</option>
                {events.filter(e => e.status !== 'FINISHED').map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.client.name}
                  </option>
                ))}
              </datalist>

              <div className="money-row">
                <input name="desc" placeholder="Descripción" required style={{ flex: 2 }} />
                <input name="amount" type="number" placeholder="Monto" required style={{ flex: 1 }} />
              </div>
              <div className="money-row">
                <select name="type">
                  <option value="OUT">Gasto (Salida)</option>
                  <option value="IN">Ingreso (Entrada)</option>
                </select>
                <button type="submit" className="action-btn primary-btn" style={{ marginTop: 0 }}>Registrar</button>
              </div>
            </div>
          </form>
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="expenses-list">
          <h3>Historial Unificado</h3>
          {combinedHistory.length === 0 ? (
            <p className="no-data">No hay movimientos registrados.</p>
          ) : (
            combinedHistory.map((tx, idx) => (
              <div key={idx} className="expense-row" style={{ borderLeft: tx.isEvent ? '3px solid #9d4edd' : '3px solid #555', paddingLeft: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className={`tag ${tx.type === 'IN' ? 'success' : 'warning'}`}>
                      {tx.type === 'IN' ? '+' : '-'}
                    </span>
                    <strong style={{ color: 'white' }}>{tx.desc}</strong>
                    <span className={tx.type === 'IN' ? 'text-success' : 'text-danger'}>
                      {formatPeso(tx.amount)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                    {tx.isEvent ? (
                      <span>📅 Evento: {tx.clientName}</span>
                    ) : (
                      <span>🏢 Caja General</span>
                    )}
                    <span style={{ marginLeft: '10px' }}>({tx.date})</span>
                  </div>
                </div>

                <button className="del-btn-mini" onClick={() => {
                  if (!confirm('¿Eliminar registro?')) return;
                  if (tx.isEvent) {
                    removeExpense(tx.eventId, tx.realId);
                  } else {
                    removeGlobalTx(tx.id);
                  }
                }}>x</button>
              </div>
            ))
          )}
        </div>

      </div >
    );
  };
  const deleteInventoryItem = (id) => {
    if (confirm('¿Estás seguro de ELIMINAR este equipo del inventario?')) {
      setInventory(inventory.filter(item => item.id !== id));
    }
  };

  const [editingItem, setEditingItem] = useState(null);

  const handleEditInventory = (e) => {
    e.preventDefault();
    const id = editingItem.id;
    const name = e.target.name.value;
    const category = e.target.category.value;
    const total = Number(e.target.total.value);
    const available = Number(e.target.available.value);

    setInventory(inventory.map(item => item.id === id ? { ...item, name, category, total, available } : item));
    setEditingItem(null);
  };

  // --- VIEW: INVENTORY ---
  const renderInventory = () => {
    const categories = ['Todo', 'Sonido', 'Iluminación', 'Estructura', 'Cableado', 'Varios'];

    const filteredInv = filterCat === 'Todo' ? inventory : inventory.filter(i => i.category === filterCat);

    return (
      <div className="fade-in container">
        <div className="header-row">
          <button onClick={() => setView('menu')} className="icon-btn">← Menú</button>
          <h2>Inventario & Equipos</h2>
        </div>

        {/* CATEGORY TABS */}
        <div className="tabs-row scrollable-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`tab-btn ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* INVENTORY LIST */}
        <div className="inventory-grid">
          {filteredInv.map(item => (
            <div key={item.id} className="inventory-card">
              <div className="inv-header">
                <span className="inv-category">{item.category}</span>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button className="icon-tiny-btn" onClick={() => setEditingItem(item)}>✏️</button>
                  <button className="icon-tiny-btn danger" onClick={() => deleteInventoryItem(item.id)}>🗑️</button>
                  <span className={`status-dot ${item.available === item.total ? 'ok' : 'warn'}`}></span>
                </div>
              </div>
              <h3>{item.name}</h3>
              <div className="inv-stats">
                <div className="stat-pill">
                  <span>Total</span>
                  <strong>{item.total}</strong>
                </div>
                <div className="stat-pill">
                  <span>Disp.</span>
                  <strong>{item.available}</strong>
                </div>
              </div>
              <div className="inv-actions">
                <button
                  className="report-btn"
                  onClick={() => setShowReportModal(item.id)}
                >
                  ⚠️ Reportar Daño
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* DAMAGE REPORTS SECTION */}
        <div className="damage-log-section">
          <h3>🚨 Reportes de Daños Activos</h3>
          {damageReports.filter(r => r.status === 'PENDING').length === 0 ? (
            <p className="text-muted">No hay daños pendientes de solución.</p>
          ) : (
            <div className="damage-list">
              {damageReports.filter(r => r.status === 'PENDING').map(report => {
                const item = inventory.find(i => i.id === report.itemId);
                return (
                  <div key={report.id} className="damage-card">
                    <strong>{item?.name || 'Item General'}</strong>
                    <p>{report.description}</p>
                    <small>{report.date}</small>
                    <button
                      className="solve-btn"
                      onClick={() => {
                        if (confirm('¿Marcar como solucionado?')) {
                          setDamageReports(damageReports.map(r => r.id === report.id ? { ...r, status: 'SOLVED' } : r));
                        }
                      }}
                    >
                      ✅ Solucionar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GLOBAL ACTIONS */}
        <div className="floating-actions">
          <button className="fab-btn primary-btn" onClick={() => setShowAddModal(true)}>
            + Nuevo Item
          </button>
        </div>

        {/* REPORT MODAL */}
        {showReportModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Reportar Daño</h3>
              <p>Item: {inventory.find(i => i.id === showReportModal)?.name}</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                reportDamage(showReportModal, e.target.desc.value);
                setShowReportModal(null);
              }}>
                <textarea name="desc" placeholder="Describe el daño..." autoFocus required></textarea>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowReportModal(null)}>Cancelar</button>
                  <button type="submit" className="danger-btn">Reportar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD ITEM MODAL */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Agregar Nuevo Equipo</h3>
              <form onSubmit={handleAddInventory}>
                <input name="name" placeholder="Nombre del Equipo (Ej: Micrófono Shure)" required />
                <div className="money-row">
                  <select name="category" required>
                    {categories.filter(c => c !== 'Todo').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input name="qty" type="number" placeholder="Cantidad Total" min="1" required />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddModal(false)}>Cancelar</button>
                  <button type="submit" className="primary-btn" style={{ marginTop: 0 }}>Agregar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT ITEM MODAL */}
        {editingItem && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Editar Equipo</h3>
              <form onSubmit={handleEditInventory}>
                <label>Nombre</label>
                <input name="name" defaultValue={editingItem.name} required />

                <label>Categoría</label>
                <select name="category" defaultValue={editingItem.category} required>
                  {categories.filter(c => c !== 'Todo').map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="money-row">
                  <div style={{ flex: 1 }}>
                    <label>Total</label>
                    <input name="total" type="number" defaultValue={editingItem.total} min="0" required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Disponible</label>
                    <input name="available" type="number" defaultValue={editingItem.available} min="0" required />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setEditingItem(null)}>Cancelar</button>
                  <button type="submit" className="primary-btn" style={{ marginTop: 0 }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- VIEWS ---

  const renderCreate = () => {
    // --- TARIFAS EXACTAS APP NEXXA (Used locally for logic) ---
    // (Note: PRICING moved to App scope for shared use)



    // --- PARSER DE WHATSAPP ---
    const handlePasteFromWhatsApp = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) return alert('Portapapeles vacío');

        const newData = { ...newEvent };

        // Regex Parsers (Robustos para formato WhatsApp)
        // Busca: "Emoji *Label:* Valor"
        const matchClient = text.match(/👤 \*?Cliente:\*? (.*)/i);
        const matchDate = text.match(/📅 \*?Fecha:\*? (.*)/i);
        // Time: Captura 08:00 PM ... 02:00 AM
        const matchTime = text.match(/⏰ \*?Horario:\*?.*?(\d{1,2}:\d{2})\s?(AM|PM).*?(\d{1,2}:\d{2})\s?(AM|PM)/i);
        const matchLoc = text.match(/📍 \*?Ubicación:\*? (.*)/i);
        const matchGuests = text.match(/👥 \*?Invitados:\*? (\d+)/i);
        const matchPack = text.match(/📦 \*?Paquete:\*? (.*)/i);
        const matchExtras = text.match(/➕ \*?Extras:\*? (.*)/i);

        if (matchClient) newData.clientName = matchClient[1].trim();
        if (matchDate) newData.date = matchDate[1].trim();
        if (matchGuests) newData.guestCount = matchGuests[1].trim();

        if (matchTime) {
          // Convertir 12h AM/PM a 24h
          const parseTime = (t, ap) => {
            let [h, m] = t.split(':').map(Number);
            if (ap) {
              if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
              if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
            }
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }
          newData.startTime = parseTime(matchTime[1], matchTime[2]);
          newData.endTime = parseTime(matchTime[3], matchTime[4]);
        }

        // Fallback para ubicación si viene "Barrio, Dir"
        if (matchLoc) newData.location = matchLoc[1].trim();

        if (matchPack) {
          const pName = matchPack[1].toLowerCase();
          if (pName.includes('essential')) newData.packName = 'Essential';
          else if (pName.includes('memories')) newData.packName = 'Memories';
          else if (pName.includes('celebration')) newData.packName = 'Celebration';
          else newData.packName = 'Personalizado';
        }

        // Parse Extras del texto (ej: "Maquillaje Neón, Accesorios...")
        const newExtras = {};
        if (matchExtras) {
          const exText = matchExtras[1].toLowerCase();
          if (exText.includes('maquillaje')) newExtras['extra_makeup'] = true;
          if (exText.includes('accesorios') && exText.includes('essential')) newExtras['acc_essential'] = true;
          if (exText.includes('accesorios') && exText.includes('memories')) newExtras['acc_memories'] = true;
          if (exText.includes('accesorios') && exText.includes('celebration')) newExtras['acc_celebration'] = true;
        }
        newData.selectedExtras = newExtras;

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

    // Helper to calculate hours
    const getHours = (start, end) => {
      if (!start || !end) return 0;
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      return diffMinutes / 60;
    };

    // Smart Updater
    const updateEvent = (field, value) => {
      let updated = { ...newEvent };

      if (field === 'toggleExtra') {
        const currentExtras = { ...updated.selectedExtras };
        // Force boolean toggle
        currentExtras[value] = !currentExtras[value];
        updated.selectedExtras = currentExtras;
      } else if (field === 'changeMakeupCount') {
        updated.makeupCount = value;
      } else if (field === 'guestCount') {
        updated.guestCount = value;
        // NEXXA RULE: Re-apply 1 artist per 50 guests logic by clearing manual override
        updated.makeupCount = null;
      } else {
        updated[field] = value;
      }

      // Auto-Calc Logic
      const pack = updated.packName;
      const start = updated.startTime;
      const end = updated.endTime;
      const guests = Number(updated.guestCount) || 10;
      const selExtras = updated.selectedExtras || {};

      // Recalcular lista de precios basada en los NUEVOS invitados y override de makeup
      const currentExtrasList = getDynamicExtras(guests, updated.makeupCount);

      if (PRICING[pack] && start && end && pack !== 'Personalizado') {
        const conf = PRICING[pack];
        const duration = getHours(start, end);
        // Regla: Base incluye 4 horas. Hora adicional se cobra si duration > 4
        // Math.ceil para cobrar hora completa por fracción
        const itemsExtra = Math.max(0, Math.ceil(duration - 4));

        let calculatedTotal = conf.base + (itemsExtra * conf.extra);

        // Sumar Extras Seleccionados con PRECIOS DINÁMICOS
        currentExtrasList.forEach(ex => {
          if (selExtras[ex.id]) calculatedTotal += ex.price;
        });

        updated.totalValue = calculatedTotal;
      }
      // Si es Personalizado o datos incompletos, no autoborramos el valor manual a menos que sea un cambio explícito de extras?
      // Mejor: Si no es Personalizado siempre calculamos. Si es Personalizado, sumamos base 0 + extras?
      else if (pack === 'Personalizado') {
        // Mantener valor manual o sumar solo extras? 
        // En personalizada el usuario mete todo a mano, pero si selecciona extras, podríamos sumarlos?
        // Por seguridad, en Personalizado NO tocamos el totalValue automáticamente a menos que sea 0/vacío
        if (!updated.totalValue) {
          let sum = 0;
          currentExtrasList.forEach(ex => { if (selExtras[ex.id]) sum += ex.price; });
          updated.totalValue = sum;
        }
      }

      setNewEvent(updated);
    };

    const currentConf = PRICING[newEvent.packName] || {};
    const duration = newEvent.startTime && newEvent.endTime ? getHours(newEvent.startTime, newEvent.endTime) : 0;
    const extrasKy = Math.max(0, Math.ceil(duration - 4));

    return (
      <div className="fade-in container">
        <div className="header-row">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setView(newEvent.id ? 'events' : 'menu')} className="icon-btn">←</button>
            <button onClick={handlePasteFromWhatsApp} className="action-btn" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📋 WhatsApp
            </button>
            <button
              onClick={() => {
                if (confirm('¿Descartar cambios y limpiar formulario?')) {
                  setNewEvent({ clientName: '', clientPhone: '', date: '', startTime: '', endTime: '', location: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '' });
                  localStorage.removeItem('nexxa_draft_event');
                }
              }}
              className="action-btn"
              style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#333', color: '#ccc', border: '1px solid #555' }}>
              🗑️ Limpiar
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0 }}>{newEvent.id ? 'Editar Evento' : 'Nuevo Evento'}</h2>
            <small style={{ color: '#00d4ff', fontSize: '0.7rem' }}>💾 Autoguardado Activo</small>
          </div>
        </div>

        <form onSubmit={handleCreateEvent} className="create-form">

          {/* SECCIÓN 1: CLIENTE */}
          <div className="form-section">
            <h3>1. Cliente</h3>
            <input required placeholder="Nombre Cliente" value={newEvent.clientName} onChange={e => updateEvent('clientName', e.target.value)} />
            <input placeholder="WhatsApp (Opcional)" value={newEvent.clientPhone} onChange={e => updateEvent('clientPhone', e.target.value)} type="tel" />
          </div>

          {/* SECCIÓN 2: LOGÍSTICA (FECHA Y HORARIOS) */}
          <div className="form-section">
            <h3>2. Fecha y Horarios</h3>

            {/* Row 1: Date & Guests */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Fecha</label>
                <input required type="date" value={newEvent.date} onChange={e => updateEvent('date', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Invitados</label>
                <input type="number" placeholder="#" value={newEvent.guestCount || ''} onChange={e => updateEvent('guestCount', e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Row 2: Time Range (Compact & Fixed Layout) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>

              {/* START TIME */}
              {/* START TIME */}
              <TimeInput
                label="Hora Inicio"
                value={newEvent.startTime}
                onChange={(val) => updateEvent('startTime', val)}
              />

              {/* END TIME */}
              <TimeInput
                label="Hora Fin"
                value={newEvent.endTime}
                onChange={(val) => updateEvent('endTime', val)}
              />

            </div>

            {duration > 0 && (
              <div style={{ marginBottom: '10px', padding: '5px 10px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '20px', fontSize: '0.8rem', textAlign: 'center', color: '#00d4ff' }}>
                ⏱ <strong>{duration.toFixed(1)}h</strong>
                {extrasKy > 0 && <span style={{ color: '#facc15', marginLeft: '5px' }}> (+{extrasKy}h extra)</span>}
              </div>
            )}

            {/* Row 3: Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <input required placeholder="Barrio" value={newEvent.neighborhood || ''} onChange={e => updateEvent('neighborhood', e.target.value)} />
              <input required placeholder="Dirección Exacta" value={newEvent.location} onChange={e => updateEvent('location', e.target.value)} />
            </div>
          </div>

          {/* SECCIÓN 3: PAQUETE Y EXTRAS */}
          <div className="form-section">
            <h3>3. Paquete y Extras</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <select style={{ flex: 1 }} value={newEvent.packName} onChange={e => updateEvent('packName', e.target.value)}>
                <option value="Essential">Essential ($450k)</option>
                <option value="Memories">Memories ($650k)</option>
                <option value="Celebration">Celebration ($850k)</option>
                <option value="Personalizado">Personalizado</option>
              </select>
              <input style={{ flex: 1 }} placeholder="Responsable (Opcional)" value={newEvent.managerName} onChange={e => updateEvent('managerName', e.target.value)} />
            </div>

            <div className="extras-selection-box" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#00d4ff', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir Adicionales:</h4>
              <div className="extras-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount).map(extra => {
                  const isActive = !!(newEvent.selectedExtras && newEvent.selectedExtras[extra.id]);
                  return (
                    <div
                      key={extra.id}
                      className={`extra-item ${isActive ? 'selected-extra' : ''}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px',
                        borderRadius: '12px',
                        background: isActive ? 'linear-gradient(90deg, rgba(0, 212, 255, 0.05), transparent)' : 'rgba(255, 255, 255, 0.03)',
                        borderLeft: isActive ? '4px solid #00d4ff' : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => updateEvent('toggleExtra', extra.id)}
                    >
                      {/* Header: Name + Switch */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: isActive ? 'white' : '#ddd' }}>
                          {extra.name}
                        </span>

                        {/* Styled Switch Visual */}
                        <div style={{
                          width: '40px',
                          height: '22px',
                          background: isActive ? '#00d4ff' : '#444',
                          borderRadius: '20px',
                          position: 'relative',
                          transition: 'background 0.3s',
                          boxShadow: isActive ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '3px',
                            left: isActive ? '21px' : '3px',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                          }} />
                        </div>
                      </div>

                      {/* Material Details */}
                      <div style={{ fontSize: '0.75rem', color: isActive ? '#ccc' : '#888', marginTop: '5px', fontStyle: 'italic' }}>
                        {extra.details}
                      </div>

                      {/* Price Label */}
                      <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.9rem',
                          color: isActive ? '#00d4ff' : '#888',
                          fontWeight: isActive ? 'bold' : 'normal'
                        }}>
                          + ${extra.price.toLocaleString()}
                        </span>

                        {extra.isMakeup && isActive && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '20px', border: '1px solid #00d4ff' }}
                          >
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', color: '#00d4ff', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', padding: '0 5px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = extra.qty || 1;
                                const newVal = Math.max(1, current - 1);
                                updateEvent('changeMakeupCount', newVal);
                              }}
                            >-</button>
                            <span style={{ color: 'white', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{extra.qty}</span>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', color: '#00d4ff', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', padding: '0 5px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = extra.qty || 1;
                                updateEvent('changeMakeupCount', current + 1);
                              }}
                            >+</button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: COTIZACIÓN (TOTAL) */}
          <div className="form-section" style={{ borderColor: '#00d4ff', borderWidth: '1px', borderStyle: 'solid' }}>
            <h3 style={{ color: '#00d4ff' }}>4. Cotización Final</h3>

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
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15' }}>
                        <span>+ {extrasKy} Horas Extras:</span>
                        <strong>${(extrasKy * (currentConf.extra || 0)).toLocaleString()}</strong>
                      </div>
                    )}

                    {/* EXTRAS SELECCIONADOS */}
                    {getDynamicExtras(newEvent.guestCount, newEvent.makeupCount).map(ex => {
                      if (newEvent.selectedExtras?.[ex.id]) {
                        return (
                          <div key={ex.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa' }}>
                              <span style={{ fontSize: '0.75rem' }}>+ {ex.name}:</span>
                              <strong>${ex.price.toLocaleString()}</strong>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#666', paddingLeft: '10px' }}>
                              {ex.details}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
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
                      setNewEvent({ ...newEvent, totalValue: raw });
                    }
                  }}
                  style={{ fontWeight: 'bold', color: '#00d4ff', fontSize: '1.4rem', height: '50px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Abono Recibido (Reserva)</label>
              <input required placeholder="$ 0" type="number" value={newEvent.deposit} onChange={e => updateEvent('deposit', e.target.value)} />
            </div>
          </div>

          <div className="action-buttons-row" style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button type="button" className="action-btn secondary-btn" style={{ flex: 1, padding: '15px' }} onClick={() => handleCreateEvent(null, 'DRAFT')}>
              📝 Guardar Borrador
            </button>
            <button type="button" className="action-btn primary-btn" style={{ flex: 1, padding: '15px' }} onClick={() => handleCreateEvent(null, 'CONFIRMED')}>
              {newEvent.id ? '✅ Actualizar Evento' : '✅ Confirmar Evento'}
            </button>
          </div>
        </form>
      </div>
    )
  };


  const renderDetail = () => {
    const evt = getSelectedEvent();
    if (!evt) return null;

    // Calculate Financials live
    const totalExpenses = evt.financials.extraExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = evt.financials.totalValue - totalExpenses;

    return (
      <div className="fade-in container detail-view">
        {/* HEADER */}
        <div className="header-row">
          <button onClick={() => setView('events')} className="icon-btn">← Volver</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="icon-btn" onClick={() => editEvent(evt)}>✏️ Editar</button>
            <div className="event-status-badge">{evt.status}</div>
          </div>
        </div>

        <div className="card hero-card compact">
          <h1>{evt.client.name}</h1>
          <p className="subtitle">{evt.logistics.packName} • {evt.eventDetails.date}</p>
        </div>

        {/* --- SECTION: GENERAL --- */}
        <div className="sheet-section" style={{ marginBottom: '20px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', fontSize: '0.9rem', color: '#00d4ff', fontWeight: 'bold' }}>
            📍 UBICACIÓN Y HORARIOS
          </div>
          <div className="info-block">
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>{evt.eventDetails.location || "Ubicación pendiente"}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>⏰ {evt.eventDetails.startTime} - {evt.eventDetails.endTime}</span>
              <span className="tag" style={{ background: '#333', border: '1px solid #555' }}>
                {(() => {
                  const [h1, m1] = evt.eventDetails.startTime.split(':').map(Number);
                  const [h2, m2] = evt.eventDetails.endTime.split(':').map(Number);
                  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                  if (diff < 0) diff += 24 * 60;
                  const h = Math.floor(diff / 60);
                  const m = diff % 60;
                  return `${h} h ${m > 0 ? `${m} m` : ''}`;
                })()}
              </span>
            </div>
            <p style={{ marginTop: '10px', color: '#888', fontSize: '0.9rem' }}>👤 Responsable: <span style={{ color: 'white' }}>{evt.logistics.managerName}</span></p>
          </div>
        </div>

        {/* --- SECTION: LOGISTICS FLOW --- */}
        <div className="sheet-section" style={{ marginBottom: '20px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', fontSize: '0.9rem', color: '#00d4ff', fontWeight: 'bold' }}>
            🚀 FLUJO OPERATIVO
          </div>
          <div className="flow-grid">
            <button className={`flow-btn ${evt.logistics.flow?.staffConfirmed ? 'done' : ''}`} onClick={() => toggleFlowStep(evt.id, 'staffConfirmed')}>
              👤 Confirmado
            </button>
            <button className={`flow-btn ${evt.logistics.flow?.equipmentDelivered ? 'done' : ''}`} onClick={() => toggleFlowStep(evt.id, 'equipmentDelivered')}>
              🚚 Entregado
            </button>
            <button className={`flow-btn ${evt.logistics.flow?.equipmentReturned ? 'done' : ''}`} onClick={() => toggleFlowStep(evt.id, 'equipmentReturned')}>
              📦 Recibido
            </button>
            <button className={`flow-btn ${evt.logistics.flow?.staffPaid ? 'done' : ''}`} onClick={() => toggleFlowStep(evt.id, 'staffPaid')}>
              💰 Pago Staff
            </button>
          </div>
        </div>

        {/* --- SECTION: EQUIPMENT --- */}
        <div className="sheet-section" style={{ marginBottom: '20px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', fontSize: '0.9rem', color: '#00d4ff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📦 EQUIPO ASIGNADO</span>
            <button className="tile-btn pdf-btn mini" onClick={() => generateMissionPDF(evt)} style={{ padding: '4px 10px', fontSize: '0.7rem', height: 'auto', minHeight: 'unset' }}>
              📄 PDF
            </button>
          </div>
          <div className="checklist-container">
            {evt.logistics.items.map((item, idx) => (
              <div key={idx} className="checklist-item" onClick={() => toggleLogisticsItem(evt.id, idx)}>
                <div className={`checkbox ${item.checked ? 'checked' : ''}`}>{item.checked ? '✓' : ''}</div>
                <span>{item.name} (x{item.qty})</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- SECTION: FINANCIALS (THEMED RECAUDO) --- */}
        <div className="sheet-section" style={{ marginBottom: '50px' }}>

          {/* Main Recaudo Card (Green Theme) */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(0, 50, 0, 0.6) 0%, rgba(0, 20, 0, 0.9) 100%)',
            border: '1px solid #2eff7b',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 0 15px rgba(46, 255, 123, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background texture effect */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              backgroundImage: 'radial-gradient(#2eff7b 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.1,
              pointerEvents: 'none'
            }}></div>

            <h3 style={{ color: '#2eff7b', fontSize: '0.9rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Objetivo de Recaudo
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2eff7b', textShadow: '0 0 10px rgba(46, 255, 123, 0.5)' }}>
                {formatPeso(evt.financials.balance)}
              </div>
              <div style={{ fontSize: '3rem' }}>💰</div>
            </div>

            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px' }}>
              {evt.financials.balance > 0 ? 'Debe cobrarse al cliente al inicio.' : '✅ Todo al día. No se requiere cobro.'}
            </p>

            {/* Accounts Grid */}
            <h4 style={{ color: '#2eff7b', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase' }}>Cuentas Autorizadas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { name: 'NEQUI', val: '300 123 4567' },
                { name: 'DAVIPLATA', val: '300 123 4567' },
                { name: 'BANCOLOMBIA', val: 'AH - 123456789' },
                { name: 'EFECTIVO', val: 'Contra Entrega' }
              ].map((acc, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (acc.name !== 'EFECTIVO') {
                      navigator.clipboard.writeText(acc.val.replace(/[^0-9]/g, ''));
                      alert(`Copiado: ${acc.name}`);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #2eff7b',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(46, 255, 123, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  <strong style={{ display: 'block', color: 'white', fontSize: '0.9rem' }}>{acc.name}</strong>
                  <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{acc.val}</span>
                  {acc.name !== 'EFECTIVO' && <span style={{ position: 'absolute', right: '5px', top: '5px', fontSize: '0.7rem', opacity: 0.5 }}>📋</span>}
                </div>
              ))}
            </div>

          </div>

          {/* Expenses List (Kept underneath implicitly or moved? Let's keep it minimal as in image context, maybe collapsed) */}
          <div className="expenses-list" style={{ marginTop: '25px', borderTop: '1px solid #333', paddingTop: '15px' }}>
            <h4 style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>Registro de Gastos Adicionales</h4>
            {evt.financials.extraExpenses.length === 0 ? (
              <p className="no-data" style={{ opacity: 0.5, fontStyle: 'italic' }}>Sin gastos registrados</p>
            ) : (
              evt.financials.extraExpenses.map((exp, idx) => (
                <div key={idx} className="expense-row">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{exp.desc}</span>
                    <small className="text-muted">{exp.date}</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{formatPeso(exp.amount)}</span>
                    <button className="del-btn-mini" onClick={() => removeExpense(evt.id, exp.id)}>x</button>
                  </div>
                </div>
              ))
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              const d = e.target.desc.value;
              const a = e.target.amount.value;
              addExpense(evt.id, d, a);
              e.target.reset();
            }} style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <input name="desc" placeholder="Descripción Gasto" required style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: 'white' }} />
              <input name="amount" type="number" placeholder="$" required style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: 'white' }} />
              <button type="submit" className="action-btn" style={{ width: 'auto', padding: '0 15px', background: '#333', border: '1px solid #555' }}>+</button>
            </form>
          </div>
        </div>

      </div>
    );
  };

  // --- VIEW: MAIN MENU ---
  const renderMenu = () => (
    <div className="fade-in container menu-view" style={{ textAlign: 'center', paddingTop: '40px' }}>
      <header className="main-header" style={{ justifyContent: 'center', flexDirection: 'column', border: 'none' }}>
        <h1 className="brand-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Nexxa Manager</h1>
        <p className="brand-subtitle" style={{ fontSize: '1.1rem' }}>Centro de Comando</p>
      </header>

      <div className="menu-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

        {/* CARD: COTIZACIONES (Nuevo Evento) */}
        <div
          className="card menu-card"
          onClick={() => setView('create')}
          style={{ cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', padding: '30px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(0,0,0,0) 100%)', zIndex: 0 }}></div>
          <div style={{ zIndex: 1 }}>
            <div className="icon" style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📝</div>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Cotizaciones</h3>
            <p style={{ opacity: 0.7, marginTop: '5px' }}>Crear nuevas propuestas y calcular precios.</p>
          </div>
          <div style={{ zIndex: 1, marginTop: '20px' }}>
            <span className="tag" style={{ background: '#facc15', color: 'black' }}>Generador PDF</span>
          </div>
        </div>

        {/* CARD: GESTION DE EVENTOS */}
        <div
          className="card menu-card"
          onClick={() => setView('events')}
          style={{ cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', padding: '30px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(0,0,0,0) 100%)', zIndex: 0 }}></div>
          <div style={{ zIndex: 1 }}>
            <div className="icon" style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📅</div>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Eventos y Logística</h3>
            <p style={{ opacity: 0.7, marginTop: '5px' }}>Calendario de entregas y gestión operativa.</p>
          </div>
          <div style={{ zIndex: 1, marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="tag success">{events.filter(e => e.status !== 'FINISHED').length} Activos</span>
          </div>
        </div>

        {/* CARD: INVENTARIO */}
        <div
          className="card menu-card"
          onClick={() => setView('inventory')}
          style={{ cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', padding: '30px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(0,0,0,0) 100%)', zIndex: 0 }}></div>
          <div style={{ zIndex: 1 }}>
            <div className="icon" style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📦</div>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Inventario</h3>
            <p style={{ opacity: 0.7, marginTop: '5px' }}>Control de equipos, reporte de daños y solicitudes.</p>
          </div>
        </div>

        {/* CARD: CONTABILIDAD */}
        <div
          className="card menu-card"
          onClick={() => setView('accounting')}
          style={{ cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', padding: '30px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(157,78,221,0.1) 0%, rgba(0,0,0,0) 100%)', zIndex: 0 }}></div>
          <div style={{ zIndex: 1 }}>
            <div className="icon" style={{ fontSize: '2.5rem', marginBottom: '15px' }}>💰</div>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Contabilidad</h3>
            <p style={{ opacity: 0.7, marginTop: '5px' }}>Caja menor, ingresos y control de gastos.</p>
          </div>
        </div>

      </div>

      <p style={{ marginTop: '50px', opacity: 0.3, fontSize: '0.8rem' }}>Nexxa Sound &copy; 2026</p>
    </div>
  );

  // --- VIEW: EVENTS LIST (Formerly Dashboard) ---
  const renderEventsList = () => (
    <div className="fade-in container dashboard">
      <header className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setView('menu')} className="icon-btn" style={{ fontSize: '1.2rem' }}>←</button>
          <div>
            <h2 style={{ margin: 0 }}>Eventos</h2>
            <p className="brand-subtitle">Calendario Activo</p>
          </div>
        </div>
        <button className="add-btn" onClick={() => setView('create')}>+</button>
      </header >

      {/* Draft Indicator */}
      {(newEvent.clientName || newEvent.totalValue) && (
        <div
          onClick={() => setView('create')}
          style={{
            background: 'var(--surface-color)',
            border: '1px solid #00d4ff',
            margin: '0 0 20px 0',
            padding: '10px 15px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            animation: 'fadeIn 0.5s ease'
          }}>
          <div>
            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>📝 Tienes un borrador activo</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>{newEvent.clientName || 'Sin nombre'} • Continuar editando</span>
          </div>
          <span style={{ fontSize: '1.2rem' }}>➔</span>
        </div>
      )}

      <div className="stats-strip">
        <div className="stat">
          <span className="label">Eventos Activos</span>
          <span className="value">{events.filter(e => e.status !== 'FINISHED').length}</span>
        </div>
        <div className="stat">
          <span className="label">Por Cobrar</span>
          <span className="value">{formatPeso(events.reduce((acc, e) => acc + (e.status !== 'FINISHED' ? e.financials.balance : 0), 0))}</span>
        </div>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No hay eventos activos.</p>
            <p>Dale al <strong>+</strong> cuando recibas un abono.</p>
          </div>
        ) : (
          events.map(evt => (
            <div
              key={evt.id}
              className="event-card"
              onClick={() => {
                // Ensure ID exists before setting view
                if (evt.id) {
                  setSelectedEventId(evt.id);
                  setView('detail');
                } else {
                  console.warn("Event with no ID clicked", evt);
                }
              }}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation',
                position: 'relative',
                zIndex: 999
              }}
            >
              <div className="card-date">
                <span className="day">{evt.eventDetails.date ? evt.eventDetails.date.split('-')[2] : '??'}</span>
                <span className="month">MES</span>
              </div>
              <div className="card-info">
                <h3>{evt.client.name}</h3>
                <p>{evt.logistics.packName}</p>
                <div className="tags">
                  {evt.financials.balance > 0 && evt.status === 'CONFIRMED' && <span className="tag warning">Cobrar {formatPeso(evt.financials.balance)}</span>}
                  {evt.status === 'DRAFT' && <span className="tag" style={{ background: '#FF9800', color: 'black' }}>📝 Borrador</span>}
                  {evt.logistics.flow.missionPdfSent && evt.status === 'CONFIRMED' && <span className="tag success">PDF Enviado</span>}

                  {/* Debug ID Tag if missing */}
                  {!evt.id && <small style={{ color: 'red' }}>Falta ID</small>}
                </div>
              </div>
              <button className="delete-btn" onClick={(e) => deleteEvent(evt.id, e)}>🗑️</button>
              <div className="card-arrow">→</div>
            </div>
          ))
        )}
      </div>
    </div >
  );

  return (
    <div className="app-shell">
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>

      {view === 'menu' && renderMenu()}
      {view === 'events' && renderEventsList()}
      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
      {view === 'inventory' && renderInventory()}
      {view === 'accounting' && renderAccounting()}
    </div>
  );
}

export default App;
