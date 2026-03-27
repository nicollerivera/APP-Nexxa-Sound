import React, { useState, useEffect } from 'react';
import QuotationsView from './components/QuotationsView';
import CatalogManagerView from './components/CatalogManagerView';
import LogisticsCalendarView from './components/LogisticsCalendarView';

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

// Auxiliares dinámicos para el catálogo de Stitch
const needsPhoto = (pName, selectedExtras = {}) => {
  const p = (pName || '').toUpperCase();
  return p.includes('ONIX') || p.includes('MULTII') || p.includes('KAIZEN') || p.includes('MEMORIES') || p.includes('CELEBRATION') || selectedExtras?.extra_photo;
};
const needsDecor = (pName, selectedExtras = {}) => {
  const p = (pName || '').toUpperCase();
  return p.includes('CELEBRATION') || p.includes('ONIX') || p.includes('MULTII') || p.includes('KAIZEN') || selectedExtras?.extra_decor_onix || selectedExtras?.extra_decor_multii || selectedExtras?.extra_decor_kaizen;
};
const needsCam360 = (pName, selectedExtras = {}) => {
  const p = (pName || '').toUpperCase();
  return p.includes('MULTII') || p.includes('KAIZEN') || selectedExtras?.extra_cam360;
};
const needsAV = (pName, selectedExtras = {}) => {
  const p = (pName || '').toUpperCase();
  return p.includes('ONIX') || p.includes('MULTII') || p.includes('KAIZEN') || selectedExtras?.extra_av;
};
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc,
  serverTimestamp, query, where, orderBy, getDocs, getDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- HELPERS MOVED TO utils/helpers.js ---
// --- ICONS MOVED TO components/Icons.jsx ---


// --- TIME INTERVAL GENERATOR ---
const generateTimeOptions = () => {
   const times = [];
   for (let h = 0; h < 24; h++) {
     times.push(`${String(h).padStart(2, '0')}:00`);
   }
   return times;
 };

const getDisplayTimeUI = (val) => {
  if (!val) return { h: '08', m: '00', period: 'PM', full: '08:00 PM' };
  const timeStr = String(val);
  let [hStr, mStr] = timeStr.includes(':') ? timeStr.split(':') : [timeStr, '00'];
  let h = parseInt(hStr || 12, 10);
  const m = String(parseInt(mStr || 0, 10)).padStart(2, '0');
  if (isNaN(h)) h = 12;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return {
    h: String(h12).padStart(2, '0'),
    m,
    period,
    full: `${String(h12).padStart(2, '0')}:${m} ${period}`
  };
};

const COMMON_TIME_OPTIONS = generateTimeOptions();


// --- TIME COMPONENT ---
// --- TIME COMPONENT (NATIVE) ---
const TimeInput = ({ value, onChange, label }) => {
  const display = getDisplayTimeUI(value);
  const isAM = display.period === 'AM';

  return (
    <div className="time-input-premium" style={{
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '16px',
      padding: '10px 8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      minHeight: '85px',
      cursor: 'pointer',
      overflow: 'hidden',
      boxShadow: isAM ? '0 8px 25px rgba(0, 242, 255, 0.08)' : '0 8px 25px rgba(188, 111, 241, 0.08)',
      transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      margin: '4px 0'
    }}>
      {/* DYNAMIC AM/PM BLOB BACKGROUND */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-20%',
        width: '100px',
        height: '100px',
        background: 'var(--primary-cyan)',
        filter: 'blur(40px)',
        opacity: 0.15,
        zIndex: 0,
        transition: 'all 0.6s ease'
      }} />

      {/* LABEL WITH SPACING */}
      <span style={{
        position: 'relative',
        zIndex: 2,
        fontSize: '0.45rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        fontWeight: '900',
        letterSpacing: '1.5px',
        marginBottom: '6px'
      }}>
        {label}
      </span>

      {/* MAIN CLOCK DISPLAY */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: '2.2rem',
            fontWeight: '100',
            lineHeight: '1',
            fontFamily: 'system-ui',
            letterSpacing: '-1px'
          }}>
            {display.h}
          </span>
        </div>

        <span style={{
          fontSize: '1.2rem',
          fontWeight: '100',
          color: 'var(--primary-cyan)',
          opacity: 0.5,
          marginBottom: '4px'
        }}>:</span>

        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: '2.2rem',
            fontWeight: '100',
            lineHeight: '1',
            fontFamily: 'system-ui',
            letterSpacing: '-1px'
          }}>
            {display.m}
          </span>
        </div>
      </div>

      {/* PERIOD INDICATOR PILL */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        marginTop: '8px',
        fontSize: '0.55rem',
        fontWeight: '900',
        color: '#000',
        background: 'var(--primary-cyan)',
        padding: '3px 10px',
        borderRadius: '50px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: 'var(--gold-glow)',
        transition: 'all 0.3s ease'
      }}>
        {display.period}
      </div>

      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 10,
          background: '#111',
          color: '#fff'
        }}
      >
        <option value="" disabled style={{ background: '#111', color: '#fff' }}>Seleccionar hora</option>
        {COMMON_TIME_OPTIONS.map(t => (
          <option key={t} value={t} style={{ background: '#111', color: '#fff' }}>{getDisplayTimeUI(t).full}</option>
        ))}
      </select>

      <style dangerouslySetInnerHTML={{
        __html: `
        .time-input-premium:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-4px);
        }
        .time-input-premium:active {
            transform: scale(0.96) translateY(0);
        }
    `}} />
    </div>
  );
};

