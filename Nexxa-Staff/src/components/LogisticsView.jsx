import React, { useState, useMemo, useEffect } from 'react';
import { getHours, months, addMinutes } from '../utils/helpers';
import {
    IconBox, IconCamera, IconFlow, IconHome,
    IconCalendar, IconClock
} from './Icons';

const LogisticsView = ({ events }) => {
    // START: CALENDAR LOGIC
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [daysList, setDaysList] = useState([]);

    useEffect(() => {
        // Generate a 14-day window (3 days back, 10 days forward)
        const list = [];
        for (let i = -3; i <= 10; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            list.push(d);
        }
        setDaysList(list);
    }, []);

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const formatDateStr = (dateObj) => {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
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
        const targetDateStr = formatDateStr(selectedDate);

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
                    glow: 'rgba(0, 212, 255, 0.4)'
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
                    glow: 'rgba(250, 204, 21, 0.4)'
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
                    glow: 'rgba(188, 111, 241, 0.4)'
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
                    glow: 'rgba(255, 77, 77, 0.4)'
                });
            }
        });

        // Sort by Time (Late night logic: 00:00-05:00 counts as next chronological slot)
        return tasks.sort((a, b) => {
            const minA = getMinutes(a.time);
            const minB = getMinutes(b.time);
            const adjA = minA < 300 ? minA + 1440 : minA; // Threshold 5 AM
            const adjB = minB < 300 ? minB + 1440 : minB;
            return adjA - adjB;
        });

    }, [events, selectedDate]);

    // Format time for display (12h)
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return '--:--';
        const [h, m] = timeStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return { time: `${h12}:${String(m).padStart(2, '0')}`, period: ampm };
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

            {/* HEADER - GLASSY STYLE */}
            <div style={{ padding: '20px 20px 0 20px' }}>
                <h2 style={{
                    color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px'
                }}>
                    Agenda <span style={{ color: 'var(--primary-cyan)' }}>Logística</span>
                </h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.5, fontSize: '0.9rem', fontWeight: '500' }}>
                    {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </p>
            </div>

            {/* HORIZONTAL CALENDAR STRIP */}
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '12px',
                padding: '25px 20px',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none',  // IE/Edge
            }}>
                <style>{`
                    /* Hide Scrollbar Chrome/Safari */
                    div::-webkit-scrollbar { display: none; }
                `}</style>

                {daysList.map((d, index) => {
                    const active = isSameDay(d, selectedDate);
                    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
                    const dayNum = d.getDate();

                    return (
                        <div
                            key={index}
                            onClick={() => setSelectedDate(d)}
                            style={{
                                minWidth: '65px',
                                height: '85px',
                                background: active ? 'linear-gradient(145deg, var(--primary-cyan), #0099bb)' : 'rgba(255,255,255,0.03)',
                                borderRadius: '40px', // Liquid pill shape
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                transform: active ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
                                boxShadow: active ? '0 10px 25px rgba(0, 212, 255, 0.3)' : 'none',
                                flexShrink: 0
                            }}
                        >
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 'bold',
                                color: active ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)',
                                marginBottom: '5px'
                            }}>
                                {dayName}
                            </span>
                            <span style={{
                                fontSize: '1.4rem', fontWeight: '900',
                                color: active ? '#000' : 'white'
                            }}>
                                {dayNum}
                            </span>
                            {active && <div style={{ width: '4px', height: '4px', background: '#000', borderRadius: '50%', marginTop: '5px' }}></div>}
                        </div>
                    );
                })}
            </div>

            {/* LIQUID TIMELINE */}
            <div style={{ padding: '10px 20px' }}>
                {dailyTasks.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'rgba(255,255,255,0.02)', borderRadius: '30px',
                        border: '1px dashed rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.2 }}>🏖️</div>
                        <h3 style={{ margin: 0, color: 'white', opacity: 0.8 }}>Día Libre</h3>
                        <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#666' }}>No hay movimientos logísticos para esta fecha.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Continuous Vertical Line */}
                        <div style={{
                            position: 'absolute', left: '74px', top: '25px', bottom: '50px',
                            width: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0
                        }}></div>

                        {dailyTasks.map((task, i) => {
                            const { time, period } = formatTimeDisplay(task.time);

                            return (
                                <div key={task.id} style={{
                                    display: 'flex', gap: '20px', marginBottom: '35px',
                                    position: 'relative', zIndex: 1
                                }}>
                                    {/* TIME COLUMN */}
                                    <div style={{
                                        width: '60px', textAlign: 'right', paddingTop: '5px'
                                    }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>{time}</div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>{period}</div>
                                    </div>

                                    {/* ICON DOT */}
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            background: '#111', // Match bg
                                            border: `2px solid ${task.color}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: `0 0 15px ${task.glow}`,
                                            zIndex: 2,
                                            color: task.color
                                        }}>
                                            {/* Small visual dot inside */}
                                            <div style={{ width: '8px', height: '8px', background: task.color, borderRadius: '50%' }}></div>
                                        </div>
                                    </div>

                                    {/* GLASS CARD */}
                                    <div style={{
                                        flex: 1,
                                        background: 'rgba(30, 30, 35, 0.6)',
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid rgba(255,255,255,0.08)`,
                                        borderRadius: '24px',
                                        padding: '18px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Color Accent Bar */}
                                        <div style={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                                            background: task.color, opacity: 0.8
                                        }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                                                letterSpacing: '1px', color: task.color,
                                                background: `${task.color}15`, padding: '4px 10px', borderRadius: '8px'
                                            }}>
                                                {task.category}
                                            </span>
                                            <span style={{ opacity: 0.5 }}>{task.icon}</span>
                                        </div>

                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                            {task.title}
                                        </h4>
                                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>
                                            {task.client}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#888' }}>
                                                <IconHome size={12} /> {task.location}
                                            </div>
                                            {task.subLocation && (
                                                <div style={{ fontSize: '0.75rem', color: '#666', paddingLeft: '20px' }}>
                                                    {task.subLocation}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

export default LogisticsView;
