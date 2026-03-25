import React, { useState } from 'react';
import { months, parseFirestoreDate, formatPeso } from '../utils/helpers.js';

// --- ICONS (COPIED FOR VISUAL FIDELITY) ---
const IconPlus = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const IconUser = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const IconCheck = ({ size = 10 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconTrash = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
);
const IconWhatsApp = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7l1.1 1.1" /><path d="M12 12h.01" /><path d="M17 12c.8-1.5 1-3.5-.5-4l-3 1c-1 1-1.5 2-1 3.5.5 1.5.5 1.5 2 2.5s2.5.5 3-.5l-1.5-1.5" /></svg>
);
const IconFileText = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
);
const IconAlertTriangle = ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const IconDollar = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);

const QuotationsView = ({
    quotations = [],
    onCreate,
    onEdit,
    onApprove,
    onMarkLost,
    onOpenWhatsApp,
    onGeneratePDF,
    onSettings
}) => {
    const [showLost, setShowLost] = useState(false);
    const [selectedMonth] = useState(new Date().getMonth());
    const [selectedYear] = useState(new Date().getFullYear());

    // Sorting logic
    const sortedQuotations = [...quotations].sort((a, b) => {
        if (!a || !b) return 0;
        if (a.status === 'SENT' && b.status !== 'SENT') return -1;
        if (a.status !== 'SENT' && b.status === 'SENT') return 1;
        const dateA = parseFirestoreDate(a?.createdAt);
        const dateB = parseFirestoreDate(b?.createdAt);
        if (dateA && dateB && dateA.getTime && dateB.getTime && dateA.getTime() !== dateB.getTime()) return dateB - dateA;
        return (b.id || '').localeCompare(a.id || '');
    });

    // Filter logic
    const filteredList = sortedQuotations
        .filter(q => q && (q.client?.name || q.clientName))
        .filter(q => showLost ? q.status === 'LOST' : q.status === 'SENT');

    // Stats
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

    const effectiveness = monthLeads > 0 ? Math.round((monthWon / monthLeads) * 100) : 0;

    return (
        <div className="fade-in container" style={{ paddingBottom: '140px' }}>
            <header style={{ padding: '30px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>Ventas <span style={{ opacity: 0.3 }}>Nexxa</span></h2>
                    <small style={{ color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '1px', fontSize: '0.6rem' }}>GESTIÓN COMERCIAL</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={onCreate} style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--brand-gradient)', border: 'none', color: '#000', fontSize: '0.7rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <IconPlus size={14} /> CREAR
                    </button>
                    <button onClick={onSettings} style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                        <IconUser size={18} />
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>LEADS</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary-cyan)' }}>{monthLeads}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>CIERRES</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--success-green)' }}>{monthWon}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', fontSize: '0.6rem', display: 'block', marginBottom: '5px' }}>EFECT.</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>{effectiveness}%</div>
                </div>
            </div>

            {/* TOGGLE LOST/ACTIVE */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                    onClick={() => setShowLost(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: '15px', background: !showLost ? 'rgba(0, 242, 255, 0.1)' : 'transparent', border: `1px solid ${!showLost ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)'}`, color: !showLost ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer' }}
                >
                    ACTIVAS
                </button>
                <button
                    onClick={() => setShowLost(true)}
                    style={{ flex: 1, padding: '12px', borderRadius: '15px', background: showLost ? 'rgba(255, 56, 96, 0.1)' : 'transparent', border: `1px solid ${showLost ? '#ff3860' : 'rgba(255,255,255,0.1)'}`, color: showLost ? '#ff3860' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer' }}
                >
                    PERDIDAS
                </button>
            </div>

            <div className="sales-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {filteredList.length === 0 ? (
                    <div style={{ padding: '60px 0', textAlign: 'center', opacity: 0.2, fontWeight: '800', fontSize: '0.8rem' }}>
                        {showLost ? 'NO HAY VENTAS PERDIDAS' : 'NO HAY COTIZACIONES ACTIVAS'}
                    </div>
                ) : filteredList.map(quo => {
                    // ULTRA-PROTECCIÓN: Validar CADA cotización
                    try {
                        if (!quo || typeof quo !== 'object') return null;
                        if (!quo.id) return null;

                        // Validar que tenga nombre
                        const clientName = quo?.client?.name || quo?.clientName;
                        if (!clientName) {
                            console.warn("⚠️ Cotización sin nombre en renderizado:", quo.id);
                            return null; // No renderizar cotizaciones sin nombre
                        }

                        return (
                            <div key={quo.id} className="sales-list-item" onClick={() => onEdit && onEdit(quo)} style={{
                                padding: '16px', borderRadius: '24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden', cursor: 'pointer'
                            }}>
                                <div style={{ position: 'absolute', top: '15px', right: '-35px', width: '120px', height: '30px', background: quo.status === 'APPROVED' ? 'var(--success-green)' : (quo.status === 'LOST' ? '#ff3860' : 'var(--primary-cyan)'), transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', zIndex: 1 }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: '950', color: '#000', letterSpacing: '1px' }}>{quo.status}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '40px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{clientName}</h4>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.5, fontWeight: '500' }}>📅 {quo.eventDetails?.date} • {quo.logistics?.packName || 'Plan'}</p>
                                    </div>
                                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: 'var(--primary-cyan)' }}>{formatPeso(quo.financials?.totalValue || 0)}</div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', width: '100%', alignItems: 'center' }}>
                                    {quo.status === 'SENT' && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); onApprove && onApprove(quo); }} style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary-purple)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px', minWidth: '36px' }}><IconDollar size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Marcar este lead como Venta Perdida?')) onMarkLost && onMarkLost(quo); }} style={{ padding: '8px', background: 'rgba(255, 56, 96, 0.1)', color: '#ff3860', border: '1px solid rgba(255, 56, 96, 0.2)', borderRadius: '10px', minWidth: '36px' }}><IconTrash size={14} /></button>
                                        </>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onOpenWhatsApp && onOpenWhatsApp(quo); }} style={{ padding: '8px', background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: '10px', minWidth: '36px' }}><IconWhatsApp size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onGeneratePDF && onGeneratePDF(quo); }} style={{ padding: '8px', background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary-cyan)', border: '1px solid var(--primary-cyan)', borderRadius: '10px', minWidth: '36px' }}><IconFileText size={16} /></button>
                                </div>
                            </div>
                        );
                    } catch (err) {
                        console.error("Error rendering quotation:", quo?.id, err);
                        return (
                            <div key={quo?.id || Math.random()} style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255, 56, 96, 0.05)', border: '1px solid rgba(255, 56, 96, 0.2)', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff3860', fontSize: '0.7rem', fontWeight: '900' }}>
                                    <IconAlertTriangle size={14} /> ERROR DE DATOS
                                </div>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.6rem', opacity: 0.6 }}>ID: {quo?.id || 'Desconocido'}. La información de esta cotización está incompleta.</p>
                            </div>
                        );
                    }
                })}
            </div>
        </div>
    );
};

export default QuotationsView;