// --- MINI TIME INPUT (FOR EXTRAS) ---
const MiniTimeInput = ({ startVal, endVal, onStartChange, onEndChange, label, labelColor = '#8b9bb4' }) => {
  return (
    <div style={{ marginTop: '12px', marginLeft: '2px' }}>
      <span style={{ 
        fontSize: '0.65rem', color: labelColor, fontWeight: '950', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'inline-block', fontFamily: 'monospace'
      }}>{label}</span>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 10, 15, 0.7)',
        border: '1px solid var(--primary-cyan)', borderRadius: '50px', padding: '14px 28px', gap: '24px', width: 'fit-content', boxShadow: 'var(--gold-glow), inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.95rem', letterSpacing: '-0.5px' }}>
            {getDisplayTimeUI(startVal).full}
          </span>
          <select 
            value={startVal || ''} 
            onChange={(e) => onStartChange(e.target.value)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', background: '#111', color: '#fff', zIndex: 20 }}
          >
            <option value="" disabled style={{ background: '#111', color: '#fff' }}>Hora</option>
            {COMMON_TIME_OPTIONS.map(t => <option key={t} value={t} style={{ background: '#111', color: '#fff' }}>{getDisplayTimeUI(t).full}</option>)}
          </select>
        </div>

        <div style={{ width: '24px', height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>

        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.95rem', letterSpacing: '-0.5px' }}>
            {getDisplayTimeUI(endVal).full}
          </span>
          <select 
            value={endVal || ''} 
            onChange={(e) => onEndChange(e.target.value)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', background: '#111', color: '#fff', zIndex: 20 }}
          >
             <option value="" disabled style={{ background: '#111', color: '#fff' }}>Hora</option>
             {COMMON_TIME_OPTIONS.map(t => <option key={t} value={t} style={{ background: '#111', color: '#fff' }}>{getDisplayTimeUI(t).full}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};



const APP_VERSION = '1.4.6-logistics-force-refresh'; // UI Simplification Step 1

function App() {
  // --- VERSIONING & CLEANUP ---
  React.useEffect(() => {
    const lastVersion = localStorage.getItem('nexxa_app_version');
    if (lastVersion && lastVersion !== APP_VERSION) {
      console.log(`[VERSION] Updating from ${lastVersion} to ${APP_VERSION}. Clearing cache...`);
      localStorage.clear();
      localStorage.setItem('nexxa_app_version', APP_VERSION);
      setTimeout(() => window.location.reload(true), 100);
    } else {
      localStorage.setItem('nexxa_app_version', APP_VERSION);
    }
  }, []);


  // --- MAGIC LINK RECEIVER (Auto-fill from URL) ---
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('client')) {
      try {
        const pClient = params.get('client') || '';
        const pPhone = params.get('phone') || '';
        const pDate = params.get('date') || '';
        const pStart = params.get('start') || '';
        const pEnd = params.get('end') || '';        const pLoc = params.get('loc') || params.get('address') || params.get('direccion') || '';
        const pBarrio = params.get('barrio') || params.get('neighborhood') || '';
        const pPack = params.get('pack') || '';
        const pExtras = params.get('extras') || '';

        // Map Pack ID to Name
        let finalPack = 'Personalizado';
        if (pPack.toUpperCase().includes('ESSENTIAL')) finalPack = 'ONIX';
        if (pPack.toUpperCase().includes('ONIX') || pPack.toUpperCase().includes('SILVER')) finalPack = 'ONIX';
        if (pPack.toUpperCase().includes('MULTII') || pPack.toUpperCase().includes('ELITE')) finalPack = 'MULTII';
        if (pPack.toUpperCase().includes('KAIZEN') || pPack.toUpperCase().includes('DIAMOND')) finalPack = 'KAIZEN';

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

        const pGuest = params.get('pax') || params.get('guests') || params.get('invitados') || '10';

        const preFilledEvent = {
          clientName: pClient,
          clientPhone: pPhone,
          date: pDate,
          startTime: pStart,
          endTime: pEnd,
          location: pLoc,
          neighborhood: pBarrio,
          packName: finalPack,
          managerName: '',
          guestCount: pGuest,
          deposit: '',
          totalValue: '',
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
  React.useEffect(() => {
    const handleError = (event) => {
      setLastFatalError(event.error?.message || event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // 1. SYNC EVENTS
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      // PROTECCIÓN RADICAL: Validar que snapshot.docs sea un array
      if (!snapshot || !snapshot.docs || !Array.isArray(snapshot.docs)) {
        console.error("⚠️ onSnapshot events: snapshot.docs no es un array");
        return;
      }

      const liveEvents = snapshot.docs.map(doc => {
        const d = doc.data();
        if (!d) return null;
        
        // NORMALIZACIÓN DE UBICACIÓN Y BARRIO (Nacional -> Staff)
        const normLocation = d.eventDetails?.location || d.eventDetails?.direccion || d.eventDetails?.address || d.location || d.direccion || d.address || '';
        const normNeighborhood = d.eventDetails?.neighborhood || d.eventDetails?.barrio || d.neighborhood || d.barrio || '';
        
        const normalizedDetails = {
          ...(d.eventDetails || {}),
          location: normLocation,
          neighborhood: normNeighborhood
        };

        return { ...d, eventDetails: normalizedDetails, id: doc.id };
      }).filter(e => e !== null);

      // AUDITORÍA: Detectar eventos sin client.name o location
      liveEvents.forEach(evt => {
        if (!evt.client || (!evt.client.name && !evt.clientName)) {
          console.error("🔴 EVENTO SIN NOMBRE DETECTADO:", evt.id);
        }
        if (!evt.eventDetails?.location && !evt.location) {
          console.warn("🟠 EVENTO SIN UBICACIÓN:", evt.id);
        }
      });

      // FILTRO DE SEGURIDAD: Eliminar eventos sin datos críticos
      const validEvents = liveEvents.filter(evt => {
        const hasValidClient = evt && (evt.client?.name || evt.clientName);
        if (!hasValidClient) {
          console.warn("⚠️ Evento filtrado por falta de nombre:", evt?.id);
        }
        return hasValidClient;
      });

      // Orden cronológico: Los eventos más cercanos a suceder aparecen primero
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
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotations"), (snapshot) => {
      if (!snapshot || !snapshot.docs) return;

      const liveQuo = snapshot.docs.map(doc => {
        const d = doc.data();
        if (!d) return null;

        // NORMALIZACIÓN DE UBICACIÓN (Defensiva)
        const dClient = d.client || {};
        const dEvent = d.eventDetails || {};
        const normLoc = dEvent.location || dEvent.direccion || dEvent.address || dClient.location || dClient.direccion || dClient.address || d.direccion || d.address || d.location || '';
        const normHood = dEvent.neighborhood || dEvent.barrio || dClient.neighborhood || dClient.barrio || d.barrio || d.neighborhood || '';

        // NORMALIZACIÓN DE EXTRAS (Landing -> Staff)
        const rawExtras = d.logistics?.selectedExtras || d.selectedExtras || d.servicios || d.items || {};
        const cleanExtras = {};
        
        const processStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (Array.isArray(rawExtras)) {
          rawExtras.forEach(item => {
            const searchStr = processStr(typeof item === 'string' ? item : (item.id + ' ' + item.name + ' ' + (item.category || '')));
            if (searchStr.includes('photo') || searchStr.includes('foto')) cleanExtras['extra_photo'] = true;
            else if (searchStr.includes('360') || searchStr.includes('cam') || searchStr.includes('master')) cleanExtras['extra_cam360'] = true;
            else if (searchStr.includes('makeup') || searchStr.includes('maquillaje') || searchStr.includes('neon')) cleanExtras['extra_makeup'] = true;
            else if (searchStr.includes('av') || searchStr.includes('audiovisual') || searchStr.includes('sonido')) cleanExtras['extra_av'] = true;
            else if (searchStr.includes('111') || (searchStr.includes('essential') && searchStr.includes('kit'))) cleanExtras['acc_essential'] = true;
            else if (searchStr.includes('444') || (searchStr.includes('memories') && searchStr.includes('kit'))) cleanExtras['acc_memories'] = true;
            else if (searchStr.includes('777') || (searchStr.includes('celebration') && searchStr.includes('kit'))) cleanExtras['acc_celebration'] = true;
            else if (searchStr.includes('onix') || searchStr.includes('decor')) cleanExtras['extra_decor_onix'] = true;
            else if (searchStr.includes('multii')) cleanExtras['extra_decor_multii'] = true;
            else if (searchStr.includes('kaizen')) cleanExtras['extra_decor_kaizen'] = true;
            else if (typeof item === 'string') cleanExtras[item] = true;
            else if (item.id) cleanExtras[item.id] = true;
          });
        } else {
          Object.keys(rawExtras).forEach(k => {
            const val = rawExtras[k];
            if (val) {
              const searchStr = processStr(typeof val === 'string' ? (k + ' ' + val) : k);
              if (searchStr.includes('photo') || searchStr.includes('foto')) cleanExtras['extra_photo'] = true;
              else if (searchStr.includes('360') || searchStr.includes('cam') || searchStr.includes('master')) cleanExtras['extra_cam360'] = true;
              else if (searchStr.includes('makeup') || searchStr.includes('maquillaje') || searchStr.includes('neon')) cleanExtras['extra_makeup'] = true;
              else if (searchStr.includes('av') || searchStr.includes('audiovisual') || searchStr.includes('sonido')) cleanExtras['extra_av'] = true;
              else if (searchStr.includes('111') || (searchStr.includes('essential') && searchStr.includes('kit'))) cleanExtras['acc_essential'] = true;
              else if (searchStr.includes('444') || (searchStr.includes('memories') && searchStr.includes('kit'))) cleanExtras['acc_memories'] = true;
              else if (searchStr.includes('777') || (searchStr.includes('celebration') && searchStr.includes('kit'))) cleanExtras['acc_celebration'] = true;
              else if (searchStr.includes('onix') || searchStr.includes('decor')) cleanExtras['extra_decor_onix'] = true;
              else if (searchStr.includes('multii')) cleanExtras['extra_decor_multii'] = true;
              else if (searchStr.includes('kaizen')) cleanExtras['extra_decor_kaizen'] = true;
              else cleanExtras[k] = true;
            }
          });
        }

        const pName = (d.logistics?.packName || d.paquete || d.packName || '').toUpperCase();

        return {
          id: doc.id,
          status: d.status || 'SENT',
          createdAt: d.createdAt || d.timestamp || d.created_at || null,
          client: {
            name: (d.client?.name || d.clientName || 'Sin Nombre').trim(),
            phone: d.client?.phone || d.clientPhone || '',
            phone2: d.client?.phone2 || d.clientPhone2 || ''
          },
          eventDetails: {
            date: d.eventDetails?.date || d.arrivalDate || d.date || '',
            occasion: d.eventDetails?.occasion || '',
            startTime: d.eventDetails?.startTime || d.startTime || '',
            endTime: d.eventDetails?.endTime || d.endTime || '',
            location: normLoc,
            neighborhood: normHood,
            guestCount: (() => {
                const rawG = String(dEvent.guests || dEvent.guestCount || dEvent.invitados || d.invitados || '10');
                const match = rawG.match(/\d+/);
                return match ? Number(match[0]) : 10;
            })(),
            photoStartTime: d.eventDetails?.photoStartTime || d.eventDetails?.photoStart || '',
            photoEndTime: d.eventDetails?.photoEndTime || d.eventDetails?.photoEnd || '',
            cam360StartTime: d.eventDetails?.cam360StartTime || d.eventDetails?.camStart || d.eventDetails?.videoStartTime || '',
            cam360EndTime: d.eventDetails?.cam360EndTime || d.eventDetails?.camEnd || d.eventDetails?.videoEndTime || '',
            avStartTime: d.eventDetails?.avStartTime || d.eventDetails?.avStart || '',
            avEndTime: d.eventDetails?.avEndTime || d.eventDetails?.avEnd || '',
            decorStartTime: d.eventDetails?.decorStartTime || d.eventDetails?.decorStart || '',
            decorEndTime: d.eventDetails?.decorEndTime || d.eventDetails?.decorEnd || ''
          },
          financials: {
            totalValue: Number(d.financials?.totalValue || d.totalValue || d.valor_total || d.total || d.precio || d.price || d.valor || 0),
            deposit: Number(d.financials?.deposit || d.deposit || d.abono || d.anticipo || 0),
            extraHourPrice: Number(d.financials?.extraHourPrice) || 85000
          },
          logistics: {
            packName: (() => {
                const raw = pName || '';
                if (raw.includes('ONIX') || raw.includes('ESSENTIAL')) return 'ONIX';
                if (raw.includes('MULTII')) return 'MULTII';
                if (raw.includes('KAIZEN')) return 'KAIZEN';
                if (raw.includes('MEMORIES')) return 'MEMORIES';
                if (raw.includes('CELEBRATION')) return 'CELEBRATION';
                return raw || 'PERSONALIZADO';
            })(),
            selectedExtras: cleanExtras,
            makeupCount: Number(d.logistics?.makeupCount || d.makeupCount) || 1
          }
        };
      }).filter(q => q && q.id);

      setQuotations(liveQuo.sort((a, b) => {
        if (!a || !b) return 0;

        // CRITICAL SYNC: Strict Newest First (regardless of status)
        const dateA = a.createdAt ? parseFirestoreDate(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? parseFirestoreDate(b.createdAt) : new Date(0);
        
        const timeA = dateA.getTime ? dateA.getTime() : 0;
        const timeB = dateB.getTime ? dateB.getTime() : 0;

        if (timeA !== timeB) return timeB - timeA;

        // FALLBACK: ID
        return (b.id || '').localeCompare(a.id || '');
      }));
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNC INVENTORY
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      // PROTECCIÓN RADICAL: Validar que snapshot.docs sea un array
      if (!snapshot || !snapshot.docs || !Array.isArray(snapshot.docs)) {
        console.error("⚠️ onSnapshot inventory: snapshot.docs no es un array");
        return;
      }

      const liveInv = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // AUDITORÍA: Detectar items sin name
      liveInv.forEach(item => {
        if (!item.name) {
          console.error("🔴 ITEM DE INVENTARIO SIN NOMBRE:", {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  const [sectionState, setSectionState] = useState({ s1: true, s2: true, s3: false });
  const [catSectionState, setCatSectionState] = useState({});
  const toggleCatSection = (key) => setCatSectionState(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleSection = (key) => setSectionState(prev => ({ ...prev, [key]: !prev[key] }));
  const [isEditingAds, setIsEditingAds] = useState(false);
  const [localAdsBuffer, setLocalAdsBuffer] = useState({});
  const [adAllocations, setAdAllocations] = useState({});
  const [editingAccount, setEditingAccount] = useState(null); // 'Nequi', 'Daviplata', 'Efectivo'
  const [tempBalanceVal, setTempBalanceVal] = useState('');
  const [approveModal, setApproveModal] = useState(null); // { quo }
  const [paymentModal, setPaymentModal] = useState(null); // { evt, type: 'DEPOSIT' | 'FINAL' }
  const [paymentSplit, setPaymentSplit] = useState({ Nequi: 0, Daviplata: 0, Efectivo: 0 });
  const [historySearch, setHistorySearch] = useState('');
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0]);

  // --- AUTH STATE ---
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexxa_user');
      // PREVENT CRASH: If saved is "undefined" string or similar
      if (!saved || saved === 'undefined' || saved === 'null') return null;

      const parsedUser = JSON.parse(saved);

      // RESET DE MEMORIA RADICAL: Limpiar TODO si hay datos corruptos
      // Check for 'name' specifically as it seems to be the crash point
      if (!parsedUser || typeof parsedUser !== 'object') {
        localStorage.removeItem('nexxa_user');
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

  // 🔍 FUNCIÓN DE AUDITORÍA TEMPORAL - Detectar registros corruptos
  React.useEffect(() => {
    const auditFirebaseData = async () => {
      console.log("🔍 INICIANDO AUDITORÍA DE FIREBASE...");

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
          console.error("🔴 EVENTOS CORRUPTOS ENCONTRADOS:", corruptedEvents.length);
          corruptedEvents.forEach(evt => {
            console.error("  - ID:", evt.id, "| Client:", evt.data.client, "| ClientName:", evt.data.clientName);
          });
        } else {
          console.log("✅ Todos los eventos tienen nombre");
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
          console.error("🔴 COTIZACIONES CORRUPTAS ENCONTRADAS:", corruptedQuotations.length);
          corruptedQuotations.forEach(quo => {
            console.error("  - ID:", quo.id, "| Client:", quo.data.client, "| ClientName:", quo.data.clientName);
          });
        } else {
          console.log("✅ Todas las cotizaciones tienen nombre");
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
          console.error("🔴 ITEMS DE INVENTARIO CORRUPTOS ENCONTRADOS:", corruptedInventory.length);
          corruptedInventory.forEach(item => {
            console.error("  - ID:", item.id, "| Category:", item.data.category, "| Name:", item.data.name);
          });
        } else {
          console.log("✅ Todos los items de inventario tienen nombre");
        }

        console.log("🔍 AUDITORÍA COMPLETADA");

      } catch (error) {
        console.error("❌ Error en auditoría:", error);
      }
    };

    // Ejecutar auditoría solo una vez al montar
    if (user) {
      auditFirebaseData();
    }
  }, [user]); // Solo cuando el usuario inicia sesión


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
    } else if (pin === 'nexxa2026' && name.length > 2) {
      const u = { name: loginUser.trim(), id: `sales_${Date.now()}` };
      setUser(u);
      setUserRole('sales');
      localStorage.setItem('nexxa_user', JSON.stringify(u));
      localStorage.setItem('nexxa_role', 'sales');
    } else {
      setLoginError('Nombre o clave incorrectos. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión en el panel?')) {
      setUser(null);
      setUserRole(null);
      localStorage.removeItem('nexxa_user');
      localStorage.removeItem('nexxa_role');
      setView('events');
    }
  };

  // 5. SYNC MARKETING DISTRIBUTION (ALLOCATIONS)
  React.useEffect(() => {
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
    signature: 'Atte: El equipo de Nexxa Sound 🎧'
  });

  // --- ESTADO: AGENDA OPERATIVA (GASTOS PROGRAMADOS RECURRENTES) ---
  const [scheduledExpenses, setScheduledExpenses] = useState([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({ day: '', concept: '', amount: '' });

  // SYNC AGENDA OPERATIVA
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "operative_agenda"), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setScheduledExpenses(items);
    });
    return () => unsubscribe();
  }, []);

  // --- MONITOR DE CIERRE AUTOMÁTICO (Turbo Context) ---
  React.useEffect(() => {
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
        const d = JSON.parse(draft);
        // Ensure no automatic selection for new drafts
        if (!d.id) {
          if ((d.packName || '').toUpperCase().includes('ESSENTIAL')) d.packName = '';
          if (d.packName === 'ONIX' && !d.clientName && !d.date) d.packName = '';
        }
        if (d.packName === 'null' || !d.packName || d.packName.toUpperCase().includes('ESSENTIAL')) d.packName = '';
        return d;
      } catch (e) {
        console.error("Error parsing draft", e);
      }
    }
    return {
      clientName: '', clientPhone: '', clientPhone2: '',
      date: '', startTime: '', endTime: '',
      djStartTime: '', djEndTime: '',
      location: '', neighborhood: '',
      packName: '',
      totalValue: '', deposit: '',
      leadSource: '', guestCount: '50',
      occasion: '',
      extraHourPrice: 85000,
      indications: 'Ninguna',
      warehouseTime: '',
      materialExplanation: '',
      photoStartTime: '',
      photoEndTime: '',
      avStartTime: '',
      avEndTime: '',
      cam360StartTime: '',
      cam360EndTime: '',
      decorStartTime: '',
      decorEndTime: '',
      paymentMethod: 'Nequi'
    };
  });

  // --- LEAD PARSER (WhatsApp Clipboard) ---
  const handlePasteWhatsApp = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert('Portapapeles vacío');

      const newData = { ...newEvent, id: null, selectedExtras: {} };

      // Extended Regex for Lead Parsing
      const cMatch = text.match(/(?:Cliente|CLIENTE):\s*(.+)/i);
      const pMatch = text.match(/(?:Celular|CELULAR|WhatsApp|TELEFONO|WhatsApp 1):\s*([\d\+\s\w]+)/i);
      const dMatch = text.match(/(?:Fecha|FECHA):\s*(\d{4}-\d{2}-\d{2})/i);
      const gMatch = text.match(/(?:Invitados|INVITADOS):\s*(\d+)/i);
      const packMatch = text.match(/(?:Paquete|PAQUETE|Plan|Plan Seleccionado):\s*(.+)/i);
      const totalMatch = text.match(/(?:Total|TOTAL|Precio|Valor|Estimado|ESTIMADO):\s*[\$]?\s*([\d\.\,]+)/i);

      if (cMatch) newData.clientName = cMatch[1].trim();
      if (pMatch) newData.clientPhone = pMatch[1].trim().replace(/[^\d\+]/g, '');
      if (dMatch) newData.date = dMatch[1];
      if (gMatch) newData.guestCount = gMatch[1];
      
      if (packMatch) {
         const p = packMatch[1].toUpperCase();
         if (p.includes('ONIX')) newData.packName = 'ONIX';
         else if (p.includes('MULTII')) newData.packName = 'MULTII';
         else if (p.includes('KAIZEN')) newData.packName = 'KAIZEN';
         else newData.packName = 'Personalizado';
      }
      
      if (totalMatch) {
         const cleanString = totalMatch[1].replace(/[\.,]/g, '');
         const parsedVal = Number(cleanString);
         if (!isNaN(parsedVal)) {
            newData.totalValue = parsedVal;
            newData.deposit = Math.round(parsedVal * 0.3);
         }
      }

      // --- ADVANCED HORARY PARSER ---
      const parseRange = (line) => {
        const m = line.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)?\s*(?:a|to|-)\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)?/i);
        if (!m) return null;
        const convert = (time, p) => {
          let h, min;
          if (time.includes(':')) {
            [h, min] = time.split(':').map(Number);
          } else {
            h = Number(time);
            min = 0;
          }
          if (p?.toUpperCase() === 'PM' && h < 12) h += 12;
          if (p?.toUpperCase() === 'AM' && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        };
        return { start: convert(m[1], m[2]), end: convert(m[3], m[4]) };
      };

      const lines = text.split('\n');
      lines.forEach(line => {
        const upLine = line.toUpperCase();
        // Implicit Pack Detection (as titles)
        if (upLine.includes('* ONIX')) newData.packName = 'ONIX';
        if (upLine.includes('* MULTII')) newData.packName = 'MULTII';
        if (upLine.includes('* KAIZEN')) newData.packName = 'KAIZEN';

        if (upLine.includes('360')) {
          newData.selectedExtras['extra_cam360'] = true;
          const range = parseRange(line);
          if (range) { newData.cam360StartTime = range.start; newData.cam360EndTime = range.end; }
        }
        if (upLine.includes('FOTOGRAFIA') || upLine.includes('PHOTO')) {
          newData.selectedExtras['extra_photo'] = true;
          const range = parseRange(line);
          if (range) { newData.photoStartTime = range.start; newData.photoEndTime = range.end; }
        }
        if (upLine.includes('AUDIOVISUAL') || upLine.includes('DJ')) {
          newData.selectedExtras['extra_av'] = true;
          const range = parseRange(line);
          if (range) { 
            newData.djStartTime = range.start; newData.djEndTime = range.end; 
            newData.avStartTime = range.start; newData.avEndTime = range.end;
            if (!newData.startTime) newData.startTime = range.start;
            if (!newData.endTime) newData.endTime = range.end;
          }
        }
        if (upLine.includes('DECORACION')) {
          if (upLine.includes('ONIX')) newData.selectedExtras['extra_decor_onix'] = true;
          if (upLine.includes('MULTII')) newData.selectedExtras['extra_decor_multii'] = true;
          if (upLine.includes('KAIZEN')) newData.selectedExtras['extra_decor_kaizen'] = true;
          const range = parseRange(line);
          if (range) { newData.decorStartTime = range.start; newData.decorEndTime = range.end; }
        }
        if (upLine.includes('KITS 111') || upLine.includes('KIT 111')) newData.selectedExtras['acc_essential'] = true;
        if (upLine.includes('MAQUILLAJE')) newData.selectedExtras['extra_makeup'] = true;
      });

      // --- FINANCIAL CALCULATION SYNC ---
      // 1. Calculate the sum of detected extras to find the "Missing Base"
      const detectedExtras = getDynamicExtras(newData).filter(ex => newData.selectedExtras[ex.id]);
      const extrasSum = detectedExtras.reduce((acc, ex) => acc + (parseInt(ex.price) || 0), 0);
      
      const parsedTotal = parseInt(text.match(/TOTAL ESTIMADO:\s*\$?\s*([\d.]+)/i)?.[1].replace(/\./g, '')) || 0;
      
      // 2. If the total is higher than the extras, the difference is the Base Price (Service Cost)
      if (parsedTotal > extrasSum) {
        newData.manualBasePrice = parsedTotal - extrasSum;
      } else {
        newData.manualBasePrice = 0;
      }

      newData.totalValue = parsedTotal || extrasSum || 0;
      newData.isImported = true;
      setNewEvent(newData);
      alert(`✅ Lead "${newData.clientName}" importado exitosamente.\nTotal: ${formatPeso(newData.totalValue)}\n(Base: ${formatPeso(newData.manualBasePrice)} + Extras: ${formatPeso(extrasSum)})`);
    } catch (err) {
      console.error("DEBUG NEXXA - Parser Error:", err);
      alert('Error procesando el portapapeles.');
    }
  };

  // Auto-Save Draft Effect
  React.useEffect(() => {
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
    const pKey = (newEvent.packName || '').toUpperCase();
    if (pKey === 'MULTII' || pKey === 'KAIZEN' || pKey === 'ONIX') {
      if (!newEvent.photoStartTime) return alert(`⚠️ SE REQUIERE HORARIO DE FOTOGRAFÍA PARA ${pKey}.`);
      if (pKey === 'MULTII' || pKey === 'ONIX' || pKey === 'KAIZEN') {
        if (!newEvent.avStartTime) return alert(`⚠️ SE REQUIERE HORARIO DE AUDIOVISUALES PARA ${pKey}.`);
      }
      if (pKey === 'MULTII' || pKey === 'KAIZEN') {
        if (!newEvent.cam360StartTime) return alert(`⚠️ SE REQUIERE HORARIO DE CÁMARA 360 PARA ${pKey}.`);
      }
      if (pKey === 'MULTII') {
        if (!newEvent.decorStartTime) return alert(`⚠️ SE REQUIERE HORARIO DE DECORACIÓN PARA MULTII.`);
      }
    }

    const total = Number(newEvent.totalValue) || 0;

    // GENERATE QUOTATION ID
    const dateCode = newEvent.date.replace(/-/g, '').slice(2);
    const dailyCount = quotations.filter(q => q.eventDetails?.date === newEvent.date).length + 1;
    const finalQuoId = `QUO-${dateCode}-${String(dailyCount).padStart(2, '0')}`;

    // INITIAL ITEMS (Same logic as handleCreateEvent)
    const p = (newEvent.packName || '').toUpperCase();
    const proto = STITCH_DATA.protocols[p];
    let defaultItems = (proto?.items || []).map(name => ({
        name,
        qty: 1,
        status: 'PENDING',
        area: 'LOGÍSTICA'
    }));

    if (defaultItems.length === 0) {
        // Fallback for Personalizado
        defaultItems = [
            { name: 'SISTEMA AUDIO NEXXA PRO', qty: 1, status: 'PENDING', area: 'DJ' },
            { name: 'KIT ENERGIA COMPLETO', qty: 1, status: 'PENDING', area: 'LOGÍSTICA' }
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
        djStartTime: newEvent.djStartTime || newEvent.startTime,
        djEndTime: newEvent.djEndTime || newEvent.endTime,
        guestCount: newEvent.guestCount,
        photoStartTime: newEvent.photoStartTime || '',
        photoEndTime: newEvent.photoEndTime || '',
        decorStartTime: newEvent.decorStartTime || '',
        decorEndTime: newEvent.decorEndTime || '',
        avStartTime: newEvent.avStartTime || '',
        avEndTime: newEvent.avEndTime || '',
        cam360StartTime: newEvent.cam360StartTime || '',
        cam360EndTime: newEvent.cam360EndTime || ''
      },
      financials: {
        totalValue: total,
        deposit: Number(newEvent.deposit) || 0,
        balance: total - (Number(newEvent.deposit) || 0),
        manualBasePrice: Number(newEvent.manualBasePrice) || 0,
        manualBaseDescription: newEvent.manualBaseDescription || ''
      },
      logistics: {
        packName: newEvent.packName,
        selectedExtras: newEvent.selectedExtras || {},
        makeupCount: newEvent.makeupCount || 1,
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
      setNewEvent({ id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Onix', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', avStartTime: '', avEndTime: '', camStartTime: '', camEndTime: '', decorStartTime: '', decorEndTime: '', color: '#C9A84C' });
      localStorage.removeItem('nexxa_draft_event');
    } catch (err) {
      console.error(err);
      alert('Error en la conversión: ' + err.message);
    }
  };

  const [selectedRoleView, setSelectedRoleView] = useState('ALL');

  // --- ACTIONS ---

  const approveQuotation = (quo) => {
    // Abrir modal para confirmar método de abono
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

      eventObj.logistics.items = buildLogisticsItems(quo);

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
      alert(`✅ Evento Creado: ${eventId}`);
      setView('events');

    } catch (err) {
      console.error(err);
      alert('Error en aprobación: ' + err.message);
    }
  };

  const updateQuotationStatus = async (id, status) => {
    await updateDoc(doc(db, "quotations", id), { status });
  };

  // --- AUTO-MIGRATION: FIX OLD IDS ---
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    'Onix': { base: 1220000, extraDJ: 85000, extraPhoto: 50000 },
    'Multii': { base: 1440000, extraDJ: 85000, extraPhoto: 50000 },
    'Kaizen': { base: 1940000, extraDJ: 85000, extraPhoto: 50000 },
    'Personalizado': { base: 0, extraDJ: 0, extraPhoto: 0 }
  };

  // ==========================================
  // CONFIGURACIÓN MAESTRA (STITCH SYNC)
  // ==========================================
  const STITCH_DATA = {
    protocols: {
      'ONIX':      { price: 1250000, roles: ['DJs Profesionales', 'Fotografía Profesional'], items: ['Sonido Line Array', 'Pantallas LED', 'Luces Beam', 'Montaje Ónix'], includedExtras: ['extra_photo', 'extra_decor_onix', 'extra_av', 'acc_essential'] },
      'MULTII':    { price: 1440000, roles: ['DJs Profesionales', 'Fotografía Profesional', 'Cámara 360°'], items: ['Sonido Premium', 'Pantallas LED', 'Luces Beam', 'Montaje Elite'], includedExtras: ['extra_photo', 'extra_cam360', 'extra_decor_multii', 'extra_av', 'acc_memories'] },
      'KAIZEN':    { price: 1940000, roles: ['DJs Profesionales', 'Fotografía Profesional', 'Cámara 360°', 'Maquillaje Neón'], items: ['Máximo Sonido', 'Producción de Escenario', 'Efectos Especiales', 'Montaje Kaizen'], includedExtras: ['extra_photo', 'extra_cam360', 'extra_decor_kaizen', 'extra_makeup', 'extra_av', 'acc_celebration'] },
      'CELEBRATION': { price: 850000, roles: ['DJs Profesionales', 'Fotografía Profesional'], items: ['Sonido Pro', 'Decoración'], includedExtras: ['extra_photo', 'extra_decor_onix'] },
      'MEMORIES':    { price: 650000, roles: ['DJs Profesionales', 'Fotografía Profesional'], items: ['Sonido Pro'], includedExtras: ['extra_photo'] }
    },
    extras: {
      photo: 200000,   // Base for 4h
      cam360: 550000,  // Base for 2h
      makeup: 120000,
      av: 450000,
      decor_onix: 200000,
      decor_multii: 340000,
      decor_kaizen: 550000,
      // INDIVIDUAL ITEMS (Single Source of Truth)
      acc_espuma: 13000,
      acc_canon: 5000,
      acc_manilla: 400,
      acc_antifaz: 300,
      acc_collar: 400,
      acc_pito: 200
    },
    hourlyRates: {
      dj: 85000,
      photo: 50000,
      cam360: 200000,
      av: 85000
    }
  };

  const PRICING_DYNAMIC = new Proxy({}, {
    get: (target, name) => {
      let activeName = name || '';
      if (activeName.toUpperCase() === 'ESSENTIAL' || activeName.toUpperCase() === 'SONIDO ESSENTIAL') activeName = 'Onix';
      if (!activeName) return { base: 0, roles: [] };
      const config = STITCH_DATA.protocols[activeName.toUpperCase()];
      if (!config) return { base: 0, roles: [] };
      return { base: config.price, roles: config.roles };
    }
  });

  // --- DATA DINÁMICA DE EXTRAS ---
  const getDynamicExtras = (evt) => {
    const guests = evt?.guestCount;
    const userMakeupCount = evt?.makeupCount;
    const g = Math.max(10, Number(guests) || 10);
    const recommendedMakeup = Math.ceil(g / 50);
    const qty = (typeof userMakeupCount === 'number') ? userMakeupCount : recommendedMakeup;

    const photoDur = getHours(evt?.photoStartTime || '20:00', evt?.photoEndTime || evt?.photoStartTime || '20:00');
    const camDur = getHours(evt?.cam360StartTime || '20:00', evt?.cam360EndTime || evt?.cam360StartTime || '20:00');
    const avDur = getHours(evt?.avStartTime || '20:00', evt?.avEndTime || evt?.avStartTime || '20:00');

    const extraPhotoCost = STITCH_DATA.extras.photo;
    const extraCamCost = STITCH_DATA.extras.cam360;
    const extraAVCost = STITCH_DATA.extras.av;

    const extras = [
      {
        id: 'extra_makeup',
        name: `Maquillaje Neón`,
        price: STITCH_DATA.extras.makeup,
        isMakeup: true,
        category: 'Style',
        details: `Aplicación de maquillaje reactivo UV.`,
        needsTime: true
      },
      {
        id: 'acc_essential',
        name: 'Kit 111',
        price: (STITCH_DATA.extras.acc_espuma * 1) + (g * (STITCH_DATA.extras.acc_collar + STITCH_DATA.extras.acc_manilla + STITCH_DATA.extras.acc_pito)),
        isAcc: true,
        category: 'Accesorios',
        details: `1 Espuma + ${g} Collares/Manillas/Pitos.`,
        needsTime: false
      },
      {
        id: 'acc_memories',
        name: 'Kit 444',
        price: (STITCH_DATA.extras.acc_espuma * 2) + (g * (STITCH_DATA.extras.acc_collar + STITCH_DATA.extras.acc_manilla + STITCH_DATA.extras.acc_pito)),
        isAcc: true,
        category: 'Accesorios',
        details: `2 Espuma + ${g} Collares/Manillas/Pitos.`,
        needsTime: false
      },
      {
        id: 'acc_celebration',
        name: 'Kit 777',
        price: (STITCH_DATA.extras.acc_espuma * 3) + (STITCH_DATA.extras.acc_canon * 3) + (g * (STITCH_DATA.extras.acc_manilla + STITCH_DATA.extras.acc_pito + STITCH_DATA.extras.acc_collar + STITCH_DATA.extras.acc_antifaz)),
        isAcc: true,
        category: 'Accesorios',
        details: `3 Espuma + 3 Cañón + ${g} Collares/Manillas/Pitos/Antifaces.`,
        needsTime: false
      },
      // DECORATION
      { id: 'extra_decor_onix', name: 'Decoración Ónix', price: STITCH_DATA.extras.decor_onix, category: 'Decoración', details: 'Arco Globos (100+) • Fondo Shimmer • Topper Temático', needsTime: true },
      { id: 'extra_decor_multii', name: 'Decoración Multii', price: STITCH_DATA.extras.decor_multii, category: 'Decoración', details: 'Set de Globos (150+) • Estructura Circular • Manguera Neón • Cortina de Velo', needsTime: true },
      { id: 'extra_decor_kaizen', name: 'Decoración Kaizen', price: STITCH_DATA.extras.decor_kaizen, category: 'Decoración', details: 'Fondo de Diseño Personalizado • Trío de Cilindros • Set de Globos Premium', needsTime: true },
      // MEDIA / AUDIOVISUALES (Base price in list, extension via global calculator)
      { id: 'extra_av', name: 'Audiovisuales (Base 4h)', price: extraAVCost, category: 'Audiovisuales', details: 'Sonido Pro (2 Cabinas) • DJ Crossover • Show de Luces (4 LED + Humo)', needsTime: true },
      { id: 'extra_cam360', name: 'Cámara 360° Aérea (Min 2h)', price: extraCamCost, category: 'Video', details: 'Base 2h + Hora Extra $200k', needsTime: true },
      { id: 'extra_photo', name: 'Fotografía Social (Min 4h)', price: extraPhotoCost, category: 'Photo', details: 'Base 4h + Hora Extra $50k', needsTime: true },
      // INDIVIDUAL ITEMS
      { id: 'acc_espuma', name: 'Espuma', price: (STITCH_DATA.extras.acc_espuma || 0), isItem: true, category: 'Artículos', details: 'Lata de espuma para animación.' },
      { id: 'acc_canon', name: 'Cañón de Confeti', price: (STITCH_DATA.extras.acc_canon || 0), isItem: true, category: 'Artículos', details: 'Cañón manual de confeti o CO2.' },
      { id: 'acc_manilla', name: 'Manilla Neón', price: (STITCH_DATA.extras.acc_manilla || 0), isItem: true, category: 'Artículos', details: 'Manilla reactiva luz UV.' },
      { id: 'acc_antifaz', name: 'Antifaz', price: (STITCH_DATA.extras.acc_antifaz || 0), isItem: true, category: 'Artículos', details: 'Antifaz de cartón decorado.' },
      { id: 'acc_collar', name: 'Collar Hawaiano', price: (STITCH_DATA.extras.acc_collar || 0), isItem: true, category: 'Artículos', details: 'Collar de flores sintéticas.' },
      { id: 'acc_pito', name: 'Pito', price: (STITCH_DATA.extras.acc_pito || 0), isItem: true, category: 'Artículos', details: 'Silbato plástico para rumba.' }
    ];

    return extras.map(ex => {
        let sQty = evt?.extraQtys?.[ex.id] || ex.qty || 1;
        // Force guest count for Logistics Kits 111, 444, 777
        if (ex.isAcc && !ex.isItem) sQty = g; 
        
        // Robust lookup for protocol (Case insensitive and stripping prices/extras from string)
        const packStr = (evt?.packName || '').trim().toUpperCase();
        
        // ULTIMATE REGEX OVERRIDE (Case Insensitive)
        let isIncluded = false;
        if (/MULTII/i.test(packStr)) {
          if (['extra_photo', 'extra_cam360', 'extra_decor_multii', 'extra_av', 'acc_memories'].includes(ex.id)) isIncluded = true;
        } else if (/ONIX/i.test(packStr)) {
          if (['extra_photo', 'extra_decor_onix', 'extra_av', 'acc_essential'].includes(ex.id)) isIncluded = true;
        } else if (/KAIZEN/i.test(packStr)) {
          if (['extra_photo', 'extra_cam360', 'extra_decor_kaizen', 'extra_makeup', 'extra_av', 'acc_celebration'].includes(ex.id)) isIncluded = true;
        } else {
          const packKey = ['ONIX', 'MULTII', 'KAIZEN', 'CELEBRATION', 'MEMORIES'].find(k => packStr.includes(k)) || packStr;
          const proto = STITCH_DATA.protocols[packKey];
          isIncluded = proto?.includedExtras?.includes(ex.id) || false;
        }

        const basePrice = newEvent.extraPriceOverrides?.[ex.id] !== undefined ? Number(newEvent.extraPriceOverrides[ex.id]) : ex.price;
        const finalPrice = (isIncluded) ? 0 : ((ex.isItem || ex.isMakeup) ? basePrice * sQty : basePrice);
        return { ...ex, name: `${ex.name}`, basePrice: basePrice, qty: sQty, price: finalPrice, displayPrice: finalPrice, isIncluded };
    });
  };

  // --- DYNAMIC PRICING CALCULATOR (Staff Sync) ---
  const currentConf = PRICING_DYNAMIC[newEvent.packName] || {};
  // Use specific times IF provided; otherwise, assume BASE duration (no extra charges)
  const djDur = (newEvent.djStartTime && newEvent.djEndTime) ? getHours(newEvent.djStartTime, newEvent.djEndTime) : 4;
  const photoDur = (newEvent.photoStartTime && newEvent.photoEndTime) ? getHours(newEvent.photoStartTime, newEvent.photoEndTime) : 4;
  const camDur = (newEvent.cam360StartTime && newEvent.cam360EndTime) ? getHours(newEvent.cam360StartTime, newEvent.cam360EndTime) : 2;
  const decorDur = (newEvent.decorStartTime && newEvent.decorEndTime) ? getHours(newEvent.decorStartTime, newEvent.decorEndTime) : 2;
  const avDur = (newEvent.avStartTime && newEvent.avEndTime) ? getHours(newEvent.avStartTime, newEvent.avEndTime) : 4;

  const extraDJ = Math.max(0, Math.ceil(djDur - 4));
  const extraPhoto = Math.max(0, Math.ceil(photoDur - 4));
  const extraCam = Math.max(0, Math.ceil(camDur - 2));

  const hasDJ = newEvent.selectedExtras?.extra_dj || currentConf.roles?.includes('DJs Profesionales') || currentConf.roles?.includes('DJs') || (newEvent.djStartTime && newEvent.djEndTime);
  const hasPhoto = newEvent.selectedExtras?.extra_photo || currentConf.roles?.includes('Fotografía Profesional') || (newEvent.photoStartTime && newEvent.photoEndTime);
  const hasCam = newEvent.selectedExtras?.extra_cam360 || currentConf.roles?.includes('Cámara 360°') || (newEvent.cam360StartTime && newEvent.cam360EndTime);
  const hasAV = newEvent.selectedExtras?.extra_av || currentConf.items?.includes('Sonido Pro') || currentConf.items?.includes('Sonido Line Array') || (newEvent.avStartTime && newEvent.avEndTime);

  const basePriceValue = parseInt(currentConf.base) || 0;
  const extrasDJPrice = hasDJ ? (extraDJ * (parseInt(STITCH_DATA.hourlyRates.dj) || 0)) : 0;
  const extrasPhotoPrice = hasPhoto ? (extraPhoto * (parseInt(STITCH_DATA.hourlyRates.photo) || 0)) : 0;
  const extrasCamPrice = hasCam ? (extraCam * (parseInt(STITCH_DATA.hourlyRates.cam360) || 0)) : 0;
  const extrasAVPrice = hasAV ? (Math.max(0, Math.ceil(avDur - 4)) * (parseInt(STITCH_DATA.hourlyRates.av) || 0)) : 0;

  const activeExtrasArr = getDynamicExtras(newEvent).filter(ex => newEvent.selectedExtras?.[ex.id]);
  const otherExtrasPrice = activeExtrasArr.reduce((acc, ex) => acc + (parseInt(ex.price) || 0), 0);

  // CRITICAL FIX: Ensure Base Price is ALWAYS part of the sum
  // If it's a known package, use its base. If it's Personalized but has a manualBasePrice (from Lead), use it.
  const effectiveBasePrice = (newEvent.packName === 'PERSONALIZADO') 
    ? (parseInt(newEvent.manualBasePrice) || 0) 
    : basePriceValue;

  const computedTotal = effectiveBasePrice + 
                        extrasDJPrice + 
                        extrasPhotoPrice + 
                        extrasCamPrice + 
                        extrasAVPrice + 
                        otherExtrasPrice;

  // --- HELPER: GENERAR ITEMS DE LOGÍSTICA ---
  const buildLogisticsItems = (evt) => {
    const p = (evt.packName || '').toUpperCase();
    const protoKey = ['ONIX', 'MULTII', 'KAIZEN', 'CELEBRATION', 'MEMORIES'].find(k => p.includes(k)) || 'PERSONALIZADO';
    const protoBase = STITCH_DATA.protocols[protoKey] || {};
    
    // 1. Ítems base del protocolo
    let items = (protoBase.items || []).map(name => ({
      name,
      qty: 1,
      checked: false,
      area: name.includes('SONIDO') || name.includes('CABINA') || name.includes('LUCES') ? 'DJ' : 
            name.includes('CÁMARA') || name.includes('PLATAFORMA') || name.includes('360') ? 'VIDEO' :
            name.includes('DECORACIÓN') || name.includes('BOMBAS') ? 'DECOR' : 'LOGÍSTICA'
    }));

    if (items.length === 0) {
      items = [
        { name: 'SISTEMA AUDIO NEXXA PRO', qty: 1, checked: false, area: 'DJ' },
        { name: 'SISTEMA ILUMINACIÓN STITCH', qty: 1, checked: false, area: 'DJ' },
        { name: 'KIT ENERGÍA COMPLETO', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    }

    // 2. Ítems de extras dinámicos (seleccionados o incluidos por paquete)
    const dynamicExtras = getDynamicExtras(evt);
    dynamicExtras.forEach(ex => {
      const isActive = !!(evt.selectedExtras && evt.selectedExtras[ex.id]) || ex.isIncluded;
      if (isActive) {
        // Evitar duplicados (por nombre o indicio de nombre)
        if (!items.some(i => i.name === ex.name || i.name.toUpperCase().includes(ex.name.toUpperCase().substring(0, 8)))) {
          items.push({
            name: ex.name,
            qty: ex.qty || 1,
            checked: false,
            area: ex.category || 'EXTRAS'
          });
        }
      }
    });

    return items;
  };

  // Auto-update totalValue for accuracy
  useEffect(() => {
    if (computedTotal > 0) {
        if (!newEvent.totalValue || Number(newEvent.totalValue) === 0 || (!newEvent.isImported && Number(newEvent.totalValue) !== computedTotal)) {
             setNewEvent(prev => ({ 
                ...prev, 
                totalValue: computedTotal,
                deposit: Math.round(computedTotal * 0.3)
             }));
        }
    }
  }, [computedTotal, newEvent.id, newEvent.isImported]);


  // --- EDIT & STATUS HANDLERS ---
  const handleCreateEvent = async (e, status = 'CONFIRMED') => {
    if (e) e.preventDefault();

    // Validations (Skip for Drafts)
    if (status === 'CONFIRMED' || status === 'SENT') {
      if (!newEvent.clientName || !newEvent.date || !newEvent.totalValue) {
        return alert('Para procesar, necesitas al menos: Cliente, Fecha y Valor Total.');
      }

      // Mandatory Roles based on Package and Extras
      if (needsPhoto(newEvent.packName, newEvent.selectedExtras)) {
        if (!newEvent.photoStartTime || !newEvent.photoEndTime) {
          return alert(`⚠️ SE REQUIERE HORARIO DE FOTOGRAFÍA.`);
        }
        const photoDur = getHours(newEvent.photoStartTime, newEvent.photoEndTime);
        if (photoDur <= 0) {
          return alert('⚠️ EL HORARIO DE FOTOGRAFÍA NO PUEDE SER DE 0 HORAS.');
        }
      }
      if (needsDecor(newEvent.packName, newEvent.selectedExtras)) {
        if (!newEvent.decorStartTime || !newEvent.decorEndTime) {
          return alert(`⚠️ SE REQUIERE HORARIO DE DECORACIÓN.`);
        }
        const decorDur = getHours(newEvent.decorStartTime, newEvent.decorEndTime);
        if (decorDur <= 0) {
          return alert('⚠️ EL HORARIO DE DECORACIÓN NO PUEDE SER DE 0 HORAS.');
        }
      }
      if (needsCam360(newEvent.packName, newEvent.selectedExtras)) {
        if (!newEvent.cam360StartTime || !newEvent.cam360EndTime) {
          return alert(`⚠️ SE REQUIERE HORARIO DE CÁMARA 360.`);
        }
        const camDur = getHours(newEvent.cam360StartTime, newEvent.cam360EndTime);
        if (camDur <= 0) {
          return alert('⚠️ EL HORARIO DE CÁMARA 360 NO PUEDE SER DE 0 HORAS.');
        }
      }
      if (needsAV(newEvent.packName, newEvent.selectedExtras)) {
        if (!newEvent.avStartTime || !newEvent.avEndTime) {
          return alert(`⚠️ SE REQUIERE HORARIO AUDIOVISUAL.`);
        }
        const avDur = getHours(newEvent.avStartTime, newEvent.avEndTime);
        if (avDur <= 0) {
          return alert('⚠️ EL HORARIO AUDIOVISUAL NO PUEDE SER DE 0 HORAS.');
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

    const total = Number(newEvent.totalValue) || 0;
    const dep = Number(newEvent.deposit) || 0;

    // 1. DEFINIR ITEMS USANDO EL HELPER DINÁMICO
    const defaultItems = buildLogisticsItems(newEvent);

    // 1.1 LOS ITEMS YA INCLUYEN EXTRAS GRACIAS AL HELPER

    // 2. VERIFICACIÓN DE STOCK (Only for CONFIRMED)
    let conflictMsg = '';
    if (status === 'CONFIRMED') {
      const startToCheck = newEvent.djStartTime || newEvent.startTime || '20:00';
      const endToCheck = newEvent.djEndTime || newEvent.endTime || startToCheck;
      const newStart = parseInt(startToCheck.replace(':', ''));
      let newEnd = parseInt(endToCheck.replace(':', ''));
      if (newEnd < newStart) newEnd += 2400;

      const overlappingEvents = events.filter(evt => {
        if (evt.status === 'FINISHED' || evt.status === 'DRAFT') return false;
        if (evt.id === newEvent.id) return false;
        if (evt.eventDetails.date !== newEvent.date) return false;

        const evtStartStr = evt.eventDetails.djStartTime || evt.eventDetails.startTime || '20:00';
        const evtEndStr = evt.eventDetails.djEndTime || evt.eventDetails.endTime || evtStartStr;
        const evtStart = parseInt(evtStartStr.replace(':', ''));
        let evtEnd = parseInt(evtEndStr.replace(':', ''));
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
        startTime: newEvent.startTime || '',
        endTime: newEvent.endTime || '',
        djStartTime: newEvent.djStartTime || newEvent.startTime,
        djEndTime: newEvent.djEndTime || newEvent.endTime,
        materialsTime: newEvent.materialsTime || '',
        warehouseTime: newEvent.warehouseTime || '',
        indications: newEvent.indications || 'Ninguna',
        photoStartTime: newEvent.photoStartTime || '',
        photoEndTime: newEvent.photoEndTime || '',
        decorStartTime: newEvent.decorStartTime || '',
        decorEndTime: newEvent.decorEndTime || '',
        avStartTime: newEvent.avStartTime || '',
        avEndTime: newEvent.avEndTime || '',
        cam360StartTime: newEvent.cam360StartTime || '',
        cam360EndTime: newEvent.cam360EndTime || ''
      },
      financials: {
        totalValue: total,
        basePrice: parseInt(currentConf.base) || 0, // NEW: Include principal service cost
        deposit: dep,
        balance: total - dep,
        manualBasePrice: Number(newEvent.manualBasePrice) || 0,
        manualBaseDescription: newEvent.manualBaseDescription || '',
        extraHourPrice: Number(newEvent.extraHourPrice) || (newEvent.packName === 'Essential' ? 85000 : 135000),
        extraExpenses: newEvent.extraExpenses || []
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
        makeupCount: newEvent.makeupCount, // Save manual makeup override
        camStartTime: newEvent.camStartTime || '',
        camEndTime: newEvent.camEndTime || '',
        avStartTime: newEvent.avStartTime || '',
        avEndTime: newEvent.avEndTime || ''
      }
    };

    // FIRESTORE UPSERT
    try {
      await setDoc(doc(db, "events", finalId), eventObj);
      alert(status === 'DRAFT' ? '📝 Borrador Guardado' : (newEvent.id ? '✅ Evento Actualizado' : '✅ Evento Creado'));

      setView('events');
      const emptyState = { id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', camStartTime: '', camEndTime: '', avStartTime: '', avEndTime: '', color: '#C9A84C' };
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
      djStartTime: evt.eventDetails.djStartTime || evt.eventDetails.startTime || '',
      djEndTime: evt.eventDetails.djEndTime || evt.eventDetails.endTime || '',
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
      manualBasePrice: (() => {
        const savedBase = Number(evt.financials?.manualBasePrice) || 0;
        if (savedBase > 0) return savedBase;
        // Auto-Recovery: Total - Extras
        const total = Number(evt.financials?.totalValue) || 0;
        const extras = getDynamicExtras({ selectedExtras: evt.logistics?.selectedExtras || {}, extraQtys: evt.logistics?.extraQtys || {} });
        const extrasSum = extras.filter(ex => evt.logistics?.selectedExtras?.[ex.id]).reduce((acc, ex) => acc + (parseInt(ex.price) || 0), 0);
        return Math.max(0, total - extrasSum);
      })(),
      manualBaseDescription: evt.financials?.manualBaseDescription || '',
      deposit: evt.financials?.deposit || Math.round((Number(evt.financials?.totalValue) || 0) * 0.3),
      isImported: true,
      savedItems: evt.logistics.items, // Carry over checklist
      savedFlow: evt.logistics.flow, // Carry over flow
      warehouseTime: evt.eventDetails.warehouseTime || '',
      materialExplanation: evt.eventDetails.materialExplanation || '',
      photoStartTime: evt.eventDetails.photoStartTime || '',
      photoEndTime: evt.eventDetails.photoEndTime || '',
      decorStartTime: evt.eventDetails.decorStartTime || '',
      decorEndTime: evt.eventDetails.decorEndTime || '',
      camStartTime: evt.eventDetails.camStartTime || '',
      camEndTime: evt.eventDetails.camEndTime || '',
      avStartTime: evt.eventDetails.avStartTime || '',
      avEndTime: evt.eventDetails.avEndTime || ''
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

    // Búsqueda en el evento
    const totalKeys = ['totalValue', 'total', 'price', 'valor', 'monto', 'valorTotal', 'costo', 'pricePackage', 'total_value', 'total_amount', 'amount'];
    const depositKeys = ['deposit', 'abono', 'monto_abono', 'pagado', 'adelanto', 'deposit_amount', 'anticipo'];

    let total = clean(deepSearch(evt, totalKeys));
    let paid = clean(deepSearch(evt, depositKeys));

    // AGREGAR VALOR DE HORAS EXTRAS AL CLIENTE (NUEVA LÓGICA)
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
    if (totalPay === 0) return alert('Ingrese un monto válido');

    try {
      // 1. Create Transactions
      const batch = [];
      const createTx = (method, amount) => {
        if (amount <= 0) return;
        const sanitizedId = String(evt.id || '').trim();
        const txId = `TX-${sanitizedId}-FINAL-${method}`;
        const clientName = evt?.client?.name || evt?.clientName || 'Cliente';
        const eventIdStr = evt?.id || 'N/A';

        // Determinar descripción si hay extras
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
      alert('✅ Pago registrado y caja actualizada');

      // We check if we can close
      await checkAutoClose(updatedEvt);

    } catch (err) {
      console.error("Payment Save Error:", err);
      alert(`Error guardando pago: ${err.message || 'Error desconocido'}. Revisa la consola para más detalles.`);
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
        // Si ya pagó, opcionalmente permitir desmarcar (ej: error), o bloquear.
        // Permitamos desmarcar por corrección.
        if (confirm('El pago ya está registrado. ¿Deseas anular la marca de "Cobro Confirmado" para este evento? (Nota: El dinero ya registrado en tesorería no se borrará)')) {
          await updateDoc(doc(db, "events", evtId), { "logistics.flow.clientPaid": false });
        }
      } else {
        handleOpenPaymentModal(evt);
      }
      return;
    }

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
    times.sort((a, b) => (a?.time || '').localeCompare(b?.time || ''));

    const earliestTime = times[0]?.time;
    const earliestRoles = times.filter(t => t?.time === earliestTime);

    if (earliestRoles.length > 1) {
      // Tie-breaker logic: DJ > FOTÓGRAFO > DECORADOR
      const roleOrder = ['DJ / OPERADOR', 'FOTÓGRAFO', 'DECORADOR'];
      const responsible = earliestRoles.sort((a, b) => roleOrder.indexOf(a?.role) - roleOrder.indexOf(b?.role))[0];
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
    try {
      // --- LÓGICA DE FILTRADO Y MÉTRICAS ---
      const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

      // Filtrar transacciones por mes seleccionado
      const filteredGlobalTx = globalTx.filter(t => {
        const d = new Date(t.createdAt);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      const filteredEvents = events.filter(e => {
        if (!e.eventDetails?.date) return false;
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

      const getMonthStats = (txs) => {
        const totalIn = txs.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
        const totalOut = txs.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
        return { income: totalIn, expense: totalOut, balance: totalIn - totalOut };
      };

      const stats = getMonthStats(filteredGlobalTx);
      const currentIncome = stats.income;
      const currentBalance = stats.balance;

      const prevStats = getMonthStats(prevTx);
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
          tx.type === 'OUT' && (tx.category === c.category || (tx.desc || '').toLowerCase().includes((c.title || '').toLowerCase()))
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
        if (!e.eventDetails?.date) return;
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

      // Cálculo de balances por cuenta (HISTÓRICO REAL ACUMULADO)
      // NOTA: Se ha elimiado la suma automática de 'events' para evitar duplicidad con los ajustes manuales.
      // Ahora la fuente de verdad es EXCLUSIVAMENTE 'globalTx'.
      const getAccountBalance = (method) => {
        return globalTx.filter(t => t.method === method).reduce((acc, t) => acc + (t.type === 'IN' ? Number(t.amount) : -Number(t.amount)), 0);
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
            {['TESORERIA', 'RESUMEN', 'MARKETING'].map(tab => (
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
              {/* CARD MAESTRA (LA MARCA - SUPER COMPACT ROW) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(188, 111, 241, 0.1) 100%)',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                padding: '15px 20px',
                borderRadius: '20px',
                marginBottom: '15px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ position: 'absolute', right: '-10px', top: '-20px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
                  <IconLogoNexxa size={100} />
                </div>

                {/* Left: Label + Amount */}
                <div style={{ zIndex: 1 }}>
                  <small style={{ color: 'var(--primary-cyan)', fontWeight: '950', letterSpacing: '1px', fontSize: '0.55rem', display: 'block', marginBottom: '2px' }}>PROFIT {months[selectedMonth].toUpperCase()}</small>
                  <div style={{ fontSize: '1.8rem', fontWeight: '950', letterSpacing: '-1px', color: '#fff', lineHeight: 1 }}>
                    {formatPeso(currentBalance)}
                  </div>
                </div>

                {/* Right: Stats */}
                <div style={{ zIndex: 1, textAlign: 'right' }}>
                  <div style={{ background: diff >= 0 ? 'var(--success-green)' : 'var(--danger-red)', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '950', color: '#000' }}>
                      {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.45rem', fontWeight: '800', opacity: 0.5, letterSpacing: '0.5px' }}>VS MES PASADO</div>
                </div>
              </div>

              {/* REPARTICIÓN DE ACTIVOS (COMPACT GRID) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {[
                  { label: 'NEXXA CORP (50%)', val: currentBalance * 0.5, color: 'var(--primary-cyan)', icon: '🏛️' },
                  { label: 'OPERATIVO JULI (20%)', val: currentBalance * 0.2, color: 'var(--primary-purple)', icon: '🟣' },
                  { label: 'PATRIMONIO YO (30%)', val: currentBalance * 0.3, color: 'var(--primary-pink)', icon: '💎' }
                ].map(p => (
                  <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', padding: '10px 15px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '0.9rem' }}>{p.icon}</div>
                      <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#fff' }}>{p.label}</div>
                        <div style={{ width: '25px', height: '2px', background: p.color, borderRadius: '10px', marginTop: '2px' }}></div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff' }}>{formatPeso(p.val)}</div>
                  </div>
                ))}
              </div>

              {/* AGENDA OPERATIVA - GASTOS PROGRAMADOS (DYNAMIC) */}
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📅</span> Agenda Operativa
                  </h3>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                      width: '24px', height: '24px', color: '#fff', fontSize: '1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>

                {(() => {
                  // 1. Filtrar gastos programados (ahora son recurrentes, por lo que mostramos TODOS, pero calculamos su estado para el mes seleccionado)
                  // Se ordena por día del mes
                  const sortedExpenses = [...scheduledExpenses].sort((a, b) => parseInt(a.day) - parseInt(b.day));

                  const today = new Date();
                  // Fecha de Referencia para el mes seleccionado en el Resumen
                  // (Usamos el año seleccionado y el mes seleccionado)
                  const currentViewDate = new Date(selectedYear, selectedMonth, 1);
                  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;

                  if (sortedExpenses.length === 0) {
                    return <div style={{ opacity: 0.5, fontSize: '0.7rem', fontStyle: 'italic', padding: '10px', textAlign: 'center', border: '1px dashed #333', borderRadius: '10px' }}>No hay gastos recurrentes.</div>;
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sortedExpenses.map(expense => {
                        const day = parseInt(expense.day);
                        // Construir la fecha objetivo para este mes
                        const targetDate = new Date(selectedYear, selectedMonth, day);
                        const dateStr = `${day.toString().padStart(2, '0')}/${(selectedMonth + 1).toString().padStart(2, '0')}`;

                        // Lógica de ESTADO DINÁMICO
                        // 1. Check if PAID: Buscar en globalTx una salida (OUT) en este mes/año que coincida con el concepto (fuzzy match básico)
                        // Normalizamos strings para comparar: "Arriendo Bodega" vs "Pago Arriendo"
                        const hasPayment = globalTx.some(tx => {
                          const txDate = new Date(tx.createdAt); // o tx.date si guardas YYYY-MM-DD
                          const isSameMonth = txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
                          if (!isSameMonth || tx.type !== 'OUT') return false;

                          // Comparación flexible
                          const c1 = expense.concept.toLowerCase();
                          const c2 = (tx.desc || '').toLowerCase();
                          return c2.includes(c1) || c1.includes(c2);
                        });

                        let status = 'PENDIENTE';
                        if (hasPayment) {
                          status = 'PAGADO';
                        } else {
                          // Si no está pagado, verificamos si ya venció
                          if (isCurrentMonth) {
                            // Si estamos viendo el mes actual, comparamos con hoy
                            if (today.getDate() > day) status = 'VENCIDO';
                          } else if (currentViewDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
                            // Si estamos viendo un mes pasado y no se pagó -> VENCIDO
                            status = 'VENCIDO';
                          }
                          // Si es mes futuro -> PENDIENTE
                        }

                        return (
                          <div
                            key={expense.id}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: `1px solid ${status === 'VENCIDO' ? 'rgba(255,82,82,0.3)' : status === 'PAGADO' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                              borderRadius: '12px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              opacity: status === 'PAGADO' ? 0.6 : 1
                            }}
                          >
                            {/* Fecha Exacta */}
                            <div style={{
                              background: status === 'VENCIDO' ? 'rgba(255,82,82,0.1)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${status === 'VENCIDO' ? 'rgba(255,82,82,0.3)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '8px',
                              padding: '4px 8px',
                              minWidth: '35px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: '950', color: status === 'VENCIDO' ? 'var(--danger-red)' : '#fff' }}>
                                {dateStr}
                              </div>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: status === 'PAGADO' ? 'line-through' : 'none' }}>
                                {expense.concept}
                              </div>
                            </div>

                            {/* Monto + Estado Mini */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff' }}>
                                {formatPeso(expense.amount)}
                              </div>
                              <small style={{
                                fontSize: '0.4rem',
                                fontWeight: '900',
                                color: status === 'VENCIDO' ? 'var(--danger-red)' : status === 'PAGADO' ? 'var(--success-green)' : 'rgba(255,255,255,0.3)',
                                letterSpacing: '0.5px',
                                display: 'block'
                              }}>
                                {status}
                              </small>
                            </div>

                            {/* Delete Action (Optional, hidden usually but good for debugging) */}
                            <div onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar este gasto recurrente?')) deleteDoc(doc(db, "operative_agenda", expense.id));
                            }} style={{ marginLeft: '5px', cursor: 'pointer', opacity: 0.3 }}>×</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {accountingTab === 'TESORERIA' && (
            <div className="fade-in">
              {/* CUENTAS Y BILLETERAS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { name: 'Nequi', color: '#ff007a' },
                  { name: 'Daviplata', color: '#ff4d4d' },
                  { name: 'Efectivo', color: '#4dff88' }
                ].map(bank => {
                  const currentBal = getAccountBalance(bank.name);
                  const isEditing = editingAccount === bank.name;

                  return (
                    <div
                      key={bank.name}
                      onClick={() => {
                        if (!isEditing) {
                          setEditingAccount(bank.name);
                          setTempBalanceVal(currentBal.toString());
                        }
                      }}
                      style={{ background: 'var(--glass-bg)', padding: '15px 10px', borderRadius: '20px', border: isEditing ? `1px solid ${bank.color}` : '1px solid rgba(255,255,255,0.05)', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
                    >
                      {isEditing ? (
                        <div onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="tel"
                            value={tempBalanceVal}
                            onChange={e => setTempBalanceVal(e.target.value.replace(/\D/g, ''))}
                            onBlur={async () => {
                              // SAVE ADJUSTMENT
                              const realVal = Number(tempBalanceVal);
                              const diff = realVal - currentBal;
                              if (diff !== 0) {
                                const txId = `TX-ADJ-${Date.now()}`;
                                await setDoc(doc(db, "globalTx", txId), {
                                  id: txId,
                                  desc: `Ajuste Saldo: ${bank.name}`,
                                  amount: Math.abs(diff),
                                  method: bank.name,
                                  type: diff > 0 ? 'IN' : 'OUT',
                                  category: 'AJUSTE',
                                  date: new Date().toISOString().split('T')[0],
                                  createdAt: new Date().toISOString()
                                });
                                alert(`✅ Saldo ajustado a ${formatPeso(realVal)}`);
                              }
                              setEditingAccount(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.target.blur();
                            }}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center', fontSize: '1rem', fontWeight: '950', outline: 'none' }}
                          />
                          <small style={{ display: 'block', fontSize: '0.5rem', color: bank.color }}>Presiona enter</small>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.8rem', fontWeight: '950', color: currentBal >= 0 ? '#fff' : 'var(--danger-red)' }}>{formatPeso(currentBal)}</div>
                          <small style={{ fontSize: '0.45rem', fontWeight: '900', opacity: 0.3, letterSpacing: '1px' }}>{bank?.name?.toUpperCase()}</small>
                          <div style={{ position: 'absolute', top: '5px', right: '5px', opacity: 0.2, fontSize: '0.5rem' }}>✎</div>
                        </>
                      )}
                    </div>
                  );
                })}
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
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <small style={{ fontSize: '0.55rem', opacity: 0.3, textTransform: 'uppercase' }}>{tx.category}</small>
                            <small style={{ fontSize: '0.55rem', opacity: 0.3 }}>•</small>
                            <small
                              onClick={async (e) => {
                                e.stopPropagation();
                                const next = tx.method === 'Nequi' ? 'Daviplata' : (tx.method === 'Daviplata' ? 'Efectivo' : 'Nequi');
                                if (confirm(`¿Corregir método a ${next}?`)) {
                                  await updateDoc(doc(db, "globalTx", tx.id), { method: next });
                                }
                              }}
                              style={{ fontSize: '0.55rem', opacity: 0.6, cursor: 'pointer', borderBottom: '1px dotted rgba(255,255,255,0.3)' }}
                              title="Clic para corregir método"
                            >
                              {tx.method || 'S/M'}
                            </small>
                            {tx.eventId && (
                              <>
                                <small style={{ fontSize: '0.55rem', opacity: 0.3 }}>•</small>
                                <small style={{ fontSize: '0.55rem', color: 'var(--primary-purple)', fontWeight: '800' }}>#{tx.eventId.split('-').slice(-1)}</small>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '950', color: tx.type === 'IN' ? 'var(--success-green)' : '#fff' }}>{tx.type === 'IN' ? '+' : '-'} {formatPeso(tx.amount)}</div>
                          <small style={{ fontSize: '0.5rem', opacity: 0.2 }}>{new Date(tx.createdAt).toLocaleDateString()}</small>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar esta transacción definitivamente de la tesorería?')) {
                              await deleteDoc(doc(db, "globalTx", tx.id));
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ff3860', padding: '8px', cursor: 'pointer', opacity: 0.3 }}
                        >
                          <IconTrash size={14} />
                        </button>
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


            </div>
          )}

          {accountingTab === 'MARKETING' && (
            <div className="fade-in" style={{ paddingBottom: '30px' }}>
              {/* ANÁLISIS DE INVERSIÓN Y ROI (UNIFICADO) */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📊</span> Inteligencia de Marketing
                  </h3>
                  <button
                    onClick={async () => {
                      if (!isEditingAds) {
                        // START EDITING: Init buffer
                        setLocalAdsBuffer({ ...adAllocations });
                        setIsEditingAds(true);
                      } else {
                        // SAVE
                        const allocId = `ALLOC-${selectedYear}-${selectedMonth}`;
                        try {
                          await setDoc(doc(db, "marketing_allocations", allocId), {
                            id: allocId,
                            month: selectedMonth,
                            year: selectedYear,
                            channels: localAdsBuffer,
                            lastUpdated: new Date().toISOString()
                          }, { merge: true });
                          setIsEditingAds(false);
                        } catch (err) {
                          console.error(err);
                          alert('Error al guardar');
                        }
                      }
                    }}
                    style={{
                      background: isEditingAds ? 'var(--success-green)' : 'rgba(255,255,255,0.08)',
                      color: isEditingAds ? '#000' : '#fff',
                      border: isEditingAds ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: '950',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isEditingAds ? '0 0 15px rgba(0,255,163,0.3)' : 'none'
                    }}
                  >
                    {isEditingAds ? 'GUARDAR INVERSIÓN' : 'CONFIGURAR INVERSIÓN'}
                  </button>
                </div>

                {(() => {
                  const marketingChannels = ['Instagram', 'Meta (Face/Insta)', 'Google', 'TikTok', 'WhatsApp', 'Otro'];

                  // 1. OBTENER GASTO REAL EN BALANCE (Total, sin filtrar por ADS:)
                  // Sumamos TODO lo que esté categorizado como MARKETING en este mes
                  let totalBalanceMarketing = 0;
                  globalTx.forEach(tx => {
                    const d = new Date(tx.createdAt); // OR tx.date
                    if (
                      tx.type === 'OUT' &&
                      tx.category === 'MARKETING' &&
                      d.getMonth() === selectedMonth &&
                      d.getFullYear() === selectedYear
                    ) {
                      totalBalanceMarketing += tx.amount;
                    }
                  });

                  // 2. USAR LAS ASIGNACIONES MANUALES (adAllocations)
                  // Estas vienen del documento 'marketing_allocations' sincronizado en el useEffect
                  const currentAllocations = adAllocations || {};
                  const totalAllocated = Object.values(currentAllocations).reduce((a, b) => a + Number(b), 0);
                  const remainingToAllocate = totalBalanceMarketing - totalAllocated;

                  // FUNCIÓN DE GUARDADO PARA EL MODO EDICIÓN (Actualiza documento info, NO crea transacciones)
                  const handleSaveAdSpend = async (channel, amount) => {
                    const val = Number(amount);
                    const allocId = `ALLOC-${selectedYear}-${selectedMonth}`;

                    // Crear copia del estado actual y actualizar
                    const newAllocations = { ...currentAllocations, [channel]: val };

                    // Guardar en Firestore (Documento Sidecar)
                    try {
                      await setDoc(doc(db, "marketing_allocations", allocId), {
                        id: allocId,
                        month: selectedMonth,
                        year: selectedYear,
                        channels: newAllocations,
                        lastUpdated: new Date().toISOString()
                      }, { merge: true });
                    } catch (err) {
                      console.error("Error saving allocation:", err);
                    }
                  };

                  // PRE-CALCULAR Y ORDENAR MÉTRICAS
                  const calculatedChannels = marketingChannels.map(channel => {
                    const leads = quotations.filter(q => (q.leadSource || '').toLowerCase().includes(channel.toLowerCase().split(' ')[0])).length;

                    // Revenue: sum of APPROVED quotations
                    const revenue = quotations
                      .filter(q => (q.leadSource || '').toLowerCase().includes(channel.toLowerCase().split(' ')[0]))
                      .filter(q => ['APPROVED', 'CONFIRMED', 'CLOSED', 'SENT'].includes(q.status))
                      .reduce((sum, q) => sum + (Number(q.financials?.totalValue) || 0), 0);

                    // Costs (FROM ALLOCATIONS)
                    const investment = currentAllocations[channel] || 0;

                    // Metrics
                    const profit = revenue - investment;
                    const roi = investment > 0 ? (profit / investment) * 100 : 0;
                    const costPerLead = leads > 0 ? investment / leads : 0;
                    const isProfitable = roi > 0;

                    return { channel, leads, revenue, investment, profit, roi, costPerLead, isProfitable };
                  }).sort((a, b) => b.roi - a.roi); // ORDENAR POR ROI DESCENDENTE

                  const winner = calculatedChannels[0]; // El mejor canal
                  const hasWinner = winner && winner.roi > 0 && winner.investment > 0;

                  return (
                    <div>
                      {/* TOTAL MENSUAL CARD (Compact) */}
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.03)',
                        border: '1px solid rgba(255, 165, 0, 0.2)',
                        borderRadius: '16px',
                        padding: '15px',
                        marginBottom: '15px',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{ position: 'absolute', right: '-5px', top: '-5px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
                          <span style={{ fontSize: '60px' }}>📢</span>
                        </div>
                        <small style={{ fontSize: '0.55rem', fontWeight: '900', color: '#ffcc00', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>INVERSIÓN TOTAL MENSUAL</small>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ fontSize: '2rem', fontWeight: '950', color: '#ffcc00', letterSpacing: '-1px', lineHeight: '1' }}>
                              {formatPeso(totalBalanceMarketing)}
                            </div>
                            <small style={{ fontSize: '0.55rem', color: '#888' }}>En Balance</small>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: remainingToAllocate >= 0 ? 'var(--success-green)' : 'var(--danger-red)' }}>
                              {formatPeso(Math.abs(remainingToAllocate))}
                            </div>
                            <small style={{ fontSize: '0.45rem', fontWeight: '900', opacity: 0.6, letterSpacing: '0.5px' }}>
                              {remainingToAllocate >= 0 ? 'POR ASIGNAR' : 'EXCEDIDO'}
                            </small>
                          </div>
                        </div>
                      </div>

                      {/* CHANNEL CARDS GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                        {/* SPECIAL WINNER CARD (Compact) */}
                        {!isEditingAds && hasWinner && (
                          <div className="fade-in" style={{
                            gridColumn: '1 / -1',
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0,0,0,0) 100%)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '16px',
                            padding: '15px',
                            marginBottom: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🏆</div>
                            <div>
                              <small style={{ fontSize: '0.5rem', letterSpacing: '1.5px', fontWeight: '900', color: '#ffcc00', textTransform: 'uppercase' }}>CANAL MÁS RENTABLE</small>
                              <h2 style={{ margin: '2px 0', fontSize: '1.4rem', fontWeight: '950', color: '#fff' }}>{winner.channel}</h2>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2' }}>
                                Retorno del <strong style={{ color: 'var(--success-green)' }}>{winner.roi.toFixed(0)}%</strong>
                              </p>
                            </div>
                            <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.1 }}>
                              <span style={{ fontSize: '5rem' }}>⭐</span>
                            </div>
                          </div>
                        )}

                        {calculatedChannels.map(({ channel, leads, revenue, investment, profit, roi, costPerLead, isProfitable }) => {
                          if (isEditingAds) {
                            return (
                              <div key={channel} style={{ background: '#0a0a0a', padding: '8px 10px', borderRadius: '12px', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                    {channel === 'Instagram' ? '📸' : channel.includes('Meta') ? '♾️' : channel === 'Google' ? '🔍' : channel === 'TikTok' ? '🎵' : channel === 'WhatsApp' ? '💬' : '🌐'}
                                  </div>
                                  <span style={{ fontWeight: '950', color: '#fff', fontSize: '0.7rem' }}>{channel.split(' ')[0]}</span>
                                </div>
                                <div style={{ width: '80px' }}>
                                  <input
                                    type="tel"
                                    placeholder="$ 0"
                                    // Show formatted with dots (es-CO), or empty if 0
                                    value={localAdsBuffer[channel] ? new Intl.NumberFormat('es-CO').format(localAdsBuffer[channel]) : ''}
                                    onChange={(e) => {
                                      // Remove dots and other non-digits to get raw integer
                                      const raw = e.target.value.replace(/\D/g, '');
                                      setLocalAdsBuffer(prev => ({ ...prev, [channel]: raw === '' ? 0 : Number(raw) }));
                                    }}
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid #333',
                                      color: '#fff',
                                      fontSize: '0.9rem',
                                      fontWeight: '900',
                                      textAlign: 'right',
                                      padding: '5px 0',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          }

                          // MODE: DISPLAY
                          if (investment === 0 && leads === 0) return null;

                          return (
                            <div key={channel} style={{
                              background: '#050505',
                              border: hasWinner && winner.channel === channel ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '14px',
                              padding: '10px 12px',
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: hasWinner && winner.channel === channel ? '0 4px 20px rgba(255, 215, 0, 0.1)' : '0 2px 10px rgba(0,0,0,0.2)'
                            }}>
                              {/* ROI INDICATOR */}
                              <div style={{
                                position: 'absolute', top: '10px', right: '12px',
                                textAlign: 'right'
                              }}>
                                <small style={{ display: 'block', fontSize: '0.45rem', fontWeight: '900', color: '#666', letterSpacing: '1px' }}>ROI</small>
                                <span style={{ fontSize: '0.9rem', fontWeight: '950', color: isProfitable ? 'var(--success-green)' : (investment > 0 ? 'var(--danger-red)' : '#666') }}>
                                  {investment > 0 ? `${roi.toFixed(0)}%` : 'N/A'}
                                </span>
                              </div>

                              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {channel === 'Instagram' ? '📸' : channel.includes('Meta') ? '♾️' : channel === 'Google' ? '🔍' : channel === 'TikTok' ? '🎵' : channel === 'WhatsApp' ? '💬' : '🌐'}
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '950', color: '#fff' }}>{channel}</h4>
                                  <p style={{ margin: '1px 0 0 0', fontSize: '0.55rem', color: '#888', fontWeight: '700' }}>Inversión:
                                    <span style={{ color: '#fff' }}> {formatPeso(investment)}</span>
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff' }}>{leads}</div>
                                  <small style={{ fontSize: '0.4rem', fontWeight: '900', color: '#555', letterSpacing: '0.5px' }}>LEADS</small>
                                </div>
                                <div style={{ textAlign: 'center', background: 'rgba(0, 255, 163, 0.02)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(0, 255, 163, 0.05)' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'var(--success-green)' }}>{formatPeso(revenue)}</div>
                                  <small style={{ fontSize: '0.4rem', fontWeight: '900', color: 'var(--success-green)', opacity: 0.6, letterSpacing: '0.5px' }}>INGRESOS</small>
                                </div>
                                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: '#fff' }}>{formatPeso(costPerLead)}</div>
                                  <small style={{ fontSize: '0.4rem', fontWeight: '900', color: '#555', letterSpacing: '0.5px' }}>COSTO/LEAD</small>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* EMPTY STATE */}
                        {!isEditingAds && totalBalanceMarketing === 0 && quotations.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4, border: '2px dashed #333', borderRadius: '24px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📉</div>
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '0.9rem' }}>Sin datos</p>
                            <small style={{ fontSize: '0.7rem' }}>Configura inversión o crea cotizaciones.</small>
                          </div>
                        )}
                      </div>
                    </div>
                  );


                })()}


              </div>
            </div>
          )
          }

          {
            accountingTab === 'METRICAS' && (
              <div className="fade-in">
                {/* ANÁLISIS DE CANALES DE ADQUISICIÓN */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '950', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>📊</span> Análisis de Canales de Marketing
                    </h3>
                    {/* Botón temporal para generar datos de ejemplo */}
                    {quotations.filter(q => q.leadSource).length === 0 && (
                      <button
                        onClick={async () => {
                          if (!confirm('¿Crear 5 cotizaciones de ejemplo para visualizar las métricas?')) return;

                          const sampleQuotations = [
                            {
                              id: `QUO-DEMO-${Date.now()}-1`,
                              status: 'APPROVED',
                              createdAt: new Date().toISOString(),
                              client: { name: 'María González', phone: '3001234567', phone2: '' },
                              eventDetails: { date: '2026-03-15', occasion: 'Cumpleaños' },
                              logistics: {
                                packName: 'Memories',
                                startTime: '19:00',
                                endTime: '23:00',
                                location: 'Calle 123 #45-67',
                                neighborhood: 'Chapinero',
                                guestCount: 80,
                                selectedExtras: {}
                              },
                              financials: { totalValue: 650000, deposit: 195000, paymentMethod: 'Nequi' },
                              leadSource: 'Instagram'
                            },
                            {
                              id: `QUO-DEMO-${Date.now()}-2`,
                              status: 'SENT',
                              createdAt: new Date().toISOString(),
                              client: { name: 'Carlos Rodríguez', phone: '3109876543', phone2: '' },
                              eventDetails: { date: '2026-03-18', occasion: 'Aniversario' },
                              logistics: {
                                packName: 'Essential',
                                startTime: '18:00',
                                endTime: '22:00',
                                location: 'Carrera 7 #80-45',
                                neighborhood: 'Usaquén',
                                guestCount: 50,
                                selectedExtras: {}
                              },
                              financials: { totalValue: 450000, deposit: 135000, paymentMethod: 'Daviplata' },
                              leadSource: 'Facebook'
                            },
                            {
                              id: `QUO-DEMO-${Date.now()}-3`,
                              status: 'APPROVED',
                              createdAt: new Date().toISOString(),
                              client: { name: 'Ana Martínez', phone: '3157654321', phone2: '' },
                              eventDetails: { date: '2026-03-20', occasion: 'Boda' },
                              logistics: {
                                packName: 'Celebration',
                                startTime: '17:00',
                                endTime: '23:00',
                                location: 'Avenida 15 #100-20',
                                neighborhood: 'Suba',
                                guestCount: 150,
                                selectedExtras: {}
                              },
                              financials: { totalValue: 1020000, deposit: 306000, paymentMethod: 'Nequi' },
                              leadSource: 'Recomendación'
                            },
                            {
                              id: `QUO-DEMO-${Date.now()}-4`,
                              status: 'APPROVED',
                              createdAt: new Date().toISOString(),
                              client: { name: 'Pedro Sánchez', phone: '3201112233', phone2: '' },
                              eventDetails: { date: '2026-03-22', occasion: 'Graduación' },
                              logistics: {
                                packName: 'Memories',
                                startTime: '20:00',
                                endTime: '01:00',
                                location: 'Calle 85 #12-34',
                                neighborhood: 'Chicó',
                                guestCount: 100,
                                selectedExtras: {}
                              },
                              financials: { totalValue: 735000, deposit: 220500, paymentMethod: 'Efectivo' },
                              leadSource: 'Instagram'
                            },
                            {
                              id: `QUO-DEMO-${Date.now()}-5`,
                              status: 'SENT',
                              createdAt: new Date().toISOString(),
                              client: { name: 'Laura Díaz', phone: '3158889999', phone2: '' },
                              eventDetails: { date: '2026-03-25', occasion: 'Fiesta Corporativa' },
                              logistics: {
                                packName: 'Essential',
                                startTime: '19:00',
                                endTime: '22:00',
                                location: 'Carrera 15 #93-45',
                                neighborhood: 'Chicó Norte',
                                guestCount: 60,
                                selectedExtras: {}
                              },
                              financials: { totalValue: 450000, deposit: 135000, paymentMethod: 'Nequi' },
                              leadSource: 'Google'
                            }
                          ];

                          try {
                            for (const quo of sampleQuotations) {
                              await setDoc(doc(db, 'quotations', quo.id), quo);
                            }
                            alert('✅ 5 cotizaciones de ejemplo creadas!\n\nAhora verás las métricas de canales.');
                          } catch (error) {
                            alert('❌ Error: ' + error.message);
                          }
                        }}
                        style={{
                          background: 'var(--brand-gradient)',
                          border: 'none',
                          padding: '8px 15px',
                          borderRadius: '12px',
                          fontSize: '0.65rem',
                          fontWeight: '950',
                          color: '#000',
                          cursor: 'pointer',
                          letterSpacing: '0.5px'
                        }}
                      >
                        + DATOS DEMO
                      </button>
                    )}
                  </div>

                  {(() => {
                    // Calcular métricas por canal
                    const channels = ['Facebook', 'Instagram', 'Google', 'Recomendación', 'WhatsApp', 'TikTok', 'Otro'];
                    const channelIcons = {
                      'Facebook': '📘',
                      'Instagram': '📸',
                      'Google': '🔍',
                      'Recomendación': '👥',
                      'WhatsApp': '💬',
                      'TikTok': '🎵',
                      'Otro': '🌐'
                    };

                    const channelStats = channels.map(channel => {
                      const channelQuotations = quotations.filter(q => q.leadSource === channel);
                      const totalLeads = channelQuotations.length;
                      const convertedLeads = channelQuotations.filter(q => q.status === 'APPROVED').length;
                      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
                      const revenue = channelQuotations
                        .filter(q => q.status === 'APPROVED')
                        .reduce((sum, q) => sum + (Number(q.financials?.totalValue) || 0), 0);

                      return {
                        channel,
                        icon: channelIcons[channel],
                        totalLeads,
                        convertedLeads,
                        conversionRate,
                        revenue
                      };
                    }).filter(stat => stat.totalLeads > 0) // Solo mostrar canales con datos
                      .sort((a, b) => b.revenue - a.revenue); // Ordenar por ingresos

                    const totalLeadsAll = channelStats.reduce((sum, s) => sum + s.totalLeads, 0);
                    const totalRevenueAll = channelStats.reduce((sum, s) => sum + s.revenue, 0);

                    if (channelStats.length === 0) {
                      return (
                        <div style={{
                          background: 'rgba(255,255,255,0.02)',
                          padding: '40px',
                          borderRadius: '24px',
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}>📊</div>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                            No hay datos de canales aún.<br />
                            Empieza a registrar de dónde vienen tus clientes en cada cotización.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* RESUMEN GENERAL */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            background: 'rgba(0, 242, 255, 0.05)',
                            padding: '12px',
                            borderRadius: '14px',
                            border: '1px solid rgba(0, 242, 255, 0.2)'
                          }}>
                            <small style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: '900', letterSpacing: '0.5px' }}>TOTAL LEADS</small>
                            <div style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--primary-cyan)', marginTop: '3px' }}>
                              {totalLeadsAll}
                            </div>
                          </div>
                          <div style={{
                            background: 'rgba(0, 255, 163, 0.05)',
                            padding: '12px',
                            borderRadius: '14px',
                            border: '1px solid rgba(0, 255, 163, 0.2)'
                          }}>
                            <small style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: '900', letterSpacing: '0.5px' }}>INGRESOS TOTALES</small>
                            <div style={{ fontSize: '1rem', fontWeight: '950', color: 'var(--success-green)', marginTop: '3px' }}>
                              {formatPeso(totalRevenueAll)}
                            </div>
                          </div>
                        </div>

                        {/* TABLA DE CANALES */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {channelStats.map((stat, index) => {
                            const shareOfLeads = (stat.totalLeads / totalLeadsAll) * 100;
                            const shareOfRevenue = totalRevenueAll > 0 ? (stat.revenue / totalRevenueAll) * 100 : 0;

                            return (
                              <div
                                key={stat.channel}
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '14px',
                                  padding: '12px',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                {/* Barra de progreso de fondo */}
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${shareOfRevenue}%`,
                                  background: index === 0
                                    ? 'linear-gradient(90deg, rgba(0,242,255,0.1) 0%, rgba(0,242,255,0.02) 100%)'
                                    : 'rgba(255,255,255,0.02)',
                                  transition: 'width 0.5s ease'
                                }}></div>

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                  {/* Header del canal */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
                                      <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fff' }}>
                                          {stat.channel}
                                          {index === 0 && (
                                            <span style={{
                                              marginLeft: '6px',
                                              fontSize: '0.45rem',
                                              background: 'var(--brand-gradient)',
                                              color: '#000',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontWeight: '950'
                                            }}>
                                              TOP
                                            </span>
                                          )}
                                        </div>
                                        <small style={{ fontSize: '0.5rem', opacity: 0.4 }}>
                                          {shareOfLeads.toFixed(1)}% de leads • {shareOfRevenue.toFixed(1)}% de ingresos
                                        </small>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: '950', color: 'var(--success-green)' }}>
                                        {formatPeso(stat.revenue)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Métricas */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                    <div style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      padding: '8px',
                                      borderRadius: '10px',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1rem', fontWeight: '950', color: '#fff' }}>
                                        {stat.totalLeads}
                                      </div>
                                      <small style={{ fontSize: '0.5rem', opacity: 0.4, fontWeight: '800' }}>LEADS</small>
                                    </div>
                                    <div style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      padding: '8px',
                                      borderRadius: '10px',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '1rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>
                                        {stat.convertedLeads}
                                      </div>
                                      <small style={{ fontSize: '0.5rem', opacity: 0.4, fontWeight: '800' }}>VENTAS</small>
                                    </div>
                                    <div style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      padding: '8px',
                                      borderRadius: '10px',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '950',
                                        color: stat.conversionRate >= 50 ? 'var(--success-green)' :
                                          stat.conversionRate >= 30 ? '#facc15' : '#fff'
                                      }}>
                                        {stat.conversionRate.toFixed(0)}%
                                      </div>
                                      <small style={{ fontSize: '0.5rem', opacity: 0.4, fontWeight: '800' }}>CONVERSIÓN</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* INSIGHTS */}
                        <div style={{
                          marginTop: '15px',
                          background: 'linear-gradient(135deg, rgba(188, 111, 241, 0.1) 0%, rgba(0, 242, 255, 0.05) 100%)',
                          border: '1px solid rgba(188, 111, 241, 0.2)',
                          padding: '12px',
                          borderRadius: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>💡</span>
                            <strong style={{ fontSize: '0.65rem', color: 'var(--primary-purple)' }}>Insights</strong>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.65rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)' }}>
                            <li>
                              <strong style={{ color: '#fff' }}>{channelStats[0]?.channel}</strong> es tu mejor canal con {formatPeso(channelStats[0]?.revenue)} en ingresos
                            </li>
                            {channelStats.find(s => s.conversionRate >= 50) && (
                              <li>
                                <strong style={{ color: '#fff' }}>{channelStats.find(s => s.conversionRate >= 50).channel}</strong> tiene la mejor tasa de conversión ({channelStats.find(s => s.conversionRate >= 50).conversionRate.toFixed(0)}%)
                              </li>
                            )}
                            <li>
                              Promedio de conversión general: <strong style={{ color: '#fff' }}>
                                {(channelStats.reduce((sum, s) => sum + s.conversionRate, 0) / channelStats.length).toFixed(0)}%
                              </strong>
                            </li>
                          </ul>
                        </div>
// CÓDIGO PARA AGREGAR EN LA LÍNEA 2105 (después del cierre de Insights, antes del cierre de la sección METRICAS)

                        {/* INVERSIÓN PUBLICITARIA */}
                        <div style={{ marginTop: '20px' }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: '950', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>💰</span> Inversión Publicitaria
                          </h3>

                          {(() => {
                            // Inversiones publicitarias por canal
                            const adSpend = [
                              { channel: 'Facebook', amount: 200000, period: 'Mensual' },
                              { channel: 'Instagram', amount: 350000, period: 'Mensual' },
                              { channel: 'Google', amount: 150000, period: 'Mensual' },
                              { channel: 'TikTok', amount: 100000, period: 'Mensual' }
                            ];

                            const totalSpend = adSpend.reduce((sum, ad) => sum + ad.amount, 0);

                            // Calcular ROI por canal
                            const channelROI = adSpend.map(ad => {
                              const channelData = channelStats.find(c => c.channel === ad.channel);
                              const revenue = channelData?.revenue || 0;
                              const roi = ad.amount > 0 ? ((revenue - ad.amount) / ad.amount) * 100 : 0;

                              return {
                                ...ad,
                                revenue,
                                roi,
                                leads: channelData?.totalLeads || 0,
                                costPerLead: channelData?.totalLeads > 0 ? ad.amount / channelData.totalLeads : 0
                              };
                            }).sort((a, b) => b.roi - a.roi);

                            return (
                              <>
                                {/* Resumen de inversión */}
                                <div style={{
                                  background: 'rgba(255,165,0,0.05)',
                                  border: '1px solid rgba(255,165,0,0.2)',
                                  borderRadius: '14px',
                                  padding: '12px',
                                  marginBottom: '12px'
                                }}>
                                  <small style={{ fontSize: '0.5rem', opacity: 0.5, fontWeight: '900', letterSpacing: '0.5px' }}>INVERSIÓN TOTAL MENSUAL</small>
                                  <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#ffa500', marginTop: '3px' }}>
                                    {formatPeso(totalSpend)}
                                  </div>
                                </div>

                                {/* Tabla de inversiones */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {channelROI.map(ad => (
                                    <div
                                      key={ad.channel}
                                      style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                      }}
                                    >
                                      {/* Header */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                          <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff' }}>
                                            {ad.channel}
                                          </div>
                                          <small style={{ fontSize: '0.5rem', opacity: 0.4 }}>
                                            Inversión: {formatPeso(ad.amount)}
                                          </small>
                                        </div>
                                        <div style={{
                                          fontSize: '0.75rem',
                                          fontWeight: '950',
                                          color: ad.roi >= 100 ? 'var(--success-green)' : ad.roi >= 0 ? '#facc15' : 'var(--danger-red)'
                                        }}>
                                          ROI: {ad.roi.toFixed(0)}%
                                        </div>
                                      </div>

                                      {/* Métricas */}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                        <div style={{
                                          background: 'rgba(0,0,0,0.3)',
                                          padding: '6px',
                                          borderRadius: '8px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: '950', color: '#fff' }}>
                                            {ad.leads}
                                          </div>
                                          <small style={{ fontSize: '0.45rem', opacity: 0.4, fontWeight: '800' }}>LEADS</small>
                                        </div>
                                        <div style={{
                                          background: 'rgba(0,0,0,0.3)',
                                          padding: '6px',
                                          borderRadius: '8px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'var(--success-green)' }}>
                                            {formatPeso(ad.revenue)}
                                          </div>
                                          <small style={{ fontSize: '0.45rem', opacity: 0.4, fontWeight: '800' }}>INGRESOS</small>
                                        </div>
                                        <div style={{
                                          background: 'rgba(0,0,0,0.3)',
                                          padding: '6px',
                                          borderRadius: '8px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '0.65rem', fontWeight: '950', color: '#fff' }}>
                                            {formatPeso(ad.costPerLead)}
                                          </div>
                                          <small style={{ fontSize: '0.45rem', opacity: 0.4, fontWeight: '800' }}>COSTO/LEAD</small>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Insights de inversión */}
                                <div style={{
                                  marginTop: '12px',
                                  background: 'rgba(255,165,0,0.05)',
                                  border: '1px solid rgba(255,165,0,0.15)',
                                  padding: '10px',
                                  borderRadius: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.8rem' }}>📈</span>
                                    <strong style={{ fontSize: '0.6rem', color: '#ffa500' }}>Análisis de Inversión</strong>
                                  </div>
                                  <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.6rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.7)' }}>
                                    {channelROI[0] && (
                                      <li>
                                        <strong style={{ color: '#fff' }}>{channelROI[0].channel}</strong> tiene el mejor ROI ({channelROI[0].roi.toFixed(0)}%)
                                      </li>
                                    )}
                                    {channelROI.find(c => c.costPerLead > 0) && (
                                      <li>
                                        Costo promedio por lead: <strong style={{ color: '#fff' }}>
                                          {formatPeso(channelROI.reduce((sum, c) => sum + c.costPerLead, 0) / channelROI.filter(c => c.costPerLead > 0).length)}
                                        </strong>
                                      </li>
                                    )}
                                    <li>
                                      Retorno total: <strong style={{ color: '#fff' }}>
                                        {formatPeso(totalRevenueAll - totalSpend)}
                                      </strong> ({((totalRevenueAll - totalSpend) / totalSpend * 100).toFixed(0)}% ROI general)
                                    </li>
                                  </ul>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                      </>
                    );
                  })()}
                </div>
              </div>
            )
          }

          {/* MODAL DE SELECTOR DE MES (ADN NEXXA) */}
          {
            showMonthSelector && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '35px', padding: '30px', width: '100%', maxWidth: '380px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h3 style={{ margin: 0, fontWeight: '950' }}>Periodo</h3>
                    <button onClick={() => setShowMonthSelector(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '12px' }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {(months || []).map((m, i) => (
                      <button
                        key={m}
                        onClick={() => { setSelectedMonth(i); setShowMonthSelector(false); }}
                        style={{ padding: '12px 5px', borderRadius: '14px', border: '1.5px solid', borderColor: selectedMonth === i ? 'var(--primary-cyan)' : 'transparent', background: selectedMonth === i ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '0.65rem', fontWeight: '950' }}
                      >
                        {String(m || '').substring(0, 3).toUpperCase()}
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
            )
          }

          {/* EL PANEL FLOTANTE HA SIDO ELIMINADO PARA DESPEJAR LA NAVEGACIÓN */}
        </div >
      );
    } catch (error) {
      console.error("Crash en renderAccounting:", error);
      return (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <IconAlertTriangle size={40} color="#ff3860" />
          <h3 style={{ marginTop: '20px' }}>Error en Contabilidad</h3>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{error.message}</p>
          <button onClick={() => setView('dashboard')} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '14px', background: 'var(--primary-cyan)', border: 'none', color: '#000', fontWeight: '900' }}>VOLVER</button>
        </div>
      );
    }
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
          ) : inventory.map((item, index) => {
            if (!item) return null;
            return (
              <div key={item?.id || index} className="control-item">
                <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconBox size={24} style={{ opacity: 0.4 }} />
                </div>
                <div style={{ paddingLeft: '20px', flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{item?.name || 'Item sin nombre'}</h4>
                  <small style={{ opacity: 0.3, fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.8px', marginTop: '4px', display: 'block' }}>{item?.category || 'Sin categoría'}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: (item?.available || 0) < 3 ? 'var(--danger-red)' : 'var(--primary-cyan)', lineHeight: 1 }}>{item?.available || 0}</div>
                  <small style={{ opacity: 0.3, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.5px' }}>DISP DE {item?.total || 0}</small>
                </div>
              </div>
            )
          })}
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
    if (!e?.target) return;
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
        } else if (field === 'changeExtraQty') {
          const { id, q } = value;
          const currentQtys = { ...(updated.extraQtys || {}) };
          currentQtys[id] = Math.max(1, q);
          updated.extraQtys = currentQtys;
        } else if (field === 'changeMakeupCount') {
          updated.makeupCount = value;
        } else if (field === 'guestCount') {
          updated.guestCount = value;
          updated.makeupCount = null;
        } else if (field === 'packName') {
          const val = (value || '').toUpperCase();
          const p = ['ONIX', 'MULTII', 'KAIZEN', 'CELEBRATION', 'MEMORIES'].find(k => val.includes(k)) || val;
          updated.packName = p;
          
          // AUTO-SELECT INCLUDED EXTRAS: When a package is picked, ensure its included services are checked
          const proto = STITCH_DATA.protocols[p];
          if (proto?.includedExtras || /MULTII/i.test(p) || /ONIX/i.test(p) || /KAIZEN/i.test(p)) {
            const newExtras = { ...(updated.selectedExtras || {}) };
            const forced = proto?.includedExtras || (/MULTII/i.test(p) ? ['extra_photo', 'extra_cam360', 'extra_decor_multii', 'extra_av', 'acc_memories'] : (/ONIX/i.test(p) ? ['extra_photo', 'extra_decor_onix', 'extra_av', 'acc_essential'] : ['extra_photo', 'extra_cam360', 'extra_decor_kaizen', 'extra_makeup', 'extra_av', 'acc_celebration']));
            
            forced.forEach(extId => {
              newExtras[extId] = true;
            });
            updated.selectedExtras = newExtras;
          }
        } else if (field === 'startTime') {
          updated.startTime = value;
          // Auto-sync if not manually changed or if they match old default
          if (!updated.djStartTime || updated.djStartTime === '08:00') updated.djStartTime = value;
          if (!updated.avStartTime || updated.avStartTime === '08:00') updated.avStartTime = value;
          // Note: Photo/Cam defaults are NOT tied to main event start automatically 
          // if we want to avoid double-charging for their full duration extras.
          // They should be explicitly set by the user or landing page.

          // RULE: Decorator starts 1 hr before DJ, lasts 2 hours
          if (!updated.decorStartTime || updated.decorStartTime === '08:00') {
            updated.decorStartTime = subtractMinutes(value, 60);
          }
          if (!updated.decorEndTime || updated.decorEndTime === '08:00') {
            updated.decorEndTime = subtractMinutes(value, -60); // +1 hour from DJ Start
          }
        } else if (field === 'endTime') {
          updated.endTime = value;
          // Auto-sync
          if (!updated.djEndTime || updated.djEndTime === '08:00') updated.djEndTime = value;
          if (!updated.photoEndTime || updated.photoEndTime === '08:00') updated.photoEndTime = value;
          if (!updated.avEndTime || updated.avEndTime === '08:00') updated.avEndTime = value;
        } else if (field === 'djStartTime') {
          updated.djStartTime = value;
          if (!updated.startTime) updated.startTime = value;
        } else if (field === 'djEndTime') {
          updated.djEndTime = value;
          if (!updated.endTime) updated.endTime = value;
        } else if (field === 'changeExtraPrice') {
          const { id, price } = value;
          const newOverrides = { ...(updated.extraPriceOverrides || {}) };
          if (price === '' || price === null) delete newOverrides[id];
          else newOverrides[id] = Number(price);
          updated.extraPriceOverrides = newOverrides;
        } else {
          updated[field] = value;
        }

        // 1. STRICT SYNC: PHOTO DURATION
        // Always recalculate if start/end times exist.
        if (updated.photoStartTime && updated.photoEndTime) {
          const autoDur = getHours(updated.photoStartTime, updated.photoEndTime);
          updated.photoDuration = parseFloat(autoDur.toFixed(1));
        }

        // Clean state update: auto-calc is inherently handled by the global computedTotal watcher.
        setNewEvent(updated);
      };

      // Helper state for debugging limit (MOVED TO APP SCOPE)
      // const [alertShown, setAlertShown] = useState(false);

      // --- LOGIC: Constant Sync for Extra Hour Price ---
      const isEventMode = newEvent.id?.startsWith('EVT');

      return (
        <div className="fade-in container">
          <div className="header-row" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setView(newEvent.id?.startsWith('EVT') ? 'events' : 'quotations')}
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
                    const dynamicExtras = getDynamicExtras(newEvent);

                    // Construct Message (Premium Format + Details)
                    const extrasList = [];
                    const selExtras = newEvent.selectedExtras || {};

                    Object.keys(selExtras).forEach(k => {
                      if (selExtras[k]) {
                        // Find definition in dynamic list
                        const def = dynamicExtras.find(d => d.id === k);

                        if (def) {
                          extrasList.push(`- ${def?.name || 'Item'}: ${def?.details || ''}`);
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
🎟️ *RESERVA (30% ABONO):* ${formatPeso(newEvent.deposit)}

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
                    const emptyState = { id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: '', totalValue: '', deposit: '', leadSource: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '' };
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
                <h3 style={{ color: '#ff4444', textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>1. Datos del Evento (v1.4.6)</h3>
                <span style={{ fontSize: '1rem', color: 'var(--primary-cyan)' }}>{sectionState.s1 ? '▼' : '▶'}</span>
              </div>
              {sectionState.s1 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <input 
                        required 
                        placeholder="👤 Nombre del Cliente" 
                        value={newEvent.clientName} 
                        onChange={e => updateEvent('clientName', e.target.value)} 
                        style={{ width: '100%', fontSize: '0.95rem', fontWeight: 'bold', border: '1px solid rgba(188, 111, 241, 0.4)', boxShadow: 'var(--glow-purple)', height: '45px' }} 
                      />
                    </div>

                    <div>
                      <input placeholder="📱 Celular Princ." value={newEvent.clientPhone} onChange={e => updateEvent('clientPhone', e.target.value)} type="tel" style={{ width: '100%', fontSize: '0.82rem', height: '40px' }} />
                    </div>
                    <div>
                      <input placeholder="📱 Celular Sec." value={newEvent.clientPhone2} onChange={e => updateEvent('clientPhone2', e.target.value)} type="tel" style={{ width: '100%', fontSize: '0.82rem', height: '40px' }} />
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                      <select style={{ width: '100%', padding: '10px', fontSize: '0.85rem', border: '1px solid rgba(188, 111, 241, 0.3)', height: '42px', background: 'rgba(188, 111, 241, 0.05)' }} value={newEvent.packName} onChange={e => updateEvent('packName', e.target.value)}>
                        <option value="">Selecciona el Plan...</option>
                        <option value="ONIX">ONIX ($1.22M)</option>
                        <option value="MULTII">MULTII ($1.44M)</option>
                        <option value="KAIZEN">KAIZEN ($1.94M)</option>
                        <option value="Personalizado">Personalizado</option>
                      </select>
                    </div>

                    <div>
                       <input 
                        id="guest-input"
                        type="tel" 
                        inputMode="numeric" 
                        placeholder="👥 Invitados" 
                        value={newEvent.guestCount || ''} 
                        onChange={e => updateEvent('guestCount', e.target.value)} 
                        style={{ width: '100%', fontSize: '0.85rem', height: '40px' }} 
                      />
                    </div>

                    <div>
                      <input required type="date" value={newEvent.date} onChange={e => updateEvent('date', e.target.value)} style={{ width: '100%', fontSize: '0.85rem', height: '40px' }} />
                    </div>


                    <div>
                      <input placeholder="🎉 Ocasión (Boda/Cumple)" value={newEvent.occasion} onChange={e => updateEvent('occasion', e.target.value)} style={{ width: '100%', fontSize: '0.82rem', height: '40px' }} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <input required placeholder="📍 Ubicación (Dirección o Local)" value={newEvent.location} onChange={e => updateEvent('location', e.target.value)} style={{ width: '100%', fontSize: '0.82rem', height: '40px' }} />
                    </div>

                    {/* FRANJA HORARIA PRINCIPAL (DJ/EVENTO) */}
                    <div style={{ gridColumn: 'span 2', marginTop: '10px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <TimeInput label="Inicio Evento" value={newEvent.startTime} onChange={val => updateEvent('startTime', val)} />
                        <TimeInput label="Fin Evento" value={newEvent.endTime} onChange={val => updateEvent('endTime', val)} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <MiniTimeInput 
                            label="Horario DJ / Sonido" 
                            labelColor="var(--primary-purple)"
                            startVal={newEvent.djStartTime || newEvent.startTime} 
                            endVal={newEvent.djEndTime || newEvent.endTime}
                            onStartChange={val => updateEvent('djStartTime', val)}
                            onEndChange={val => updateEvent('djEndTime', val)}
                          />
                        </div>
                      </div>
                    </div>
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
                <h3 style={{ color: 'var(--primary-cyan)' }}>2. Extras</h3>
                <span style={{ fontSize: '1rem', color: 'var(--primary-cyan)' }}>{sectionState.s2 ? '▼' : '▶'}</span>
              </div>

              {sectionState.s2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {Object.entries(
                    getDynamicExtras(newEvent).reduce((acc, ex) => {
                      acc[ex.category] = acc[ex.category] || [];
                      acc[ex.category].push(ex);
                      return acc;
                    }, {})
                  ).map(([category, catExtras]) => {
                    const containsActive = catExtras.some(ex => !!(newEvent.selectedExtras && newEvent.selectedExtras[ex.id]) || ex.isIncluded);
                    const isOpen = !!catSectionState[category] || (containsActive && !newEvent.id);
                    return (
                      <div key={category} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                        <div 
                          onClick={() => toggleCatSection(category)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
                        >
                          <label style={{ fontSize: '0.65rem', color: 'var(--primary-purple)', fontWeight: '950', textTransform: 'uppercase', margin: 0, display: 'block', opacity: 1, letterSpacing: '2px' }}>{category}</label>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary-purple)', opacity: 0.7 }}>{isOpen ? '▼' : '▶'}</span>
                        </div>

                        {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                          {catExtras.map(extra => {
                            const isActive = !!(newEvent.selectedExtras && newEvent.selectedExtras[extra.id]) || extra.isIncluded;
                            const isAcc = extra.id.startsWith('acc_') && !extra.isItem;
                            const accQty = extra.qty;
                            return (
                              <div key={extra.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div
                                  onClick={() => updateEvent('toggleExtra', extra.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px',
                                    background: isActive ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                                    border: '1px solid', borderColor: isActive ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: '12px', cursor: 'pointer'
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#fff' : '#ccc' }}>
                                      {extra?.name || 'Extra'} {extra.isIncluded && <span style={{ color: 'var(--success-green)', fontSize: '0.6rem', marginLeft: '8px', border: '1px solid var(--success-green)', padding: '1px 5px', borderRadius: '4px', verticalAlign: 'middle' }}>INCLUIDO</span>} {isActive && extra.isAcc && !extra.isIncluded && <span style={{ color: 'var(--primary-cyan)', marginLeft: '8px', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>x{extra.qty}</span>}
                                    </span>
                                    {isActive && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{extra.details}</span>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? 'var(--primary-cyan)' : '#666' }}>
                                      {extra.isIncluded ? (
                                        <span style={{ fontSize: '0.7rem', color: '#ff4d4d', opacity: 0.8 }}>
                                          ${(extra.basePrice || extra.price).toLocaleString()} (Incluido)
                                        </span>
                                      ) : `+ $${(extra.displayPrice || extra.price).toLocaleString()}`}
                                    </span>
                                    {isActive && (extra.isMakeup || extra.isItem) && (
                                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '2px 5px' }}>
                                        <small onClick={() => updateEvent(extra.isMakeup ? 'changeMakeupCount' : 'changeExtraQty', extra.isMakeup ? Math.max(1, (extra.qty || 1) - 1) : { id: extra.id, q: (extra.qty || 1) - 1 })} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>-</small>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{extra.qty}</span>
                                        <small onClick={() => updateEvent(extra.isMakeup ? 'changeMakeupCount' : 'changeExtraQty', extra.isMakeup ? (extra.qty || 1) + 1 : { id: extra.id, q: (extra.qty || 1) + 1 })} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>+</small>
                                      </div>
                                    )}
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: isActive ? 'var(--primary-cyan)' : '#444', background: isActive ? 'var(--primary-cyan)' : 'transparent' }}></div>
                                  </div>
                                </div>


                                {extra.id.includes('_decor_') && isActive && (
                                  <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: isActive ? '1px solid var(--primary-cyan)' : '1px solid rgba(255,255,255,0.05)' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--primary-purple)', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>🖌️ Personalización Diseño Visual</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <label style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', gap: '8px', cursor: 'pointer', overflow: 'hidden' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: newEvent.decorColor || '#C9A84C', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '1px' }}>
                                          <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COLOR</span>
                                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{newEvent.decorColor || '#C9A84C'}</span>
                                        </div>
                                        <input type="color" value={newEvent.decorColor || '#C9A84C'} onChange={(e) => updateEvent('decorColor', e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', opacity: 0, width: '200%', height: '200%', cursor: 'pointer' }} />
                                      </label>
                                      <input type="text" placeholder="Ej: Neón, Floral, Despedida..." value={newEvent.decorTheme || ''} onChange={(e) => updateEvent('decorTheme', e.target.value)} style={{ flex: 1, minWidth: '150px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 15px', borderRadius: '20px', fontSize: '0.8rem', outline: 'none' }} />
                                    </div>
                                  </div>
                                )}

                                {isActive && (
                                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '10px', padding: '16px', background: 'rgba(0, 242, 255, 0.05)', borderRadius: '20px', border: '1.5px solid rgba(0, 242, 255, 0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-cyan)' }}></div>
                                      <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio Activo</span>
                                    </div>
                                    {/* TIME PICKER IF NEEDED */}
                                    {(extra.needsTime || ['extra_photo', 'extra_cam360', 'extra_av', 'extra_makeup'].includes(extra.id) || extra.id.includes('_decor_')) && (
                                      <MiniTimeInput
                                        label={`Horario ${extra.name}`}
                                        labelColor={'var(--primary-cyan)'}
                                        startVal={(() => {
                                          if (extra.id === 'extra_photo') return newEvent.photoStartTime;
                                          if (extra.id === 'extra_cam360') return newEvent.cam360StartTime;
                                          if (extra.id === 'extra_av') return newEvent.avStartTime;
                                          if (extra.id.includes('_decor_')) return newEvent.decorStartTime;
                                          if (extra.id === 'extra_makeup') return newEvent.makeupStartTime;
                                          if (extra.id === 'acc_memories') return newEvent.memoriesStartTime;
                                          if (extra.id === 'acc_celebration') return newEvent.celebrationStartTime;
                                          return '';
                                        })()}
                                        endVal={(() => {
                                          if (extra.id === 'extra_photo') return newEvent.photoEndTime;
                                          if (extra.id === 'extra_cam360') return newEvent.cam360EndTime;
                                          if (extra.id === 'extra_av') return newEvent.avEndTime;
                                          if (extra.id.includes('_decor_')) return newEvent.decorEndTime;
                                          if (extra.id === 'extra_makeup') return newEvent.makeupEndTime;
                                          if (extra.id === 'acc_memories') return newEvent.memoriesEndTime;
                                          if (extra.id === 'acc_celebration') return newEvent.celebrationEndTime;
                                          return '';
                                        })()}
                                        onStartChange={(val) => {
                                          let field = '';
                                          if (extra.id === 'extra_photo') field = 'photoStartTime';
                                          else if (extra.id === 'extra_cam360') field = 'cam360StartTime';
                                          else if (extra.id === 'extra_av') { field = 'avStartTime'; updateEvent('djStartTime', val); }
                                          else if (extra.id.includes('_decor_')) field = 'decorStartTime';
                                          else if (extra.id === 'extra_makeup') field = 'makeupStartTime';
                                          else if (extra.id === 'acc_memories') field = 'memoriesStartTime';
                                          else if (extra.id === 'acc_celebration') field = 'celebrationStartTime';
                                          if (field) updateEvent(field, val);
                                        }}
                                        onEndChange={(val) => {
                                          let field = '';
                                          if (extra.id === 'extra_photo') field = 'photoEndTime';
                                          else if (extra.id === 'extra_cam360') field = 'cam360EndTime';
                                          else if (extra.id === 'extra_av') { field = 'avEndTime'; updateEvent('djEndTime', val); }
                                          else if (extra.id.includes('_decor_')) field = 'decorEndTime';
                                          else if (extra.id === 'extra_makeup') field = 'makeupEndTime';
                                          else if (extra.id === 'acc_memories') field = 'memoriesEndTime';
                                          else if (extra.id === 'acc_celebration') field = 'celebrationEndTime';
                                          if (field) updateEvent(field, val);
                                        }}
                                      />
                                    )}

                                    {/* PRICE OVERRIDE DISPLAY (DISABLED IF INCLUDED) */}
                                    {(extra.isIncluded === true || extra.price === 0) ? null : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Precio Personalizado (Opcional)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                          <span style={{ color: 'var(--primary-cyan)', fontWeight: '900', marginRight: '5px' }}>$</span>
                                          <input 
                                            type="number" 
                                            placeholder={extra.basePrice}
                                            value={newEvent.extraPriceOverrides?.[extra.id] || ''} 
                                            onChange={(e) => updateEvent('changeExtraPrice', { id: extra.id, price: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', fontWeight: '900' }}
                                          />
                                        </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
            <div className="form-section" style={{ borderColor: 'var(--primary-cyan)', borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 style={{ color: 'var(--primary-cyan)' }}>5. Cotización Final</h3>

              <div className="money-row">
                <div style={{ flex: 1, fontSize: '0.8rem', color: '#ccc', background: '#222', padding: '10px', borderRadius: '8px', marginRight: '10px' }}>
                  {(() => {
                    const p = (newEvent.packName || '').toUpperCase();
                    const proto = STITCH_DATA.protocols[p] || {};
                    const hasPlan = p && p !== 'PERSONALIZADO';

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* HEADER MESSAGE / PLAN SPECS */}
                        {/* HEADER MESSAGE / PLAN SPECS */}
                        {p === 'PERSONALIZADO' ? (
                          <div style={{ color: 'var(--primary-cyan)', fontWeight: 'bold', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ marginBottom: '10px' }}>
                              <span>Configuración Personalizada:</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)' }}>
                              <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>COSTO BASE (SERVICIOS PRINCIPALES)</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input 
                                  type="text"
                                  value={formatInputNumber(newEvent.manualBasePrice || 0)}
                                  onChange={e => updateEvent('manualBasePrice', parseInputNumber(e.target.value))}
                                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--primary-cyan)', fontSize: '1.2rem', fontWeight: '950', outline: 'none', padding: 0 }}
                                />
                                <input 
                                  type="text"
                                  placeholder="Detalle: DJ, Sonido, Luces, etc..."
                                  value={newEvent.manualBaseDescription || ''}
                                  onChange={e => updateEvent('manualBaseDescription', e.target.value)}
                                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 'bold', outline: 'none', padding: 0, marginTop: '5px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px' }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : hasPlan ? (
                          <div style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 'bold' }}>
                              <span>Paquete {p} (4h):</span>
                              <span>${(proto.price || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: '0.62rem', color: '#aaa', marginTop: '6px', lineHeight: '1.4', fontWeight: 'bold' }}>
                              Personal: { (proto.roles || []).join(' • ') }
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '4px', lineHeight: '1.4' }}>
                              Equipos: { (proto.items || []).join(' • ') }
                            </div>
                          </div>
                        ) : null}

                        {/* DJ EXTRA (ONLY IF PACKAGE CHOSEN) */}
                        {hasPlan && extraDJ > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', fontSize: '0.65rem' }}>
                            <span>+ {extraDJ}h Extensión DJ ($85k/h):</span>
                            <strong>${extrasDJPrice.toLocaleString()}</strong>
                          </div>
                        )}

                        {/* PHOTO/VIDEO/AV EXTRAS (IF ANY DURATION ADDED) */}
                        {extraPhoto > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff9f43', fontSize: '0.65rem' }}>
                            <span>+ {extraPhoto}h Extensión Fotografía ($50k/h):</span>
                            <strong>${extrasPhotoPrice.toLocaleString()}</strong>
                          </div>
                        )}
                        {extraCam > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00d4ff', fontSize: '0.65rem' }}>
                            <span>+ {extraCam}h Extensión 360 ($200k/h):</span>
                            <strong>${extrasCamPrice.toLocaleString()}</strong>
                          </div>
                        )}
                        {Math.max(0, Math.ceil(avDur - 4)) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff3860', fontSize: '0.65rem' }}>
                            <span>+ {Math.max(0, Math.ceil(avDur - 4))}h Extensión Audiovisual ($85k/h):</span>
                            <strong>${extrasAVPrice.toLocaleString()}</strong>
                          </div>
                        )}

                        {/* ADICIONALES SELECCIONADOS (KITS, NEON, ETC) */}
                        {(() => {
                          const activeExtras = getDynamicExtras(newEvent).filter(ex => newEvent.selectedExtras?.[ex.id]);
                          if (activeExtras.length === 0) return null;
                          return (
                            <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: hasPlan ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              {activeExtras.map(ex => (
                                <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#C9A84C', fontSize: '0.65rem', marginBottom: '2px' }}>
                                  <span>+ {ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ''}:</span>
                                  <strong>{ex.isIncluded ? 'INCLUIDO' : `$${ex.price.toLocaleString()}`}</strong>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                  </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <small style={{ color: '#888', fontWeight: '900', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Cotización Calculada (Smart):</small>
                    <div 
                      className="pulse-required"
                      style={{ 
                        background: 'rgba(0, 212, 255, 0.25)', 
                        border: '2.5px solid #00d4ff', 
                        color: '#fff', 
                        fontSize: '0.9rem', 
                        padding: '6px 14px', 
                        borderRadius: '12px', 
                        fontWeight: '1000',
                        boxShadow: '0 0 25px rgba(0, 212, 255, 0.4)',
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {formatPeso(computedTotal)}
                    </div>
                  </div>
                  <input
                    required
                    placeholder="$ 0"
                    type="text"
                    value={formatInputNumber(newEvent.totalValue)}
                    onChange={e => {
                      updateEvent('totalValue', parseInputNumber(e.target.value));
                    }}
                    style={{ 
                      fontWeight: '900', 
                      color: Number(newEvent.totalValue) === computedTotal ? '#00d4ff' : '#facc15', 
                      fontSize: '1.8rem', 
                      height: '60px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${Number(newEvent.totalValue) === computedTotal ? 'rgba(0,212,255,0.3)' : 'rgba(250,204,21,0.3)'}`
                    }}
                  />
                  {Number(newEvent.totalValue) !== computedTotal && (
                    <button 
                      onClick={() => setNewEvent(prev => ({ ...prev, totalValue: computedTotal, deposit: Math.round(computedTotal * 0.3) }))}
                      style={{ fontSize: '0.6rem', color: '#facc15', background: 'none', border: 'none', textDecoration: 'underline', padding: 0, cursor: 'pointer' }}
                    >
                      Sincronizar con cálculo automático ⚡
                    </button>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'flex-end', overflow: 'visible' }}>
                <div style={{ width: '40% !important', position: 'relative', minWidth: '120px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Abono (30%)</label>
                  <div style={{ position: 'relative', width: '100%' }}>

                    <input
                      key="input_money_icon_force"
                      required
                      placeholder="0"
                      type="tel"
                      inputMode="numeric"
                      value={formatInputNumber(newEvent.deposit)}
                      onChange={e => updateEvent('deposit', parseInputNumber(e.target.value))}
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
                          padding: '6px 2px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.1)',
                          background: newEvent.paymentMethod?.includes(m.id) ? `${m.color}22` : 'rgba(255,255,255,0.03)',
                          color: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.3)',
                          fontSize: '0.55rem',
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
            </div>
          </form>
        </div>
      )
    } catch (error) {
      console.error("Critical error in renderCreate:", error);
      return (
        <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ color: '#ff3860', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '900' }}>⚠️ Error de Datos</h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,56,96,0.2)' }}>
            <p style={{ opacity: 0.8, fontSize: '1rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Esta cotización contiene información dañada o incompleta que impide su visualización.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'left' }}>
               <code style={{ fontSize: '0.7rem', color: '#ff8a8a', whiteSpace: 'pre-wrap' }}>{error.message}</code>
            </div>
            <button
              onClick={() => {
                setNewEvent({ id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'Onix', totalValue: '', deposit: '', leadSource: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '' });
                setView('quotations');
              }}
              className="primary-btn"
              style={{ padding: '15px 30px', textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              VOLVER A VENTAS
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
      // TRIGGER AUTO-CLOSE: If this was the last item to be returned and payment is done, it should close.
      const updatedEvt = { ...evt, logistics: { ...evt.logistics, items: newItems } };
      checkAutoClose(updatedEvt);
    } catch (err) {
      console.error("Error updating item status:", err);
      alert("Error al actualizar estado del ítem");
    }
  };

  /* --- VIRTUAL INVENTORY LOGIC (MOVED UP FOR SCOPE ACCESS) --- */
  const getVirtualItems = (role, packName) => {
    // Definición estricta de ítems por rol (según solicitud)
    const pName = (packName || '').toLowerCase();
    const dj = [
      { name: 'CABINAS ACTIVAS 15 PULGADAS + TRÍPODES', qty: pName.includes('celebration') ? 4 : 2 },
      { name: 'PC PORTÁTIL + CARGADOR + CABLE AUDIO 2 A 1', qty: 1 },
      { name: 'LUCES LED X4 + SOPORTE TRÍPODE', qty: 1 },
      { name: 'MÁQUINA HUMO + CONTROL + LÍQUIDO', qty: 1 },
      { name: 'KIT ENERGIA (3 PODER, 2 MULT, 2 EXT, 2 ADAPT)', qty: 1 },
      { name: 'MAQUILLAJE NEON (PINTURAS, PINCEL, MAQUILLADOR, 2H)', qty: 1 }
    ];
    const photo = [
      { name: 'CÁMARA', qty: 1 },
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
      if (!confirm(`⚠️ HAY MATERIALES PENDIENTES:\n${unreturnedGroups.map(([norm]) => `- ${norm}`).join('\n')}\n\n¿Deseas ignorar esto y CERRAR EL EVENTO de todos modos (Fuerza Bruta)?`)) return;
    } else {
      if (!confirm('¿Confirmar cierre operativo y financiero del evento?')) return;
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
      alert('✅ Evento CERRADO exitosamente.');
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
        alert('🎊 ¡Todo listo! El evento se ha finalizado automáticamente.');
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

    // 1. FORZAR ACTUALIZACIÓN de lo que ya esté en la lista para este rol
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

    // 2. Asegurar que los items virtuales esperados también estén (y en el estado correcto)
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
      alert(`✅ Estado actualizado a '${newStatus}' para ${role}.`);
    } catch (err) {
      console.error("Bulk update error:", err);
      alert(`Error en actualización masiva: ${err.message || 'Error desconocido'}`);
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

      // CÁLCULO DE EXTRAS CLIENTE (REFORZADO)
      const customerExtrasTotal = (parseFloat(extraHoursMap.DJ || 0) * 85000) +
        (parseFloat(extraHoursMap.FOTO || 0) * 35000) +
        (parseFloat(extraHoursMap.DECOR || 0) * 40000);

      // Cálculo de Utilidad Líquida Real
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
                    ⚠️ {displayName.toUpperCase()} COBRA {formatPeso(currentBalanceDue)}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
              {[
                { label: 'DJ / OP', role: 'DJ / OPERADOR', icon: <IconStaff size={12} /> },
                { label: 'FOTO', role: 'FOTÓGRAFO', icon: <IconCamera size={12} /> },
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
                  color: evt.logistics?.flow?.misionSent?.PHOTO ? '#22c55e' : '#C9A84C',
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
                {(evt.client?.name || 'Cliente').toUpperCase()} • <span style={{ color: 'var(--primary-purple)' }}>{evt.eventDetails?.occasion?.toUpperCase() || 'EVENTO'}</span>
              </h4>
              <span style={{ color: 'var(--primary-cyan)', fontSize: '0.65rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                WP-{evt.id?.split('-').slice(1).join('-') || '000000-00'}
              </span>
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '25px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--brand-gradient)' }}></div>

              {/* LOCALIZACIÓN COMPACTA (MOVED) */}
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
                    BRÚJULA NEXXA →
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
                  <span style={{ fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '1px' }}>DURACIÓN</span>
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
                      if (field === 'eventDetails.startTime' || field === 'eventDetails.djStartTime') {
                        const oldStart = evt.eventDetails?.djStartTime || evt.eventDetails?.startTime;
                        if (evt.eventDetails?.photoStartTime === oldStart) updates['eventDetails.photoStartTime'] = timeString;
                        if (evt.eventDetails?.decorStartTime === oldStart) updates['eventDetails.decorStartTime'] = timeString;
                      }
                      if (field === 'eventDetails.endTime' || field === 'eventDetails.djEndTime') {
                        const oldEnd = evt.eventDetails?.djEndTime || evt.eventDetails?.endTime;
                        if (evt.eventDetails?.photoEndTime === oldEnd) updates['eventDetails.photoEndTime'] = timeString;
                        if (evt.eventDetails?.avEndTime === oldEnd) updates['eventDetails.avEndTime'] = timeString;
                        if (evt.eventDetails?.decorEndTime === oldEnd) updates['eventDetails.decorEndTime'] = timeString;
                      }

                      updateDoc(doc(db, "events", evt.id), updates);
                    };

                    const roles = [
                      {
                        id: 'DJ', label: 'DJ', color: '#fff',
                        startField: 'eventDetails.djStartTime', endField: 'eventDetails.djEndTime',
                        sVal: evt.eventDetails?.djStartTime || evt.eventDetails?.startTime, 
                        eVal: evt.eventDetails?.djEndTime || evt.eventDetails?.endTime,
                        visible: true
                      },
                      {
                        id: 'FOTO', label: 'FOTO', color: '#facc15',
                        startField: 'eventDetails.photoStartTime', endField: 'eventDetails.photoEndTime',
                        sVal: evt.eventDetails?.photoStartTime || evt.eventDetails?.startTime,
                        eVal: evt.eventDetails?.photoEndTime || evt.eventDetails?.endTime,
                        visible: (isMemories || isCelebration) || (!isEssential && (evt.eventDetails?.photoStartTime || hasRole('FOTÓGRAFO')))
                      },
                      {
                        id: 'DECOR', label: 'DECOR', color: '#C9A84C',
                        startField: 'eventDetails.decorStartTime', endField: 'eventDetails.decorEndTime',
                        sVal: evt.eventDetails?.decorStartTime || evt.eventDetails?.startTime,
                        eVal: evt.eventDetails?.decorEndTime || evt.eventDetails?.endTime,
                        visible: isCelebration || (!isEssential && !isMemories && (evt.eventDetails?.decorStartTime || hasRole('DECORADOR')))
                      },
                      {
                        id: 'AV', label: 'AV', color: 'var(--primary-cyan)',
                        startField: 'eventDetails.avStartTime', endField: 'eventDetails.avEndTime',
                        sVal: evt.eventDetails?.avStartTime || evt.eventDetails?.startTime,
                        eVal: evt.eventDetails?.avEndTime || evt.eventDetails?.endTime,
                        visible: needsAV(evt.logistics?.packName, evt.logistics?.selectedExtras) || !!evt.eventDetails?.avStartTime
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
                        // Mostramos vacío si es 0 para facilitar escritura
                        value={evt.financials?.extraHours?.[role.id] === 0 ? "" : (evt.financials?.extraHours?.[role.id] ?? "")}
                        onFocus={(e) => e.target.select()}
                        onChange={async (e) => {
                          const valStr = e.target.value;
                          const valNum = valStr === "" ? 0 : parseFloat(valStr);

                          // ACTUALIZACIÓN DIRECTA EN EL ESTADO LOCAL DE EVENTOS
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
                    const dynamicExtras = getDynamicExtras(evt);
                    const selExtras = evt.logistics?.selectedExtras || {};
                    const active = Object.keys(selExtras).filter(k => selExtras[k]);
                    if (active.length === 0) return <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: '700' }}>Ninguno</span>;
                    return (
                      <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#ccc', letterSpacing: '0.3px' }}>
                        {active.map(k => dynamicExtras.find(d => d.id === k)?.name || k).join(' • ').toUpperCase()}
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

                {/* UTILIDAD LÍQUIDA REAL (Solo Admin) */}
                {userRole === 'admin' && (
                  <div style={{ marginTop: '15px', padding: '15px', borderRadius: '16px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--success-green)', letterSpacing: '1px' }}>UTILIDAD LÍQUIDA REAL</span>
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
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>Seleccione una pestaña</td></tr>
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
                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#22c55e', letterSpacing: '1px' }}>✅ SALDO RECAUDADO</span>
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
                              if (confirm('¿Eliminar este registro de pago de la tesorería?')) {
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
                      <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block' }}>Cálculo de Recaudo Real:</span>
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

      // 4. Próximos Eventos (Top 3) - Mirando hacia adelante desde hoy
      const upcomingEvents = events
        .filter(e => e.status === 'CONFIRMED' && e.eventDetails?.date && parseLocalStrDate(e.eventDetails.date) >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => parseLocalStrDate(a.eventDetails.date) - parseLocalStrDate(b.eventDetails.date))
        .slice(0, 3);

      // 5. Alertas (Ej: Eventos próximos sin staff)
      const alerts = upcomingEvents.filter(e => !e.staff || e.staff.length === 0);

      return (
        <div className="fade-in container" style={{ paddingBottom: '100px' }}>
          <header style={{ padding: '20px 0 15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>Visión <span style={{ opacity: 0.3 }}>Global</span></h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '2px' }} onClick={() => setShowMonthSelector(true)}>
                <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontWeight: '800', color: 'var(--primary-cyan)' }}>
                  {(months[selectedMonth] || 'Mes').toUpperCase()} {selectedYear}
                </p>
                <IconIndicator size={8} style={{ color: 'var(--primary-cyan)', opacity: 0.5 }} />
              </div>
            </div>
          </header>

          {/* A. MÉTRICA PRINCIPAL (HÉROE - COMPACT - Solo Admin) */}
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

          {/* B. MÉTRICAS SECUNDARIAS (COMPACT) */}
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
                  <IconAlertTriangle size={14} /> ATENCIÓN
                </h3>
                {alerts.map(a => {
                  try {
                    if (!a || typeof a !== 'object') return null;
                    if (!a.id) return null;
                    const clientName = a?.client?.name || a?.clientName;
                    if (!clientName) {
                      console.warn("⚠️ Alerta sin nombre:", a.id);
                      return null;
                    }
                    return (
                      <div key={a.id} style={{ background: 'rgba(255, 204, 0, 0.05)', border: '1px solid rgba(255, 204, 0, 0.2)', borderRadius: '16px', padding: '10px 15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255, 204, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcc00' }}>
                          <IconStaff size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: '800', fontSize: '0.8rem', display: 'block', color: '#ffcc00' }}>Falta Staff</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{clientName} • {a.eventDetails?.date ? new Date(a.eventDetails.date).getDate() : ''}/{a.eventDetails?.date ? new Date(a.eventDetails.date).getMonth() + 1 : ''}</span>
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

          {/* D. PRÓXIMOS EVENTOS (COMPACT) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>PRÓXIMOS</h3>
              <button onClick={() => setView('events')} style={{ background: 'none', border: 'none', color: 'var(--primary-cyan)', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer' }}>VER TODO</button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', opacity: 0.4 }}>
                <small style={{ fontSize: '0.7rem' }}>Sin eventos próximos.</small>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {upcomingEvents.map(e => {
                  try {
                    if (!e || typeof e !== 'object') return null;
                    if (!e.id) return null;
                    const clientName = e?.client?.name || e?.clientName;
                    if (!clientName) {
                      console.warn("⚠️ Evento próximo sin nombre:", e.id);
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

  // --- VIEW: EVENTS (EJECUCIÓN) ---
  // --- LOGISTICS AGENDA HELPERS ---
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = (timeStr.includes(':') ? timeStr : `${timeStr}:00`).split(':');
    return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
  };

  const minutesToTime = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${p}`;
  };

  const renderLogisticsAgenda = () => {
    const dayEvents = events.filter(e => e.eventDetails?.date === agendaDate && e.status !== 'CANCELLED');
    
    let points = [];
    dayEvents.forEach(evt => {
      const client = evt?.client?.name || evt?.clientName || 'Cliente';
      const city = evt.logistics?.neighborhood || 'NEXXA HQ';
      
      if (evt.eventDetails?.warehouseTime) {
        points.push({
          time: evt.eventDetails.warehouseTime,
          type: 'WAREHOUSE_OUT',
          label: `SALIDA BODEGA: ${client}`,
          sub: `Logística: ${city}`,
          evtId: evt.id
        });
      }
      
      if (evt.eventDetails?.startTime) {
        points.push({
          time: evt.eventDetails.startTime,
          type: 'DELIVERY',
          label: `ENTREGA Y MONTAJE: ${client}`,
          sub: `Ubicación: ${evt.logistics?.location || city}`,
          evtId: evt.id
        });
      }
      
      if (evt.eventDetails?.endTime) {
        points.push({
          time: evt.eventDetails.endTime,
          type: 'RECEPTION',
          label: `RECEPCIÓN Y DESMONTAJE: ${client}`,
          sub: `Retorno de equipos`,
          evtId: evt.id
        });
      }
    });

    points.sort((a, b) => a.time.localeCompare(b.time));

    const timeline = [];
    for (let i = 0; i < points.length; i++) {
        timeline.push(points[i]);
        if (i < points.length - 1) {
            const currentMins = timeToMinutes(points[i].time);
            const nextMins = timeToMinutes(points[i+1].time);
            const gap = nextMins - currentMins;
            if (gap > 30) {
                timeline.push({ type: 'FREE', duration: gap, start: points[i].time, end: points[i+1].time });
            }
        }
    }

    return (
      <div className="fade-in" style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', padding: '15px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '25px', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '1.2rem' }}>📅</div>
            <div style={{ flex: 1 }}>
                <small style={{ display: 'block', fontSize: '0.5rem', fontWeight: '900', opacity: 0.4, letterSpacing: '1px', marginBottom: '4px' }}>FECHA DE CONSULTA</small>
                <input 
                    type="date" 
                    value={agendaDate} 
                    onChange={(e) => setAgendaDate(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: '950', outline: 'none', width: '100%' }}
                />
            </div>
            {dayEvents.length > 0 && <div style={{ background: 'var(--primary-cyan)', color: '#000', fontSize: '0.6rem', fontWeight: '1000', padding: '4px 10px', borderRadius: '10px' }}>{dayEvents.length} EVENTOS</div>}
        </div>

        <div style={{ position: 'relative', paddingLeft: '30px', listStyle: 'none' }}>
           {/* Vertical Line */}
           <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, var(--primary-cyan) 0%, var(--primary-purple) 100%)', opacity: 0.2, borderRadius: '10px' }}></div>
           
           {timeline.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '15px', opacity: 0.15 }}>🚚</div>
                <h3 style={{ fontSize: '0.9rem', color: '#fff', opacity: 0.5, fontWeight: '800' }}>Sin logística programada</h3>
                <small style={{ opacity: 0.3 }}>Este día se encuentra totalmente libre.</small>
             </div>
           ) : timeline.map((itm, idx) => {
               if (itm.type === 'FREE') {
                   const h = Math.floor(itm.duration / 60);
                   const m = itm.duration % 60;
                   return (
                       <div key={`free-${idx}`} style={{ margin: '15px 0', padding: '12px 15px', background: 'rgba(34, 197, 94, 0.03)', border: '1px dashed rgba(34, 197, 94, 0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '5px' }}>
                           <div style={{ color: 'var(--success-green)', fontSize: '0.9rem' }}>🟢</div>
                           <div>
                               <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'var(--success-green)', letterSpacing: '0.5px' }}>TIEMPO DISPONIBLE</div>
                               <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Libre durante {h > 0 ? `${h}h ` : ''}{m > 0 ? `${m}m` : ''}</div>
                           </div>
                       </div>
                   );
               }

               const icon = itm.type === 'WAREHOUSE_OUT' ? '📦' : itm.type === 'DELIVERY' ? '🚚' : '📥';
               const color = itm.type === 'RECEPTION' ? 'var(--primary-purple)' : 'var(--primary-cyan)';

               return (
                   <div key={idx} style={{ position: 'relative', marginBottom: '25px', cursor: 'pointer' }} onClick={() => { if(itm.evtId) { setSelectedEventId(itm.evtId); setView('detail'); } }}>
                       {/* Node Dot */}
                       <div style={{ position: 'absolute', left: '-27px', top: '15px', width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, zIndex: 2 }}></div>
                       
                       <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '15px', transition: 'all 0.3s' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                   <div style={{ fontSize: '1.2rem' }}>{icon}</div>
                                   <div>
                                       <span style={{ fontSize: '0.85rem', fontWeight: '950', color: '#fff' }}>{getDisplayTimeUI(itm.time).full}</span>
                                   </div>
                               </div>
                               <IconArrowRight size={14} style={{ opacity: 0.2 }} />
                           </div>
                           <h4 style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: '900', color: itm.type === 'FREE' ? 'var(--success-green)' : '#fff', letterSpacing: '0.3px' }}>{itm.label}</h4>
                           <p style={{ margin: 0, fontSize: '0.6rem', opacity: 0.5, fontWeight: '700' }}>{itm.sub}</p>
                       </div>
                   </div>
               );
           })}
        </div>
      </div>
    );
  };

  const renderEventsList = () => {
    try {
      // Solo eventos confirmados, orden cronológico
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
          // 1. Excluir si ya está CERRADO o CANCELADO
          if (e.status === 'CLOSED' || e.status === 'CANCELLED') return false;

          // 2. Excluir SOLO si se cumplen AMBAS condiciones (Pagado Y Retornado)
          const isPaid = e.logistics?.flow?.clientPaid;
          const isReturned = e.logistics?.flow?.equipmentReturned;
          const items = e.logistics?.items || [];

          if (isPaid && isReturned) {
            // Si tiene flag de retorno y está pagado, fuera.
            return false;
          }

          // 3. Verificación resiliente basada en items si no hay flags
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
              { id: 'agenda', label: 'AGENDA' },
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
                        console.warn("⚠️ Evento sin nombre en renderizado:", evt.id);
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
                        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
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
                                    if (confirm(`¿Archivar evento de ${clientName} manualmente?`)) {
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
                  <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>Inventario detallado próximamente.</p>
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
                        return dateB.localeCompare(dateA); // Más recientes primero
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
                          console.warn("⚠️ Evento cerrado sin nombre:", evt.id);
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
                                📅 {evt.eventDetails?.date}
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
              Sesión activa como: <span style={{ color: '#888' }}>{user.email}</span> ({userRole?.toUpperCase()})
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
              // ULTRA-PROTECCIÓN: Validar CADA cotización
              try {
                if (!quo || typeof quo !== 'object') return null;
                if (!quo.id) return null;

                // Validar que tenga nombre
                const clientName = quo?.client?.name || quo?.clientName;
                if (!clientName) {
                  console.warn("⚠️ Cotización sin nombre en renderQuotations:", quo.id);
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
                        const p = (quo.logistics?.packName || '').toUpperCase();
                        if (p.includes('MEMORIES')) return 'MEMORIES';
                        if (p.includes('CELEBRATION')) return 'CELEBRATION';
                        if (p.includes('MULTII')) return 'MULTII';
                        if (p.includes('KAIZEN')) return 'KAIZEN';
                        return 'ONIX'; // 'Essential' now maps to ONIX
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
                          📅 {quo.eventDetails?.date} • {quo.logistics?.packName || 'Personalizado'}
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
                          ⏱ {Math.floor((new Date() - parseFirestoreDate(quo.createdAt)) / (1000 * 60 * 60 * 24))} DÍAS ABIERTO
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
                            <span style={{ fontSize: '6px' }}>💰</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('¿Marcar este lead como Venta Perdida?')) updateQuotationStatus(quo.id, 'LOST'); }}
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
              placeholder="••••••••"
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
  if (!events || !quotations) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Cargando información...</div>;

  // TRY-CATCH WRAPPER for main render
  try {
    console.log("DEBUG NEXXA - Rendering main app with:", {
      user: userData,
      eventsLength: events?.length,
      quotationsLength: quotations?.length
    });

    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
        <div className="noise-overlay"></div>
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
          {view === 'create' && renderCreate()}
          {view === 'inventory' && renderInventory()}
          {view === 'accounting' && renderAccounting()}
          {view === 'config' && renderConfig()}
          {view === 'profile' && renderProfile()}
          {view === 'logistics' && <LogisticsCalendarView events={events} onBack={() => setView('events')} />}
          {view === 'catalog' && <CatalogManagerView onBack={() => setView('logistics')} />}
          {view === 'quotations' && (() => {
            try {
              return (
                <QuotationsView
                  quotations={quotations}
                  onCreate={() => {
                    setNewEvent({ clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: '', totalValue: '', deposit: '', managerName: '', guestCount: '', occasion: '', extraHourPrice: 85000, indications: 'Ninguna', warehouseTime: '', materialExplanation: '', photoStartTime: '', photoEndTime: '', decorStartTime: '', decorEndTime: '', paymentMethod: 'Nequi' });
                    setView('create');
                  }}
                  onEdit={(quo) => {
                    setNewEvent({
                      id: quo.id,
                      createdAt: quo.createdAt || null,
                      clientName: quo.client?.name || quo.clientName || '',
                      clientPhone: quo.client?.phone || quo.clientPhone || '',
                      clientPhone2: quo.client?.phone2 || quo.clientPhone2 || '',
                      date: quo.eventDetails?.date || '',
                      startTime: quo.eventDetails?.startTime || '',
                      endTime: quo.eventDetails?.endTime || '',
                      location: quo.eventDetails?.location || '',
                      neighborhood: quo.eventDetails?.neighborhood || '',
                      packName: (() => {
                        const p = (quo.logistics?.packName || '').toUpperCase();
                        if (p.includes('ONIX') || p.includes('ESSENTIAL')) return 'ONIX';
                        if (p.includes('MULTII')) return 'MULTII';
                        if (p.includes('KAIZEN')) return 'KAIZEN';
                        if (p.includes('MEMORIES')) return 'MEMORIES';
                        if (p.includes('CELEBRATION')) return 'CELEBRATION';
                        if (p.includes('APP') || p.includes('PERSONALIZADO')) return 'PERSONALIZADO';
                        return '';
                      })(),
                      totalValue: Number(quo.financials?.totalValue) || 0,
                      deposit: Number(quo.financials?.deposit) || 0,
                      managerName: '',
                      guestCount: Number(quo.eventDetails?.guestCount) || 50,
                      selectedExtras: quo.logistics?.selectedExtras || {},
                      extraQtys: quo.logistics?.extraQtys || {},
                      makeupCount: quo.logistics?.makeupCount || 1,
                      occasion: quo.eventDetails?.occasion || '',
                      extraHourPrice: quo.financials?.extraHourPrice || 85000,
                      indications: quo.eventDetails?.indications || 'Ninguna',
                      materialsTime: '',
                      warehouseTime: '',
                      photoStartTime: quo.eventDetails?.photoStartTime || '',
                      photoEndTime: quo.eventDetails?.photoEndTime || '',
                      decorStartTime: quo.eventDetails?.decorStartTime || '',
                      decorEndTime: quo.eventDetails?.decorEndTime || '',
                      cam360StartTime: quo.eventDetails?.cam360StartTime || '',
                      cam360EndTime: quo.eventDetails?.cam360EndTime || '',
                      avStartTime: quo.eventDetails?.avStartTime || '',
                      avEndTime: quo.eventDetails?.avEndTime || '',
                      essentialStartTime: quo.eventDetails?.essentialStartTime || '',
                      essentialEndTime: quo.eventDetails?.essentialEndTime || '',
                      memoriesStartTime: quo.eventDetails?.memoriesStartTime || '',
                      memoriesEndTime: quo.eventDetails?.memoriesEndTime || '',
                      celebrationStartTime: quo.eventDetails?.decorStartTime || quo.eventDetails?.celebrationStartTime || '',
                      celebrationEndTime: quo.eventDetails?.decorEndTime || quo.eventDetails?.celebrationEndTime || '',
                      decorStartTime: quo.eventDetails?.decorStartTime || '',
                      decorEndTime: quo.eventDetails?.decorEndTime || '',
                      avStartTime: quo.eventDetails?.avStartTime || '',
                      avEndTime: quo.eventDetails?.avEndTime || '',
                      cam360StartTime: quo.eventDetails?.cam360StartTime || '',
                      cam360EndTime: quo.eventDetails?.cam360EndTime || '',
                      decorColor: quo.eventDetails?.decorColor || '',
                      decorTheme: quo.eventDetails?.decorTheme || '',
                      manualBasePrice: (() => {
                        const savedBase = Number(quo.financials?.manualBasePrice) || 0;
                        if (savedBase > 0) return savedBase;
                        // Auto-Recovery: Total - Extras
                        const total = Number(quo.financials?.totalValue) || 0;
                        const extras = getDynamicExtras({ selectedExtras: quo.logistics?.selectedExtras || {}, extraQtys: quo.logistics?.extraQtys || {} });
                        const extrasSum = extras.filter(ex => quo.logistics?.selectedExtras?.[ex.id]).reduce((acc, ex) => acc + (parseInt(ex.price) || 0), 0);
                        return Math.max(0, total - extrasSum);
                      })(),
                      manualBaseDescription: quo.financials?.manualBaseDescription || '',
                      isImported: true,
                      indications: quo.eventDetails?.indications || 'Ninguna',
                      materials: quo.logistics?.materials || '',
                      materialExplanation: quo.logistics?.materials || '',
                      warehouseTime: quo.logistics?.warehouseTime || '',
                      paymentMethod: quo.financials?.paymentMethod || 'Nequi',
                      deposit: Number(quo.financials?.deposit) || Math.round((Number(quo.financials?.totalValue) || 0) * 0.3)
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <small style={{ color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '2px', fontSize: '0.65rem' }}>GESTIÓN DE PERFIL Y APP</small>
                  <span style={{ fontSize: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', opacity: 0.5 }}>{APP_VERSION}</span>
                </div>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: 'rgba(255,56,96,0.05)', border: '1px solid rgba(255,56,96,0.2)', padding: '15px', borderRadius: '20px', marginBottom: '10px' }}>
                   <p style={{ margin: '0 0 10px 0', fontSize: '0.65rem', color: '#ff3860', fontWeight: '800' }}>¿PROBLEMAS DE SINCRONIZACIÓN?</p>
                   <button 
                    onClick={() => {
                        if(confirm("Se borrarán los borradores y la sesión. ¿Continuar?")) {
                            localStorage.clear();
                            window.location.reload(true);
                        }
                    }}
                    style={{ width: '100%', padding: '12px', background: '#ff3860', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '950', fontSize: '0.7rem', cursor: 'pointer' }}
                   >
                     LIMPIAR CACHE Y FORZAR RECARGA
                   </button>
                </div>

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
                  💡 Tip: Si este gasto es de un evento, usa "POR EVENTO" para ver ganancias reales.
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
                // La lógica de renderizado detectará automáticamente la transacción en globalTx y marcará PAGADO en la vista.

                setShowFinanceModal(null);
                setFinAmount('');
                setFinDesc('');
                alert('✅ Transacción registrada correctamente');

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

                    {/* CALCULADORA DE NÓMINA DINÁMICA */}
                    {finEventId && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '5px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-purple)', display: 'block', marginBottom: '8px' }}>CALCULAR NÓMINA AUTOMÁTICA</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <select
                            id="roleCalcSelector"
                            onKeyDown={(e) => e.stopPropagation()}
                            style={{ flex: 1, padding: '8px', borderRadius: '10px', background: '#000', color: '#fff', border: '1px solid #333', fontSize: '0.7rem' }}
                          >
                            <option value="DJ">DJ / OP</option>
                            <option value="FOTO">FOTÓGRAFO</option>
                            <option value="DECOR">DECORADOR</option>
                            <option value="LOGISTICA">LOGÍSTICA</option>
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
                              setFinCategory('NÓMINA');
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
                    {['LOGISTICA', 'EQUIPOS', 'MARKETING', 'NÓMINA', 'MANTENIMIENTO', 'FIJOS', 'VENTA', 'OTROS'].map(cat => (
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
                Total: {formatPeso(paymentModal.total)} • Pendiente: <strong style={{ color: paymentModal.total === 0 ? 'var(--danger-red)' : 'var(--primary-cyan)' }}>{formatPeso(paymentModal.pending)}</strong>
              </p>

              {paymentModal.total === 0 && (
                <div style={{ background: 'rgba(255,100,100,0.05)', padding: '15px', borderRadius: '20px', border: '1px solid rgba(255,100,100,0.2)', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.6rem', color: '#ff3860', fontWeight: '900', display: 'block', marginBottom: '10px', textAlign: 'center' }}>⚠️ NO SE DETECTÓ SALDO AUTOMÁTICO</span>
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
                <label style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.4, letterSpacing: '1px' }}>MÉTODO DE PAGO</label>
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
                    <span style={{ opacity: 0.2 }}>→</span>
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
                        category: 'NÓMINA',
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
                    💳 Pagar por {method}
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
              <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#888', marginBottom: '20px' }}>Este gasto se repetirá automáticamente todos los meses.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newExpenseData.day || !newExpenseData.concept || !newExpenseData.amount) return alert('Completa todos los campos');

                const dayNum = parseInt(newExpenseData.day);
                if (dayNum < 1 || dayNum > 31) return alert('Día inválido');

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
                  alert('✅ Gasto mensual programado!');
                } catch (err) {
                  console.error(err);
                  alert('Error al guardar: ' + err.message);
                }
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Día del Pago (Mensual)</label>
                    <input
                      type="number"
                      min="1" max="31"
                      placeholder="Ej: 5 (para el día 5 de cada mes)"
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

    // AUTO-RELOAD: Si es el error de 'name', recargar automáticamente UNA VEZ
    const hasReloaded = sessionStorage.getItem('nexxa_error_reload');
    if (error.message && error.message.includes('name') && !hasReloaded) {
      console.warn("🔄 ERROR DE 'NAME' DETECTADO - RECARGANDO AUTOMÁTICAMENTE...");
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
            <h2 style={{ color: '#00d4ff' }}>🔄 Recargando...</h2>
            <p style={{ opacity: 0.6 }}>Limpiando estado corrupto</p>
          </div>
        </div>
      );
    }

    // Si ya recargó una vez, mostrar error
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
          <h2 style={{ color: '#ff3860', marginBottom: '15px' }}>⚠️ Error Crítico</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>
            La aplicación encontró un error inesperado.
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
            RECARGAR APLICACIÓN
          </button>
        </div>
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.05)', zIndex: 9999 }}>{APP_VERSION}</div>
      </div>
    );
  }
}



export default App;
