import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
    IconArrowLeft,
    IconUser,
    IconLogoNexxa,
    IconPlus,
    IconTrash,
    IconAlertTriangle
} from './Icons';
import { formatPeso, months } from '../utils/helpers';

const AccountingView = ({
    db,
    globalTx,
    events,
    quotations,
    setView,
    setShowAddExpenseModal // Prop to trigger modal in parent if needed, or we implement here
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthSelector, setShowMonthSelector] = useState(false);
    const [accountingTab, setAccountingTab] = useState('TESORERIA'); // TESORERIA | RESUMEN | METRICAS
    const [tradingTimeframe, setTradingTimeframe] = useState('W'); // H, D, W, M, Y

    // Marketing Allocations
    const [isEditingAds, setIsEditingAds] = useState(false);
    const [localAdsBuffer, setLocalAdsBuffer] = useState({});
    const [adAllocations, setAdAllocations] = useState({});

    // Editing Account Balance
    const [editingAccount, setEditingAccount] = useState(null); // 'Nequi', 'Daviplata', 'Efectivo'
    const [tempBalanceVal, setTempBalanceVal] = useState('');

    // Finance Modal States (Local)
    const [showFinanceModal, setShowFinanceModal] = useState(null); // 'IN' | 'OUT' | 'XFER'
    const [finType, setFinType] = useState('GENERAL'); // 'GENERAL' | 'EVENT'
    const [payingPartner, setPayingPartner] = useState(null); // Partner being liquidated

    // Scheduled Expenses (Operative Agenda)
    const [scheduledExpenses, setScheduledExpenses] = useState([]);

    // Fetch Scheduled Expenses
    React.useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(collection(db, "operative_agenda"), (snapshot) => {
            const liveExpenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduledExpenses(liveExpenses);
        });
        return () => unsubscribe();
    }, [db]);

    // Fetch Marketing Allocations
    React.useEffect(() => {
        if (!db) return;
        const allocId = `ALLOC-${selectedYear}-${selectedMonth}`;
        const unsubscribe = onSnapshot(doc(db, "marketing_allocations", allocId), (doc) => {
            if (doc.exists()) {
                setAdAllocations(doc.data().channels || {});
            } else {
                setAdAllocations({});
            }
        });
        return () => unsubscribe();
    }, [db, selectedMonth, selectedYear]);


    // --- LOGIC ---

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
        const dividendsOut = txs.filter(t => t.type === 'OUT' && t.category === 'DIVIDENDOS').reduce((acc, t) => acc + t.amount, 0);

        // El Profit Operativo es la utilidad ANTES de pagarle a los socios
        const operatingProfit = totalIn - (totalOut - dividendsOut);

        return {
            income: totalIn,
            expense: totalOut,
            balance: totalIn - totalOut,
            operatingProfit: operatingProfit,
            dividends: dividendsOut
        };
    };

    const stats = getMonthStats(filteredGlobalTx);
    const currentIncome = stats.income;
    const currentBalance = stats.balance; // Saldo real en bancos/caja
    const operatingProfit = stats.operatingProfit; // Base para liquidación

    const prevStats = getMonthStats(prevTx);
    const lastMonthBalance = prevStats.balance;

    const diff = lastMonthBalance === 0 ? 0 : ((currentBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100;

    // Estadísticas de categorías para el mes seleccionado
    const expenseByCat = filteredGlobalTx.filter(t => t.type === 'OUT').reduce((acc, t) => {
        const cat = t.category || 'VARIOS';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
    }, {});

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
                    <div
                        onClick={async () => {
                            if (currentBalance <= 0) return alert('No hay utilidades para distribuir.');
                            if (!window.confirm(`¿Deseas registrar la liquidación de ${formatPeso(currentBalance)} y dejar los saldos en 0?\n\nSe creará un registro de salida para cada socio según sus porcentajes.`)) return;

                            try {
                                const dist = [
                                    { name: '🏛️ NEXXA CORP (50%)', amount: currentBalance * 0.5, cat: 'LIQUIDACIÓN_CORP' },
                                    { name: '🟣 OPERATIVO JULI (20%)', amount: currentBalance * 0.2, cat: 'LIQUIDACIÓN_JULI' },
                                    { name: '💎 PATRIMONIO YO (30%)', amount: currentBalance * 0.3, cat: 'LIQUIDACIÓN_PATRIMONIO' }
                                ];

                                for (const item of dist) {
                                    const txId = `TX-DIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                                    await setDoc(doc(db, "globalTx", txId), {
                                        id: txId,
                                        desc: `Liquidación: ${item.name}`,
                                        amount: item.amount,
                                        method: 'Efectivo', // Defaulting to one method for zeroing, or we could split
                                        type: 'OUT',
                                        category: item.cat,
                                        date: new Date().toISOString().split('T')[0],
                                        createdAt: new Date().toISOString()
                                    });
                                }
                                alert('✅ Profit liquidado. Los saldos del mes ahora están en 0.');
                            } catch (err) {
                                console.error(err);
                                alert('Error al liquidar');
                            }
                        }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(188, 111, 241, 0.1) 100%)',
                            border: '1px solid rgba(0, 242, 255, 0.2)',
                            padding: '15px 20px',
                            borderRadius: '20px',
                            marginBottom: '15px',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ position: 'absolute', right: '-10px', top: '-20px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
                            <IconLogoNexxa size={100} />
                        </div>

                        {/* Left: Label + Amount */}
                        <div style={{ zIndex: 1 }}>
                            <small style={{ color: 'var(--primary-cyan)', fontWeight: '950', letterSpacing: '1px', fontSize: '0.55rem', display: 'block', marginBottom: '2px' }}>PROFIT OPERATIVO (BASE)</small>
                            <div style={{ fontSize: '1.8rem', fontWeight: '950', letterSpacing: '-1px', color: '#fff', lineHeight: 1 }}>
                                {formatPeso(operatingProfit)}
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

                    {/* REPARTICIÓN DE ACTIVOS (INDIVIDUAL LIQUIDATION) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                        {[
                            { label: 'NEXXA CORP (50%)', perc: 0.5, color: 'var(--primary-cyan)', icon: '🏛️', short: 'CORP' },
                            { label: 'OPERATIVO JULI (20%)', perc: 0.2, color: 'var(--primary-purple)', icon: '🟣', short: 'JULI' },
                            { label: 'PATRIMONIO YO (30%)', perc: 0.3, color: 'var(--primary-pink)', icon: '💎', short: 'PATRIMONIO' }
                        ].map(p => {
                            // Calculamos cuánto se le ha pagado YA a este socio en este mes
                            const alreadyPaid = filteredGlobalTx
                                .filter(t => t.type === 'OUT' && t.category === 'DIVIDENDOS' && t.desc.includes(p.label))
                                .reduce((acc, t) => acc + t.amount, 0);

                            // Lo que queda por pagar es su porcentaje del profit operativo menos lo ya pagado
                            const remaining = (operatingProfit * p.perc) - alreadyPaid;
                            const isFullyPaid = remaining <= 0 && operatingProfit > 0;

                            return (
                                <div
                                    key={p.label}
                                    onClick={() => {
                                        if (remaining <= 0) return alert('Este socio ya ha sido liquidado o no tiene saldo pendiente.');
                                        setPayingPartner({ ...p, remaining });
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'var(--glass-bg)',
                                        padding: '10px 15px',
                                        borderRadius: '14px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        cursor: remaining > 0 ? 'pointer' : 'default',
                                        opacity: isFullyPaid ? 0.5 : 1
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontSize: '0.9rem' }}>{p.icon}</div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#fff' }}>{p.label}</div>
                                                {isFullyPaid && <span style={{ fontSize: '0.5rem', color: 'var(--success-green)' }}>✅</span>}
                                            </div>
                                            <div style={{ width: '25px', height: '2px', background: p.color, borderRadius: '10px', marginTop: '2px' }}></div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '950', color: isFullyPaid ? 'var(--success-green)' : '#fff' }}>
                                            {isFullyPaid ? 'LIQUIDADO' : formatPeso(remaining)}
                                        </div>
                                        <small style={{ fontSize: '0.45rem', opacity: 0.3, fontWeight: '900' }}>
                                            {isFullyPaid ? 'PAGO COMPLETO' : 'CLIC PARA PAGAR'}
                                        </small>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* AGENDA OPERATIVA - GASTOS PROGRAMADOS (DYNAMIC) */}
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: '950', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>📅</span> Agenda Operativa
                            </h3>
                            <button
                                onClick={() => setShowAddExpenseModal(true)} // This needs to be implemented or passed
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
                                        const dateStr = `${String(day).padStart(2, '0')}/${(selectedMonth + 1).toString().padStart(2, '0')}`;

                                        // Lógica de ESTADO DINÁMICO
                                        const hasPayment = globalTx.some(tx => {
                                            const txDate = new Date(tx.createdAt);
                                            const isSameMonth = txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
                                            if (!isSameMonth || tx.type !== 'OUT') return false;

                                            // Comparación flexible
                                            const c1 = (expense.concept || expense.title || '').toLowerCase();
                                            const c2 = (tx.desc || '').toLowerCase();
                                            return c2.includes(c1) || c1.includes(c2);
                                        });

                                        let status = 'PENDIENTE';
                                        if (hasPayment) {
                                            status = 'PAGADO';
                                        } else {
                                            // Si no está pagado, verificamos si ya venció
                                            if (isCurrentMonth) {
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
                                                        {expense.concept || expense.title}
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
                                                    if (window.confirm('¿Eliminar este gasto recurrente?')) deleteDoc(doc(db, "operative_agenda", expense.id));
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
                                                        const current = tx.method || 'Efectivo';
                                                        let next = 'Nequi';
                                                        if (current === 'Nequi') next = 'Daviplata';
                                                        else if (current === 'Daviplata') next = 'Efectivo';
                                                        else next = 'Nequi';

                                                        if (window.confirm(`¿Corregir método a ${next}?`)) {
                                                            await updateDoc(doc(db, "globalTx", tx.id), { method: next });
                                                        }
                                                    }}
                                                    style={{ fontSize: '0.55rem', opacity: 0.6, cursor: 'pointer', borderBottom: '1px dotted rgba(255,255,255,0.3)' }}
                                                    title="Clic para corregir método"
                                                >
                                                    {tx.method || 'Efectivo'}
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
                                                if (window.confirm('¿Eliminar esta transacción definitivamente de la tesorería?')) {
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
                                                                value={localAdsBuffer[channel] ? new Intl.NumberFormat('es-CO').format(localAdsBuffer[channel]) : ''}
                                                                onChange={(e) => {
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
            )}

            {/* MODAL DE MÉTODO PARA LIQUIDACIÓN */}
            {payingPartner && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="fade-in" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '35px', padding: '30px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{payingPartner.icon}</div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '950' }}>Liquidar a {payingPartner.short}</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: '950', color: 'var(--primary-cyan)', marginBottom: '25px' }}>{formatPeso(payingPartner.remaining)}</div>

                        <p style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: '800', marginBottom: '20px' }}>SELECCIONA EL MÉTODO DE PAGO:</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            {['Efectivo', 'Nequi', 'Daviplata'].map(method => (
                                <button
                                    key={method}
                                    onClick={async () => {
                                        try {
                                            const txId = `TX-DIV-${Date.now()}-${payingPartner.short}`;
                                            await setDoc(doc(db, "globalTx", txId), {
                                                id: txId,
                                                desc: `Pago de Ganancias: ${payingPartner.label}`,
                                                amount: payingPartner.remaining,
                                                method: method,
                                                type: 'OUT',
                                                category: 'DIVIDENDOS',
                                                date: new Date().toISOString().split('T')[0],
                                                createdAt: new Date().toISOString()
                                            });
                                            alert(`✅ Liquidación de ${payingPartner.label} vía ${method} registrada.`);
                                            setPayingPartner(null);
                                        } catch (err) {
                                            console.error(err);
                                            alert('Error al procesar');
                                        }
                                    }}
                                    style={{
                                        padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)',
                                        background: 'rgba(255,255,255,0.03)', color: '#fff', fontWeight: '950', fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    Pagar con {method.toUpperCase()}
                                </button>
                            ))}
                            <button
                                onClick={() => setPayingPartner(null)}
                                style={{ marginTop: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountingView;
