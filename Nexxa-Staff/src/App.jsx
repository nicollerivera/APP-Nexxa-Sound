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

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const getHours = (start, end) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return diffMinutes / 60;
};

const parseFirestoreDate = (date) => {
  if (!date) return new Date();
  if (date.toDate) return date.toDate();
  return new Date(date);
};


// --- MINIMALIST ICONS (SVG) ---
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
);
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
);
const IconPhone = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
);
const IconLocation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const IconNeighborhood = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const IconPDF = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
);
const IconServices = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M11 3L8 9l3 12" /><path d="M13 3l3 6-3 12" /></svg>
);
const IconFlow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconRecaudo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IconPayroll = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);
const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconUser = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const IconPlus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const IconHistory = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /><polyline points="12 8 12 12 16 14" /></svg>
);
const IconWhatsApp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7l1.1 1.1" /><path d="M12 12h.01" /><path d="M17 12c.8-1.5 1-3.5-.5-4l-3 1c-1 1-1.5 2-1 3.5.5 1.5.5 1.5 2 2.5s2.5.5 3-.5l-1.5-1.5" /></svg>
);
const IconStaff = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const IconAlertTriangle = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const IconCalendar = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const IconInventory = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
const IconChecklist = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
const IconCamera = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const IconSettings = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const IconLogout = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
const IconLogoNexxa = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" stroke="url(#logoGrad)" strokeWidth="8" />
    <path d="M30 40 L50 60 L70 40" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#00d4ff" />
        <stop offset="100%" stopColor="#9d4edd" />
      </linearGradient>
    </defs>
  </svg>
);

