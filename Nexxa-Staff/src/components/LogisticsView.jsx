import React, { useState, useMemo } from 'react';
import { getHours, months, addMinutes, getClientName } from '../utils/helpers';
import {
    IconBox, IconCamera, IconFlow, IconHome,
    IconCalendar, IconClock, IconArrowLeft, IconArrowRight
} from './Icons';

const LogisticsView = ({ events, quotations = [], inventory = [], staffRates = {}, manualTasks = [], onSaveTask, onDeleteTask }) => {
    // START: CALENDAR LOGIC
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', time: '12:00', cat: 'OTROS' });

    // Helper to check if a day has any events OR pending quotes
    const { busyDays, pendingDays } = useMemo(() => {
        const busy = new Set();
        const pending = new Set();

        events.forEach(e => {
            if (e.eventDetails?.date && e.status !== 'CANCELLED') {
                busy.add(e.eventDetails.date);
            }
        });

        // Add Manual Tasks to busy days as well
        manualTasks.forEach(t => {
            if (t.date) busy.add(t.date);
        });

        quotations.forEach(q => {
            if (q.eventDetails?.date && q.status === 'SENT') {
                pending.add(q.eventDetails.date);
            }
        });
        return { busyDays: busy, pendingDays: pending };
    }, [events, quotations, manualTasks]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const CalendarGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);
        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isTodayDate = new Date();
            const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            const isToday = isTodayDate.getDate() === d && isTodayDate.getMonth() === month && isTodayDate.getFullYear() === year;

            const isBusy = busyDays.has(dateStr);
            const isPending = pendingDays.has(dateStr);
            const hasActivity = isBusy || isPending;

            days.push(
                <div key={d} className={`calendar-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(new Date(year, month, d))}
                    style={{
                        height: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%',
                        background: isSelected ? 'var(--primary-purple)' : 'transparent',
                        color: isSelected ? 'white' : (isToday ? 'var(--primary-cyan)' : 'white'),
                        fontWeight: isSelected || isToday ? 'bold' : 'normal', position: 'relative', transition: '0.2s'
                    }}
                >
                    <span style={{ fontSize: '0.9rem' }}>{d}</span>
                    {hasActivity && !isSelected && (
                        <div style={{
                            width: '4px', height: '4px',
                            background: isBusy ? 'var(--primary-cyan)' : '#888',
                            borderRadius: '50%', marginTop: '2px'
                        }}></div>
                    )}
                </div>
            );
        }
        return days;
    };

    const changeMonth = (delta) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };
    // END: CALENDAR LOGIC

    // Parse 'HH:mm' to minutes
    const getMinutes = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 9999;
        try {
            const [h, m] = timeStr.split(':').map(Number);
            if (isNaN(h) || isNaN(m)) return 9999;
            return h * 60 + m;
        } catch (e) { return 9999; }
    };

    // Derive Daily Equipment Summary
    const inventorySummary = useMemo(() => {
        const summary = {};
        const targetDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        const daysEvents = events.filter(e => (e.eventDetails?.date === targetDateStr) && e.status !== 'CANCELLED');

        daysEvents.forEach(evt => {
            const items = evt.logistics?.items || [];
            items.forEach(item => {
                const name = item.name;
                const qty = Number(item.qty) || 1;
                if (!summary[name]) {
                    summary[name] = { needed: 0, stock: 0 };
                    const invItem = inventory.find(i => i.name === name);
                    summary[name].stock = invItem ? invItem.total : 0;
                }
                summary[name].needed += qty;
            });
        });

        return Object.entries(summary).sort((a, b) => b[1].needed - a[1].needed);
    }, [events, selectedDate, inventory]);

    // Derive Tasks
    const dailyTasks = useMemo(() => {
        const tasks = [];
        const targetDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        // 1. CONFIRMED EVENTS
        const daysEvents = events.filter(e => (e.eventDetails?.date === targetDateStr) && e.status !== 'CANCELLED');

        daysEvents.forEach(evt => {
            const client = getClientName(evt);
            const loc = evt.eventDetails?.location || evt.location || '';
            const hood = evt.eventDetails?.neighborhood || evt.neighborhood || '';
            const pack = evt.logistics?.packName || 'Básico';
            const manager = evt.logistics?.managerName || 'Sin asignar';

            if (evt.eventDetails?.startTime || evt.startTime) tasks.push({
                id: `${evt.id}_dj_start`, time: evt.eventDetails?.startTime || evt.startTime,
                cat: 'DJ', title: 'Montaje Principal', client, loc: hood, sub: loc,
                icon: <IconBox size={18} />, color: '#00d4ff', glow: 'rgba(0, 212, 255, 0.5)',
                staff: manager
            });
            const photoStart = evt.eventDetails?.photoStartTime || evt.logistics?.rolesSchedule?.photographerStart || evt.photoStartTime;
            if (photoStart) tasks.push({
                id: `${evt.id}_photo_start`, time: photoStart,
                cat: 'FOTO', title: 'Cobertura Foto', client, loc: hood, sub: loc,
                icon: <IconCamera size={18} />, color: '#facc15', glow: 'rgba(250, 204, 21, 0.5)',
                staff: 'Por confirmar'
            });
            const decorStart = evt.eventDetails?.decorStartTime || evt.logistics?.rolesSchedule?.decorStart || evt.decorStartTime;
            if (decorStart) tasks.push({
                id: `${evt.id}_decor_start`, time: decorStart,
                cat: 'DECOR', title: 'Ambientación', client, loc: hood, sub: loc,
                icon: <IconFlow size={18} />, color: '#bc6ff1', glow: 'rgba(188, 111, 241, 0.5)',
                staff: 'Por confirmar'
            });
            if (evt.eventDetails?.endTime || evt.endTime) {
                const rawEndTime = evt.eventDetails?.endTime || evt.endTime;
                const pickupTime = addMinutes(rawEndTime, 120);
                tasks.push({
                    id: `${evt.id}_end`, time: pickupTime,
                    cat: 'RECOGIDA', title: 'Desmontaje Total', client, loc: hood, sub: loc,
                    icon: <IconHome size={18} />, color: '#ff4d4d', glow: 'rgba(255, 77, 77, 0.5)',
                    staff: manager
                });
            }
        });

        // 2. PENDING QUOTATIONS (Provisional)
        const daysQuotes = quotations.filter(q => (q.eventDetails?.date === targetDateStr) && q.status === 'SENT');

        daysQuotes.forEach(quo => {
            tasks.push({
                id: `quo_${quo.id}`,
                time: quo.eventDetails?.startTime,
                cat: 'PENDIENTE', // Cotización
                title: 'Posible Evento' + (quo.eventDetails?.occasion ? ': ' + quo.eventDetails.occasion : ''),
                client: (quo.client?.name || 'Prospecto') + ' (Cotización)',
                loc: quo.eventDetails?.neighborhood || 'Por definir',
                sub: 'Esperando aprobación',
                icon: <IconCalendar size={18} />,
                color: '#888', // Gray for pending
                glow: 'rgba(255, 255, 255, 0.1)',
                isPending: true
            });
        });

        // 3. MANUAL TASKS
        const filteredManualTasks = manualTasks.filter(t => t.date === targetDateStr);
        filteredManualTasks.forEach(t => {
            tasks.push({
                id: t.id,
                time: t.time || '12:00',
                cat: t.cat || 'OTROS',
                title: t.title || 'Actividad',
                client: t.desc || 'Actividad Manual',
                loc: 'Manual',
                sub: '',
                icon: <IconFlow size={18} />,
                color: '#888',
                glow: 'rgba(255, 255, 255, 0.2)',
                isManual: true
            });
        });

        // 4. SMART PURCHASE LOGIC: Grouped Weekend Prep & Individual rems
        const dayOfWeek = selectedDate.getDay(); // 0: Sun, 1: Mon, ..., 4: Thu
        const targetDateStrTomorrow = (() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

        // FUNCTION TO DETECT DECOR
        const isDecorEvent = (e) => e.status !== 'CANCELLED' && (e.logistics?.packName === 'Celebration' || (e.eventDetails?.decorStartTime && e.eventDetails?.decorStartTime !== ''));

        if (dayOfWeek === 4) { // THURSDAY: Mega-recordatorio para el bloque de fin de semana (Vie, Sab, Dom)
            const weekendDates = [1, 2, 3].map(offset => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + offset);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            });

            const weekendEvents = events.filter(e => weekendDates.includes(e.eventDetails?.date) && isDecorEvent(e));

            if (weekendEvents.length > 0) {
                tasks.push({
                    id: `weekend_bulk_buy_${targetDateStr}`,
                    time: '09:30',
                    cat: 'MEGA COMPRAS',
                    title: `Comprar Globos/Material (${weekendEvents.length} Eventos)`,
                    client: `IDs: ${weekendEvents.map(e => e.id?.split('-').slice(0, 3).join('-') || 'EVT').join(' | ')}`,
                    loc: 'Centro / Bodega',
                    sub: `Destinación: ${weekendEvents.length > 3 ? '6' : '4'} Horas`,
                    icon: <IconBox size={18} />,
                    color: '#ff007a',
                    glow: 'rgba(255, 0, 122, 0.5)',
                    staff: 'Logística'
                });
            }
        } else {
            // Para otros días, compra individual si el evento es mañana Y NO es parte del bloque de fin de semana (ya comprado el jueves)
            // Aunque para mayor seguridad, si no es jueves, simplemente recordamos lo del día siguiente si no es domingo (comprado jueves)
            const tomorrowEvents = events.filter(e => e.eventDetails?.date === targetDateStrTomorrow && isDecorEvent(e));

            // Si hoy es Viernes o Sábado, no recordamos para mañana porque ya se compró el Jueves (según la lógica del usuario)
            const isWeekendBuyAlreadyDone = dayOfWeek === 5 || dayOfWeek === 6;

            if (tomorrowEvents.length > 0 && !isWeekendBuyAlreadyDone) {
                tomorrowEvents.forEach(evt => {
                    tasks.push({
                        id: `${evt.id}_buy_materials`,
                        time: '09:30',
                        cat: 'COMPRAS',
                        title: 'Comprar Material Decoración',
                        client: `Evento: ${evt.id}`,
                        loc: 'Bodega / Proveedores',
                        sub: 'Destinación 4 horas',
                        icon: <IconBox size={18} />,
                        color: '#ff007a',
                        glow: 'rgba(255, 0, 122, 0.5)',
                        staff: 'Logística'
                    });
                });
            }
        }

        return tasks.sort((a, b) => {
            const minA = getMinutes(a.time);
            const minB = getMinutes(b.time);
            const adjA = minA < 300 ? minA + 1440 : minA;
            const adjB = minB < 300 ? minB + 1440 : minB;
            return adjA - adjB;
        });
    }, [events, quotations, selectedDate, manualTasks]);

    // Helpers
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr || !timeStr.includes(':')) return { time: '--:--', period: '' };
        let [hStr, mStr] = timeStr.split(':');
        let h = parseInt(hStr);
        let m = parseInt(mStr);
        if (isNaN(h) || isNaN(m)) return { time: '--:--', period: '' };
        const period = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return { time: `${h12}:${String(m).padStart(2, '0')}`, period };
    };

    const getHourLabel = (h) => {
        const visibleHour = h % 24;
        const period = visibleHour >= 12 ? 'PM' : 'AM';
        let h12 = visibleHour % 12;
        if (h12 === 0) h12 = 12;
        return { h12, period };
    };

    // SMART GRID LOGIC: Group free slots
    const scheduleChunks = useMemo(() => {
        const chunks = [];
        // Hours from 07 to 27 (3AM next day)
        for (let h = 7; h <= 27; h++) {
            // Find tasks for this hour
            const slotTasks = dailyTasks.filter(t => {
                const [th, tm] = t.time.split(':').map(Number);
                let targetH = th;
                if (targetH < 5) targetH += 24;
                return targetH === h;
            });

            const isBusy = slotTasks.length > 0;
            const type = isBusy ? 'busy' : 'free';

            // Special logic: Group FREE slots, but keep BUSY slots distinct per hour
            if (type === 'free') {
                const lastChunk = chunks[chunks.length - 1];
                if (lastChunk && lastChunk.type === 'free') {
                    lastChunk.endHour = h; // Extend last free chunk
                } else {
                    chunks.push({ type: 'free', startHour: h, endHour: h });
                }
            } else {
                // Busy slot always starts a new chunk (unless we decided to group events, but hourly split is better for grid)
                chunks.push({ type: 'busy', hour: h, tasks: slotTasks });
            }
        }
        return chunks;
    }, [dailyTasks]);

    return (
        <div className="fade-in notranslate" style={{ paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            {/* HEADER */}
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
                        {months[viewDate.getMonth()]} <span style={{ opacity: 0.5 }}>{viewDate.getFullYear()}</span>
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => changeMonth(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}><IconArrowLeft size={16} /></button>
                        <button onClick={() => changeMonth(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}><IconArrowRight size={16} /></button>
                    </div>
                </div>
                <div style={{ background: 'rgba(20,20,25,0.5)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px', opacity: 0.5 }}>
                        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '5px' }}>
                        <CalendarGrid />
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 20px 0px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Agenda del {selectedDate.getDate()}
                </h3>
                <button
                    onClick={() => setShowAddTaskModal(true)}
                    style={{ background: 'var(--primary-purple)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(188, 111, 241, 0.4)', cursor: 'pointer' }}
                >+</button>
            </div>

            {/* SMART GRID VIEW */}
            <div style={{ padding: '0 20px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '55px', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }}></div>

                {scheduleChunks.map((chunk, index) => {
                    if (chunk.type === 'free') {
                        // Determine label
                        const range = chunk.endHour - chunk.startHour;
                        // If only 1 hour free, show simple line
                        if (range === 0) {
                            const label = getHourLabel(chunk.startHour);
                            return (
                                <div key={`free-${index}`} style={{ display: 'flex', gap: '15px', minHeight: '40px' }}>
                                    <div style={{ width: '45px', textAlign: 'right', paddingTop: '16px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#333' }}>{label.h12} {label.period}</div>
                                    </div>
                                    <div style={{ flex: 1, borderTop: '1px dashed rgba(255,255,255,0.05)', marginTop: '25px' }}></div>
                                </div>
                            );
                        } else {
                            // Multiple hours free -> Collapsed Block
                            const startLabel = getHourLabel(chunk.startHour);
                            const endLabel = getHourLabel(chunk.endHour + 1); // +1 to imply duration end
                            return (
                                <div key={`free-${index}`} style={{ display: 'flex', gap: '15px', margin: '15px 0' }}>
                                    <div style={{ width: '45px' }}></div> {/* Empty time column */}
                                    <div style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        padding: '8px 12px', /* Reduced padding */
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px dashed rgba(255,255,255,0.08)',
                                        color: '#666', fontSize: '0.75rem' /* Reduced font size */
                                    }}>
                                        <span>⏳ Disp: {startLabel.h12} {startLabel.period} - {endLabel.h12} {endLabel.period}</span>
                                    </div>
                                </div>
                            );
                        }
                    } else {
                        // BUSY CHUNK
                        const label = getHourLabel(chunk.hour);
                        return (
                            <div key={`busy-${chunk.hour}`} style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ width: '45px', textAlign: 'right', paddingTop: '8px' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{label.h12} <span style={{ fontSize: '0.6rem' }}>{label.period}</span></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1, paddingTop: '0px' }}>
                                    {chunk.tasks.map(task => (
                                        <div key={task.id} style={{ position: 'relative', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#000', border: `2px solid ${task.color}`, boxShadow: `0 0 10px ${task.glow}`, marginTop: '6px' }}>
                                                <div style={{ width: '3px', height: '3px', background: task.color, borderRadius: '50%', margin: '3px auto' }}></div>
                                            </div>
                                            <div style={{ flex: 1, background: '#111', border: `1px solid ${task.color}40`, borderRadius: '12px', padding: '12px', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: task.color }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                            <div style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', color: task.color }}>{task.cat}</div>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: '950', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>
                                                                {(() => {
                                                                    const t = formatTimeDisplay(task.time);
                                                                    return `${t.time} ${t.period}`;
                                                                })()}
                                                            </div>
                                                            {task.isManual && (
                                                                <button
                                                                    onClick={() => onDeleteTask(task.id)}
                                                                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ff4d4d', opacity: 0.5, cursor: 'pointer', padding: '0 5px' }}
                                                                >✕</button>
                                                            )}
                                                        </div>
                                                        <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{task.title}</h4>
                                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>{task.client}</div>
                                                        {(task.loc || task.sub) && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                                                                {task.loc && (
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        📍 {task.loc}
                                                                    </div>
                                                                )}
                                                                {task.sub && (
                                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600', paddingLeft: '16px' }}>
                                                                        {task.sub}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {task.staff && (
                                                            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: task.color, fontWeight: '700', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', width: 'fit-content' }}>
                                                                👤 {task.staff}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ color: task.color, opacity: 0.8 }}>{task.icon}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* TASK MODAL */}
            {showAddTaskModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '350px', background: '#111', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', padding: '30px' }}>
                        <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>Nueva Actividad</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '800', display: 'block', marginBottom: '5px' }}>TITULO DE ACTIVIDAD</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Reunión Staff"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '800', display: 'block', marginBottom: '5px' }}>HORA</label>
                                    <input
                                        type="time"
                                        value={newTask.time}
                                        onChange={e => setNewTask({ ...newTask, time: e.target.value })}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '800', display: 'block', marginBottom: '5px' }}>CATEGORÍA</label>
                                    <select
                                        value={newTask.cat}
                                        onChange={e => setNewTask({ ...newTask, cat: e.target.value })}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: 'white', outline: 'none' }}
                                    >
                                        <option value="OTROS">Otros</option>
                                        <option value="REUNIÓN">Reunión</option>
                                        <option value="BODEGA">Bodega</option>
                                        <option value="PERSONAL">Personal</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={() => setShowAddTaskModal(false)}
                                    style={{ flex: 1, padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', border: 'none', color: '#666', fontWeight: '800', cursor: 'pointer' }}
                                >CANCELAR</button>
                                <button
                                    onClick={async () => {
                                        if (!newTask.title) return alert('Ponle un titulo');
                                        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                                        const ok = await onSaveTask({ ...newTask, date: dateStr });
                                        if (ok) {
                                            setShowAddTaskModal(false);
                                            setNewTask({ title: '', time: '12:00', cat: 'OTROS' });
                                        }
                                    }}
                                    style={{ flex: 1, padding: '15px', borderRadius: '15px', background: 'var(--primary-purple)', border: 'none', color: 'white', fontWeight: '900', boxShadow: '0 10px 20px rgba(188, 111, 241, 0.2)', cursor: 'pointer' }}
                                >GUARDAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EQUIPMENT SUMMARY SECTION */}
            {inventorySummary.length > 0 && (
                <div style={{ padding: '0 20px', marginTop: '40px' }}>
                    <div style={{ background: 'rgba(10,10,10,0.5)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '0.8rem', fontWeight: '950', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IconBox size={16} color="var(--primary-cyan)" /> Resumen de Equipos Necesarios
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            {inventorySummary.map(([name, data]) => {
                                const hasConflict = data.needed > data.stock;
                                return (
                                    <div key={name} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 15px', background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px', border: `1px solid ${hasConflict ? 'rgba(255,77,77,0.3)' : 'rgba(255,255,255,0.05)'}`
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: hasConflict ? '#ff4d4d' : '#fff' }}>{name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#666' }}>Stock disponible: {data.stock}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '950', color: hasConflict ? '#ff4d4d' : 'var(--primary-cyan)' }}>
                                                {data.needed}
                                            </div>
                                            {hasConflict && (
                                                <div style={{ fontSize: '0.55rem', color: '#ff4d4d', fontWeight: 'bold' }}>⚠️ SOBRE-USO</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ height: '50px' }}></div>
        </div>
    );
};

export default LogisticsView;
