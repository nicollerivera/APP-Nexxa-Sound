import React, { useState, useEffect } from 'react';

import QuotationsView from './components/QuotationsView';
import AccountingView from './components/AccountingView';
import CreateEventView from './components/CreateEventView';
import InventoryView from './components/InventoryView';
import LogisticsView from './components/LogisticsView';
import { getDynamicExtras } from './utils/helpers';

// --- IMPORTS MOVED ---
import { formatPeso, months, getHours, parseFirestoreDate, parseLocalStrDate, getTodayStr, getTomorrowStr, subtractMinutes, formatInputNumber, parseInputNumber } from './utils/helpers';
import {
  IconArrowLeft, IconEdit, IconPhone, IconLocation, IconNeighborhood,
  IconPDF, IconServices, IconFlow, IconRecaudo, IconCopy,
  IconPayroll, IconCheck, IconUser, IconPlus, IconHistory,
  IconWhatsApp, IconStaff, IconAlertTriangle, IconCalendar, IconInventory,
  IconTrash, IconArrowRight, IconChecklist, IconCamera, IconSettings,
  IconLogout, IconLogoNexxa, IconHome, IconBox, IconIndicator, IconFileText
} from './components/Icons';
import * as pdfService from './services/pdfService';
import { db, auth } from './firebase';
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc,
  serverTimestamp, query, where, orderBy, getDocs, getDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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
  const [lastFatalError, setLastFatalError] = useState(null);

  // Error listener for Mobile Debugging
  useEffect(() => {
    const handleError = (event) => {
      setLastFatalError(event.error?.message || event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // 1. SYNC EVENTS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      // PROTECCIÓN RADICAL: Validar que snapshot.docs sea un array
      if (!snapshot || !snapshot.docs || !Array.isArray(snapshot.docs)) {
        console.error("âš ï¸ onSnapshot events: snapshot.docs no es un array");
        return;
      }

      const liveEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // AUDITORÃA: Detectar eventos sin client.name
      liveEvents.forEach(evt => {
        if (!evt.client || (!evt.client.name && !evt.clientName)) {
          console.error("ðŸ”´ EVENTO SIN NOMBRE DETECTADO:", {
            id: evt.id,
            client: evt.client,
            clientName: evt.clientName,
            fullData: evt
          });
        }
      });

      // FILTRO DE SEGURIDAD: Eliminar eventos sin datos crÃ­ticos
      const validEvents = liveEvents.filter(evt => {
        const hasValidClient = evt && (evt.client?.name || evt.clientName);
        if (!hasValidClient) {
          console.warn("âš ï¸ Evento filtrado por falta de nombre:", evt?.id);
        }
        return hasValidClient;
      });

      // Orden cronolÃ³gico: Los eventos mÃ¡s cercanos a suceder aparecen primero
      setEvents(validEvents.sort((a, b) => {
        if (!a || !b) return 0;
        const dateA = a.eventDetails?.date || '';
        const dateB = b.eventDetails?.date || '';
        if (dateA === dateB) return (a.id || '').localeCompare(b.id || '');
        return dateA.localeCompare(dateB);
      }));
    });
    return () => unsubscribe();
  }, []);

  // 1.5 SYNC QUOTATIONS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotations"), (snapshot) => {
      // PROTECCIÓN RADICAL: Validar que snapshot.docs sea un array
      if (!snapshot || !snapshot.docs || !Array.isArray(snapshot.docs)) {
        console.error("âš ï¸ onSnapshot quotations: snapshot.docs no es un array");
        return;
      }

      const liveQuo = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // AUDITORÃA: Detectar cotizaciones sin client.name
      liveQuo.forEach(quo => {
        if (!quo.client || (!quo.client.name && !quo.clientName)) {
          console.error("ðŸ”´ COTIZACIÓN SIN NOMBRE DETECTADA:", {
            id: quo.id,
            client: quo.client,
            clientName: quo.clientName
          });
        }
      });

      // FILTRO DE SEGURIDAD: Eliminar cotizaciones sin nombre
      const validQuotations = liveQuo.filter(quo => {
        return quo && (quo.client?.name || quo.clientName);
      });

      setQuotations(validQuotations.sort((a, b) => {
        if (!a || !b) return 0;
        // 1. PRIORIDAD: ESTADO 'SENT' (Leads nuevos) ARRIBA
        if (a.status === 'SENT' && b.status !== 'SENT') return -1;
        if (a.status !== 'SENT' && b.status === 'SENT') return 1;

        // 2. ORDEN CRONOLÓGICO: MÃ¡s reciente primero
        const dateA = parseFirestoreDate(a.createdAt);
        const dateB = parseFirestoreDate(b.createdAt);
        if (dateA && dateB && dateA.getTime && dateB.getTime && dateA.getTime() !== dateB.getTime()) return dateB - dateA;

        // 3. FALLBACK: ID
        return (b.id || '').localeCompare(a.id || '');
      }));
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNC INVENTORY
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      // PROTECCIÓN RADICAL: Validar que snapshot.docs sea un array
      if (!snapshot || !snapshot.docs || !Array.isArray(snapshot.docs)) {
        console.error("âš ï¸ onSnapshot inventory: snapshot.docs no es un array");
        return;
      }

      const liveInv = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // AUDITORÃA: Detectar items sin name
      liveInv.forEach(item => {
        if (!item.name) {
          console.error("ðŸ”´ ITEM DE INVENTARIO SIN NOMBRE:", {
            id: item.id,
            category: item.category,
            fullData: item
          });
        }
      });

      // FILTRO DE SEGURIDAD: Solo items con nombre
      const validInventory = liveInv.filter(item => {
        return item && item.name;
      });

      setInventory(validInventory);
    });
    return () => unsubscribe();
  }, []);

  // 3. SYNC GLOBAL TX
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "globalTx"), (snapshot) => {
      const liveTx = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setGlobalTx(liveTx.sort((a, b) => {
        const da = new Date(a.createdAt || a.date || 0);
        const db_ = new Date(b.createdAt || b.date || 0);
        return db_ - da;
      }));
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




  const [view, setView] = useState('logistics'); // Default to events instead of dashboard
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
  const [sectionState, setSectionState] = useState({ s1: true, s2: false, s3: false });
  const toggleSection = (key) => setSectionState(prev => ({ ...prev, [key]: !prev[key] }));
  const [tempBalanceVal, setTempBalanceVal] = useState('');
  const [approveModal, setApproveModal] = useState(null); // { quo }
  const [paymentModal, setPaymentModal] = useState(null); // { evt, type: 'DEPOSIT' | 'FINAL' }
  const [paymentSplit, setPaymentSplit] = useState({ Nequi: 0, Daviplata: 0, Efectivo: 0 });
  const [historySearch, setHistorySearch] = useState('');
  const [adAllocations, setAdAllocations] = useState({});

  // --- AUTH STATE ---
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(() => {
    try {
      const savedKey = 'nexxa_user';
      const savedTimeKey = 'nexxa_login_time';
      const saved = localStorage.getItem(savedKey);
      const savedTime = localStorage.getItem(savedTimeKey);

      // PREVENT CRASH: If saved is "undefined" string or similar
      if (!saved || saved === 'undefined' || saved === 'null') return null;

      // SECURITY: Force re-login after 1 hour (3600000 ms)
      if (!savedTime || (Date.now() - Number(savedTime) > 3600000)) {
        console.warn("Session expired. Clearing user.");
        localStorage.removeItem(savedKey);
        localStorage.removeItem(savedTimeKey);
        localStorage.removeItem('nexxa_role');
        return null; // Force logout
      }

      const parsedUser = JSON.parse(saved);

      // RESET DE MEMORIA RADICAL: Limpiar TODO si hay datos corruptos
      // Check for 'name' specifically as it seems to be the crash point
      if (!parsedUser || typeof parsedUser !== 'object') {
        localStorage.removeItem(savedKey);
        return null;
      }

      if (!parsedUser.name) {
        console.error("🔴 USUARIO SIN NOMBRE - LIMPIANDO TODO LOCALSTORAGE:", parsedUser);
        localStorage.clear(); // LIMPIAR TODO
        return null;
      }

      return parsedUser;
    } catch (e) {
      console.error("Error reading nexxa_user from localStorage:", e);
      localStorage.clear(); // Limpiar en caso de error
      return null;
    }
  });

  // DEBUGGING CONSOLE (Moved after user definition)
  console.log("DEBUG NEXXA - App Rendering:", {
    user: user || { name: 'No User' },
    userName: user?.name || 'No User',
    eventsCount: events?.length || 0,
    quotationsCount: quotations?.length || 0
  });
  const [userRole, setUserRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem('nexxa_role');
      return savedRole || null;
    } catch (e) {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Placeholder for session check (Moved below handleLogout)

  // ðŸ” FUNCIÓN DE AUDITORÃA TEMPORAL - Detectar registros corruptos
  useEffect(() => {
    const auditFirebaseData = async () => {
      console.log("ðŸ” INICIANDO AUDITORÃA DE FIREBASE...");

      try {
        // Auditar EVENTOS
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const corruptedEvents = [];
        eventsSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.client || (!data.client.name && !data.clientName)) {
            corruptedEvents.push({ id: doc.id, data });
          }
        });

        if (corruptedEvents.length > 0) {
          console.error("ðŸ”´ EVENTOS CORRUPTOS ENCONTRADOS:", corruptedEvents.length);
          corruptedEvents.forEach(evt => {
            console.error("  - ID:", evt.id, "| Client:", evt.data.client, "| ClientName:", evt.data.clientName);
          });
        } else {
          console.log("âœ… Todos los eventos tienen nombre");
        }

        // Auditar COTIZACIONES
        const quotationsSnapshot = await getDocs(collection(db, "quotations"));
        const corruptedQuotations = [];
        quotationsSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.client || (!data.client.name && !data.clientName)) {
            corruptedQuotations.push({ id: doc.id, data });
          }
        });

        if (corruptedQuotations.length > 0) {
          console.error("ðŸ”´ COTIZACIONES CORRUPTAS ENCONTRADAS:", corruptedQuotations.length);
          corruptedQuotations.forEach(quo => {
            console.error("  - ID:", quo.id, "| Client:", quo.data.client, "| ClientName:", quo.data.clientName);
          });
        } else {
          console.log("âœ… Todas las cotizaciones tienen nombre");
        }

        // Auditar INVENTARIO
        const inventorySnapshot = await getDocs(collection(db, "inventory"));
        const corruptedInventory = [];
        inventorySnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.name) {
            corruptedInventory.push({ id: doc.id, data });
          }
        });

        if (corruptedInventory.length > 0) {
          console.error("ðŸ”´ ITEMS DE INVENTARIO CORRUPTOS ENCONTRADOS:", corruptedInventory.length);
          corruptedInventory.forEach(item => {
            console.error("  - ID:", item.id, "| Category:", item.data.category, "| Name:", item.data.name);
          });
        } else {
          console.log("âœ… Todos los items de inventario tienen nombre");
        }

        console.log("ðŸ” AUDITORÃA COMPLETADA");

      } catch (error) {
        console.error("âŒ Error en auditorÃ­a:", error);
      }
    };

    // Ejecutar auditorÃ­a solo una vez al montar
    if (user) {
      auditFirebaseData();
    }
  }, [user]); // Solo cuando el usuario inicia sesiÃ³n


  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const name = loginUser.trim().toLowerCase();
    const pin = loginPass.trim();

    if (name === 'sharon' && pin === '280128') {
      const u = { name: 'Sharon', id: 'admin_1' };
      setUser(u);
      setUserRole('admin');
      localStorage.setItem('nexxa_user', JSON.stringify(u));
      localStorage.setItem('nexxa_role', 'admin');
      localStorage.setItem('nexxa_login_time', Date.now());
    } else if (pin === 'nexxa2026' && name.length > 2) {
      const u = { name: loginUser.trim(), id: `sales_${Date.now()}` };
      setUser(u);
      setUserRole('sales');
      localStorage.setItem('nexxa_user', JSON.stringify(u));
      localStorage.setItem('nexxa_role', 'sales');
      localStorage.setItem('nexxa_login_time', Date.now());
    } else {
      setLoginError('Nombre o clave incorrectos. Intenta de nuevo.');
    }
  };



  // SECURITY: Active session monitoring (1h Timeout)
  useEffect(() => {
    const checkSession = () => {
      const savedTime = localStorage.getItem('nexxa_login_time');
      // 1 hour = 3600000 ms
      if (savedTime && (Date.now() - Number(savedTime) > 3600000)) {
        console.warn("Session expired during active use.");
        // Logout silently and refresh
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('nexxa_user');
        localStorage.removeItem('nexxa_role');
        // No need to clear login_time here immediately, reload will do it or state init
        // But better to clear it to be safe
        localStorage.removeItem('nexxa_login_time');
        window.location.reload();
      }
    };

    // Check every minute
    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Force immediate logout without confirmation dialog to avoid encoding issues and UX friction
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('nexxa_user');
    localStorage.removeItem('nexxa_role');
    localStorage.removeItem('nexxa_login_time');
    // Force reload to clean state
    window.location.href = '/';
  };

  // 5. SYNC MARKETING DISTRIBUTION (ALLOCATIONS)
  useEffect(() => {
    const allocId = `ALLOC-${selectedYear}-${selectedMonth}`;
    const unsubscribe = onSnapshot(doc(db, "marketing_allocations", allocId), (docSnap) => {
      if (docSnap.exists()) {
        setAdAllocations(docSnap.data().channels || {});
      } else {
        setAdAllocations({});
      }
    });
    return () => unsubscribe();
  }, [selectedYear, selectedMonth]);

  // --- ESTADO: IDENTIDAD OPERATIVA (PERFIL) ---
  const [userProfile, setUserProfile] = useState({
    businessName: 'Nexxa Sound',
    nit: '',
    fiscalAddress: '',
    whatsapp: '3204863127',
    email: 'contacto@nexxasound.com',
    city: 'Bogotá D.C.',
    signature: 'Atte: El equipo de Nexxa Sound ðŸŽ§'
  });

  // --- ESTADO: AGENDA OPERATIVA (GASTOS PROGRAMADOS RECURRENTES) ---
  const [scheduledExpenses, setScheduledExpenses] = useState([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({ day: '', concept: '', amount: '' });

  // SYNC AGENDA OPERATIVA
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "operative_agenda"), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setScheduledExpenses(items);
    });
    return () => unsubscribe();
  }, []);

  // --- MONITOR DE CIERRE AUTOMÃTICO (Turbo Context) ---
  useEffect(() => {
    if (view === 'detail' && selectedEventId) {
      const currentEvt = events.find(e => e.id === selectedEventId);
      if (currentEvt && currentEvt.status !== 'CLOSED') {
        const isPaid = currentEvt.logistics?.flow?.clientPaid;
        const isReturnedFlag = currentEvt.logistics?.flow?.equipmentReturned;
        const items = currentEvt.logistics?.items || [];
        const norm = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const statusMap = {};

        if (Array.isArray(items)) {
          try {
            items.forEach(i => {
              if (i && typeof i === 'object' && i.name) {
                const n = norm(i.name);
                if (n) (statusMap[n] = statusMap[n] || []).push(i.status);
              }
            });
          } catch (e) {
            console.warn("Error monitoring event items:", e);
          }
        }

        const allItemsReturned = !Array.isArray(items) || items.length === 0 || (Object.keys(statusMap).length > 0 && Object.values(statusMap).every(ss => ss.every(s => s === 'RETURNED')));

        if (isPaid && (isReturnedFlag || allItemsReturned)) {
          checkAutoClose(currentEvt);
        }
      }
    }
    // eslint-disable-next-line
  }, [events, selectedEventId, view]);

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
      leadSource: '', guestCount: '',
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
      const photoDur = getHours(newEvent.photoStartTime, newEvent.photoEndTime);
      if (photoDur <= 0) {
        return alert('⚠️ EL HORARIO DE FOTOGRAFÍA NO PUEDE SER DE 0 HORAS.');
      }
    }
    if (newEvent.packName === 'Celebration') {
      if (!newEvent.decorStartTime || !newEvent.decorEndTime) {
        return alert('⚠️ EL PAQUETE CELEBRATION REQUIERE HORARIO DE DECORACIÓN.');
      }
      const decorDur = getHours(newEvent.decorStartTime, newEvent.decorEndTime);
      if (decorDur <= 0) {
        return alert('⚠️ EL HORARIO DE DECORACIÓN NO PUEDE SER DE 0 HORAS.');
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

      alert('âœ… CotizaciÃ³n Guardada y Enviada.');
      setView('quotations');
      setNewEvent({ id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '' });
      localStorage.removeItem('nexxa_draft_event');
    } catch (err) {
      console.error(err);
      alert('Error en la conversiÃ³n: ' + err.message);
    }
  };

  const [selectedRoleView, setSelectedRoleView] = useState('ALL');

  // --- ACTIONS ---

  const approveQuotation = (quo) => {
    // Abrir modal para confirmar mÃ©todo de abono
    setApproveModal({ quo });
  };

  const handleConfirmApproval = async (method) => {
    if (!approveModal) return;
    const { quo } = approveModal;

    try {
      // 1. Generate ID: YYMMDD-Index-ClientName
      const d = new Date(quo.eventDetails?.date || new Date());
      const yy = d.getFullYear().toString().slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const datePrefix = `${yy}${mm}${dd}`; // YYMMDD

      // Count events on this date for index
      const todayEvents = events.filter(e => e.id && e.id.includes(datePrefix));
      const suffix = String(todayEvents.length + 1).padStart(2, '0');

      // Sanitize Client Name for ID
      const clientObj = quo.client || {};
      const cleanName = (clientObj.name || quo.clientName || 'Cliente').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
      const eventId = `EVT-${datePrefix}-${suffix}-${cleanName}`;

      // 2. Build Event Object
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
            staffPaid: false,
            clientPaid: false // Must be false until final balance (70%) is paid. Deposit is 30% and tracked separately.
            // Actually 'clientPaid' usually refers to Full Payment/Settlement in this app flow.
            // Detailed flow: Deposit is paid (implied by creation), Balance is pending.
          },
          items: []
        }
      };

      // Generate Inventory Items
      let defaultItems = [];
      const packName = quo.logistics.packName;
      const createItem = (name, qty, area) => ({ name, qty, area, status: 'PENDING', deliveredTime: null, returnedTime: null });

      const djItems = [
        createItem('CABINAS ACTIVAS 15 Pulgadas + TRÃPODES', packName === 'Celebration' ? 4 : 2, 'DJ'),
        createItem('PC PORTÃTIL + CARGADOR + CABLE AUDIO 2 a 1', 1, 'DJ'),
        createItem('LUCES LED x4 + SOPORTE TRÃPODE', packName === 'Celebration' ? 2 : 1, 'DJ'),
        createItem('MÃQUINA HUMO + CONTROL + LÃQUIDO', 1, 'DJ'),
        createItem('KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', 1, 'DJ'),
        createItem('MAQUILLAJE NEON (PINTURAS, PINCEL, MAQUILLADOR, 2H)', 1, 'DJ')
      ];
      const photoItems = [createItem('CÃMARA', 1, 'PHOTO'), createItem('MICRO SD', 1, 'PHOTO')];
      const decorItems = [createItem('BOMBAS', 150, 'DECOR'), createItem('INFLADOR', 1, 'DECOR')];

      if (packName === 'Essential') defaultItems = [...djItems];
      else if (packName === 'Memories') defaultItems = [...djItems, ...photoItems];
      else if (packName === 'Celebration') defaultItems = [...djItems, ...photoItems, ...decorItems];
      else defaultItems = [...djItems];

      eventObj.logistics.items = defaultItems;

      // 3. Save Event
      await setDoc(doc(db, "events", eventId), eventObj);
      await updateDoc(doc(db, "quotations", quo.id), { status: 'APPROVED' });

      // 4. Register Treasury Deposit
      const depositAmount = Number(quo.financials?.deposit) || 0;
      if (depositAmount > 0) {
        const txId = `TX-${Date.now()}`;
        await setDoc(doc(db, "globalTx", txId), {
          id: txId,
          desc: `Abono Inicial (30%) Evento: ${quo.client?.name || quo.clientName || 'Cliente'}`,
          amount: depositAmount,
          method: method,
          type: 'IN',
          category: 'VENTA',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          eventId: eventId
        });
      }

      setApproveModal(null);
      alert(`âœ… Evento Creado: ${eventId}`);
      setView('events');

    } catch (err) {
      console.error(err);
      alert('Error en aprobaciÃ³n: ' + err.message);
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
      const isNewFormat = /^EVT-\d{6}-\d{2}/.test(evt.id); // Allow IDs with name suffixes (e.g., -CLIENTNAME)

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
          return alert(`âš ï¸ EL PAQUETE ${newEvent.packName.toUpperCase()} REQUIERE HORARIO DE FOTOGRAFÃA.`);
        }
        const photoDur = getHours(newEvent.photoStartTime, newEvent.photoEndTime);
        if (photoDur <= 0) {
          return alert('âš ï¸ EL HORARIO DE FOTOGRAFÃA NO PUEDE SER DE 0 HORAS.');
        }
      }
      if (newEvent.packName === 'Celebration') {
        if (!newEvent.decorStartTime || !newEvent.decorEndTime) {
          return alert('âš ï¸ EL PAQUETE CELEBRATION REQUIERE HORARIO DE DECORACIÓN.');
        }
        const decorDur = getHours(newEvent.decorStartTime, newEvent.decorEndTime);
        if (decorDur <= 0) {
          return alert('âš ï¸ EL HORARIO DE DECORACIÓN NO PUEDE SER DE 0 HORAS.');
        }
      }

      // Validate Minimum Duration
      if (newEvent.startTime && newEvent.endTime) {
        const duration = getHours(newEvent.startTime, newEvent.endTime);
        if (duration < appConfig.minEventDuration) {
          if (!confirm(`âš ï¸ ALERTA DE MÃNIMO:\nLa duraciÃ³n es de ${duration.toFixed(1)} horas.\nEl mÃ­nimo operativo es de ${appConfig.minEventDuration} horas.\n\nÂ¿Guardar de todos modos?`)) {
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
        { name: 'CABINAS ACTIVAS 15 PULGADAS + TRÃPODES', qty: 2, checked: false, area: 'DJ' },
        { name: 'PC PORTÃTIL + CARGADOR + CABLE AUDIO 2 A 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'LUCES LED X4 + SOPORTE TRÃPODE', qty: 1, checked: false, area: 'DJ' },
        { name: 'MÃQUINA HUMO + CONTROL + LÃQUIDO', qty: 1, checked: false, area: 'DJ' },
        { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1, checked: false, area: 'LOGÃSTICA' }
      ];
    } else if (newEvent.packName === 'Memories') {
      defaultItems = [
        { name: 'CABINAS ACTIVAS 15 PULGADAS + TRÃPODES', qty: 2, checked: false, area: 'DJ' },
        { name: 'BAJOS 18" ACTIVOS', qty: 2, checked: false, area: 'DJ' },
        { name: 'ESTRUCTURA PORTERÃA LUCES', qty: 1, checked: false, area: 'DJ' },
        { name: 'CABEZA MÃ“VIL BEAM / SPOT', qty: 2, checked: false, area: 'DJ' },
        { name: 'PAR LED RGBW', qty: 6, checked: false, area: 'DJ' },
        { name: 'CÃMARA', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'MICRO SD', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'PC PORTÃTIL + CARGADOR + CABLE AUDIO 2 A 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'MÃQUINA HUMO + CONTROL + LÃQUIDO', qty: 1, checked: false, area: 'DJ' },
        { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1, checked: false, area: 'LOGÃSTICA' }
      ];
    } else if (newEvent.packName === 'Celebration') {
      defaultItems = [
        { name: 'CABINAS ACTIVAS 15 PULGADAS + TRÃPODES', qty: 4, checked: false, area: 'DJ' },
        { name: 'BAJOS 18" ACTIVOS', qty: 2, checked: false, area: 'DJ' },
        { name: 'CABINA RETORNO DJ', qty: 1, checked: false, area: 'DJ' },
        { name: 'ESTRUCTURA PORTERÃA LUCES 4M', qty: 1, checked: false, area: 'DJ' },
        { name: 'CABEZA MÃ“VIL BEAM / SPOT', qty: 4, checked: false, area: 'DJ' },
        { name: 'PAR LED RGBW', qty: 8, checked: false, area: 'DJ' },
        { name: 'CÃMARA', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'MICRO SD', qty: 1, checked: false, area: 'PHOTO' },
        { name: 'BOMBAS', qty: 150, checked: false, area: 'DECOR' },
        { name: 'INFLADOR', qty: 1, checked: false, area: 'DECOR' },
        { name: 'PC PORTÃTIL + CARGADOR + CABLE AUDIO 2 A 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'MÃQUINA HUMO + CONTROL + LÃQUIDO', qty: 1, checked: false, area: 'DJ' },
        { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1, checked: false, area: 'LOGÃSTICA' }
      ];
    } else {
      defaultItems = [
        { name: 'KIT SONIDO BÃSICO NEXXA', qty: 1, checked: false, area: 'DJ' },
        { name: 'KIT ILUMINACIÃ“N BÃSICO NEXXA', qty: 1, checked: false, area: 'DJ' },
        { name: 'CABLEADO Y EXTENSIONES AC', qty: 1, checked: false, area: 'LOGÃSTICA' }
      ];
    }

    // 1.1 AÃ‘ADIR MATERIALES DE EXTRAS SELECCIONADOS
    const dynamicExtras = getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount);
    dynamicExtras.forEach(ex => {
      if (newEvent.selectedExtras && newEvent.selectedExtras[ex.id]) {
        // Solo aÃ±adir si no existe ya para evitar duplicados en ediciones
        if (ex && !defaultItems.some(i => i && i.name === ex.name)) {
          defaultItems.push({
            name: ex.name,
            qty: ex.qty || 1,
            checked: false,
            area: ex.area || 'Decor'
          });
        }
      }
    });

    // 2. VERIFICACIÃ“N DE STOCK (Only for CONFIRMED)
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
          const found = (evt.logistics?.items || []).find(i => i && i.name === reqItem.name);
          if (found && found.qty > 0) {
            usedQty += found.qty;
            conflictDetails.push(`${evt.id}`);
          }
        });
        const invItem = inventory.find(i => i && i.name === reqItem.name);
        if (invItem) {
          if ((usedQty + reqItem.qty) > invItem.total) {
            conflictMsg += `\nâŒ ${reqItem.name}: Stock ${invItem.total} | Uso: ${usedQty} | Pides: ${reqItem.qty}`;
          }
        }
      });

      if (conflictMsg) {
        const proceed = window.confirm(`âš ï¸ STOCK INSUFICIENTE:\n${conflictMsg}\nÂ¿Confirmar de todos modos?`);
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
        name: newEvent?.clientName || '',
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
      alert(status === 'DRAFT' ? 'ðŸ“ Borrador Guardado' : (newEvent.id ? 'âœ… Evento Actualizado' : 'âœ… Evento Creado'));

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
      clientName: (evt.client?.name || evt.clientName || 'Cliente'),
      clientPhone: evt.client?.phone || '',
      clientPhone2: evt.client?.phone2 || '',
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
      packName: evt.logistics?.packName || 'Essential',
      managerName: evt.logistics?.managerName || '',
      totalValue: evt.financials?.totalValue || 0,
      deposit: evt.financials?.deposit || 0,
      selectedExtras: evt.logistics?.selectedExtras || {},
      extraExpenses: evt.financials?.extraExpenses || [],
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
    if (window.confirm('Â¿EstÃ¡s seguro de ELIMINAR este evento? No se puede deshacer.')) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const getSelectedEvent = () => events.find(e => e.id === selectedEventId);

  // --- LOGIC HANDLERS ---
  // --- HANDLE EVENT PAYMENTS (70% or Custom) ---
  const handleOpenPaymentModal = (evt) => {
    const deepSearch = (obj, keys) => {
      if (!obj || typeof obj !== 'object') return null;

      // First, check immediate keys
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && Number(obj[key]) > 0) {
          return obj[key];
        }
      }

      // If not found, recurse
      for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          const found = deepSearch(obj[k], keys);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const clean = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const c = String(val).replace(/[^0-9]/g, '');
      return Number(c) || 0;
    };

    // BÃºsqueda en el evento
    const totalKeys = ['totalValue', 'total', 'price', 'valor', 'monto', 'valorTotal', 'costo', 'pricePackage', 'total_value', 'total_amount', 'amount'];
    const depositKeys = ['deposit', 'abono', 'monto_abono', 'pagado', 'adelanto', 'deposit_amount', 'anticipo'];

    let total = clean(deepSearch(evt, totalKeys));
    let paid = clean(deepSearch(evt, depositKeys));

    // AGREGAR VALOR DE HORAS EXTRAS AL CLIENTE (NUEVA LÃ“GICA)
    const eks = evt.financials?.extraHours || {};
    const extrasTotal = (Number(eks.DJ || 0) * 85000) +
      (Number(eks.FOTO || 0) * 35000) +
      (Number(eks.DECOR || 0) * 40000);

    total += extrasTotal;

    // INTELIGENCIA: Si el evento no tiene dinero, lo buscamos en su COTIZACIÓN original
    if (total === 0) {
      const normalize = (s) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const rawName = typeof evt.client === 'string' ? evt.client : (evt.client?.name || evt.clientName || '');
      const myClient = normalize(rawName);
      // Extraemos la fecha del ID (EVT-YYMMDD-...) o de eventDetails
      const myDate = evt.eventDetails?.date || (evt.id?.includes('EVT-') ? `20${evt.id.substring(4, 6)}-${evt.id.substring(6, 8)}-${evt.id.substring(8, 10)}` : '');

      let relatedQuo = quotations.find(q => {
        const qName = normalize(typeof q.client === 'string' ? q.client : (q?.client?.name || q?.clientName || ''));
        const qDate = q.eventDetails?.date || '';
        return myClient.length > 0 && qName === myClient && qDate === myDate;
      });

      // RESCATE FINAL: Si no hay nombre, buscar SOLO por fecha en cotizaciones aprobadas
      if (!relatedQuo && myDate) {
        relatedQuo = quotations.find(q => (q.eventDetails?.date === myDate) && q.status === 'APPROVED');
      }

      if (relatedQuo) {
        total = clean(deepSearch(relatedQuo, totalKeys));
        paid = clean(deepSearch(relatedQuo, depositKeys));
      }
    }

    const pending = Math.max(0, total - paid);

    setPaymentSplit({ Nequi: 0, Daviplata: 0, Efectivo: 0 });
    setPaymentModal({ evt, pending, total, deposit: paid });
  };

  const handleSaveEventPayment = async () => {
    if (!paymentModal) return;
    const { evt } = paymentModal;
    const { Nequi, Daviplata, Efectivo } = paymentSplit;

    const totalPay = Number(Nequi) + Number(Daviplata) + Number(Efectivo);
    if (totalPay === 0) return alert('Ingrese un monto vÃ¡lido');

    try {
      // 1. Create Transactions
      const batch = [];
      const createTx = (method, amount) => {
        if (amount <= 0) return;
        const sanitizedId = String(evt.id || '').trim();
        const txId = `TX-${sanitizedId}-FINAL-${method}`;
        const clientName = evt?.client?.name || evt?.clientName || 'Cliente';
        const eventIdStr = evt?.id || 'N/A';

        // Determinar descripciÃ³n si hay extras
        const hasExtras = Object.values(evt.financials?.extraHours || {}).some(v => parseFloat(v) > 0);
        const description = hasExtras
          ? `Saldo Final + Extras Evento: ${clientName} (${eventIdStr})`
          : `Saldo Pendiente Evento: ${clientName} (${eventIdStr})`;

        batch.push(
          setDoc(doc(db, "globalTx", txId), {
            id: txId,
            desc: description,
            amount: Number(amount),
            method,
            type: 'IN',
            category: 'VENTA',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            eventId: eventIdStr
          })
        );
      };

      createTx('Nequi', Nequi);
      createTx('Daviplata', Daviplata);
      createTx('Efectivo', Efectivo);

      await Promise.all(batch);

      // 2. Update Event Status (Careful not to overwrite CLOSED)
      const sanitizedId = String(evt.id || '').trim();
      const eventRef = doc(db, "events", sanitizedId);
      const updates = { "logistics.flow.clientPaid": true };
      if (evt.status === 'SENT') updates.status = "CONFIRMED";

      await updateDoc(eventRef, updates);

      // AUTO-CLOSE CHECK
      const updatedEvt = {
        ...evt,
        logistics: {
          ...evt.logistics,
          flow: { ...(evt.logistics?.flow || {}), clientPaid: true }
        }
      };

      setPaymentModal(null);
      alert('âœ… Pago registrado y caja actualizada');

      // We check if we can close
      await checkAutoClose(updatedEvt);

    } catch (err) {
      console.error("Payment Save Error:", err);
      alert(`Error guardando pago: ${err.message || 'Error desconocido'}. Revisa la consola para mÃ¡s detalles.`);
    }
  };

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

    // SI ES PAGO DE CLIENTE, ABRIR MODAL
    if (area === 'clientPaid') {
      if (evt.logistics?.flow?.clientPaid) {
        // Si ya pagÃ³, opcionalmente permitir desmarcar (ej: error), o bloquear.
        // Permitamos desmarcar por correcciÃ³n.
        if (confirm('El pago ya estÃ¡ registrado. Â¿Deseas anular la marca de "Cobro Confirmado" para este evento? (Nota: El dinero ya registrado en tesorerÃ­a no se borrarÃ¡)')) {
          await updateDoc(doc(db, "events", evtId), { "logistics.flow.clientPaid": false });
        }
      } else {
        handleOpenPaymentModal(evt);
      }
      return;
    }

    // SI ES PAGO DE STAFF, ABRIR MODAL PARA SELECCIONAR MÃ‰TODO
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
      { role: 'FOTÃ“GRAFO', time: evt.eventDetails?.photoStartTime || '23:59' },
      { role: 'DECORADOR', time: evt.eventDetails?.decorStartTime || '23:59' } // Decorator usually finishes last
    ].filter(t => t.time !== '23:59'); // Filter out roles that don't have a time

    if (times.length === 0) {
      return { responsibleRole: 'N/A', isTieBreak: false };
    }

    // Sort by time to find the earliest
    times.sort((a, b) => (a?.time || '').localeCompare(b?.time || ''));

    const earliestTime = times[0]?.time;
    const earliestRoles = times.filter(t => t?.time === earliestTime);

    if (earliestRoles.length > 1) {
      // Tie-breaker logic: DJ > FOTÃ“GRAFO > DECORADOR
      const roleOrder = ['DJ / OPERADOR', 'FOTÃ“GRAFO', 'DECORADOR'];
      const responsible = earliestRoles.sort((a, b) => roleOrder.indexOf(a?.role) - roleOrder.indexOf(b?.role))[0];
      return { responsibleRole: responsible.role, isTieBreak: true };
    } else {
      return { responsibleRole: earliestRoles[0].role, isTieBreak: false };
    }
  };

  // --- VIEW: CENTER HUB (ACCIONES RÃPIDAS) ---
  const renderHomeHub = () => {
    return (
      <div className="fade-in container" style={{ paddingBottom: '140px' }}>
        <header className="main-header" style={{ padding: '60px 0 30px 0' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, lineHeight: '1.1' }}>Â¿QuÃ© hacemos<br /><span style={{ opacity: 0.3 }}>ahora?</span></h2>
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
                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Crear CotizaciÃ³n</h3>
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





  // --- VIEWS ---





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
      // TRIGGER AUTO-CLOSE: If this was the last item to be returned and payment is done, it should close.
      const updatedEvt = { ...evt, logistics: { ...evt.logistics, items: newItems } };
      checkAutoClose(updatedEvt);
    } catch (err) {
      console.error("Error updating item status:", err);
      alert("Error al actualizar estado del Ã­tem");
    }
  };

  /* --- VIRTUAL INVENTORY LOGIC (MOVED UP FOR SCOPE ACCESS) --- */
  const getVirtualItems = (role, packName) => {
    // DefiniciÃ³n estricta de Ã­tems por rol (segÃºn solicitud)
    const pName = (packName || '').toLowerCase();
    const dj = [
      { name: 'CABINAS ACTIVAS 15 PULGADAS + TRÃPODES', qty: pName.includes('celebration') ? 4 : 2 },
      { name: 'PC PORTÃTIL + CARGADOR + CABLE AUDIO 2 A 1', qty: 1 },
      { name: 'LUCES LED X4 + SOPORTE TRÃPODE', qty: 1 },
      { name: 'MÃQUINA HUMO + CONTROL + LÃQUIDO', qty: 1 },
      { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1 },
      { name: 'MAQUILLAJE NEON (PINTURAS, PINCEL, MAQUILLADOR, 2H)', qty: 1 }
    ];
    const photo = [
      { name: 'CÃMARA', qty: 1 },
      { name: 'MICRO SD', qty: 1 }
    ];
    const decor = [
      { name: 'BOMBAS', qty: 150 },
      { name: 'INFLADOR', qty: 1 }
    ];

    if (role === 'DJ') return dj; // DJ items always present

    if (role === 'PHOTO') {
      if (pName.includes('memories') || pName.includes('celebration')) return photo;
      return [];
    }

    if (role === 'DECOR') {
      if (pName.includes('celebration')) return decor;
      return [];
    }

    return [];
  };

  const closeEvent = async (evt) => {
    const packName = evt.logistics?.packName;
    const allExpectedItems = [
      ...getVirtualItems('DJ', packName),
      ...getVirtualItems('PHOTO', packName),
      ...getVirtualItems('DECOR', packName)
    ];

    const dbItems = evt.logistics?.items || [];
    const normalize = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const statusMap = {};
    dbItems.forEach(i => {
      if (!i) return;
      const norm = normalize(i?.name);
      if (!norm) return;
      if (!statusMap[norm]) statusMap[norm] = [];
      statusMap[norm].push(i.status);
    });

    const unreturnedGroups = Object.entries(statusMap).filter(([norm, statuses]) => {
      // Si el item es parte de los esperados para este paquete, DEBE estar TODO RETURNED
      const isExpected = allExpectedItems.some(exp => normalize(exp?.name) === norm);
      return isExpected && !statuses.every(s => s === 'RETURNED');
    });

    if (unreturnedGroups.length > 0) {
      if (!confirm(`âš ï¸ HAY MATERIALES PENDIENTES:\n${unreturnedGroups.map(([norm]) => `- ${norm}`).join('\n')}\n\nÂ¿Deseas ignorar esto y CERRAR EL EVENTO de todos modos (Fuerza Bruta)?`)) return;
    } else {
      if (!confirm('Â¿Confirmar cierre operativo y financiero del evento?')) return;
    }

    try {
      const sanitizedId = String(evt.id || '').trim();
      await updateDoc(doc(db, "events", sanitizedId), {
        status: 'CLOSED',
        "logistics.flow.equipmentReturned": true,
        "logistics.flow.clientPaid": true,
        "logistics.flow.staffConfirmed": true,
        "logistics.flow.equipmentDelivered": true
      });
      alert('âœ… Evento CERRADO exitosamente.');
      setView('events');
    } catch (err) {
      console.error(err);
      alert('Error al cerrar evento');
    }
  };

  const checkAutoClose = async (evt) => {
    if (!evt || evt.status === 'CLOSED') return;

    const dbItems = evt.logistics?.items || [];
    const normalize = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const statusMap = {};
    dbItems.forEach(i => {
      if (!i) return;
      const norm = normalize(i?.name || 'Sin nombre');
      if (!norm) return;
      if (!statusMap[norm]) statusMap[norm] = [];
      statusMap[norm].push(i.status);
    });

    const allGroupsReturned = dbItems.length > 0 && Object.values(statusMap).every(statuses =>
      statuses.every(s => s === 'RETURNED')
    );

    const isPaid = evt.logistics?.flow?.clientPaid;
    const currentReturned = evt.logistics?.flow?.equipmentReturned;
    const sanitizedId = String(evt.id || '').trim();

    // 1. Update Return Flag if all items are returned
    if (allGroupsReturned && !currentReturned) {
      await updateDoc(doc(db, "events", sanitizedId), {
        "logistics.flow.equipmentReturned": true
      });
    }

    // 2. Auto-Close if BOTH are met
    if (allGroupsReturned && isPaid) {
      try {
        await updateDoc(doc(db, "events", sanitizedId), {
          status: 'CLOSED',
          "logistics.flow.equipmentReturned": true,
          "logistics.flow.staffConfirmed": true,
          "logistics.flow.equipmentDelivered": true,
          "logistics.flow.clientPaid": true
        });
        alert('ðŸŽŠ Â¡Todo listo! El evento se ha finalizado automÃ¡ticamente.');
        if (view === 'detail') setView('events');
      } catch (err) { console.error("Auto-close error:", err); }
    }
  };



  const updateVirtualItemStatus = async (evt, itemName, role, newStatus) => {
    const currentItems = [...(evt.logistics?.items || [])];
    const normalize = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const targetNorm = normalize(itemName);
    const existingIndex = currentItems.findIndex(i => i && normalize(i?.name) === targetNorm);

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
      const updatedEvt = { ...evt, logistics: { ...(evt.logistics || {}), items: currentItems } };
      await checkAutoClose(updatedEvt);
    } catch (err) { console.error(err); }
  };

  const bulkUpdateMaterialStatus = async (evt, role, newStatus) => {
    let currentItems = [...(evt.logistics?.items || [])];
    const normalize = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 1. FORZAR ACTUALIZACIÃ“N de lo que ya estÃ© en la lista para este rol
    let itemChanged = false;
    const normalizedRole = role.toUpperCase();
    currentItems = currentItems.map(i => {
      if (!i) return i;
      if (normalize(i.area) === normalizedRole || (normalizedRole === 'DJ' && normalize(i.area) === 'LOGISTICA')) {
        itemChanged = true;
        return { ...i, status: newStatus };
      }
      return i;
    });

    // 2. Asegurar que los items virtuales esperados tambiÃ©n estÃ©n (y en el estado correcto)
    const virtualList = getVirtualItems(role, evt.logistics?.packName);
    if (virtualList.length > 0) {
      virtualList.forEach(vItem => {
        if (!vItem || !vItem.name) return; // Safety check
        const vNameNorm = normalize(vItem.name);
        const existingIdx = currentItems.findIndex(i => i && normalize(i?.name) === vNameNorm);
        if (existingIdx >= 0) {
          if (currentItems[existingIdx].status !== newStatus) {
            currentItems[existingIdx] = { ...currentItems[existingIdx], status: newStatus };
            itemChanged = true;
          }
        } else {
          currentItems.push({
            name: vItem.name,
            area: role,
            qty: vItem.qty,
            status: newStatus
          });
          itemChanged = true;
        }
      });
    }

    try {
      const sanitizedId = String(evt.id || '').trim();
      await updateDoc(doc(db, "events", sanitizedId), {
        "logistics.items": currentItems
      });

      const updatedEvt = { ...evt, logistics: { ...(evt.logistics || {}), items: currentItems } };
      await checkAutoClose(updatedEvt);
      alert(`âœ… Estado actualizado a '${newStatus}' para ${role}.`);
    } catch (err) {
      console.error("Bulk update error:", err);
      alert(`Error en actualizaciÃ³n masiva: ${err.message || 'Error desconocido'}`);
    }
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

      const extraHoursMap = evt.financials?.extraHours || {};
      const totalExtraHoursSum = Object.values(extraHoursMap).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
      const payrollValue = 35000 + (duration * 13000) + (totalExtraHoursSum * 15000);

      // CÃLCULO DE EXTRAS CLIENTE (REFORZADO)
      const customerExtrasTotal = (parseFloat(extraHoursMap.DJ || 0) * 85000) +
        (parseFloat(extraHoursMap.FOTO || 0) * 35000) +
        (parseFloat(extraHoursMap.DECOR || 0) * 40000);

      // CÃ¡lculo de Utilidad LÃ­quida Real
      const eventTransactions = globalTx.filter(t => t.eventId === evt.id);
      const eventExpenses = eventTransactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const baseRevenue = evt.financials?.totalValue || 0;
      const paidAmount = Number(evt.financials?.deposit) || 0;
      const totalRevenuePlusExtras = baseRevenue + customerExtrasTotal;
      const currentBalanceDue = Math.max(0, totalRevenuePlusExtras - paidAmount);
      const liquidProfit = totalRevenuePlusExtras - eventExpenses;

      // FORCE VISUAL RESET: Use Virtual List, ignore DB list for structure
      // Default to DJ if 'ALL' or invalid
      const effectiveRole = (selectedRoleView === 'ALL' || !selectedRoleView) ? 'DJ' : selectedRoleView;
      const virtualList = getVirtualItems(effectiveRole, evt.logistics?.packName);

      return (
        <div className="fade-in container detail-view" style={{ paddingBottom: '140px', background: '#050505', color: '#fff', fontSize: '13px' }}>
          {/* HEADER OPERATIVO */}
          <header style={{ padding: '20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setView('events')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800' }}>
              <IconArrowLeft /> VOLVER
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary-cyan)' }}>
                {evt.logistics?.packName || 'Evento'}
              </h2>
              <span style={{ fontSize: '0.65rem', fontWeight: '950', opacity: 0.5, letterSpacing: '1px' }}>
                {evt.id}
              </span>
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
                if (!responsibleRole || responsibleRole === 'N/A' || currentBalanceDue <= 0) return null;
                const assignedPerson = (evt.staff || []).find(s => s && s.role === responsibleRole);
                const displayName = assignedPerson ? (assignedPerson.name || '').split(' ')[0] : (responsibleRole === 'DJ / OPERADOR' ? 'DJ' : responsibleRole);
                return (
                  <span style={{ color: '#ff3860', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                    âš ï¸ {displayName.toUpperCase()} COBRA {formatPeso(currentBalanceDue)}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              {[
                { label: 'DJ / OP', role: 'DJ / OPERADOR', icon: <IconStaff size={12} /> },
                { label: 'FOTO', role: 'FOTÃ“GRAFO', icon: <IconCamera size={12} /> },
                { label: 'DECOR', role: 'DECORADOR', icon: <IconPlus size={12} /> }
              ].filter(st => {
                if (st.role === 'DECORADOR') {
                  const pName = (evt.logistics?.packName || evt.eventDetails?.package || '').toLowerCase();
                  return !['essential', 'memories'].some(k => pName.includes(k));
                }
                return true;
              }).map(st => {
                if (!st) return null;
                const assigned = (evt.staff || []).find(s => s && s.role === st.role);
                return (
                  <div key={st.role} style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0 8px',
                    height: '42px', // Fixed height to match PDF buttons
                    borderRadius: '12px',
                    border: assigned ? '1px solid var(--primary-cyan)' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.45rem', fontWeight: '900', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
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
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '800', outline: 'none', width: '100%', textAlign: 'right' }}
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
                  padding: '8px', borderRadius: '10px',
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
                  padding: '8px', borderRadius: '10px',
                  background: evt.logistics?.flow?.misionSent?.PHOTO ? 'rgba(34, 197, 94, 0.1)' : 'rgba(188, 111, 241, 0.1)',
                  border: `1px solid ${evt.logistics?.flow?.misionSent?.PHOTO ? '#22c55e' : 'rgba(188, 111, 241, 0.2)'}`,
                  color: evt.logistics?.flow?.misionSent?.PHOTO ? '#22c55e' : '#bc6ff1',
                  fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                {evt.logistics?.flow?.misionSent?.PHOTO ? <IconCheck size={12} /> : <IconPDF size={12} />} PDF FOTO
              </button>

              {(() => {
                const pName = (evt.logistics?.packName || evt.eventDetails?.package || '').toLowerCase();
                const showDecor = !['essential', 'memories'].some(k => pName.includes(k));
                if (!showDecor) return null;
                return (
                  <button
                    onClick={() => generateMissionPDF(evt, 'DECOR')}
                    style={{
                      padding: '8px', borderRadius: '10px',
                      background: evt.logistics?.flow?.misionSent?.DECOR ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 242, 255, 0.1)',
                      border: `1px solid ${evt.logistics?.flow?.misionSent?.DECOR ? '#22c55e' : 'rgba(0, 242, 255, 0.2)'}`,
                      color: evt.logistics?.flow?.misionSent?.DECOR ? '#22c55e' : 'var(--primary-cyan)',
                      fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                  >
                    {evt.logistics?.flow?.misionSent?.DECOR ? <IconCheck size={12} /> : <IconPDF size={12} />} PDF DECOR
                  </button>
                );
              })()}
            </div>

            <button
              onClick={() => generateQuotationPDF(evt)}
              style={{
                width: '100%', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.55rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'
              }}
            >
              <IconFileText size={12} /> VER COTIZACIÓN ORIGINAL (CONTRATO)
            </button>
          </section>

          {/* 2. INFO DEL EVENTO (HORARIO, FECHA, LUGAR) */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', margin: 0, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                {(evt.client?.name || 'Cliente').toUpperCase()} â€¢ <span style={{ color: 'var(--primary-purple)' }}>{evt.eventDetails?.occasion?.toUpperCase() || 'EVENTO'}</span>
              </h4>
              <span style={{ color: 'var(--primary-cyan)', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                WP-{evt.id?.split('-').slice(1).join('-') || '000000-00'}
              </span>
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '25px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--brand-gradient)' }}></div>

              {/* LOCALIZACIÃ“N COMPACTA (MOVED) */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <IconLocation size={14} color="var(--primary-cyan)" style={{ marginTop: '3px', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.eventDetails?.location?.toUpperCase()}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: '750', opacity: 0.4, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.eventDetails?.neighborhood?.toUpperCase()}</span>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evt.eventDetails?.location || ''} ${evt.eventDetails?.neighborhood || ''}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      color: '#fff', textDecoration: 'none', fontSize: '0.55rem', fontWeight: '950',
                      display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0,
                      background: 'rgba(0, 242, 255, 0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 242, 255, 0.1)'
                    }}
                  >
                    BRÃšJULA NEXXA â†’
                  </a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '1px' }}>FECHA</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '950', color: '#fff' }}>{evt.eventDetails?.date}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '1px' }}>HORARIO</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '950', color: '#fff', whiteSpace: 'nowrap' }}>
                    {formatT(evt.eventDetails?.startTime)} - {formatT(evt.eventDetails?.endTime)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '1px' }}>BODEGA (-2.5H)</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>
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
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '1px' }}>DURACIÃ“N</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '950', color: '#fff' }}>{duration.toFixed(1)}H</span>
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
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#facc15' }}>ðŸ“¸ FOTOGRAFÃA</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>{formatT(evt.eventDetails.photoStartTime)} - {formatT(evt.eventDetails.photoEndTime)}</span>
                        </div>
                      )}
                      {evt.eventDetails?.decorStartTime && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-purple)' }}>âœ¨ DECORACIÓN</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>{formatT(evt.eventDetails.decorStartTime)} - {formatT(evt.eventDetails.decorEndTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}



              {/* GESTIÓN DE HORARIOS (EXTRAS) */}
              {/* GESTIÓN DE HORARIOS COMPACTA (EXTRAS) */}
              <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>


                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: '4px', alignItems: 'center', opacity: 0.6, marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: '800' }}>ROL</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: '800', textAlign: 'center' }}>INICIO</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: '800', textAlign: 'center' }}>SALIDA</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    const pName = (evt.logistics?.packName || evt.eventDetails?.package || '').toLowerCase();
                    const isEssential = pName.includes('essential');
                    const isMemories = pName.includes('memories');
                    const isCelebration = pName.includes('celebration');
                    const hasRole = (role) => (evt.staff || []).some(s => s.role === role);

                    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
                    const minutes = ['00', '15', '30', '45'];
                    const ampms = ['AM', 'PM'];

                    const parseTime = (t) => {
                      if (!t) return { h: '12', m: '00', ap: 'AM' }; // Default
                      let [hh, mm] = t.split(':').map(Number);
                      const ap = hh < 12 ? 'AM' : 'PM';
                      hh = hh % 12 || 12;
                      return { h: String(hh), m: String(mm).padStart(2, '0'), ap };
                    };

                    const updateTime = (prevTime, part, val, field) => {
                      const current = parseTime(prevTime);
                      const newParts = { ...current, [part]: val };

                      let h24 = Number(newParts.h);
                      if (newParts.ap === 'PM' && h24 !== 12) h24 += 12;
                      if (newParts.ap === 'AM' && h24 === 12) h24 = 0;

                      const timeString = `${String(h24).padStart(2, '0')}:${newParts.m}`;

                      const updates = { [field]: timeString };

                      // SYNC LOGIC: If updating DJ time, sync PHOTO/DECOR if they match old DJ time
                      if (field === 'eventDetails.startTime') {
                        if (evt.eventDetails?.photoStartTime === evt.eventDetails?.startTime) updates['eventDetails.photoStartTime'] = timeString;
                        if (evt.eventDetails?.decorStartTime === evt.eventDetails?.startTime) updates['eventDetails.decorStartTime'] = timeString;
                      }
                      if (field === 'eventDetails.endTime') {
                        if (evt.eventDetails?.photoEndTime === evt.eventDetails?.endTime) updates['eventDetails.photoEndTime'] = timeString;
                        if (evt.eventDetails?.decorEndTime === evt.eventDetails?.endTime) updates['eventDetails.decorEndTime'] = timeString;
                      }

                      updateDoc(doc(db, "events", evt.id), updates);
                    };

                    const roles = [
                      {
                        id: 'DJ', label: 'DJ', color: '#fff',
                        startField: 'eventDetails.startTime', endField: 'eventDetails.endTime',
                        sVal: evt.eventDetails?.startTime, eVal: evt.eventDetails?.endTime,
                        visible: true
                      },
                      {
                        id: 'FOTO', label: 'FOTO', color: '#facc15',
                        startField: 'eventDetails.photoStartTime', endField: 'eventDetails.photoEndTime',
                        sVal: evt.eventDetails?.photoStartTime || evt.eventDetails?.startTime,
                        eVal: evt.eventDetails?.photoEndTime || evt.eventDetails?.endTime,
                        visible: (isMemories || isCelebration) || (!isEssential && (evt.eventDetails?.photoStartTime || hasRole('FOTÃ“GRAFO')))
                      },
                      {
                        id: 'DECOR', label: 'DECOR', color: '#bc6ff1',
                        startField: 'eventDetails.decorStartTime', endField: 'eventDetails.decorEndTime',
                        sVal: evt.eventDetails?.decorStartTime || evt.eventDetails?.startTime,
                        eVal: evt.eventDetails?.decorEndTime || evt.eventDetails?.endTime,
                        visible: isCelebration || (!isEssential && !isMemories && (evt.eventDetails?.decorStartTime || hasRole('DECORADOR')))
                      }
                    ];

                    const renderTimeSelects = (val, field) => {
                      const t = parseTime(val);
                      const isEnd = field.toLowerCase().includes('end');
                      return (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                          background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0 8px', height: '34px',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {/* Hours */}
                          <select
                            value={t.h}
                            onChange={(e) => updateTime(val, 'h', e.target.value, field)}
                            style={{
                              background: 'transparent', border: 'none', color: '#fff',
                              fontSize: '13px', fontWeight: '700', padding: 0,
                              outline: 'none', appearance: 'none', textAlign: 'center', width: '20px', cursor: 'pointer', lineHeight: 1
                            }}
                          >
                            {hours.map(h => <option key={h} value={h} style={{ color: '#000', fontSize: '13px' }}>{h}</option>)}
                          </select>

                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#555', lineHeight: 1, marginTop: '-1px' }}>:</span>

                          {/* Minutes */}
                          <select
                            value={t.m}
                            onChange={(e) => updateTime(val, 'm', e.target.value, field)}
                            style={{
                              background: 'transparent', border: 'none', color: '#fff',
                              fontSize: '13px', fontWeight: '700', padding: 0,
                              outline: 'none', appearance: 'none', textAlign: 'center', width: '20px', cursor: 'pointer', lineHeight: 1
                            }}
                          >
                            {minutes.map(m => <option key={m} value={m} style={{ color: '#000', fontSize: '13px' }}>{m}</option>)}
                          </select>

                          {/* AM/PM Text */}
                          <div style={{ marginLeft: '4px', height: '100%', display: 'flex', alignItems: 'center' }}>
                            <select
                              value={t.ap}
                              onChange={(e) => updateTime(val, 'ap', e.target.value, field)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: isEnd ? 'var(--primary-cyan)' : '#facc15',
                                fontSize: '11px', fontWeight: '800', padding: 0,
                                outline: 'none', appearance: 'none', textAlign: 'right', cursor: 'pointer', minWidth: '22px', lineHeight: 1
                              }}
                            >
                              {ampms.map(ap => <option key={ap} value={ap} style={{ color: '#000', fontSize: '13px' }}>{ap}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    };

                    return roles.filter(r => r.visible).map(r => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1fr', gap: '4px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '4px 6px', borderRadius: '8px', borderLeft: `2px solid ${r.color}` }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: '900', color: r.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                        {renderTimeSelects(r.sVal, r.startField)}
                        {renderTimeSelects(r.eVal, r.endField)}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* REPORTE DE HORAS EXTRAS (REAL-TIME SYNC) */}
              <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,247,237,0.02)', borderRadius: '12px', border: '1px solid rgba(251,146,60,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ fontSize: '0.5rem', fontWeight: '950', color: '#fb923c', margin: 0, letterSpacing: '0.5px' }}>EXTRAS POR COBRAR AL CLIENTE</h5>
                  <span style={{ fontSize: '0.45rem', fontWeight: '950', color: 'var(--success-green)' }}>+ {formatPeso(customerExtrasTotal)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'DJ', label: 'DJ', price: '85k' },
                    { id: 'FOTO', label: 'FOTO', price: '35k' },
                    { id: 'DECOR', label: 'DECOR', price: '40k' }
                  ].map(role => (
                    <div key={role.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 2px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <label style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>{role.label}</label>
                      <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'var(--primary-cyan)', display: 'block', marginBottom: '4px' }}>${role.price}/HR</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        // Mostramos vacÃ­o si es 0 para facilitar escritura
                        value={evt.financials?.extraHours?.[role.id] === 0 ? "" : (evt.financials?.extraHours?.[role.id] ?? "")}
                        onFocus={(e) => e.target.select()}
                        onChange={async (e) => {
                          const valStr = e.target.value;
                          const valNum = valStr === "" ? 0 : parseFloat(valStr);

                          // ACTUALIZACIÃ“N DIRECTA EN EL ESTADO LOCAL DE EVENTOS
                          // Esto fuerza a React a re-calcular todos los totales al instante
                          const updatedEvents = events.map(ev => {
                            if (ev.id === evt.id) {
                              return {
                                ...ev,
                                financials: {
                                  ...ev.financials,
                                  extraHours: {
                                    ...(ev.financials?.extraHours || {}),
                                    [role.id]: valNum
                                  }
                                }
                              };
                            }
                            return ev;
                          });
                          setEvents(updatedEvents);

                          // GUARDADO EN FIREBASE (EN SEGUNDO PLANO)
                          await updateDoc(doc(db, "events", evt.id), {
                            [`financials.extraHours.${role.id}`]: valNum
                          });
                        }}
                        style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: '950', width: '80%', textAlign: 'center', outline: 'none', borderRadius: '6px', padding: '2px 0' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SERVICIOS Y NOTAS COMPACTOS */}

              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px', letterSpacing: '1px' }}>SERVICIOS EXTRAS</span>
                  {(() => {
                    const dynamicExtras = getDynamicExtras(Number(evt.eventDetails?.guestCount) || 10, evt.makeupCount);
                    const selExtras = evt.logistics?.selectedExtras || {};
                    const active = Object.keys(selExtras).filter(k => selExtras[k]);
                    if (active.length === 0) return <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: '700' }}>Ninguno</span>;
                    return (
                      <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#ccc', letterSpacing: '0.3px' }}>
                        {active.map(k => dynamicExtras.find(d => d.id === k)?.name || k).join(' â€¢ ').toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px', letterSpacing: '1px' }}>OBSERVACIONES</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#999', lineHeight: '1.2' }}>
                    {evt.eventDetails?.indications || 'Sin notas'}
                  </span>
                </div>
              </div>

              {/* FINANZAS COMPACTAS (MOVED TO BOTTOM) */}
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '10px', marginTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>VALOR EVENTO</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff' }}>{formatPeso(baseRevenue)}</span>
                    <small style={{ fontSize: '0.4rem', display: 'block', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>Abono (30%): {formatPeso(paidAmount)}</small>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>EXTRAS (100%)</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--success-green)' }}>+ {formatPeso(customerExtrasTotal)}</span>
                    <small style={{ fontSize: '0.38rem', display: 'block', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>Reportado Hoy</small>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>TOTAL A COBRAR</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '950', color: '#ff3860' }}>{formatPeso(currentBalanceDue)}</span>
                    <small style={{ fontSize: '0.38rem', display: 'block', color: 'rgba(255,255,250,0.4)', fontWeight: '900' }}>Saldo Pendiente Real</small>
                  </div>
                </div>

                {/* UTILIDAD LÃQUIDA REAL (Solo Admin) */}
                {userRole === 'admin' && (
                  <div style={{ marginTop: '15px', padding: '15px', borderRadius: '16px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--success-green)', letterSpacing: '1px' }}>UTILIDAD LÃQUIDA REAL</span>
                      <small style={{ display: 'block', fontSize: '0.5rem', opacity: 0.5, color: 'var(--success-green)' }}>Total Venta - Gastos/Nómina</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '950', color: 'var(--success-green)' }}>{formatPeso(liquidProfit)}</div>
                      <small style={{ fontSize: '0.55rem', opacity: 0.5, color: '#fff' }}>Gtos asociados: {formatPeso(eventExpenses)}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. MATERIAL ASIGNADO (CONTROL DE INVENTARIO) */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', marginBottom: '15px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>CONTROL DE INVENTARIO</h4>

            {/* Segmented Control (NO 'ALL') */}
            <div style={{ display: 'flex', background: '#0a0a0a', borderRadius: '8px', padding: '2px', marginBottom: '10px', border: '1px solid #222' }}>
              {['DJ', 'PHOTO', 'DECOR'].map(role => {
                const isActive = (selectedRoleView === role) || (selectedRoleView === 'ALL' && role === 'DJ');
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleView(role)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                      background: isActive ? 'var(--primary-cyan)' : 'transparent',
                      color: isActive ? '#000' : '#666',
                      fontSize: '0.6rem', fontWeight: '950', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>

            {/* Bulk Actions Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              {[
                { id: 'PENDING', label: 'TODO PENDIENTE', color: '#ef4444' },
                { id: 'DELIVERED', label: 'TODO ENTREGADO', color: '#3b82f6' },
                { id: 'RETURNED', label: 'TODO RECUPERADO', color: '#22c55e' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => bulkUpdateMaterialStatus(evt, effectiveRole, btn.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: '8px', border: `1px solid ${btn.color}44`,
                    background: `${btn.color}11`, color: btn.color,
                    fontSize: '0.45rem', fontWeight: '950', cursor: 'pointer', textTransform: 'uppercase',
                    transition: 'all 0.2s'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div style={{ border: '1px solid #1a1a1a', borderRadius: '15px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                    <th style={{ padding: '8px 6px', fontSize: '0.6rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'left', width: '50%' }}>ITEM / EQUIPO</th>
                    <th style={{ padding: '8px 6px', fontSize: '0.6rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'center', borderLeft: '1px solid #222' }}>CANT</th>
                    <th style={{ padding: '8px 6px', fontSize: '0.6rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'center', borderLeft: '1px solid #222' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {virtualList.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>Seleccione una pestaÃ±a</td></tr>
                  ) : virtualList.map((vItem, idx) => {
                    const normRel = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const vNameNorm = normRel(vItem?.name);
                    const dbItem = (evt.logistics?.items || []).find(i => normRel(i?.name) === vNameNorm);
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
                        <td style={{ padding: '8px 6px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          {vItem?.name?.toUpperCase() || 'ITEM'}
                        </td>
                        <td style={{ padding: '8px 6px', fontSize: '0.65rem', textAlign: 'center', opacity: 0.8, borderLeft: '1px solid #111', fontWeight: '900' }}>{vItem.qty}</td>
                        <td style={{ padding: '4px', textAlign: 'center', borderLeft: '1px solid #111' }}>
                          <select
                            value={status}
                            onChange={(e) => updateVirtualItemStatus(evt, vItem?.name, effectiveRole, e.target.value)}
                            style={{
                              background: 'transparent', color: currentColor, border: 'none', borderBottom: `1px solid ${currentColor}33`,
                              borderRadius: '0', padding: '2px 0', fontSize: '0.55rem', fontWeight: '800',
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



          {/* ACTION BUTTONS */}
          <div style={{ padding: '10px 15px 40px 15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evt.logistics?.flow?.clientPaid ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '15px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#22c55e', letterSpacing: '1px' }}>âœ… SALDO RECAUDADO</span>
                  <button
                    onClick={() => toggleFlowStep(evt.id, 'clientPaid')}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '0.55rem', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ANULAR
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {eventTransactions
                    .filter(t => t.desc?.includes('Saldo Final') && t.type === 'IN')
                    .map((t, i) => {
                      if (!t) return null;
                      return (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.03)',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.45rem', opacity: 0.4, fontWeight: '900' }}>{t.method.toUpperCase()}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: '950', color: '#fff' }}>{formatPeso(t.amount)}</span>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Â¿Eliminar este registro de pago de la tesorerÃ­a?')) {
                                await deleteDoc(doc(db, "globalTx", t.id));
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#ff3860', padding: '4px', cursor: 'pointer', opacity: 0.4 }}
                          >
                            <IconTrash size={12} />
                          </button>
                        </div>
                      )
                    })}
                  {eventTransactions.filter(t => t.desc?.includes('Saldo Final') && t.type === 'IN').length === 0 && (
                    <div style={{ width: '100%', marginTop: '5px' }}>
                      <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block' }}>CÃ¡lculo de Recaudo Real:</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>
                        {formatPeso(baseRevenue)} (Base) - {formatPeso(paidAmount)} (30%) + {formatPeso(customerExtrasTotal)} (Extras) = <span style={{ color: 'var(--success-green)' }}>{formatPeso(currentBalanceDue)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => toggleFlowStep(evt.id, 'clientPaid')}
                style={{
                  padding: '12px',
                  borderRadius: '15px',
                  background: 'var(--primary-purple)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '950',
                  width: '100%',
                  boxShadow: '0 10px 25px rgba(188, 111, 241, 0.2)'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '1000', marginBottom: '2px' }}>COBRAR {formatPeso(currentBalanceDue)}</div>
                  <div style={{ fontSize: '0.5rem', opacity: 0.7, fontWeight: '800', letterSpacing: '0.3px' }}>
                    {formatPeso(baseRevenue)} - {formatPeso(paidAmount)} (30%) + {formatPeso(customerExtrasTotal)} Extras
                  </div>
                </div>
              </button>
            )}

            <button onClick={() => closeEvent(evt)} style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid rgba(255, 56, 96, 0.3)', color: '#ff3860', fontSize: '0.6rem', fontWeight: '950', width: '100%', display: evt.status === 'CLOSED' ? 'none' : 'block' }}>
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



  // --- VIEW: DASHBOARD (VISIÃ“N) ---
  // --- VIEW: DASHBOARD (VISIÃ“N 20s) ---
  const renderDashboard = () => {
    try {
      // Usamos el mes y aÃ±o seleccionados globalmente para que sea consistente
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
          const d = parseLocalStrDate(e.eventDetails?.date);
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
        const d = parseLocalStrDate(e.eventDetails?.date);
        return e.status === 'CONFIRMED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      // 4. PrÃ³ximos Eventos (Top 3) - Mirando hacia adelante desde hoy
      const upcomingEvents = events
        .filter(e => e.status === 'CONFIRMED' && e.eventDetails?.date && parseLocalStrDate(e.eventDetails.date) >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => parseLocalStrDate(a.eventDetails.date) - parseLocalStrDate(b.eventDetails.date))
        .slice(0, 3);

      // 5. Alertas (Ej: Eventos prÃ³ximos sin staff)
      const alerts = upcomingEvents.filter(e => !e.staff || e.staff.length === 0);

      return (
        <div className="fade-in container" style={{ paddingBottom: '100px' }}>
          <header style={{ padding: '20px 0 15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>VisiÃ³n <span style={{ opacity: 0.3 }}>Global</span></h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '2px' }} onClick={() => setShowMonthSelector(true)}>
                <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontWeight: '800', color: 'var(--primary-cyan)' }}>
                  {(months[selectedMonth] || 'Mes').toUpperCase()} {selectedYear}
                </p>
                <IconIndicator size={8} style={{ color: 'var(--primary-cyan)', opacity: 0.5 }} />
              </div>
            </div>
          </header>

          {/* A. MÃ‰TRICA PRINCIPAL (HÃ‰ROE - COMPACT - Solo Admin) */}
          {userRole === 'admin' && (
            <div style={{ background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.05) 0%, rgba(188, 111, 241, 0.05) 100%)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(0, 242, 255, 0.2)', marginBottom: '15px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '120px', height: '120px', background: 'radial-gradient(circle, var(--primary-cyan) 0%, transparent 70%)', opacity: 0.15, filter: 'blur(30px)' }}></div>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: '5px' }}>PROFIT ESTIMADO</span>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', color: '#fff', textShadow: '0 5px 20px rgba(0,0,0,0.5)', lineHeight: 1 }}>
                {formatPeso(totalIncome - monthExpenses)}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--success-green)', background: 'rgba(0, 255, 157, 0.1)', padding: '5px 10px', borderRadius: '8px' }}>
                  ING: {formatPeso(totalIncome)}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#ff3860', background: 'rgba(255, 56, 96, 0.1)', padding: '5px 10px', borderRadius: '8px' }}>
                  GTO: {formatPeso(monthExpenses)}
                </span>
              </div>
            </div>
          )}

          {/* B. MÃ‰TRICAS SECUNDARIAS (COMPACT) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '18px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => setView('quotations')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <IconPDF size={18} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '1rem', fontWeight: '900' }}>{openQuotes}</span>
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: '700', opacity: 0.5 }}>COTIZACIONES</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '18px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => setView('events')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <IconCalendar size={18} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '1rem', fontWeight: '900' }}>{confirmedEventsCount}</span>
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: '700', opacity: 0.5 }}>EVENTOS MES</span>
            </div>
          </div>

          {/* C. ALERTAS (COMPACT) */}
          {
            alerts.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ffcc00' }}>
                  <IconAlertTriangle size={14} /> ATENCIÃ“N
                </h3>
                {alerts.map(a => {
                  try {
                    if (!a || typeof a !== 'object') return null;
                    if (!a.id) return null;
                    const clientName = a?.client?.name || a?.clientName;
                    if (!clientName) {
                      console.warn("âš ï¸ Alerta sin nombre:", a.id);
                      return null;
                    }
                    return (
                      <div key={a.id} style={{ background: 'rgba(255, 204, 0, 0.05)', border: '1px solid rgba(255, 204, 0, 0.2)', borderRadius: '16px', padding: '10px 15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255, 204, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcc00' }}>
                          <IconStaff size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: '800', fontSize: '0.8rem', display: 'block', color: '#ffcc00' }}>Falta Staff</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{clientName} â€¢ {a.eventDetails?.date ? new Date(a.eventDetails.date).getDate() : ''}/{a.eventDetails?.date ? new Date(a.eventDetails.date).getMonth() + 1 : ''}</span>
                        </div>
                        <button onClick={() => { setSelectedEventId(a.id); setView('detail'); }} style={{ background: '#ffcc00', border: 'none', color: '#000', padding: '6px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: '900' }}>ASIGNAR</button>
                      </div>
                    );
                  } catch (err) {
                    console.error("Error rendering alert:", a?.id, err);
                    return null;
                  }
                })}
              </div>
            )
          }

          {/* D. PRÃ“XIMOS EVENTOS (COMPACT) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>PRÃ“XIMOS</h3>
              <button onClick={() => setView('events')} style={{ background: 'none', border: 'none', color: 'var(--primary-cyan)', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer' }}>VER TODO</button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', opacity: 0.4 }}>
                <small style={{ fontSize: '0.7rem' }}>Sin eventos prÃ³ximos.</small>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {upcomingEvents.map(e => {
                  try {
                    if (!e || typeof e !== 'object') return null;
                    if (!e.id) return null;
                    const clientName = e?.client?.name || e?.clientName;
                    if (!clientName) {
                      console.warn("âš ï¸ Evento prÃ³ximo sin nombre:", e.id);
                      return null;
                    }
                    return (
                      <div
                        key={e.id}
                        onClick={() => { setSelectedEventId(e.id); setView('detail'); }}
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        className="dashboard-card"
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '10px', minWidth: '45px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: '900' }}>{e.eventDetails?.date ? parseLocalStrDate(e.eventDetails.date).getDate() : '?'}</span>
                            <span style={{ fontSize: '0.5rem', fontWeight: '700', textTransform: 'uppercase' }}>{e.eventDetails?.date ? parseLocalStrDate(e.eventDetails.date).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '') : '-'}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: '900', fontSize: '0.85rem', display: 'block', color: '#fff' }}>{clientName}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: '600' }}>{e.logistics?.packName || 'Especial'}</span>
                          </div>
                        </div>
                        <IconArrowRight size={14} style={{ opacity: 0.5 }} />
                      </div>
                    );
                  } catch (err) {
                    console.error("Error rendering upcoming event:", e?.id, err);
                    return null;
                  }
                })}
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

  // --- VIEW: EVENTS (EJECUCIÃ“N) ---
  const renderEventsList = () => {
    try {
      // Solo eventos confirmados, orden cronolÃ³gico
      const getEarliestTime = (evt) => {
        const times = [
          evt.eventDetails?.startTime,
          evt.eventDetails?.warehouseTime,
          evt.eventDetails?.photoStartTime,
          evt.eventDetails?.decorStartTime
        ].filter(t => t && t !== '' && typeof t === 'string');
        if (times.length === 0) return '23:59';
        // SAFE SORT: Asegurar que todos los elementos sean strings
        return times.sort((a, b) => (a || '').localeCompare(b || ''))[0];
      };

      const confirmedEvents = events
        .filter(e => {
          if (!e) return false;
          // 1. Excluir si ya estÃ¡ CERRADO o CANCELADO
          if (e.status === 'CLOSED' || e.status === 'CANCELLED') return false;

          // 2. Excluir SOLO si se cumplen AMBAS condiciones (Pagado Y Retornado)
          const isPaid = e.logistics?.flow?.clientPaid;
          const isReturned = e.logistics?.flow?.equipmentReturned;
          const items = e.logistics?.items || [];

          if (isPaid && isReturned) {
            // Si tiene flag de retorno y estÃ¡ pagado, fuera.
            return false;
          }

          // 3. VerificaciÃ³n resiliente basada en items si no hay flags
          if (isPaid) {
            if (!Array.isArray(items) || items.length === 0) return false; // Sin items y pagado -> Fuera

            const norm = (s) => String(s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const groups = {};

            try {
              items.forEach(i => {
                if (i && typeof i === 'object' && i.name) {
                  const n = norm(i.name);
                  if (n) (groups[n] = groups[n] || []).push(i.status);
                }
              });
            } catch (err) { console.warn("Error processing items in dashboard:", err); }

            const allOk = Object.keys(groups).length > 0 && Object.values(groups).every(ss => ss.every(s => s === 'RETURNED'));

            if (allOk) return false; // Todo recibido y pagado -> Fuera
          }

          return (e.status === 'CONFIRMED' || e.status === 'SENT') && (e.client?.name || e.clientName || 'Cliente') && e.eventDetails?.date;
        })
        .sort((a, b) => {
          // SAFE SORT: Validar que ambos objetos existan
          if (!a || !b) return 0;
          if (!a?.eventDetails || !b?.eventDetails) return 0;
          const dateA = a.eventDetails?.date || '9999-12-31';
          const dateB = b.eventDetails?.date || '9999-12-31';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          try {
            return getEarliestTime(a).localeCompare(getEarliestTime(b));
          } catch (e) { return 0; }
        });

      const totalMonthEventsCount = events.filter(e => {
        if (!e || !e.eventDetails?.date) return false;
        const d = parseLocalStrDate(e.eventDetails.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }).length;

      return (
        <div className="fade-in container" style={{ paddingBottom: '140px' }}>
          <header style={{ padding: '30px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Eventos <span style={{ opacity: 0.3 }}>Logistics</span></h2>
                <div style={{ background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary-cyan)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '950', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
                  {totalMonthEventsCount}
                </div>
              </div>
              <small style={{ color: 'var(--primary-cyan)', fontWeight: '800', letterSpacing: '1px', fontSize: '0.6rem' }}>GESTIÓN OPERATIVA</small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => {
                  if (eventSubTab === 'inventory') {
                    setShowAddModal(true);
                  } else {
                    setNewEvent({ clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', paymentMethod: 'Nequi' });
                    setView('create');
                  }
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

          {/* PROGRESS BAR: META DIARIA (HOY) */}
          {(() => {
            const todayStr = getTodayStr();
            const todayEvents = events.filter(e => e && e.eventDetails?.date === todayStr);
            const totalToday = todayEvents.length;

            // Solo contamos como completados los cerrados o con equipos devueltos
            const completedCount = todayEvents.filter(e =>
              e.status === 'CLOSED' ||
              e.logistics?.flow?.equipmentReturned
            ).length;

            const percent = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

            if (totalToday === 0) return null; // Si no hay eventos hoy, no mostramos la barra

            return (
              <div style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: '950', letterSpacing: '2px', color: 'var(--primary-cyan)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Agenda de Hoy
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: '1000', color: '#fff', letterSpacing: '-0.5px' }}>
                      {totalToday} <span style={{ opacity: 0.3, fontWeight: '700', fontSize: '0.9rem' }}>Eventos para hoy</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: '1000', color: percent === 100 ? 'var(--success-green)' : 'var(--primary-cyan)', lineHeight: 1 }}>{percent}%</div>
                    <span style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.3 }}>{completedCount} FINALIZADOS</span>
                  </div>
                </div>

                {/* BARRA DE PROGRESO */}
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: percent === 100 ? 'var(--success-green)' : 'var(--brand-gradient)',
                    borderRadius: '20px',
                    boxShadow: `0 0 25px ${percent === 100 ? 'rgba(0, 255, 163, 0.4)' : 'rgba(0, 242, 255, 0.4)'}`,
                    transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}></div>
                </div>
              </div>
            );
          })()}

          <div style={{
            display: 'flex',
            gap: '12px',
            margin: '0 0 25px 0',
            background: 'rgba(255,255,255,0.03)',
            padding: '6px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {[
              { id: 'list', label: 'EVENTOS' },
              { id: 'inventory', label: 'INVENTARIO' },
              { id: 'history', label: 'HISTORIAL' }
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

          {
            eventSubTab === 'list' && (
              <div style={{ marginBottom: '25px', display: 'flex', gap: '8px', paddingBottom: '10px', width: '100%', justifyContent: 'center' }}>
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
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: filterExecution === f.id ? '1px solid currentColor' : '1px solid transparent',
                      background: filterExecution === f.id ? f.color : 'rgba(255,255,255,0.02)',
                      color: filterExecution === f.id ? '#fff' : 'rgba(255,255,255,0.4)',
                      fontSize: '0.6rem',
                      fontWeight: '900',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )
          }

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

                  let lastDate = null;
                  const today = getTodayStr();
                  const tomorrow = getTomorrowStr();

                  return filtered.map((evt, idx) => {
                    // ULTRA-PROTECCIÓN: Validar CADA propiedad
                    try {
                      if (!evt || typeof evt !== 'object') return null;
                      if (!evt.id) return null; // Sin ID, no renderizar

                      // Validar que tenga nombre
                      const clientName = evt?.client?.name || evt?.clientName;
                      if (!clientName) {
                        console.warn("âš ï¸ Evento sin nombre en renderizado:", evt.id);
                        return null; // No renderizar eventos sin nombre
                      }

                      console.log("Rendering Event Row:", evt.id, clientName);

                      const flow = evt.logistics?.flow || {};
                      const eventDate = evt.eventDetails?.date;
                      const showHeader = eventDate !== lastDate;
                      lastDate = eventDate;

                      let dateLabel = eventDate;
                      let headerColor = 'rgba(255,255,255,0.4)';
                      if (eventDate === today) { dateLabel = 'HOY'; headerColor = 'var(--primary-cyan)'; }
                      else if (eventDate === tomorrow) { dateLabel = 'MAÑANA'; headerColor = 'var(--primary-purple)'; }
                      else if (eventDate) {
                        const d = new Date(eventDate + 'T12:00:00');
                        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÃBADO'];
                        dateLabel = `${days[d.getDay()]} ${eventDate.split('-').reverse().slice(0, 2).join('/')}`;
                      }

                      return (
                        <React.Fragment key={evt.id}>
                          {showHeader && (
                            <div style={{ padding: '8px 5px', marginTop: idx === 0 ? '0' : '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: '950', letterSpacing: '1px', color: headerColor }}>{dateLabel}</span>
                              <span style={{ fontSize: '0.55rem', fontWeight: '800', opacity: 0.2 }}>{eventDate}</span>
                            </div>
                          )}
                          <div className="execution-card" onClick={() => { setSelectedEventId(evt.id); setView('detail'); }} style={{
                            padding: '12px 14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', position: 'relative', overflow: 'hidden'
                          }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: evt.status === 'SENT' ? 'var(--primary-purple)' : (flow.equipmentReturned ? 'var(--success-green)' : 'var(--brand-gradient)') }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '0.45rem', fontWeight: '900', color: evt.status === 'SENT' ? 'var(--primary-purple)' : 'var(--primary-cyan)', opacity: 0.8 }}>{evt.id}</span>
                                  <span style={{ fontSize: '0.4rem', fontWeight: '950', background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '1px 4px', borderRadius: '3px', opacity: 0.6 }}>{evt.status}</span>
                                  <span style={{ fontSize: '0.35rem', fontWeight: '900', color: 'rgba(255,255,255,0.2)', marginLeft: '4px' }}>
                                    [P:{flow.clientPaid ? 'Y' : 'N'} R:{flow.equipmentReturned ? 'Y' : 'N'} I:{evt.logistics?.items?.length || 0}]
                                  </span>
                                  {evt.status === 'SENT' && <span style={{ fontSize: '0.45rem', fontWeight: '900', background: 'rgba(188, 111, 241, 0.1)', color: 'var(--primary-purple)', padding: '2px 4px', borderRadius: '3px' }}>COTIZACIÓN</span>}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientName}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', opacity: 0.5, fontSize: '0.6rem', fontWeight: '700' }}>
                                  <IconLocation size={9} />
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{evt.eventDetails?.location || 'Por definir'}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: '70px', paddingLeft: '8px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: '950', color: 'var(--primary-cyan)', letterSpacing: '-0.5px' }}>
                                  {(() => {
                                    try {
                                      const timeStr = getEarliestTime(evt);
                                      if (!timeStr || typeof timeStr !== 'string') return '00:00';
                                      const [h, m] = timeStr.split(':').map(Number);
                                      if (isNaN(h) || isNaN(m)) return '00:00';
                                      const ap = h >= 12 ? 'PM' : 'AM';
                                      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
                                    } catch (e) {
                                      console.error("Error parsing time:", e);
                                      return '00:00';
                                    }
                                  })()}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Â¿Archivar evento de ${clientName} manualmente?`)) {
                                      updateDoc(doc(db, "events", evt.id), {
                                        status: 'CLOSED',
                                        "logistics.flow.equipmentReturned": true,
                                        "logistics.flow.clientPaid": true
                                      });
                                    }
                                  }}
                                  style={{ background: 'rgba(255,56,96,0.1)', border: 'none', color: '#ff3860', padding: '4px 8px', borderRadius: '6px', fontSize: '0.5rem', fontWeight: '900', marginTop: '5px', cursor: 'pointer' }}
                                >
                                  ARCHIVAR
                                </button>
                                <div style={{ fontSize: '0.4rem', fontWeight: '900', opacity: 0.3, letterSpacing: '0.5px', marginTop: '1px' }}>1ER LLAMADO</div>
                                <button onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt); }} style={{ marginTop: '5px', padding: '4px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#fff' }}>
                                  <IconPDF size={12} />
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '3px', marginTop: '12px' }}>
                              {[
                                { label: 'STAFF', done: flow.staffConfirmed, color: 'var(--primary-purple)' },
                                { label: 'OUT', done: flow.equipmentDelivered, color: 'var(--primary-cyan)' },
                                { label: 'SHOW', done: flow.equipmentDelivered && !flow.equipmentReturned, color: '#fff' },
                                { label: 'FIN', done: flow.equipmentReturned, color: 'var(--success-green)' }
                              ].map((step) => (
                                <div key={step.label} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step.done ? step.color : 'rgba(255,255,255,0.05)', boxShadow: step.done ? `0 0 8px ${step.color}44` : 'none' }}></div>
                              ))}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    } catch (err) {
                      console.error("Error rendering event:", evt?.id, err);
                      return null;
                    }
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
                  <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>Inventario detallado Próximamente.</p>
                </div>
              </div>
            )
          }

          {
            eventSubTab === 'history' && (
              <div className="fade-in">
                {/* Buscador de Historial */}
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar en historial (nombre o ID)..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(() => {
                    const closedEvents = events
                      .filter(e => e.status === 'CLOSED')
                      .filter(e => {
                        if (!historySearch) return true;
                        const s = (historySearch || '').toLowerCase();
                        const client = (e?.client?.name || e?.clientName || '').toLowerCase();
                        const id = (e?.id || '').toLowerCase();
                        return client.includes(s) || id.includes(s);
                      })
                      .sort((a, b) => {
                        const dateA = a.eventDetails?.date || '';
                        const dateB = b.eventDetails?.date || '';
                        return dateB.localeCompare(dateA); // MÃ¡s recientes primero
                      });

                    if (closedEvents.length === 0) {
                      return (
                        <div style={{ padding: '60px 0', textAlign: 'center', opacity: 0.2 }}>
                          <IconHistory size={40} style={{ marginBottom: '15px' }} />
                          <p style={{ fontWeight: '900', letterSpacing: '1px' }}>SIN RESULTADOS EN EL ARCHIVO</p>
                        </div>
                      );
                    }

                    return closedEvents.map(evt => {
                      // ULTRA-PROTECCIÓN: Validar CADA evento cerrado
                      try {
                        if (!evt || typeof evt !== 'object') return null;
                        if (!evt.id) return null;

                        // Validar que tenga nombre
                        const clientName = evt?.client?.name || evt?.clientName;
                        if (!clientName) {
                          console.warn("âš ï¸ Evento cerrado sin nombre:", evt.id);
                          return null;
                        }

                        return (
                          <div
                            key={evt.id}
                            onClick={() => { setSelectedEventId(evt.id); setView('detail'); }}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              padding: '15px 20px',
                              borderRadius: '20px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: '950', color: 'var(--success-green)', opacity: 0.6 }}>{evt.id}</span>
                                <span style={{ fontSize: '0.5rem', fontWeight: '900', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-green)', padding: '2px 6px', borderRadius: '4px' }}>CERRADO</span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {clientName}
                              </h4>
                              <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '700', marginTop: '2px' }}>
                                ðŸ“… {evt.eventDetails?.date}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>
                                {formatPeso(evt.financials?.totalValue || 0)}
                              </div>
                              <div style={{ fontSize: '0.55rem', fontWeight: '800', opacity: 0.3 }}>TOTAL BRUTO</div>
                            </div>
                          </div>
                        );
                      } catch (err) {
                        console.error("Error rendering closed event:", evt?.id, err);
                        return null;
                      }
                    });
                  })()}
                </div>
              </div>
            )
          }


        </div >
      );
    } catch (error) {
      console.error("Crash en renderEventsList:", error);
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <IconAlertTriangle size={40} color="#ff3860" />
          <h3 style={{ marginTop: '20px' }}>Error al cargar Lista de Eventos</h3>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{error.message}</p>
          <button onClick={() => setView('dashboard')} className="primary-btn">Volver a Dashboard</button>
        </div>
      );
    }
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
          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', opacity: 0.4, fontWeight: '600' }}>AsÃ­ te ven tus clientes.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--primary-purple)' }}>DATOS DE CONTACTO</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <TextInput label="Nombre Comercial" value={userProfile.businessName} onChange={(val) => setUserProfile({ ...userProfile, businessName: val })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <TextInput label="NIT / Documento" value={userProfile.nit} onChange={(val) => setUserProfile({ ...userProfile, nit: val })} />
                <TextInput label="DirecciÃ³n Fiscal" value={userProfile.fiscalAddress} onChange={(val) => setUserProfile({ ...userProfile, fiscalAddress: val })} />
              </div>
              <TextInput label="WhatsApp Principal" value={userProfile.whatsapp} onChange={(val) => setUserProfile({ ...userProfile, whatsapp: val })} />
              <TextInput label="Correo electrónico" value={userProfile.email} onChange={(val) => setUserProfile({ ...userProfile, email: val })} />
              <TextInput label="Ciudad / Zona" value={userProfile.city} onChange={(val) => setUserProfile({ ...userProfile, city: val })} />
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--primary-cyan)' }}>FIRMA AUTOMÃTICA</h3>
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

  // --- VIEW: CONFIGURACIÃ“N GLOBAL (AJUSTES) ---
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
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', opacity: 0.4, fontWeight: '600' }}>Reglas, precios y automatizaciÃ³n.</p>
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
                <MoneyInput label="Hora FotografÃ­a" value={appConfig.photoHour} onChange={(val) => setAppConfig({ ...appConfig, photoHour: val })} />
                <MoneyInput label="Artista NeÃ³n (U)" value={appConfig.neonArtist} onChange={(val) => setAppConfig({ ...appConfig, neonArtist: val })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <TextInput label="Desc. MÃ¡ximo (%)" value={appConfig.maxDiscount} onChange={(val) => setAppConfig({ ...appConfig, maxDiscount: val })} />
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
              <MoneyInput label="Penalidad SolapÃ©" value={appConfig.overlapPenalty} onChange={(val) => setAppConfig({ ...appConfig, overlapPenalty: val })} />
              <TextInput label="Abono MÃ­nimo (%)" value={appConfig.minDeposit} onChange={(val) => setAppConfig({ ...appConfig, minDeposit: val })} />
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
              <h3 style={{ fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>4. MENSAJES AUTOMÃTICOS</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[
                { k: 'msgQuote', l: 'Plantilla CotizaciÃ³n' },
                { k: 'msgAdvisory', l: 'Plantilla AsesorÃ­a' },
                { k: 'msgConfirm', l: 'ConfirmaciÃ³n Abono' }
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
          <section style={{ paddingBottom: '40px' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '18px',
                background: 'rgba(255, 56, 96, 0.05)',
                border: '1px solid rgba(255, 56, 96, 0.2)',
                color: '#ff3860',
                fontWeight: '900',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <IconLogout size={18} /> CERRAR SESIÓN
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#555', marginTop: '15px', fontWeight: '700' }}>
              SesiÃ³n activa como: <span style={{ color: '#888' }}>{user.email}</span> ({userRole?.toUpperCase()})
            </p>
          </section>
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
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Cotizaciones <span style={{ opacity: 0.3 }}>Activas</span> <small style={{ fontSize: '0.6rem', opacity: 0.5 }}>v3.0 MICRO</small></h2>
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
            {quotations.filter(q => q && (q.client?.name || q.clientName)).map(quo => {
              // ULTRA-PROTECCIÓN: Validar CADA cotizaciÃ³n
              try {
                if (!quo || typeof quo !== 'object') return null;
                if (!quo.id) return null;

                // Validar que tenga nombre
                const clientName = quo?.client?.name || quo?.clientName;
                if (!clientName) {
                  console.warn("âš ï¸ CotizaciÃ³n sin nombre en renderQuotations:", quo.id);
                  return null;
                }

                return (
                  <div key={quo.id} className="sales-list-item" onClick={() => {
                    setNewEvent({
                      id: quo.id,
                      clientName: clientName,
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
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexDirection: 'column',
                    gap: '8px'
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '40px', marginBottom: '8px', width: '100%' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quo.client?.name || 'Cliente sin nombre'}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', opacity: 0.5, fontWeight: '500' }}>
                          ðŸ“… {quo.eventDetails?.date} â€¢ {quo.logistics?.packName || 'Personalizado'}
                        </p>
                      </div>
                      <div>
                        <div style={{ fontWeight: '900', fontSize: '0.9rem', color: 'var(--primary-cyan)', textAlign: 'right' }}>{formatPeso(quo.financials?.totalValue || 0)}</div>
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
                          â± {Math.floor((new Date() - parseFirestoreDate(quo.createdAt)) / (1000 * 60 * 60 * 24))} DÃAS ABIERTO
                        </span>
                      )}
                    </div>

                    {/* ACTION BUTTONS WRAP ROW (Mobile Optimized) */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      justifyContent: 'flex-start',
                      width: '100%'
                    }}>
                      {/* CONFIRM BUTTON */}
                      {quo.status === 'SENT' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); approveQuotation(quo); }}
                            style={{
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              background: 'linear-gradient(135deg, #a855f7 0%, #d8b4fe 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 5px rgba(168, 85, 247, 0.3)'
                            }}
                            title="Registrar Abono"
                          >
                            <span style={{ fontSize: '6px' }}>ðŸ’°</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('Â¿Marcar este lead como Venta Perdida?')) updateQuotationStatus(quo.id, 'LOST'); }}
                            style={{
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              background: 'rgba(255, 56, 96, 0.08)',
                              color: '#ff3860',
                              border: '1px solid rgba(255, 56, 96, 0.1)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <IconTrash size={6} />
                          </button>
                        </>
                      )}

                      {/* TOOLS */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setWhatsappModalQuo(quo); }}
                        style={{
                          padding: '0',
                          width: '20px',
                          height: '20px',
                          background: 'rgba(37, 211, 102, 0.06)',
                          color: '#25d366',
                          border: '1px solid rgba(37, 211, 102, 0.1)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Seguimiento WhatsApp"
                      >
                        <IconWhatsApp size={10} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); generateQuotationPDF(quo); }}
                        style={{
                          padding: '0',
                          width: '20px',
                          height: '20px',
                          background: 'rgba(0, 242, 255, 0.06)',
                          color: 'var(--primary-cyan)',
                          border: '1px solid rgba(0, 242, 255, 0.1)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Generar PDF"
                      >
                        <IconFileText size={10} />
                      </button>


                    </div>

                    {quo.status === 'APPROVED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-cyan)', opacity: 0.8, marginTop: '10px' }}>
                        <IconCheck size={14} />
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Misionado</span>
                      </div>
                    )}
                  </div>
                );
              } catch (err) {
                console.error("Error rendering quotation:", quo?.id, err);
                return null;
              }
            })
            }
            {quotations.length === 0 && <div className="empty-state" style={{ padding: '80px 0', opacity: 0.3 }}>No hay cotizaciones registradas.</div>}
          </div>
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
        icon: '📷'
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
      background: 'rgba(5, 5, 5, 0.98)',
      backdropFilter: 'blur(30px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '0 10px 20px 10px',
      height: '80px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center'
    }}>


      <button className={`nav-item ${view === 'quotations' ? 'active' : ''}`} onClick={() => setView('quotations')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: view === 'quotations' ? 'var(--primary-cyan)' : '#666' }}>
        <IconPDF size={20} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '4px' }}>Ventas</span>
      </button>

      <button className={`nav-item ${view === 'events' || view === 'detail' ? 'active' : ''}`} onClick={() => setView('events')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: (view === 'events' || view === 'detail') ? 'var(--primary-cyan)' : '#666' }}>
        <IconCalendar size={20} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '4px' }}>Eventos</span>
      </button>

      <button className={`nav-item ${view === 'logistics' ? 'active' : ''}`} onClick={() => setView('logistics')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: view === 'logistics' ? 'var(--primary-cyan)' : '#666' }}>
        <IconFlow size={20} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '4px' }}>Logística</span>
      </button>

      {userRole === 'admin' && (
        <button className={`nav-item ${view === 'accounting' ? 'active' : ''}`} onClick={() => setView('accounting')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: view === 'accounting' ? 'var(--primary-cyan)' : '#666' }}>
          <IconRecaudo size={20} />
          <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '4px' }}>Caja</span>
        </button>
      )}

      <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: view === 'profile' ? 'var(--primary-cyan)' : '#666' }}>
        <IconUser size={20} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', marginTop: '4px' }}>Yo</span>
      </button>

    </nav>
  );

  const renderLogin = () => (
    <div className="login-screen" style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', position: 'relative', overflow: 'hidden'
    }}>
      <div className="aurora-bg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(0, 242, 255, 0.08), transparent 70%)', filter: 'blur(100px)' }}></div>
      </div>

      <form onSubmit={handleLogin} className="fade-in" style={{
        width: '90%', maxWidth: '380px', background: 'rgba(255,255,255,0.02)',
        padding: '40px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.05)',
        zIndex: 1, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img
              src="/logo_staff_new.jpg"
              alt="Nexxa Staff"
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'cover',
                borderRadius: '50%',
                boxShadow: '0 0 50px rgba(0, 242, 255, 0.2)',
                border: '2px solid rgba(0, 242, 255, 0.3)'
              }}
            />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '950', margin: 0, letterSpacing: '-1px' }}>Nexxa <span style={{ color: 'var(--primary-cyan)' }}>Staff</span></h2>
          <p style={{ opacity: 0.4, fontSize: '0.8rem', marginTop: '8px', fontWeight: '700' }}>Inicia sesión para continuar</p>
        </div>

        {loginError && (
          <div style={{ background: 'rgba(255,56,96,0.1)', color: '#ff3860', padding: '12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '20px', border: '1px solid rgba(255,56,96,0.2)', textAlign: 'center' }}>
            {loginError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.4, marginLeft: '5px' }}>TU NOMBRE</label>
            <input
              type="text"
              placeholder="Ej: Camila"
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              required
              style={{ padding: '16px 20px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', fontWeight: '700', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.4, marginLeft: '5px' }}>CLAVE DE ACCESO</label>
            <input
              type="password"
              placeholder="********"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              required
              style={{ padding: '16px 20px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', fontWeight: '700', outline: 'none' }}
            />
          </div>

          <button type="submit" style={{
            marginTop: '15px', padding: '18px', borderRadius: '18px', background: 'var(--brand-gradient)',
            border: 'none', color: '#000', fontWeight: '950', fontSize: '0.9rem', cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(0, 212, 255, 0.2)'
          }}>
            ENTRAR AL PANEL
          </button>
        </div>
      </form>
    </div>
  );

  if (authLoading) return (
    <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader-ring"></div>
    </div>
  );

  // SAFE USER DATA with fallback
  const userData = user || { name: 'Cargando...', id: 'temp' };
  console.log("DEBUG NEXXA - userData:", userData);

  if (!user) return renderLogin();
  if (!events || !quotations) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Cargando informaciÃ³n...</div>;

  // TRY-CATCH WRAPPER for main render
  try {
    console.log("DEBUG NEXXA - Rendering main app with:", {
      user: userData,
      eventsLength: events?.length,
      quotationsLength: quotations?.length
    });

    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
        {lastFatalError && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 99999, background: '#ff3860', color: '#fff', padding: '10px', fontSize: '0.6rem', fontWeight: 'bold', textAlign: 'center' }}>
            DEBUG MOBILE: {lastFatalError} <button onClick={() => setLastFatalError(null)} style={{ marginLeft: '10px', background: '#fff', color: '#ff3860', border: 'none', borderRadius: '4px', padding: '2px 5px' }}>OK</button>
          </div>
        )}
        <div className="aurora-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' }}>
          <div className="aurora-blob blob-1" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1), transparent 70%)', filter: 'blur(80px)' }}></div>
          <div className="aurora-blob blob-2" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(188, 111, 241, 0.1), transparent 70%)', filter: 'blur(80px)' }}></div>
        </div>

        <main className="main-content" style={{ paddingBottom: '120px' }}>
          {view === 'dashboard' && renderDashboard()}
          {(view === 'events' || view === 'detail') && (view === 'detail' ? renderDetail() : renderEventsList())}
          {view === 'create' && (
            <CreateEventView
              newEvent={newEvent}
              setNewEvent={setNewEvent}
              handleCreateEvent={handleCreateEvent}
              handleCreateQuotation={handleCreateQuotation}
              view={view}
              setView={setView}
            />
          )}
          {view === 'inventory' && (
            <InventoryView
              inventory={inventory}
              setView={setView}
            />
          )}
          {view === 'logistics' && (
            <LogisticsView
              events={events}
              quotations={quotations}
            />
          )}
          {view === 'accounting' && (
            <AccountingView
              db={db}
              globalTx={globalTx}
              events={events}
              quotations={quotations}
              setView={setView}
              setShowAddExpenseModal={setShowAddExpenseModal}
            />
          )}
          {view === 'config' && renderConfig()}
          {view === 'profile' && renderProfile()}
          {view === 'quotations' && (() => {
            try {
              return (
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
                      clientName: quo.client?.name || quo.clientName || '',
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
              );
            } catch (e) {
              console.error("Crash en view quotations:", e);
              return <div style={{ padding: '40px', textAlign: 'center' }}>Error en Ventas: {e.message}</div>;
            }
          })()}
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

                {/* AJUSTES - Solo Admin */}
                {userRole === 'admin' && (
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
                )}

                {/* ROLES / STAFF - Solo Admin */}
                {userRole === 'admin' && (
                  <div
                    className="sales-list-item"
                    onClick={() => alert('Gestión de nómina: Esta función estará disponible en la próxima actualización.')}
                    style={{ padding: '25px', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: 0.5 }}
                  >
                    <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'rgba(188, 111, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-purple)' }}>
                        <IconStaff size={22} />
                      </div>
                      <div>
                        <span style={{ fontWeight: '900', fontSize: '1.1rem', display: 'block' }}>Roles / Staff</span>
                        <small style={{ opacity: 0.4, fontWeight: '700' }}>Nómina y jerarquías (Próximamente)</small>
                      </div>
                    </div>
                    <IconArrowRight size={18} style={{ opacity: 0.3 }} />
                  </div>
                )}

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
                  onClick={handleLogout}
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
            <div className="fade-in" onKeyDown={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain', padding: '40px 30px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px', background: '#080808', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#fff', textAlign: 'center' }}>Registro de <span style={{ color: showFinanceModal === 'IN' ? 'var(--success-green)' : 'var(--danger-red)' }}>{showFinanceModal === 'IN' ? 'Ingreso' : 'Egreso'}</span></h3>

              <div style={{ marginTop: '30px', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '18px' }}>
                <button
                  type="button"
                  onClick={() => { setFinType('GENERAL'); setFinEventId(''); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: finType === 'GENERAL' ? 'rgba(255,255,255,0.1)' : 'transparent', color: finType === 'GENERAL' ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '1px' }}
                >
                  GASTO GENERAL
                </button>
                <button
                  type="button"
                  onClick={() => setFinType('EVENT')}
                  style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: finType === 'EVENT' ? 'var(--primary-purple)' : 'transparent', color: '#fff', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '1px' }}
                >
                  POR EVENTO (Utilidad)
                </button>
              </div>
              {showFinanceModal === 'OUT' && finType === 'GENERAL' && (
                <p style={{ margin: '10px 0 0 0', fontSize: '0.65rem', color: '#888', textAlign: 'center' }}>
                  ðŸ’¡ Tip: Si este gasto es de un evento, usa "POR EVENTO" para ver ganancias reales.
                </p>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!finDesc || !finAmount) return alert('Datos incompletos');

                const txId = `TX-${Date.now()}`;
                const val = Number(finAmount);

                const txObj = {
                  id: txId,
                  desc: finDesc,
                  amount: val,
                  method: finMethod,
                  category: finCategory || 'VARIOS',
                  type: showFinanceModal,
                  date: getTodayStr(),
                  createdAt: new Date().toISOString()
                };

                // Logic for Event Expenses
                if (finType === 'EVENT' && finEventId) {
                  txObj.eventId = finEventId;
                  if (showFinanceModal === 'OUT') {
                    const evt = events.find(ev => ev.id === finEventId);
                    if (evt) {
                      const newExpenses = [...(evt.financials?.extraExpenses || []), {
                        id: Date.now(),
                        date: new Date().toLocaleDateString(),
                        desc: finDesc,
                        amount: val
                      }];
                      await updateDoc(doc(db, "events", finEventId), { "financials.extraExpenses": newExpenses });
                    }
                  }
                }

                // Save Global Tx
                await setDoc(doc(db, "globalTx", txId), txObj);

                // SYNC AGENDA OPERATIVA: No es necesario actualizar el documento plantilla.
                // La lÃ³gica de renderizado detectarÃ¡ automÃ¡ticamente la transacciÃ³n en globalTx y marcarÃ¡ PAGADO en la vista.

                setShowFinanceModal(null);
                setFinAmount('');
                setFinDesc('');
                alert('âœ… Transacción registrada correctamente');

              }} style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                    {events.filter(ev => ev.client?.name || ev.clientName).map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.client?.name || ev.clientName} (ID: {ev.id})</option>
                    ))}

                    {/* CALCULADORA DE NÃ“MINA DINÃMICA */}
                    {finEventId && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '5px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-purple)', display: 'block', marginBottom: '8px' }}>CALCULAR NÃ“MINA AUTOMÃTICA</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <select
                            id="roleCalcSelector"
                            onKeyDown={(e) => e.stopPropagation()}
                            style={{ flex: 1, padding: '8px', borderRadius: '10px', background: '#000', color: '#fff', border: '1px solid #333', fontSize: '0.7rem' }}
                          >
                            <option value="DJ">DJ / OP</option>
                            <option value="FOTO">FOTÃ“GRAFO</option>
                            <option value="DECOR">DECORADOR</option>
                            <option value="LOGISTICA">LOGÃSTICA</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const evt = events.find(e => e.id === finEventId);
                              if (!evt) return alert('Evento no encontrado');

                              const role = document.getElementById('roleCalcSelector').value;
                              // Helper function for specific role durations
                              const getRoleDuration = (roleName) => {
                                let start = evt.eventDetails.startTime;
                                let end = evt.eventDetails.endTime;

                                if (roleName === 'FOTO') {
                                  start = evt.eventDetails.photoStartTime || start;
                                  end = evt.eventDetails.photoEndTime || end;
                                } else if (roleName === 'DECOR') {
                                  start = evt.eventDetails.decorStartTime || start;
                                  end = evt.eventDetails.decorEndTime || end;
                                } else if (roleName === 'LOGISTICA') {
                                  end = evt.eventDetails.logisticsEndTime || end;
                                }
                                return getHours(start, end);
                              };
                              const dur = getRoleDuration(role);

                              let pay = 0;
                              if (role === 'DJ') pay = 35000 + (dur * 13000);
                              else if (role === 'LOGISTICA') pay = 25000 + (dur * 10000);
                              else if (role === 'FOTO') pay = dur * 13000;
                              else if (role === 'DECOR') pay = 40000; // Tarifa plana base

                              setFinAmount(pay);
                              setFinDesc(`Pago Nómina ${role} - ${evt.client?.name || evt.clientName || 'Evento'}`);
                              setFinCategory('NÃ“MINA');
                            }}
                            style={{ padding: '8px 12px', background: 'var(--primary-purple)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer' }}
                          >
                            CALCULAR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={finCategory}
                    onChange={e => setFinCategory(e.target.value)}
                    style={{ flex: 1, padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.75rem', fontWeight: '800' }}
                  >
                    {['LOGISTICA', 'EQUIPOS', 'MARKETING', 'NÃ“MINA', 'MANTENIMIENTO', 'FIJOS', 'VENTA', 'OTROS'].map(cat => (
                      <option key={cat} value={cat} style={{ background: '#000' }}>{cat}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Descripción..."
                    value={finDesc}
                    onChange={e => setFinDesc(e.target.value)}
                    required
                    style={{ flex: 2, padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '700' }}
                  />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Monto total ($)"
                  value={formatInputNumber(finAmount)}
                  onChange={e => setFinAmount(parseInputNumber(e.target.value))}
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

        {/* MODAL PAGO DE SALDO FINAL (CLIENTE) */}
        {paymentModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ width: '90%', maxWidth: '400px', background: '#111', padding: '35px', borderRadius: '40px', border: '1px solid var(--primary-cyan)', boxShadow: '0 20px 50px rgba(0,212,255,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: '950', color: '#fff' }}>Recaudar Saldo Final <span style={{ fontSize: '0.45rem', color: 'var(--primary-cyan)', verticalAlign: 'middle', opacity: 0.5 }}>v.RESILIENT</span></h3>
              <p style={{ margin: '0 0 25px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                Evento: <strong>{
                  (typeof paymentModal.evt?.client === 'string' ? paymentModal.evt.client : paymentModal.evt?.client?.name) ||
                  paymentModal.evt?.clientName ||
                  (paymentModal?.evt?.name || paymentModal?.evt?.clientName || 'Evento sin nombre')
                }</strong><br />
                Total: {formatPeso(paymentModal.total)} â€¢ Pendiente: <strong style={{ color: paymentModal.total === 0 ? 'var(--danger-red)' : 'var(--primary-cyan)' }}>{formatPeso(paymentModal.pending)}</strong>
              </p>

              {paymentModal.total === 0 && (
                <div style={{ background: 'rgba(255,100,100,0.05)', padding: '15px', borderRadius: '20px', border: '1px solid rgba(255,100,100,0.2)', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.6rem', color: '#ff3860', fontWeight: '900', display: 'block', marginBottom: '10px', textAlign: 'center' }}>âš ï¸ NO SE DETECTÃ“ SALDO AUTOMÃTICO</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: '900' }}>VALOR TOTAL</label>
                      <input
                        type="tel"
                        placeholder="$ 0"
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                          setPaymentModal({ ...paymentModal, total: val, pending: Math.max(0, val - (paymentModal.deposit || 0)) });
                        }}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '900' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: '900' }}>ABONO PREVIO</label>
                      <input
                        type="tel"
                        placeholder="$ 0"
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                          setPaymentModal({ ...paymentModal, deposit: val, pending: Math.max(0, (paymentModal.total || 0) - val) });
                        }}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: '900' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentModal.pending === 0 && paymentModal.total === 0 && (
                <div style={{ fontSize: '0.4rem', color: '#444', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '8px', wordBreak: 'break-all', maxHeight: '60px', overflow: 'auto', marginBottom: '10px' }}>
                  DEBUG: {JSON.stringify(paymentModal.evt).slice(0, 300)}...
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Nequi', 'Daviplata', 'Efectivo'].map(method => (
                      <div key={method} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: '15px', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#888', width: '70px' }}>{method.toUpperCase()}</label>
                          <input
                            type="tel"
                            placeholder="$ 0"
                            value={formatInputNumber(paymentSplit[method])}
                            onChange={e => {
                              setPaymentSplit({ ...paymentSplit, [method]: parseInputNumber(e.target.value) });
                            }}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: '900', textAlign: 'right', outline: 'none' }}
                          />
                        </div>
                        {paymentSplit[method] > 0 && (
                          <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--primary-cyan)', fontWeight: '800', opacity: 0.8 }}>
                            {formatPeso(paymentSplit[method])}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.5 }}>TOTAL INGRESADO:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>
                      {formatPeso(Number(paymentSplit.Nequi || 0) + Number(paymentSplit.Daviplata || 0) + Number(paymentSplit.Efectivo || 0))}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setPaymentModal(null)} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontWeight: '900' }}>CANCELAR</button>
                  <button onClick={handleSaveEventPayment} style={{ flex: 1.5, padding: '18px', borderRadius: '20px', background: 'var(--primary-cyan)', border: 'none', color: '#000', fontWeight: '900' }}>GUARDAR PAGO</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {approveModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ width: '90%', maxWidth: '400px', background: '#111', padding: '35px', borderRadius: '40px', border: '1px solid var(--primary-purple)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: '950', color: '#fff', textAlign: 'center' }}>Confirmar Abono</h3>
              <p style={{ margin: '0 0 25px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                Registrando abono de <strong>{formatPeso(approveModal.quo?.financials?.deposit || 0)}</strong> para <strong>{approveModal.quo?.client?.name || approveModal.quo?.clientName || 'Cliente'}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.4, letterSpacing: '1px' }}>MÃ‰TODO DE PAGO</label>
                {['Nequi', 'Daviplata', 'Efectivo'].map(method => (
                  <button
                    key={method}
                    onClick={() => handleConfirmApproval(method)}
                    style={{
                      padding: '20px',
                      borderRadius: '24px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: '900',
                      fontSize: '1.1rem',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{method}</span>
                    <span style={{ opacity: 0.2 }}>â†’</span>
                  </button>
                ))}
                <button onClick={() => setApproveModal(null)} style={{ marginTop: '15px', padding: '15px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', fontWeight: '800' }}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PAGO DE STAFF */}
        {staffPayModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ width: '90%', maxWidth: '400px', background: '#111', padding: '35px', borderRadius: '40px', border: '1px solid rgba(188, 111, 241, 0.3)' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', fontWeight: '950', color: 'var(--primary-purple)' }}>Liquidar Nómina</h3>
              <p style={{ margin: '0 0 25px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Selecciona el canal de dinero para pagar a <strong>{staffPayModal.client?.name || staffPayModal.clientName || 'Empleado'}</strong>.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Nequi', 'Daviplata', 'Efectivo'].map(method => (
                  <button
                    key={method}
                    onClick={async () => {
                      const dur = getHours(staffPayModal.eventDetails.startTime, staffPayModal.eventDetails.endTime);
                      const eks = staffPayModal.financials?.extraHours || {};

                      const djPay = 35000 + (dur * 13000) + ((eks.DJ || 0) * 15000);
                      const pDur = staffPayModal.eventDetails.photoStartTime ? getHours(staffPayModal.eventDetails.photoStartTime, staffPayModal.eventDetails.photoEndTime) : 0;
                      const photoPay = (pDur * 13000) + ((eks.FOTO || 0) * 15000);
                      const decorPay = ((staffPayModal.eventDetails.decorStartTime || staffPayModal.logistics.packName === 'Celebration') ? 40000 : 0) + ((eks.DECOR || 0) * 15000);
                      const managerPay = (dur * 10000) + 25000 + ((eks.LOGISTICA || 0) * 15000);
                      const totalPay = djPay + photoPay + decorPay + managerPay;

                      // 1. Crear Transacción Goblal (OUT)
                      const txId = `TX-STAFF-${Date.now()}`;
                      await setDoc(doc(collection(db, "globalTx"), txId), {
                        id: txId,
                        desc: `Nómina Evento: ${staffPayModal.client?.name || staffPayModal.clientName || 'Empleado'}`,
                        amount: totalPay,
                        method: method,
                        type: 'OUT',
                        category: 'NÃ“MINA',
                        date: getTodayStr(),
                        createdAt: new Date().toISOString(),
                        eventId: staffPayModal.id
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
                    ðŸ’³ Pagar por {method}
                  </button>
                ))}
                <button onClick={() => setStaffPayModal(null)} style={{ marginTop: '10px', padding: '15px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', fontWeight: '800' }}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AGREGAR GASTO PROGRAMADO (RECURRENTE) */}
        {showAddExpenseModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ width: '90%', maxWidth: '350px', background: '#111', padding: '25px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '950', color: '#fff', textAlign: 'center' }}>Agendar Gasto Mes</h3>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginBottom: '20px' }}>Este gasto se repetirÃ¡ automÃ¡ticamente todos los meses.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newExpenseData.day || !newExpenseData.concept || !newExpenseData.amount) return alert('Completa todos los campos');

                const dayNum = parseInt(newExpenseData.day);
                if (dayNum < 1 || dayNum > 31) return alert('DÃ­a invÃ¡lido');

                try {
                  await addDoc(collection(db, "operative_agenda"), {
                    day: dayNum, // Storing just the day number
                    concept: newExpenseData.concept,
                    amount: Number(newExpenseData.amount),
                    createdAt: new Date().toISOString()
                    // No status field needed, calculated dynamically
                  });

                  setNewExpenseData({ day: '', concept: '', amount: '' });
                  setShowAddExpenseModal(false);
                  alert('âœ… Gasto mensual programado!');
                } catch (err) {
                  console.error(err);
                  alert('Error al guardar: ' + err.message);
                }
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>DÃ­a del Pago (Mensual)</label>
                    <input
                      type="number"
                      min="1" max="31"
                      placeholder="Ej: 5 (para el dÃ­a 5 de cada mes)"
                      required
                      value={newExpenseData.day}
                      onChange={e => setNewExpenseData({ ...newExpenseData, day: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Concepto</label>
                    <input type="text" placeholder="Ej: Arriendo" required value={newExpenseData.concept} onChange={e => setNewExpenseData({ ...newExpenseData, concept: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Valor Estimado</label>
                    <input type="tel" placeholder="$ 0" required value={formatInputNumber(newExpenseData.amount)} onChange={e => setNewExpenseData({ ...newExpenseData, amount: parseInputNumber(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#facc15', fontWeight: 'bold', fontSize: '1.1rem' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setShowAddExpenseModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', fontWeight: '800' }}>CANCELAR</button>
                    <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#fff', border: 'none', color: '#000', fontWeight: '900' }}>AGENDAR</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("DEBUG NEXXA - CRITICAL ERROR:", error);
    console.error("DEBUG NEXXA - Error Stack:", error.stack);
    console.error("DEBUG NEXXA - Current State:", { user: userData, events: events?.length, quotations: quotations?.length });

    // AUTO-RELOAD: Si es el error de 'name', recargar automÃ¡ticamente UNA VEZ
    const hasReloaded = sessionStorage.getItem('nexxa_error_reload');
    if (error.message && error.message.includes('name') && !hasReloaded) {
      console.warn("ðŸ”„ ERROR DE 'NAME' DETECTADO - RECARGANDO AUTOMÃTICAMENTE...");
      sessionStorage.setItem('nexxa_error_reload', 'true');
      setTimeout(() => window.location.reload(), 1000);
      return (
        <div style={{
          height: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#00d4ff' }}>ðŸ”„ Recargando...</h2>
            <p style={{ opacity: 0.6 }}>Limpiando estado corrupto</p>
          </div>
        </div>
      );
    }

    // Si ya recargÃ³ una vez, mostrar error
    return (
      <div style={{
        height: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '20px',
        color: '#fff'
      }}>
        <div style={{
          background: 'rgba(255,56,96,0.1)',
          border: '2px solid #ff3860',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ff3860', marginBottom: '15px' }}>âš ï¸ Error CrÃ­tico</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>
            La aplicaciÃ³n encontrÃ³ un error inesperado.
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '15px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            textAlign: 'left',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              cursor: 'pointer'
            }}
          >
            RECARGAR APLICACIÃ“N
          </button>
        </div>
      </div>
    );
  }
}



export default App;