const IconHome = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const IconBox = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" /><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" /><path d="M10 12h4" /></svg>
);
const IconIndicator = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
);
const IconFileText = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
);

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
      const liveEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })); // Ensure ID from doc
      // Sort by date (descending or accordingly) could happen here
      setEvents(liveEvents.sort((a, b) => b.id.localeCompare(a.id)));
    });
    return () => unsubscribe();
  }, []);

  // 1.5 SYNC QUOTATIONS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotations"), (snapshot) => {
      const liveQuo = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setQuotations(liveQuo.sort((a, b) => b.id.localeCompare(a.id)));
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
  const [staffPayModal, setStaffPayModal] = useState(null);
  const [whatsappModalQuo, setWhatsappModalQuo] = useState(null); // { quo, type }

  // --- ESTADO: IDENTIDAD OPERATIVA (PERFIL) ---
  const [userProfile, setUserProfile] = useState({
    businessName: 'Nexxa Sound',
    nit: '',
    fiscalAddress: '',
    whatsapp: '3001234567',
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
      return alert('Faltan datos para crear la cotización.');
    }

    const total = Number(newEvent.totalValue) || 0;
    const dateCode = newEvent.date ? newEvent.date.replace(/-/g, '').slice(2) : 'XXXXXX';
    const dailyCount = quotations.filter(q => q.eventDetails.date === newEvent.date).length + 1;
    const finalId = `QUO-${dateCode}-${String(dailyCount).padStart(2, '0')}`;

    const quoObj = {
      status: status,
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
        guestCount: newEvent.guestCount
      },
      financials: {
        totalValue: total,
        deposit: Number(newEvent.deposit) || 0,
        balance: total - (Number(newEvent.deposit) || 0)
      },
      logistics: {
        packName: newEvent.packName,
        selectedExtras: newEvent.selectedExtras || {},
        makeupCount: newEvent.makeupCount
      }
    };

    try {
      await setDoc(doc(db, "quotations", finalId), quoObj);
      alert('✅ Cotización guardada');
      setView('quotations');
      setNewEvent({ clientName: '', clientPhone: '', date: '', startTime: '', endTime: '', location: '', packName: 'Essential', totalValue: '', deposit: '', managerName: '' });
      localStorage.removeItem('nexxa_draft_event');
    } catch (err) {
      console.error(err);
      alert('Error al guardar cotización');
    }
  };

  const approveQuotation = async (quo) => {
    if (!confirm('¿Aprobar esta cotización y convertarla en evento?')) return;

    const eventId = quo.id.replace('QUO', 'EVT');
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
        items: [] // Will use default items based on pack in handleCreateEvent logic or similar
      }
    };

    // Need to generate default items
    let defaultItems = [];
    const packName = quo.logistics.packName;
    if (packName === 'Essential') {
      defaultItems = [
        { name: 'Cabinas Activas 15" + Trípodes', qty: 2, checked: false, area: 'DJ' },
        { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, checked: false, area: 'DJ' },
        { name: 'Luces LED + Soporte Trípode', qty: 1, checked: false, area: 'DJ' },
        { name: 'Máquina Humo + Control + Líquido', qty: 1, checked: false, area: 'DJ' },
        { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, checked: false, area: 'LOGÍSTICA' }
      ];
    } else if (packName === 'Memories') {
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
    } else if (packName === 'Celebration') {
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
    if (status === 'CONFIRMED') {
      if (!newEvent.clientName || !newEvent.date || !newEvent.totalValue) {
        return alert('Para confirmar, necesitas al menos: Cliente, Fecha y Valor Total.');
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
      const current = evt.logistics.flow[area]?.[step];
      await updateDoc(doc(db, "events", evtId), {
        [`logistics.flow.${area}.${step}`]: !current
      });
    } else {
      await updateDoc(doc(db, "events", evtId), {
        [`logistics.flow.${area}`]: !evt.logistics.flow[area]
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

  // --- PDF GENERATOR (LOGISTICS MISSION) - STATE OF THE ART DESIGN ---
  const generateMissionPDF = async (evt, role = 'GENERAL') => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = 297;
      const margin = 15;

      // --- HELPERS ---
      const formatT = (t) => {
        if (!t || typeof t !== 'string' || !t.includes(':')) return '--:--';
        let [h, m] = t.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '--:--';
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ap}`;
      };

      const subtractMinutes = (timeStr, minutesToSub) => {
        if (!timeStr || !timeStr.includes(':')) return '--:--';
        let [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '--:--';
        let totalMin = h * 60 + m;
        totalMin -= minutesToSub;
        if (totalMin < 0) totalMin += 24 * 60;
        const newH = Math.floor(totalMin / 60);
        const newM = totalMin % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      };

      const getBase64 = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Fetch error');
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) { return null; }
      };

      const logoData = await getBase64('/logo_staff_new.jpg');

      const COLORS = {
        DARK: [0, 0, 0],          // Pure Black
        WHITE: [255, 255, 255],
        ICE: [248, 249, 252],
        CYAN: [0, 242, 255],      // Official Nexxa Cyan
        PURPLE: [188, 111, 241],  // Official Nexxa Purple
        PURPLE_SOFT: [245, 243, 255],
        GREY_TEXT: [100, 110, 130],
        BORDERS: [225, 230, 240]
      };

      // 0. BACKGROUND & STRUCTURE
      doc.setFillColor(...COLORS.DARK);
      doc.rect(0, 0, pageWidth, 50, 'F'); // Header block

      doc.setFillColor(15, 15, 20); // Deep Dark Body
      doc.rect(0, 50, pageWidth, pageHeight - 50, 'F');

      // 1. BRANDING (HEADER)
      if (logoData) {
        doc.addImage(logoData, 'JPEG', margin, 10, 30, 30);
        // Mask the "Gemini Star" or artifacts in the bottom right corner of the logo
        doc.setFillColor(0, 0, 0);
        doc.rect(margin + 26, 36, 4, 4, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);

      const titlePart1 = 'NEXXA SOUND ';
      const titlePart2 = role === 'GENERAL' ? 'LEVEL PRODUCTIONS' : `MISIONES ${role}`;
      const w2 = doc.getTextWidth(titlePart2);
      const w1 = doc.getTextWidth(titlePart1);

      // Right-aligned dual color title with Nexxa Colors
      doc.setTextColor(...COLORS.PURPLE);
      doc.text(titlePart2, pageWidth - margin, 25, { align: 'right' });
      doc.setTextColor(...COLORS.CYAN);
      doc.text(titlePart1, pageWidth - margin - w2, 25, { align: 'right' });

      // Subtle premium accent line
      doc.setDrawColor(...COLORS.CYAN);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - margin - (w1 + w2), 28, pageWidth - margin - (w2 * 0.5), 28); // Short line

      // Improved ID Logic: Sequential for the day
      let displayId = 'N/A';
      if (evt.eventDetails?.date) {
        const dateStr = evt.eventDetails.date;
        const shortDate = dateStr.replace(/-/g, '').substring(2); // YYMMDD
        const sameDayEvents = (events || []).filter(e => e.eventDetails?.date === dateStr)
          .sort((a, b) => (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || ''));
        const index = sameDayEvents.findIndex(e => e.id === evt.id);
        const sequence = index !== -1 ? index + 1 : sameDayEvents.length + 1;
        displayId = `${shortDate}-${String(sequence).padStart(2, '0')}`;
      } else {
        displayId = (evt.id || '---').substring(0, 8);
      }
      doc.setTextColor(110, 110, 130);
      doc.setFontSize(9);
      doc.text(`ID: ${displayId} | ROL: ${role}`, pageWidth - margin, 37, { align: 'right' });

      let y = 58;

      // 2. LOGISTICS & DATE CARD (DARK)
      doc.setFillColor(0, 0, 0);
      doc.setDrawColor(40, 40, 50);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 24, 2, 2, 'FD');

      // Dynamic Times based on Role
      let timeLlegada = evt.eventDetails?.warehouseTime || subtractMinutes(evt.eventDetails?.startTime, 150);
      let timeLabel = 'LLEGADA A BODEGA';
      let managerLabel = 'GESTOR OPERATIVO';

      if (role === 'PHOTO') {
        timeLlegada = evt.eventDetails?.photoStartTime ? subtractMinutes(evt.eventDetails.photoStartTime, 30) : evt.eventDetails?.startTime;
        timeLabel = 'LLEGADA AL LUGAR';
        managerLabel = 'COORDINADOR';
      } else if (role === 'DECOR') {
        timeLlegada = evt.eventDetails?.decorStartTime || evt.eventDetails?.startTime;
        timeLabel = 'INICIO MONTAJE';
      }

      // Warehouse Col
      doc.setTextColor(160, 160, 180);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(timeLabel, margin + 7, y + 7);
      doc.setTextColor(...COLORS.CYAN);
      doc.setFontSize(13);
      doc.text(formatT(timeLlegada), margin + 7, y + 16);

      // Manager Col
      doc.setTextColor(160, 160, 180);
      doc.setFontSize(7);
      doc.text(managerLabel, margin + 60, y + 7);
      doc.setTextColor(...COLORS.WHITE);
      doc.setFontSize(10);
      doc.text(evt.logistics?.managerName?.toUpperCase() || 'POR ASIGNAR', margin + 60, y + 16);

      // Extra Hour Col (Only relevant for General/DJ usually, but showing simple for all)
      doc.setTextColor(160, 160, 180);
      doc.setFontSize(7);
      doc.text('VALOR HR EXTRA', margin + 115, y + 7);
      doc.setTextColor(...COLORS.CYAN);
      doc.setFontSize(10);
      const ehPrice = evt.financials?.extraHourPrice || (evt.logistics?.packName === 'Essential' ? 85000 : 135000);
      doc.text(formatPeso(ehPrice), margin + 115, y + 16);

      // Date Col
      doc.setTextColor(160, 160, 180);
      doc.setFontSize(7);
      doc.text('FECHA SERVICIO', pageWidth - margin - 7, y + 7, { align: 'right' });
      doc.setTextColor(...COLORS.PURPLE);
      doc.setFontSize(12);
      doc.text(evt.eventDetails?.date || '---', pageWidth - margin - 7, y + 16, { align: 'right' });

      y += 30;

      // 3. CLIENT CARD (DARK)
      doc.setFillColor(0, 0, 0);
      doc.setDrawColor(...COLORS.PURPLE);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 1.5, 1.5, 'FD');

      doc.setTextColor(...COLORS.PURPLE);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE TITULAR / EVENTO', margin + 7, y + 7);

      doc.setTextColor(...COLORS.WHITE);
      doc.setFontSize(12);
      const nameText = (evt.client?.name || 'Invitado').toUpperCase();
      const occasionText = (evt.eventDetails?.occasion || '---').toUpperCase();
      doc.text(`${nameText}  |  ${occasionText}`, margin + 7, y + 15);

      // Client Phones & WhatsApp Link
      const phone1 = evt.client?.phone || '';
      const phone2 = evt.client?.phone2 || '';
      if (phone1 || phone2) {
        doc.setFontSize(12);
        let phoneX = margin + 15 + doc.getTextWidth(`${nameText}  |  ${occasionText}`);
        doc.setFontSize(8.5);
        if (phone1) {
          doc.setTextColor(...COLORS.CYAN);
          const p1Label = `WP: ${phone1}`;
          doc.text(p1Label, phoneX, y + 15, { link: { url: `https://wa.me/${phone1.replace(/\D/g, '')}` } });
          const tw = doc.getTextWidth(p1Label);
          doc.setDrawColor(...COLORS.CYAN);
          doc.setLineWidth(0.2);
          doc.line(phoneX, y + 16, phoneX + tw, y + 16);
          phoneX += tw + 8;
        }
        if (phone2) {
          doc.setTextColor(160, 160, 180);
          doc.text(`|  CEL: ${phone2}`, phoneX, y + 15);
        }
      }

      y += 28;

      // 4. OPERATION TABLE (DARK THEME)
      doc.setTextColor(200, 200, 220);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCALIZACIÓN Y CRONOGRAMA', margin, y);
      y += 5;

      // Logic for ROLE SPECIFIC TIMES
      let startT = evt.eventDetails?.startTime || '00:00';
      let endT = evt.eventDetails?.endTime || '00:00';

      if (role === 'PHOTO') {
        startT = evt.eventDetails?.photoStartTime || startT;
        endT = evt.eventDetails?.photoEndTime || endT;
      } else if (role === 'DECOR') {
        startT = evt.eventDetails?.decorStartTime || startT;
        endT = evt.eventDetails?.decorEndTime || endT;
      }

      const [ho1, mo1] = startT.split(':').map(Number);
      const [ho2, mo2] = endT.split(':').map(Number);
      let diffMinO = (ho2 * 60 + mo2) - (ho1 * 60 + mo1);
      if (diffMinO < 0) diffMinO += 24 * 60;
      const durationO = `${(diffMinO / 60).toFixed(1)} HORAS`;

      autoTable(doc, {
        startY: y,
        theme: 'grid',
        head: [['ZONA / BARRIO', 'DIRECCIÓN EXACTA', `HORARIO (${role})`, 'DURACIÓN']],
        body: [[
          evt.eventDetails?.neighborhood || '---',
          evt.eventDetails?.location || '---',
          `${formatT(startT)} - ${formatT(endT)}`,
          durationO
        ]],
        styles: { fontSize: 8.5, cellPadding: 5, fillColor: [25, 25, 30], textColor: [255, 255, 255], lineColor: [40, 40, 50] },
        headStyles: { fillColor: [0, 0, 0], textColor: COLORS.CYAN, lineWidth: 0.1, lineColor: [40, 40, 50] },
        columnStyles: { 0: { width: 40 }, 1: { width: 65 }, 2: { width: 50 }, 3: { width: 25 } }
      });

      y = doc.lastAutoTable.finalY + 12;

      // 5. MATERIALS IN CHARGE (INVENTORY LIST)
      doc.setTextColor(200, 200, 220);
      doc.setFontSize(10);
      doc.text(`MATERIAL A CARGO (${role})`, margin, y);
      y += 5;

      let itemsToDisplay = [...(evt.logistics?.items || [])];

      // Fallback & Dynamic Extras Logic if list is empty or to ensure extras are listed
      const pName = (evt.logistics?.packName || '').toUpperCase();

      if (itemsToDisplay.length === 0) {
        if (pName.includes('ESSENTIAL')) {
          itemsToDisplay = [
            { name: 'Cabinas Activas 15" + Trípodes', qty: 2, area: 'DJ' },
            { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, area: 'DJ' },
            { name: 'Luces LED + Soporte Trípode', qty: 1, area: 'DJ' },
            { name: 'Máquina Humo + Control + Líquido', qty: 1, area: 'DJ' },
            { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, area: 'LOGÍSTICA' }
          ];
        } else if (pName.includes('MEMORIES')) {
          itemsToDisplay = [
            { name: 'Cabinas Activas 15" + Trípodes', qty: 2, area: 'DJ' },
            { name: 'Bajos 18" Activos', qty: 2, area: 'DJ' },
            { name: 'Estructura Portería Luces', qty: 1, area: 'DJ' },
            { name: 'Cabeza Móvil Beam / Spot', qty: 2, area: 'DJ' },
            { name: 'Par LED RGBW', qty: 6, area: 'DJ' },
            { name: 'Cámara Pro + Lente + Flash', qty: 1, area: 'PHOTO' },
            { name: 'Controladora / Mixer DJ', qty: 1, area: 'DJ' },
            { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, area: 'DJ' },
            { name: 'Máquina Humo + Control + Líquido', qty: 1, area: 'DJ' },
            { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, area: 'LOGÍSTICA' }
          ];
        } else if (pName.includes('CELEBRATION')) {
          itemsToDisplay = [
            { name: 'Cabinas Activas 15" + Trípodes', qty: 4, area: 'DJ' },
            { name: 'Bajos 18" Activos', qty: 2, area: 'DJ' },
            { name: 'Cabina Retorno DJ', qty: 1, area: 'DJ' },
            { name: 'Estructura Portería Luces 4m', qty: 1, area: 'DJ' },
            { name: 'Cabeza Móvil Beam / Spot', qty: 4, area: 'DJ' },
            { name: 'Par LED RGBW', qty: 8, area: 'DJ' },
            { name: 'Cámara Pro + Lente + Flash', qty: 1, area: 'PHOTO' },
            { name: 'PC Portátil + Cargador + Cable Audio 2 a 1', qty: 1, area: 'DJ' },
            { name: 'Máquina Humo + Control + Líquido', qty: 1, area: 'DJ' },
            { name: 'Kit Energía (3 Poder, 2 Mult, 2 Ext, 2 Adapt)', qty: 1, area: 'LOGÍSTICA' }
          ];
        } else {
          // Generic fallback for custom/unrecognized plans
          itemsToDisplay = [
            { name: 'Kit Sonido Básico Nexxa', qty: 1, area: 'DJ' },
            { name: 'Kit Iluminación Básico Nexxa', qty: 1, area: 'DJ' },
            { name: 'Cableado y Extensiones AC', qty: 1, area: 'LOGÍSTICA' }
          ];
        }
      }

      // Map for human-readable extra names with specific inventory contents
      const extraLabels = {
        makeup: 'MAQUILLAJE NEÓN (Pinturas, Maquillador, 2h)',
        acc_essential: 'KIT ACCESORIOS ESSENTIAL (1 Esp, 50 Man, 25 Pit)',
        acc_memories: 'KIT ACCESORIOS MEMORIES (2 Esp, 50 Man, 50 Pit, 2 Cañ)',
        acc_celebration: 'KIT ACCESORIOS CELEBRATION (3 Esp, 25 Man, 50 Pit, 50 Col, 50 Ant, 3 Cañ)',
        specialDecor: 'DECORACIÓN ESPECIAL'
      };

      // Add extras if they are selected but not already in the list
      if (evt.logistics?.selectedExtras) {
        Object.entries(evt.logistics.selectedExtras).forEach(([id, active]) => {
          if (active) {
            const friendlyName = extraLabels[id] || id.replace(/_/g, ' ').toUpperCase();
            // Determine Area based on ID
            let extraArea = 'EXTRAS';
            if (id === 'makeup' || id.includes('Photo')) extraArea = 'PHOTO';
            if (id.includes('Decor')) extraArea = 'DECOR';

            if (!itemsToDisplay.some(i => i.name.toUpperCase().includes(friendlyName))) {
              itemsToDisplay.push({ name: friendlyName, qty: 1, area: extraArea });
            }
          }
        });
      }

      // FILTER ITEMS BASED ON ROLE
      let filteredItems = itemsToDisplay;
      if (role === 'DJ') {
        filteredItems = itemsToDisplay.filter(i => !i.area || i.area === 'DJ' || i.area.includes('LOGÍSTICA') || i.area === 'EXTRAS');
      } else if (role === 'PHOTO') {
        filteredItems = itemsToDisplay.filter(i => i.area === 'PHOTO' || i.area === 'VIDEO' || i.name.includes('Cámara') || i.name.includes('Maquillaje'));
      } else if (role === 'DECOR') {
        filteredItems = itemsToDisplay.filter(i => i.area === 'DECOR' || i.name.includes('Decor') || i.name.includes('Estructura'));
      }

      const materialsTable = filteredItems.map(item => [
        item.name.toUpperCase(),
        item.qty.toString(),
        item.area || 'GENERAL'
      ]);

      const emptyMsg = role === 'PHOTO' ? 'SIN EQUIPO FOTOGRÁFICO ASIGNADO' : 'SIN MATERIALES ESPECÍFICOS';

      autoTable(doc, {
        startY: y,
        theme: 'grid',
        head: [['ÍTEM / EQUIPO', 'CANTIDAD', 'ÁREA']],
        body: materialsTable.length > 0 ? materialsTable : [[emptyMsg, '-', '-']],
        styles: { fontSize: 7.5, cellPadding: 2.2, fillColor: [25, 25, 30], textColor: [255, 255, 255], lineColor: [40, 40, 50] },
        headStyles: { fillColor: [0, 0, 0], textColor: COLORS.PURPLE, lineWidth: 0.1, lineColor: [40, 40, 50] }
      });

      y = doc.lastAutoTable.finalY + 8;

      // INDICATIONS (NOTES)
      doc.setTextColor(200, 200, 220);
      doc.setFontSize(10);
      doc.text('INDICACIONES Y OBSERVACIONES', margin, y);
      y += 5;
      doc.setFontSize(8.5);
      doc.setTextColor(180, 180, 200);
      const splitIndications = doc.splitTextToSize(evt.eventDetails?.indications || 'Sin observaciones adicionales.', pageWidth - (margin * 2));
      doc.text(splitIndications, margin, y);

      y += (splitIndications.length * 5) + 5;

      y = doc.lastAutoTable.finalY + 15;

      // 6. FINANCIAL CARDS (REDIESIGNED - NO WHITE)
      // Only show financials for GENERAL role to protect privacy and avoid confusion
      if (role === 'GENERAL') {
        const colWidth = (pageWidth - (margin * 2) - 10) / 2;

        // Payroll Card (Dark/Cyan)
        doc.setFillColor(0, 0, 0);
        doc.setDrawColor(...COLORS.CYAN);
        doc.roundedRect(margin, y, colWidth, 35, 2, 2, 'FD');
        doc.setTextColor(...COLORS.CYAN);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('COSTEO DE SERVICIO (NÓMINA)', margin + 7, y + 8);

        const [hs, ms] = (evt.eventDetails?.startTime || '00:00').split(':').map(Number);
        const [he, me] = (evt.eventDetails?.endTime || '00:00').split(':').map(Number);
        let totalM = (he * 60 + me) - (hs * 60 + ms);
        if (totalM < 0) totalM += 24 * 60;
        const djPay = 35000 + ((totalM / 60) * 13000);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`BASE + VARIABLE: ${formatPeso(djPay)}`, margin + 7, y + 20);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 150);
        doc.text('Cálculo por duración operativa.', margin + 7, y + 28);

        // Collection Card (Dark/Purple)
        doc.setFillColor(0, 0, 0);
        doc.setDrawColor(...COLORS.PURPLE);
        doc.roundedRect(margin + colWidth + 10, y, colWidth, 35, 2, 2, 'FD');
        doc.setTextColor(...COLORS.PURPLE);
        doc.text('OBJETIVO DE RECAUDO CLIENTE', margin + colWidth + 17, y + 8);

        const totalV = evt.financials?.totalValue || 0;
        const pays = evt.financials?.advance || evt.financials?.deposit || 0;
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(formatPeso(totalV - pays), margin + colWidth + 17, y + 22);
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 200);
        doc.text('NEQUI / DAVIPLATA: 300 259 6935', margin + colWidth + 17, y + 30);
      } else {
        // Simple footer for staff roles to fill space
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('** Por favor, verificar inventario y reportar novedades antes del evento. **', margin, y);
      }

      // 7. FOOTER UNIFIED
      doc.setTextColor(...COLORS.GREY_TEXT);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`GUÍA OPERATIVA - ROL: ${role}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.setTextColor(...COLORS.PURPLE);
      doc.text('NEXXA SOUND - PASIÓN POR LA EXCELENCIA', pageWidth / 2, pageHeight - 8, { align: 'center' });

      doc.save(`ORDEN_${role}_${nameText}.pdf`);

    } catch (err) {
      console.error(err);
      alert('Error en Rediseño PDF: ' + err.message);
    }
  };

  const generateQuotationPDF = async (quo) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = 297;
      const margin = 20; // Increased margin for cleaner look
      const contractClientName = (quo.client?.name || 'Cliente').toUpperCase();

      // Load Logo Logic (Base64)
      const getBase64 = async (url) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) { return null; }
      };

      const logoData = await getBase64('/nexxa-app-icon.png');
      const signatureData = await getBase64('/firma_sharon.jpg');

      // 3. COLORS (Clean White Theme)
      const THEME = {
        TEXT_MAIN: [17, 17, 17],
        TEXT_SUB: [51, 51, 51],
        TEXT_LEGAL: [119, 119, 119],
        ACCENT: [188, 111, 241],
        BG_LIGHT: [250, 250, 252],
        WHITE: [255, 255, 255]
      };

      // 4. HEADER
      let y = 30;

      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, 15, 25, 25);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('Contrato de Prestación de Servicios', pageWidth / 2, 22, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Producción de eventos · Sonido · Iluminación · DJ', pageWidth / 2, 29, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...THEME.TEXT_LEGAL);
      doc.text(`Bogotá D.C. • ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, 36, { align: 'center' });

      doc.setDrawColor(...THEME.ACCENT);
      doc.setLineWidth(0.5);
      doc.line(margin, 45, pageWidth - margin, 45);

      y = 55;

      // 5. SECCIÓN 1 - DATOS DEL EVENTO
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('DATOS DEL EVENTO', margin, y);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 12;



      const evtDate = quo.eventDetails?.date || '---';
      const evtTime = `${quo.eventDetails?.startTime || '--'} - ${quo.eventDetails?.endTime || '--'}`;
      const evtLoc = (quo.eventDetails?.location || 'Ubicación por confirmar');
      const clientN = (quo.client?.name || 'Cliente');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...THEME.TEXT_MAIN);

      const col1X = margin + 10;
      const colVal1X = margin + 35;
      const col2X = (pageWidth / 2) + 10;
      const colVal2X = (pageWidth / 2) + 35;

      // Col 1
      doc.text('Cliente:', col1X, y + 10);
      doc.setFont('helvetica', 'normal'); doc.text(clientN, colVal1X, y + 10);

      doc.setFont('helvetica', 'bold');
      doc.text('Ubicación:', col1X, y + 20);
      doc.setFont('helvetica', 'normal'); doc.text(evtLoc, colVal1X, y + 20);

      // Col 2
      // Format Date
      const rawDate = quo.eventDetails?.date;
      const formattedDate = rawDate ? new Date(rawDate + 'T00:00:00').toLocaleDateString('es-CO') : '---';

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', col2X, y + 10);
      doc.setFont('helvetica', 'normal'); doc.text(formattedDate, colVal2X, y + 10);

      doc.setFont('helvetica', 'bold');
      doc.text('Horario:', col2X, y + 20);
      doc.setFont('helvetica', 'normal'); doc.text(evtTime, colVal2X, y + 20);

      y += 45;

      // 6. SECCIÓN 2 - IDENTIFICACIÓN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('IDENTIFICACIÓN', margin, y);

      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 12;



      // Labels Row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...THEME.TEXT_MAIN);

      doc.text('Proveedor del servicio', margin + 10, y);

      const holderX = (pageWidth / 2) + 10;
      doc.text('Titular del servicio', holderX, y);

      // Content Row
      y += 8;

      // Provider Content
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('NEXXA SOUND', margin + 10, y + 2);

      // Holder Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Sharon Nicolle Rivera Tocasuche', holderX, y);
      doc.text('C.C. 1024488302', holderX, y + 5);

      y += 20;

      // End of section

      // 7. SECCIÓN 3 - SERVICIOS INCLUIDOS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Servicios incluidos', margin, y);
      y += 6;

      const scopeData = [
        ['Paquete / Experiencia:', quo.logistics.packName?.toUpperCase() || 'PERSONALIZADO'],
        ['Servicio principal:', 'Producción de Evento (Sonido/Iluminación)']
      ];

      const activeExtras = getDynamicExtras(quo.eventDetails.guestCount || 100, quo.logistics.makeupCount || 0)
        .filter(ex => quo.logistics.selectedExtras && quo.logistics.selectedExtras[ex.id]);

      if (activeExtras.length > 0) {
        const extrasText = activeExtras.map(ex => `• ${ex.name} (${ex.details})`).join('\n');
        scopeData.push(['Complementos incluidos:', extrasText]);
      } else {
        scopeData.push(['Complementos incluidos:', 'Ninguno seleccionado']);
      }

      autoTable(doc, {
        startY: y,
        theme: 'plain',
        body: scopeData,
        styles: { fontSize: 11, cellPadding: 6, textColor: THEME.TEXT_MAIN, lineWidth: 0, overflow: 'linebreak' },
        columnStyles: {
          0: { fontStyle: 'bold', width: 60, textColor: THEME.TEXT_SUB },
          1: { width: 110 }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.setDrawColor(200, 200, 200); // 200 is visible light grey
            doc.setLineWidth(0.1);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      y = doc.lastAutoTable.finalY + 15;

      // 8. SECCIÓN 4 - INVERSIÓN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Inversión del servicio', margin, y);
      y += 10;

      const totalVal = quo.financials.totalValue || 0;
      const payToReserve = Math.ceil((totalVal * 0.3) / 5000) * 5000;
      const payFinal = totalVal - payToReserve;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...THEME.TEXT_MAIN);

      // 1. Anticipo
      doc.text('Anticipo (30%):', margin, y);
      doc.setFont('helvetica', 'bold'); doc.text(formatPeso(payToReserve), margin + 40, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_LEGAL);
      doc.text('(confirma reserva de fecha)', margin + 80, y);

      y += 8;
      // 2. Saldo
      doc.setFontSize(11); doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('Saldo (70%):', margin, y);
      doc.setFont('helvetica', 'bold'); doc.text(formatPeso(payFinal), margin + 40, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_LEGAL);
      doc.text('(antes del inicio del evento)', margin + 80, y);

      y += 12; // Extra space before total for emphasis
      // 3. Total
      doc.setFontSize(12); doc.setTextColor(...THEME.TEXT_MAIN);
      doc.setFont('helvetica', 'bold');
      doc.text('Valor total:', margin, y);
      doc.text(formatPeso(totalVal), margin + 40, y);

      y += 25;

      // 9. CONDICIONES Y POLÍTICAS
      if (y > pageHeight - 120) { doc.addPage(); y = 30; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Información del Servicio y Recomendaciones', margin, y);
      y += 10;

      const fullConditions = [
        {
          title: "PAGO DEL SERVICIO",
          items: [
            "El saldo pendiente se pagará en su totalidad el día del evento. Se podrá cancelar en efectivo o mediante transferencia a las cuentas autorizadas (Nequi/Daviplata: 3002596935).",
            "El pago correspondiente debe ser realizado al Gestor asignado ANTES de dar inicio al servicio.",
            "Sin excepción alguna, el servicio no podrá dar inicio si el saldo pendiente no ha sido cancelado en su totalidad."
          ]
        },
        {
          title: "CANCELACIÓN",
          items: [
            "En caso de necesitar cancelar el servicio, es necesario hacerlo con un mínimo de 2 días de anticipación. De lo contrario, se deberá asumir el 35% del valor total del servicio.",
            "Si el servicio es cancelado después de haber realizado el abono, NO se realizarán devoluciones debido a costos administrativos y de reserva."
          ]
        },
        {
          title: "APLAZAMIENTO",
          items: [
            "En caso de que el servicio sea aplazado, la reserva se mantendrá únicamente por un plazo máximo de un (1) mes. De lo contrario, se considerará como una cancelación.",
            "La reprogramación del servicio solo será posible si disponemos de disponibilidad para la nueva fecha solicitada."
          ]
        },
        {
          title: "TENER EN CUENTA (LOGÍSTICA)",
          items: [
            "Los datos del Gestor (nombre y cédula) podrán ser solicitados SOLAMENTE un día antes del servicio sin excepciones, ya que la programación se realiza basada en la disponibilidad del personal en esa fecha.",
            "En caso de que el Gestor llegue tarde, se repondrá el tiempo perdido. Si no es posible debido al horario, se descontarán $5.000 por cada media hora de retraso, cubriendo la nómina del Gestor."
          ]
        },
        {
          title: "INCONVENIENTES Y RECLAMOS",
          items: [
            "La empresa se compromete a garantizar la entrega de todos los elementos descritos en este contrato.",
            "Cualquier inconformidad relacionada con la prestación del servicio deberá ser abordada y resuelta EN EL MOMENTO por el personal presente en el evento para dar solución inmediata."
          ]
        }
      ];

      doc.setFontSize(10);

      fullConditions.forEach((section) => {
        // Force Page Break for Specific Section
        if (section.title === "INCONVENIENTES Y RECLAMOS") {
          doc.addPage(); y = 30;
        } else if (y > pageHeight - 40) {
          doc.addPage(); y = 30;
        }

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...THEME.TEXT_MAIN);
        doc.text(section.title, margin, y);
        y += 7; // More space after title

        // Items
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.TEXT_SUB);

        section.items.forEach(item => {
          // Fix Overflow: Reduce width by extra 10 units to accommodate indent
          const splitItem = doc.splitTextToSize(`• ${item}`, pageWidth - (margin * 2) - 10);

          if (y + (splitItem.length * 6) > pageHeight - 25) {
            doc.addPage(); y = 30;
            doc.setFont('helvetica', 'bold'); // Reset font if needed logic was complex, but here simplistic is fine
            // We are in loop, so just continue
            doc.setFont('helvetica', 'normal');
          }

          doc.text(splitItem, margin + 5, y); // Indent 5
          y += (splitItem.length * 5) + 4; // Increased line height and paragraph spacing
        });

        y += 8; // More space between sections
      });

      y += 5;

      // IMPORTANT WARNING
      if (y > pageHeight - 45) { doc.addPage(); y = 30; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(220, 20, 60); // Crimson Red
      doc.text('¡IMPORTANTE!', pageWidth / 2, y, { align: 'center' });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...THEME.TEXT_MAIN);
      const warningText = "Cualquier servicio, equipo o indicación que NO esté especificada explícitamente dentro de este contrato no tendrá derecho a reclamos ni devoluciones. Solo se cumplirá estrictamente con los ítems y servicios pactados en este documento.";

      const splitWarning = doc.splitTextToSize(warningText, pageWidth - (margin * 2));
      doc.text(splitWarning, pageWidth / 2, y, { align: 'center' });

      y += (splitWarning.length * 5) + 10;

      // 10. CIERRE
      if (y > pageHeight - 40) { doc.addPage(); y = 30; }
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(...THEME.TEXT_LEGAL);
      doc.text(`Este contrato se rige por las leyes de la República de Colombia.\nPara constancia se firma en Bogotá D.C. el ${new Date().toLocaleDateString('es-CO')}.`, margin, y);
      y += 50;

      // 11. FIRMAS
      if (y > pageHeight - 60) { doc.addPage(); y = 60; }

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);

      // Client
      doc.line(margin, y, margin + 70, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('EL CLIENTE', margin, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...THEME.TEXT_SUB);
      doc.text(`Nombre: ${quo.client?.name || ''}`, margin, y + 10);
      doc.text(`Cédula: ${quo.client?.id || ''}`, margin, y + 15);

      // Provider
      if (signatureData) {
        // Rotating 90 degrees
        // Moving X far RIGHT because rotation pivots leftwards
        // Moving Y down closer to the line
        doc.addImage(signatureData, 'JPEG', pageWidth - margin - 20, y - 30, 40, 30, null, 'NONE', 90);
      }
      doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...THEME.TEXT_MAIN);
      doc.text('EL PROVEEDOR', pageWidth - margin - 70, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Nombre: Sharon Nicolle Rivera Tocasuche', pageWidth - margin - 70, y + 10);
      doc.text('Cédula: 1024488302', pageWidth - margin - 70, y + 15);

      // Commercial Name (No Color Accent)
      doc.setTextColor(...THEME.TEXT_SUB);
      doc.text('Nombre comercial: NEXXA', pageWidth - margin - 70, y + 20);

      // 12. FOOTER
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...THEME.TEXT_LEGAL);
        doc.text('NEXXA · Producción de eventos', margin, pageHeight - 10);
        doc.text(`${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Output
      const pdfData = doc.output('arraybuffer');
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Timestamp added to bust cache
      link.setAttribute('download', `CONTRATO_NEXXA_${contractClientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 500);

    } catch (err) {
      alert('Error en Cotización: ' + err.message);
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
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} `;
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
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} `;
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

          updated.totalValue = calculatedTotal;

          // Update Extra Hour Price Display
          if (pDuration > 0 && hasPhoto) {
            updated.extraHourPrice = djExtraPrice;
          } else {
            updated.extraHourPrice = djExtraPrice + (hasPhoto ? photoExtraPrice : 0);
          }

        } else if (pack === 'Personalizado') {
          // Calc logic for personalized... (preserve existing simple sum of extras)
          if (!updated.totalValue && !newEvent.id) { // Only if not set or new
            let sum = 0;
            currentExtrasList.forEach(ex => { if (selExtras[ex.id]) sum += ex.price; });
            updated.totalValue = sum;
          }
        }

        // Auto-calc Deposit
        if (updated.totalValue > 0 && !updated.deposit) {
          updated.deposit = Math.round((updated.totalValue * 0.3) / 1000) * 1000;
        }

        setNewEvent(updated);
      };

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
🎟️ *RESERVA (30%):* ${formatPeso(newEvent.deposit || (newEvent.totalValue * 0.3))}

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

            {/* SECCIÓN 1: CLIENTE */}
            <div className="form-section">
              <h3>1. Datos del Cliente</h3>
              <input required placeholder="Nombre Cliente" value={newEvent.clientName} onChange={e => updateEvent('clientName', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <input placeholder="WhatsApp Principal" value={newEvent.clientPhone} onChange={e => updateEvent('clientPhone', e.target.value)} type="tel" />
                <input placeholder="WhatsApp Secundario" value={newEvent.clientPhone2} onChange={e => updateEvent('clientPhone2', e.target.value)} type="tel" />
              </div>
            </div>

            {/* SECCIÓN 2: LOGÍSTICA (FECHA Y HORARIOS) */}
            <div className="form-section">
              <h3>2. Fecha y Horarios</h3>

              {/* Row 1: Date & Occasion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Fecha</label>
                  <input required type="date" value={newEvent.date} onChange={e => updateEvent('date', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Ocasión</label>
                  <input placeholder="Ej: Cumpleaños" value={newEvent.occasion} onChange={e => updateEvent('occasion', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Row 2: Guests & Extra Hour Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Invitados</label>
                  <input type="tel" inputMode="numeric" placeholder="#" value={newEvent.guestCount || ''} onChange={e => updateEvent('guestCount', e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px', display: 'block' }}>Valor Hora Extra ($)</label>
                  <input type="tel" inputMode="numeric" value={newEvent.extraHourPrice} onChange={e => updateEvent('extraHourPrice', e.target.value)} style={{ width: '100%', color: '#facc15', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* Row 2: Time Range (Compact & Fixed Layout) */}
              {/* Row 2: Time Range (Compact & Fixed Layout) */}
              {/* Logística Interna (Visible solo en MODO EVENTO) */}
              {isEventMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <TimeInput
                    label="Hora Inicio"
                    value={newEvent.startTime}
                    onChange={(val) => updateEvent('startTime', val)}
                  />
                  <TimeInput
                    label="Hora Fin"
                    value={newEvent.endTime}
                    onChange={(val) => updateEvent('endTime', val)}
                  />
                  <TimeInput
                    label="Materiales"
                    value={newEvent.materialsTime}
                    onChange={(val) => updateEvent('materialsTime', val)}
                  />
                  <TimeInput
                    label="Bodega"
                    value={newEvent.warehouseTime}
                    onChange={(val) => updateEvent('warehouseTime', val)}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <TimeInput
                    label="Hora Inicio"
                    value={newEvent.startTime}
                    onChange={(val) => updateEvent('startTime', val)}
                  />
                  <TimeInput
                    label="Hora Fin"
                    value={newEvent.endTime}
                    onChange={(val) => updateEvent('endTime', val)}
                  />
                </div>
              )}

              {/* SEPARATE SCHEDULING FOR PHOTOGRAPHY (IF APPLICABLE AND EVENT MODE) */}
              {(isEventMode && (newEvent.packName === 'Memories' || newEvent.packName === 'Celebration')) && (
                <div style={{ padding: '15px', background: 'rgba(255, 150, 0, 0.05)', borderRadius: '15px', border: '1px solid rgba(255, 150, 0, 0.2)', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#facc15' }}>
                    <IconCalendar size={14} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Fotografía (Franja diferente)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <TimeInput
                      label="Inicio Foto"
                      value={newEvent.photoStartTime}
                      onChange={(val) => updateEvent('photoStartTime', val)}
                    />
                    <TimeInput
                      label="Fin Foto"
                      value={newEvent.photoEndTime}
                      onChange={(val) => updateEvent('photoEndTime', val)}
                    />
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.65rem', opacity: 0.6, color: '#fff' }}>
                    * El fotógrafo suele ir por una franja de horas distinta a la del DJ.
                  </p>
                </div>
              )}

              {/* SEPARATE SCHEDULING FOR DECORATION (IF APPLICABLE AND EVENT MODE) */}
              {(isEventMode && newEvent.packName === 'Celebration') && (
                <div style={{ padding: '15px', background: 'rgba(188, 111, 241, 0.05)', borderRadius: '15px', border: '1px solid rgba(188, 111, 241, 0.2)', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary-purple)' }}>
                    <IconFlow size={14} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Decoración (Montaje)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <TimeInput
                      label="Inicio Decor"
                      value={newEvent.decorStartTime}
                      onChange={(val) => updateEvent('decorStartTime', val)}
                    />
                    <TimeInput
                      label="Fin Decor"
                      value={newEvent.decorEndTime}
                      onChange={(val) => updateEvent('decorEndTime', val)}
                    />
                  </div>
                </div>
              )}

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
                <input style={{ flex: 1 }} placeholder="Nombre y Apellido Gestor" value={newEvent.managerName} onChange={e => updateEvent('managerName', e.target.value)} />
              </div>

              {/* PHOTO DURATION INPUT (Clean) */}
              {(newEvent.packName === 'Memories' || newEvent.packName === 'Celebration') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#ccc', flex: 1 }}>⏱ Horas Servicio Fotografía:</label>
                  <input
                    type="number"
                    placeholder="Ej: 6"
                    value={newEvent.photoDuration || ''}
                    onChange={e => updateEvent('photoDuration', e.target.value)}
                    style={{ width: '80px', textAlign: 'center', marginBottom: 0 }}
                  />
                </div>
              )}

              {/* EXTRAS LIST (SIMPLIFIED & CLEAN) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '5px' }}>Adicionales Disponibles:</label>
                {getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount).map(extra => {
                  const isActive = !!(newEvent.selectedExtras && newEvent.selectedExtras[extra.id]);
                  return (
                    <div
                      key={extra.id}
                      onClick={() => updateEvent('toggleExtra', extra.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isActive ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer'
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
                        {/* Manual Makeup Counter if Active */}
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
            </div>

            {/* SECCIÓN 4: INDICACIONES Y EXPLICACIÓN MATERIAL */}
            {/* SECCIÓN 4: INDICACIONES Y EXPLICACIÓN MATERIAL (SOLO EN MODO EVENTO) */}
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
              <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>Abono Recibido</label>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0, 242, 255, 0.15)', color: 'var(--primary-cyan)', padding: '2px 8px', borderRadius: '6px', fontWeight: '900' }}>30% RESERVA</span>
                  </div>
                  <input required placeholder="$ 0" type="tel" inputMode="numeric" value={newEvent.deposit} onChange={e => updateEvent('deposit', e.target.value)} style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary-cyan)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' }}>Canal de Recepción</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'Nequi', color: '#ff007a' },
                      { id: 'Daviplata', color: '#ff4d4d' },
                      { id: 'Efectivo', color: '#4dff88' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateEvent('paymentMethod', m.id)}
                        style={{
                          padding: '12px 5px',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: newEvent.paymentMethod === m.id ? m.color : 'rgba(255,255,255,0.1)',
                          background: newEvent.paymentMethod === m.id ? `${m.color}22` : 'rgba(255,255,255,0.03)',
                          color: newEvent.paymentMethod === m.id ? m.color : 'rgba(255,255,255,0.4)',
                          fontSize: '0.65rem',
                          fontWeight: '900',
                          transition: 'all 0.2s'
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

      return (
        <div className="fade-in container detail-view" style={{ paddingBottom: '140px', background: '#050505', color: '#fff', fontSize: '13px' }}>
          {/* HEADER OPERATIVO */}
          <header style={{ padding: '20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setView('events')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
              <IconArrowLeft /> VOLVER
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Hoja de Misión Operativa</h2>
            </div>
            <button onClick={() => editEvent(evt)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '12px', color: '#fff' }}>
              <IconEdit />
            </button>
          </header>

          {/* 1. TOP INFO BAR (4 COLUMNS) */}
          <section style={{ padding: '0 15px 20px 15px' }}>
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, display: 'block', marginBottom: '8px' }}>LLEGADA A BODEGA</span>
                <span style={{ fontSize: '1rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>{evt.eventDetails?.warehouseTime || '00:00'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, display: 'block', marginBottom: '8px' }}>GESTOR OPERATIVO</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase' }}>{evt.logistics?.managerName || 'POR ASIGNAR'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, display: 'block', marginBottom: '8px' }}>VALOR HR EXTRA</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>{formatPeso(evt.financials?.extraHourPrice || 85000)}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, display: 'block', marginBottom: '8px' }}>FECHA SERVICIO</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--primary-purple)' }}>{evt.eventDetails?.date}</span>
              </div>
            </div>
          </section>

          {/* 2. CLIENT BOX */}
          <section style={{ padding: '0 15px 25px 15px' }}>
            <div style={{ border: '1.5px solid var(--primary-purple)', borderRadius: '12px', padding: '20px', background: 'rgba(157, 78, 221, 0.02)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '5px' }}>CLIENTE TITULAR / EVENTO</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '950', letterSpacing: '0.5px' }}>
                  {evt.client?.name?.toUpperCase()} <span style={{ opacity: 0.2, margin: '0 10px' }}>|</span> {evt.eventDetails?.occasion?.toUpperCase()}
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>WP: {evt.id?.replace('EVT', '')}</span>
              </div>
            </div>
          </section>

          {/* 3. LOCALIZATION TABLE */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', marginBottom: '15px' }}>LOCALIZACIÓN Y CRONOGRAMA</h4>
            <div style={{ border: '1px solid #1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                    {['ZONA / BARRIO', 'DIRECCIÓN EXACTA', 'HORARIO', 'DURACIÓN'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-cyan)', textAlign: 'left', borderRight: '1px solid #1a1a1a' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '15px 10px', fontSize: '0.8rem', borderRight: '1px solid #1a1a1a' }}>{evt.eventDetails?.neighborhood || 'N/A'}</td>
                    <td style={{ padding: '15px 10px', fontSize: '0.8rem', borderRight: '1px solid #1a1a1a' }}>{evt.eventDetails?.location || 'N/A'}</td>
                    <td style={{ padding: '15px 10px', fontSize: '0.8rem', borderRight: '1px solid #1a1a1a' }}>{formatT(evt.eventDetails?.startTime)} - {formatT(evt.eventDetails?.endTime)}</td>
                    <td style={{ padding: '15px 10px', fontSize: '0.8rem', fontWeight: '800' }}>{duration.toFixed(1)} HORAS</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evt.eventDetails?.location || ''} ${evt.eventDetails?.neighborhood || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '12px', color: 'var(--primary-cyan)', textDecoration: 'none', fontSize: '0.7rem', fontWeight: '900' }}
            >
              <IconLocation size={12} /> ABRIR EN GOOGLE MAPS
            </a>
          </section>

          {/* 4. MATERIAL TABLE */}
          <section style={{ padding: '0 15px 35px 15px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', marginBottom: '15px' }}>MATERIAL A CARGO E INVENTARIO</h4>
            <div style={{ border: '1px solid #1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'left', width: '60%' }}>ITEM / EQUIPO</th>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'center', borderLeft: '1px solid #1a1a1a' }}>CANTIDAD</th>
                    <th style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '950', color: 'var(--primary-purple)', textAlign: 'right', borderLeft: '1px solid #1a1a1a' }}>ÁREA ASIGNADA</th>
                  </tr>
                </thead>
                <tbody>
                  {(evt.logistics?.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #111', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '12px 10px', fontSize: '0.75rem', fontWeight: '700' }}>{item.name?.toUpperCase()}</td>
                      <td style={{ padding: '12px 10px', fontSize: '0.75rem', textAlign: 'center', opacity: 0.6, borderLeft: '1px solid #111' }}>{item.quantity || 1}</td>
                      <td style={{ padding: '12px 10px', fontSize: '0.65rem', fontWeight: '900', textAlign: 'right', opacity: 0.4, borderLeft: '1px solid #111' }}>{item.area || 'DJ'}</td>
                    </tr>
                  ))}
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

          {/* ACTION BUTTONS (UPDATED) */}
          <div style={{ padding: '0 15px 50px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

            {/* PDF DOWNLOADS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button onClick={() => generateMissionPDF(evt, 'GENERAL')} style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem', fontWeight: '900', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <IconPDF size={18} /> GRAL
              </button>
              <button onClick={() => generateMissionPDF(evt, 'DJ')} style={{ padding: '15px', borderRadius: '15px', background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', color: '#facc15', fontSize: '0.7rem', fontWeight: '900', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <IconPDF size={18} /> DJ
              </button>
              <button onClick={() => generateMissionPDF(evt, 'PHOTO')} style={{ padding: '15px', borderRadius: '15px', background: 'rgba(188, 111, 241, 0.1)', border: '1px solid rgba(188, 111, 241, 0.2)', color: '#bc6ff1', fontSize: '0.7rem', fontWeight: '900', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <IconPDF size={18} /> FOTO
              </button>
            </div>

            <button onClick={() => toggleFlowStep(evt.id, 'clientPaid')} style={{ padding: '18px', borderRadius: '15px', background: evt.logistics?.flow?.clientPaid ? '#22c55e' : 'var(--primary-purple)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: '950', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', width: '100%' }}>
              {evt.logistics?.flow?.clientPaid ? 'COBRO CONFIRMADO' : 'CONFIRMAR RECAUDO'}
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
      .filter(e => e.status === 'CONFIRMED')
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

        {
          eventSubTab === 'list' && (
            <div className="execution-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {confirmedEvents.length === 0 ? (
                <div className="empty-state" style={{ padding: '100px 0', opacity: 0.2, textAlign: 'center', fontWeight: '800', letterSpacing: '2px' }}>NO HAY EVENTOS CONFIRMADOS</div>
              ) : (
                confirmedEvents.map(evt => (
                  <div key={evt.id} className="execution-card" onClick={() => { setSelectedEventId(evt.id); setView('detail'); }} style={{
                    padding: '30px',
                    borderRadius: '38px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.01)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--brand-gradient)' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--primary-cyan)', background: 'rgba(0, 242, 255, 0.08)', padding: '4px 10px', borderRadius: '8px', letterSpacing: '1px' }}>{evt.id}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.25 }}>{evt.eventDetails?.date}</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#fff' }}>{evt.client.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', opacity: 0.4, fontSize: '0.8rem', fontWeight: '600' }}>
                          <IconLocation size={14} />
                          <span>{evt.eventDetails?.location || 'Por definir'}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{evt.eventDetails?.startTime}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: '800', opacity: 0.2, letterSpacing: '1px', marginTop: '4px', marginBottom: '8px' }}>START TIME</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); generateMissionPDF(evt); }}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: 'var(--primary-cyan)',
                            fontSize: '0.55rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'flex-end',
                            width: '100%'
                          }}
                        >
                          <IconPDF size={12} /> ORDEN
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '35px' }}>
                      {['Staff', 'Bodega', 'Show', 'Cierre'].map((step, i) => {
                        const isActive = i === 0; // Example logic placeholder
                        return (
                          <div key={step} style={{ flex: 1 }}>
                            <div style={{ height: '3px', borderRadius: '10px', background: isActive ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.05)', marginBottom: '10px', boxShadow: isActive ? '0 0 10px rgba(0, 242, 255, 0.4)' : 'none' }}></div>
                            <div style={{ fontSize: '0.55rem', fontWeight: isActive ? '900' : '700', opacity: isActive ? 1 : 0.2, letterSpacing: '0.5px', textAlign: 'center', textTransform: 'uppercase' }}>{step}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
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
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Cotizaciones <span style={{ opacity: 0.3 }}>Activas</span></h2>
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
                display: 'flex',
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

                {/* ACTION BUTTONS SCROLL ROW */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '5px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {/* CONFIRM BUTTON */}
                  {quo.status === 'SENT' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); approveQuotation(quo); }}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '10px 16px',
                          fontSize: '0.65rem',
                          background: 'var(--success-green)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: '900',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <IconCheck size={12} /> ABONO
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Marcar este lead como Venta Perdida?')) updateQuotationStatus(quo.id, 'LOST'); }}
                        style={{
                          padding: '10px',
                          background: 'rgba(255, 56, 96, 0.1)',
                          color: '#ff3860',
                          border: '1px solid rgba(255, 56, 96, 0.2)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          minWidth: '40px'
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </>
                  )}

                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                  {/* TOOLS */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setWhatsappModalQuo(quo); }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '10px 14px',
                      background: 'rgba(37, 211, 102, 0.1)',
                      color: '#25d366',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '0.65rem',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <IconWhatsApp size={14} /> SEGUIMIENTO
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); generateQuotationPDF(quo); }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '10px 14px',
                      fontSize: '0.65rem',
                      background: 'rgba(0, 242, 255, 0.1)',
                      color: 'var(--primary-cyan)',
                      border: '1px solid var(--primary-cyan)',
                      borderRadius: '12px',
                      fontWeight: '800',
                      display: 'flex', alignItems: 'center', gap: '6px'
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
        {view === 'quotations' && renderQuotations()}
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
