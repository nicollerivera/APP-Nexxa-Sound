import React, { useState } from 'react';
import { months, parseFirestoreDate, formatPeso } from '../utils/helpers';

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

// Helpers are imported from helpers.js

const QuotationsView = ({
    quotations = [],
    onCreate,
    onEdit,
    onApprove,
    onMarkLost,
    onOpenWhatsApp,
    onGeneratePDF,
    onSettings // To navigate to settings (IconUser)
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Sorting logic (if not sorted by parent)
    const sortedQuotations = [...quotations].sort((a, b) => {
        const dateA = parseFirestoreDate(a.createdAt);
        const dateB = parseFirestoreDate(b.createdAt);
        if (dateA.getTime() === dateB.getTime()) return b.id.localeCompare(a.id);
        return dateB - dateA;
    });

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <IconAlertTriangle size={40} color="#ff3860" />
                <h3 style={{ marginTop: '20px', color: '#fff' }}>Error al cargar Cotizaciones</h3>
                <p style={{ opacity: 0.5, fontSize: '0.8rem', color: '#fff' }}>{error.message}</p>
            </div>
        );
    }

    // Calculate stats for the dashboard header
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
        <div className="fade-in container" style={{ paddingBottom: '140px', fontFamily: 'inherit' }}>
            <header style={{ padding: '30px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>Cotizaciones <span style={{ opacity: 0.3 }}>Activas</span></h2>
                    <small style={{ color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '1px', fontSize: '0.6rem' }}>GESTIÓN COMERCIAL</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={onCreate}
                        style={{ padding: '10px 18px', borderRadius: '14px', background: 'var(--brand-gradient)', border: 'none', color: '#000', fontSize: '0.7rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                    >
                        <IconPlus size={14} /> CREAR
                    </button>
                    <button
                        onClick={onSettings}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                        <IconUser size={18} />
                    </button>
                </div>
            </header>

            {/* DASHBOARD STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '15px', marginBottom: '35px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px', color: '#fff' }}>LEADS {(months[selectedMonth] || 'Mes').toUpperCase()}</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary-cyan)' }}>
                        {monthLeads}
                    </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px', color: '#fff' }}>CIERRES (VENTAS)</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--success-green)' }}>
                        {monthWon}
                    </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ opacity: 0.4, fontWeight: '900', letterSpacing: '1px', fontSize: '0.6rem', display: 'block', marginBottom: '5px', color: '#fff' }}>EFECTIVIDAD</small>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>
                        {effectiveness}%
                    </div>
                </div>
            </div>

            <div className="sales-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {sortedQuotations.filter(q => q && q.client && q.client.name).map(quo => (
                    <div key={quo.id} className="sales-list-item" onClick={() => onEdit && onEdit(quo)} style={{
                        padding: '28px',
                        borderRadius: '38px',
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer'
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
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.5, fontWeight: '500', color: '#fff' }}>
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
                                        onClick={(e) => { e.stopPropagation(); onApprove && onApprove(quo); }}
                                        style={{
                                            padding: '12px',
                                            fontSize: '1.2rem',
                                            background: 'var(--primary-purple)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            minWidth: '50px'
                                        }}
                                        title="Registrar Abono"
                                    >
                                        💰
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Marcar este lead como Venta Perdida?')) onMarkLost && onMarkLost(quo); }}
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
                                onClick={(e) => { e.stopPropagation(); onOpenWhatsApp && onOpenWhatsApp(quo); }}
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
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <IconWhatsApp size={14} /> SEGUIMIENTO
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onGeneratePDF && onGeneratePDF(quo); }}
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
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    cursor: 'pointer'
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
                ))}
                {quotations.length === 0 && !loading && (
                    <div className="empty-state" style={{ padding: '80px 0', opacity: 0.3, textAlign: 'center', color: '#fff' }}>No hay cotizaciones registradas.</div>
                )}
            </div>
        </div>
    );
};

export default QuotationsView;
