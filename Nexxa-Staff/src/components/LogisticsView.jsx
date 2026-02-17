import React, { useState, useMemo } from 'react';
import { getHours, months, addMinutes } from '../utils/helpers';
import {
    IconBox, IconCamera, IconFlow, IconHome,
    IconCalendar, IconClock, IconArrowLeft, IconArrowRight
} from './Icons';

const LogisticsView = ({ events }) => {
    // START: CALENDAR LOGIC
    const [viewDate, setViewDate] = useState(new Date()); // Controls the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // Controls the specific day selected
    const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'

    // Helper to check if a day has any events
    const busyDays = useMemo(() => {
        const busy = new Set();
        events.forEach(e => {
            if (e.eventDetails?.date && e.status !== 'CANCELLED') {
                busy.add(e.eventDetails.date);
            }
        });
        return busy;
    }, [events]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        // We want Monday = 0, Sunday = 6
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const CalendarGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);

        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days of current month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
            const hasEvent = busyDays.has(dateStr);

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                        setSelectedDate(new Date(year, month, d));
                        setViewMode('list'); // Switch to list view when date is tapped
                    }}
                    style={{
                        height: '45px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--primary-purple)' : 'transparent',
                        color: isSelected ? 'white' : (isToday ? 'var(--primary-cyan)' : 'white'),
                        fontWeight: isSelected || isToday ? 'bold' : 'normal',
                        position: 'relative',
                        transition: '0.2s'
                    }}
                >
                    <span style={{ fontSize: '0.9rem' }}>{d}</span>
                    {hasEvent && !isSelected && (
                        <div style={{
                            width: '4px', height: '4px', background: 'var(--primary-cyan)',
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

    // Parse 'HH:mm' to minutes for sorting
    const getMinutes = (timeStr) => {
        if (!timeStr) return 9999;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Derive Tasks from Events
    const dailyTasks = useMemo(() => {
        const tasks = [];
        const targetDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        // Filter events for selected date & valid status
        const daysEvents = events.filter(e => {
            return (e.eventDetails?.date === targetDateStr) && e.status !== 'CANCELLED';
        });

        daysEvents.forEach(evt => {
            const client = evt.client?.name || evt.clientName || 'Cliente';
            const loc = evt.eventDetails?.location || evt.location || '';
            const hood = evt.eventDetails?.neighborhood || evt.neighborhood || '';
            const pack = evt.packName || evt.logistics?.packName || 'Básico';

            // 1. DJ / SOUND DELIVERY
            if (evt.eventDetails?.startTime || evt.startTime) {
                tasks.push({
                    id: `${evt.id}_dj_start`,
                    time: evt.eventDetails?.startTime || evt.startTime,
                    type: 'ENTREGA',
                    category: 'DJ & Sonido',
                    title: 'Montaje Principal',
                    client,
                    location: hood,
                    subLocation: loc || 'Ubicación no especificada',
                    details: `Paquete ${pack}`,
                    icon: <IconBox size={18} />,
                    color: '#00d4ff', // Cyan
                    glow: 'rgba(0, 212, 255, 0.5)'
                });
            }

            // 2. PHOTO DELIVERY
            const photoStart = evt.eventDetails?.photoStartTime || evt.logistics?.rolesSchedule?.photographerStart || evt.photoStartTime;
            if (photoStart) {
                tasks.push({
                    id: `${evt.id}_photo_start`,
                    time: photoStart,
                    type: 'INICIO',
                    category: 'Fotografía',
                    title: 'Cobertura Foto',
                    client,
                    location: hood,
                    subLocation: loc,
                    details: 'Servicio de Fotografía',
                    icon: <IconCamera size={18} />,
                    color: '#facc15', // Yellow
                    glow: 'rgba(250, 204, 21, 0.5)'
                });
            }

            // 3. DECOR DELIVERY
            const decorStart = evt.eventDetails?.decorStartTime || evt.logistics?.rolesSchedule?.decorStart || evt.decorStartTime;
            if (decorStart) {
                tasks.push({
                    id: `${evt.id}_decor_start`,
                    time: decorStart,
                    type: 'MONTAJE',
                    category: 'Decoración',
                    title: 'Ambientación',
                    client,
                    location: hood,
                    subLocation: loc,
                    details: 'Montaje Decoración',
                    icon: <IconFlow size={18} />,
                    color: '#bc6ff1', // Purple
                    glow: 'rgba(188, 111, 241, 0.5)'
                });
            }

            // 4. PICKUP (End of Event + 2 Hours)
            if (evt.eventDetails?.endTime || evt.endTime) {
                const rawEndTime = evt.eventDetails?.endTime || evt.endTime;
                const pickupTime = addMinutes(rawEndTime, 120); // +2 Hours

                tasks.push({
                    id: `${evt.id}_end`,
                    time: pickupTime,
                    type: 'LOGÍSTICA',
                    category: 'Recogida General',
                    title: 'Desmontaje Total',
                    client,
                    location: hood,
                    subLocation: loc,
                    details: 'Transporte y Bodega',
                    icon: <IconHome size={18} />,
                    color: '#ff4d4d', // Red
                    glow: 'rgba(255, 77, 77, 0.5)'
                });
            }
        });

        // Sort by Time
        return tasks.sort((a, b) => {
            const minA = getMinutes(a.time);
            const minB = getMinutes(b.time);
            const adjA = minA < 300 ? minA + 1440 : minA;
            const adjB = minB < 300 ? minB + 1440 : minB;
            return adjA - adjB;
        });

    }, [events, selectedDate]);

    // Format time for display (12h)
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return { time: '--:--', period: '' };
        const [h, m] = timeStr.split(':').map(Number);

        // Standard AM/PM logic
        let period = h >= 12 ? 'PM' : 'AM';

        let h12 = h % 12;
        if (h12 === 0) h12 = 12; // 0 -> 12

        return { time: `${h12}:${String(m).padStart(2, '0')}`, period };
    };

    return (
        <div className="fade-in notranslate" style={{ paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

            {/* 1. CALENDAR HEADER */}
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
                        {months[viewDate.getMonth()]} <span style={{ opacity: 0.5 }}>{viewDate.getFullYear()}</span>
                        <span style={{ fontSize: '0.6rem', verticalAlign: 'middle', background: '#00d4ff', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>v2.0</span>
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => changeMonth(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconArrowLeft size={16} />
                        </button>
                        <button onClick={() => changeMonth(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* 2. CALENDAR GRID */}
                <div style={{ background: 'rgba(20,20,25,0.5)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px', opacity: 0.5 }}>
                        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '5px' }}>
                        <CalendarGrid />
                    </div>
                </div>
            </div>

            {/* 3. VIEW TOGGLE & CONTENT */}
            <div style={{ padding: '0 20px 10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Agenda del {selectedDate.getDate()}
                </h3>

                {/* View Toggle (Hidden for now as user just wants list based on image)
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', display: 'flex' }}>
                    <button onClick={() => setViewMode('list')} ... >Lista</button>
                    <button onClick={() => setViewMode('grid')} ... >Grilla</button>
                </div>
                */}
            </div>

            <div style={{ padding: '0 20px' }}>
                {dailyTasks.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px',
                        background: 'rgba(255,255,255,0.02)', borderRadius: '20px',
                        border: '1px dashed rgba(255,255,255,0.1)'
                    }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Nada programado para hoy.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', marginTop: '10px' }}>
                        {/* Vertical Guide Line */}
                        <div style={{
                            position: 'absolute', left: '55px', top: '15px', bottom: '40px',
                            width: '1px', background: 'rgba(255,255,255,0.1)', zIndex: 0
                        }}></div>

                        {dailyTasks.map((task, i) => {
                            const { time, period } = formatTimeDisplay(task.time);

                            return (
                                <div key={task.id} style={{
                                    display: 'flex', gap: '15px', marginBottom: '20px',
                                    position: 'relative', zIndex: 1
                                }}>
                                    {/* TIME COLUMN */}
                                    <div style={{ width: '45px', textAlign: 'right', paddingTop: '4px' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'white' }}>{time}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{period}</div>
                                    </div>

                                    {/* NEON DOT */}
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: '#000',
                                            border: `2px solid ${task.color}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: `0 0 12px ${task.glow}`,
                                            zIndex: 2
                                        }}>
                                            <div style={{ width: '6px', height: '6px', background: task.color, borderRadius: '50%' }}></div>
                                        </div>
                                    </div>

                                    {/* CARD CONTENT - MATCHING USER IMAGE EXACTLY */}
                                    <div style={{
                                        flex: 1,
                                        background: '#111', // Dark solid bg
                                        border: `1px solid ${task.color}40`, // Colored border low opacity
                                        borderRadius: '16px',
                                        padding: '16px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                    }}>
                                        {/* Left Colored Accent Bar with Glow */}
                                        <div style={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                                            background: task.color,
                                            boxShadow: `2px 0 10px ${task.color}60`
                                        }}></div>

                                        <div style={{ paddingLeft: '8px' }}>
                                            <div style={{
                                                fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                                                color: task.color, marginBottom: '4px', letterSpacing: '0.5px'
                                            }}>
                                                {task.category}
                                            </div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                                {task.title}
                                            </h4>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#ccc', fontWeight: '500' }}>
                                                {task.client}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.6 }}>
                                                <div style={{ width: '6px', height: '6px', background: '#ff3860', borderRadius: '50%' }}></div>
                                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{task.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ height: '40px' }}></div>
        </div>
    );
};

export default LogisticsView;
