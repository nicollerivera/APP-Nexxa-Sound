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

    // Default to 'grid' to show slots as requested, but user wants "La grilla siempre activa"
    // The user's mock looks like a list BUT they asked for the grid functionality (busy vs free).
    // Actually, the user says "necesito q la grilla siempre este activa". This usually means 
    // showing the hourly slots (7am, 8am...) regardless of whether there is an event or not.
    // The previous design (List) only showed times WITH events.
    // The new design (Grid/Hourly) needs to show ALL hours and place events in them.

    const [viewMode, setViewMode] = useState('grid'); // Forced to 'grid' logic

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
            const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
            const hasEvent = busyDays.has(dateStr);

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(new Date(year, month, d))}
                    style={{
                        height: '45px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--primary-purple)' : 'transparent',
                        color: isSelected ? 'white' : (isToday ? 'var(--primary-cyan)' : 'white'),
                        fontWeight: isSelected || isToday ? 'bold' : 'normal',
                        position: 'relative', transition: '0.2s'
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

        const daysEvents = events.filter(e => {
            return (e.eventDetails?.date === targetDateStr) && e.status !== 'CANCELLED';
        });

        daysEvents.forEach(evt => {
            const client = evt.client?.name || evt.clientName || 'Cliente';
            const loc = evt.eventDetails?.location || evt.location || '';
            const hood = evt.eventDetails?.neighborhood || evt.neighborhood || '';
            const pack = evt.packName || evt.logistics?.packName || 'Básico';

            // 1. DJ
            if (evt.eventDetails?.startTime || evt.startTime) {
                tasks.push({
                    id: `${evt.id}_dj_start`,
                    time: evt.eventDetails?.startTime || evt.startTime,
                    cat: 'DJ', title: 'Montaje Principal', client, loc: hood, sub: loc,
                    icon: <IconBox size={18} />, color: '#00d4ff', glow: 'rgba(0, 212, 255, 0.5)'
                });
            }
            // 2. PHOTO
            const photoStart = evt.eventDetails?.photoStartTime || evt.logistics?.rolesSchedule?.photographerStart || evt.photoStartTime;
            if (photoStart) {
                tasks.push({
                    id: `${evt.id}_photo_start`,
                    time: photoStart,
                    cat: 'FOTO', title: 'Cobertura Foto', client, loc: hood, sub: loc,
                    icon: <IconCamera size={18} />, color: '#facc15', glow: 'rgba(250, 204, 21, 0.5)'
                });
            }
            // 3. DECOR
            const decorStart = evt.eventDetails?.decorStartTime || evt.logistics?.rolesSchedule?.decorStart || evt.decorStartTime;
            if (decorStart) {
                tasks.push({
                    id: `${evt.id}_decor_start`,
                    time: decorStart,
                    cat: 'DECOR', title: 'Ambientación', client, loc: hood, sub: loc,
                    icon: <IconFlow size={18} />, color: '#bc6ff1', glow: 'rgba(188, 111, 241, 0.5)'
                });
            }
            // 4. PICKUP
            if (evt.eventDetails?.endTime || evt.endTime) {
                const rawEndTime = evt.eventDetails?.endTime || evt.endTime;
                const pickupTime = addMinutes(rawEndTime, 120);
                tasks.push({
                    id: `${evt.id}_end`,
                    time: pickupTime,
                    cat: 'RECOGIDA', title: 'Desmontaje Total', client, loc: hood, sub: loc,
                    icon: <IconHome size={18} />, color: '#ff4d4d', glow: 'rgba(255, 77, 77, 0.5)'
                });
            }
        });

        return tasks.sort((a, b) => {
            const minA = getMinutes(a.time);
            const minB = getMinutes(b.time);
            const adjA = minA < 300 ? minA + 1440 : minA;
            const adjB = minB < 300 ? minB + 1440 : minB;
            return adjA - adjB;
        });
    }, [events, selectedDate]);

    // Format time
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return { time: '--:--', period: '' };
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return { time: `${h12}:${String(m).padStart(2, '0')}`, period };
    };

    // GENERATE HOURLY SLOTS
    const timeSlots = useMemo(() => {
        // From 07:00 AM to 03:00 AM (next day)
        const slots = [];
        for (let i = 7; i <= 27; i++) {
            slots.push(i);
        }
        return slots;
    }, []);

    return (
        <div className="fade-in notranslate" style={{ paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

            {/* HEADER */}
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
                        {months[viewDate.getMonth()]} <span style={{ opacity: 0.5 }}>{viewDate.getFullYear()}</span>
                        <span style={{ fontSize: '0.6rem', verticalAlign: 'middle', background: '#00d4ff', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>v3.0</span>
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => changeMonth(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}><IconArrowLeft size={16} /></button>
                        <button onClick={() => changeMonth(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}><IconArrowRight size={16} /></button>
                    </div>
                </div>
                {/* CALENDAR */}
                <div style={{ background: 'rgba(20,20,25,0.5)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px', opacity: 0.5 }}>
                        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '5px' }}>
                        <CalendarGrid />
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 20px 10px 20px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Agenda del {selectedDate.getDate()}
                </h3>
            </div>

            {/* HOURLY GRID VIEW ALWAYS ACTIVE */}
            <div style={{ padding: '0 20px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '55px', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }}></div>

                {timeSlots.map(h => {
                    const visibleHour = h % 24;
                    const period = visibleHour >= 12 ? 'PM' : 'AM';
                    let h12 = visibleHour % 12;
                    if (h12 === 0) h12 = 12;
                    const label = `${h12} ${period}`;

                    // Filter tasks for this hour
                    const slotTasks = dailyTasks.filter(t => {
                        const [th, tm] = t.time.split(':').map(Number);
                        // Strict hour match. 07:00 -> 07, 07:59 -> 07.
                        // Late night: 01:00 task matches slot 25 (01:00 next day)
                        let targetH = th;
                        if (targetH < 5) targetH += 24; // 1am -> 25
                        return targetH === h;
                    });

                    const isBusy = slotTasks.length > 0;

                    return (
                        <div key={h} style={{ display: 'flex', gap: '15px', marginBottom: isBusy ? '20px' : '0', minHeight: isBusy ? 'auto' : '50px' }}>
                            {/* TIME COLUMN */}
                            <div style={{ width: '45px', textAlign: 'right', paddingTop: '10px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isBusy ? 'white' : '#444' }}>{h12} <span style={{ fontSize: '0.6rem' }}>{period}</span></div>
                            </div>

                            {/* CONTENT COLUMN */}
                            <div style={{ flex: 1, paddingBottom: isBusy ? '0' : '0', paddingTop: '5px', position: 'relative', zIndex: 1 }}>
                                {isBusy ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {slotTasks.map(task => (
                                            <div key={task.id} style={{
                                                position: 'relative',
                                                display: 'flex', gap: '15px', alignItems: 'flex-start'
                                            }}>
                                                {/* DOT */}
                                                <div style={{
                                                    width: '16px', height: '16px', borderRadius: '50%',
                                                    background: '#000', border: `2px solid ${task.color}`,
                                                    boxShadow: `0 0 10px ${task.glow}`, marginTop: '4px'
                                                }}>
                                                    <div style={{ width: '4px', height: '4px', background: task.color, borderRadius: '50%', margin: '4px auto' }}></div>
                                                </div>

                                                {/* CARD */}
                                                <div style={{
                                                    flex: 1, background: '#111', border: `1px solid ${task.color}40`,
                                                    borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden'
                                                }}>
                                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: task.color, boxShadow: `2px 0 10px ${task.color}60` }}></div>
                                                    <div style={{ paddingLeft: '8px' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: task.color, marginBottom: '4px' }}>{task.cat}</div>
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{task.title}</h4>
                                                        <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#ccc' }}>{task.client}</p>
                                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>📍 {task.loc}</div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '5px', color: 'white', textAlign: 'right' }}>{formatTimeDisplay(task.time).time} {formatTimeDisplay(task.time).period}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // EMPTY SLOT INDICATOR
                                    <div style={{
                                        height: '1px', width: '100%', background: 'rgba(255,255,255,0.03)',
                                        marginTop: '18px'
                                    }}></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ height: '50px' }}></div>
        </div>
    );
};

export default LogisticsView;
