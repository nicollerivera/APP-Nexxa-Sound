import React, { useState, useMemo } from 'react';
import { getHours, months, addMinutes } from '../utils/helpers';
import {
    IconCalendar, IconFlow, IconCamera, IconBox,
    IconHome, IconArrowRight, IconCheck
} from './Icons';

const LogisticsView = ({ events }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Parse 'HH:mm' to minutes for sorting
    const getMinutes = (timeStr) => {
        if (!timeStr) return 9999;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Derive Tasks from Events
    const dailyTasks = useMemo(() => {
        const tasks = [];

        // Filter events for selected date & valid status
        const daysEvents = events.filter(e => {
            return e.eventDetails?.date === selectedDate && e.status !== 'CANCELLED';
        });

        daysEvents.forEach(evt => {
            const client = evt.client?.name || evt.clientName || 'Cliente';
            const loc = evt.eventDetails?.location || evt.location || '';
            const hood = evt.eventDetails?.neighborhood || evt.neighborhood || '';
            const pack = evt.packName || evt.logistics?.packName || 'Básico';

            // 1. DJ / SOUND DELIVERY (Base Event Start)
            // Logic: Delivery is usually set to 'startTime' or slightly before. 
            // We use startTime as the key anchor.
            if (evt.eventDetails?.startTime || evt.startTime) {
                tasks.push({
                    id: `${evt.id}_dj_start`,
                    time: evt.eventDetails?.startTime || evt.startTime,
                    type: 'ENTREGA',
                    category: 'DJ',
                    title: 'Entrega DJ & Sonido',
                    client,
                    location: `${hood} - ${loc}`,
                    details: `Paquete ${pack}`,
                    icon: <IconBox />,
                    color: '#00d4ff' // Cyan
                });
            }

            // 2. PHOTO DELIVERY
            const photoStart = evt.eventDetails?.photoStartTime || evt.logistics?.rolesSchedule?.photographerStart || evt.photoStartTime;
            if (photoStart) {
                tasks.push({
                    id: `${evt.id}_photo_start`,
                    time: photoStart,
                    type: 'ENTREGA',
                    category: 'FOTO',
                    title: 'Inicio Fotografía',
                    client,
                    location: `${hood} - ${loc}`,
                    details: 'Servicio de Fotografía',
                    icon: <IconCamera />,
                    color: '#facc15' // Yellow
                });
            }

            // 3. DECOR DELIVERY
            const decorStart = evt.eventDetails?.decorStartTime || evt.logistics?.rolesSchedule?.decorStart || evt.decorStartTime;
            if (decorStart) {
                tasks.push({
                    id: `${evt.id}_decor_start`,
                    time: decorStart,
                    type: 'ENTREGA',
                    category: 'DECOR',
                    title: 'Inicio Decoración',
                    client,
                    location: `${hood} - ${loc}`,
                    details: 'Montaje Decoración',
                    icon: <IconFlow />,
                    color: '#bc6ff1' // Purple
                });
            }

            // 4. PICKUP (End of Event)
            // Usually we pickup everything at end time
            // 4. PICKUP (End of Event + 2 Hours Transport)
            if (evt.eventDetails?.endTime || evt.endTime) {
                const rawEndTime = evt.eventDetails?.endTime || evt.endTime;
                // Calculate Pickup Time = EndTime + 2 Hours (120 min)
                const pickupTime = addMinutes(rawEndTime, 120);

                tasks.push({
                    id: `${evt.id}_end`,
                    time: pickupTime,
                    type: 'RECOGIDA',
                    category: 'ALL',
                    title: 'Recogida General (+2h)',
                    client,
                    location: `${hood} - ${loc}`,
                    details: 'Finalizar Evento, Desmontar y Transportar',
                    icon: <IconHome />,
                    color: '#ff4d4d' // Red
                });
            }
        });

        // Sort by Time
        // Custom Sort: 05:00 to 23:59 goes first. 00:00 to 04:59 goes last (Late night).
        return tasks.sort((a, b) => {
            const minA = getMinutes(a.time);
            const minB = getMinutes(b.time);

            // Adjust for "Late Night" logistics (after midnight counts as 'after' evening)
            // Shift 00:00-05:00 to be > 24:00
            const adjA = minA < 300 ? minA + 1440 : minA; // Threshold 5 AM
            const adjB = minB < 300 ? minB + 1440 : minB;

            return adjA - adjB;
        });

    }, [events, selectedDate]);

    return (
        <div className="fade-in container">
            {/* Header / Date Picker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--primary-cyan)', margin: 0 }}>Agenda Logística</h2>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                        background: '#333', color: 'white', border: '1px solid #555',
                        padding: '8px 15px', borderRadius: '8px', fontSize: '1rem'
                    }}
                />
            </div>

            {/* Timeline */}
            <div className="timeline-container">
                {dailyTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <p>No hay movimientos logísticos programados para este día.</p>
                    </div>
                ) : (
                    dailyTasks.map((task, index) => (
                        <div key={task.id} className="timeline-item" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                            {/* Time Column */}
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px',
                                paddingTop: '5px'
                            }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>{task.time}</span>
                                <div style={{ width: '2px', flex: 1, background: '#333', marginTop: '10px' }}></div>
                            </div>

                            {/* Card Content */}
                            <div style={{
                                flex: 1,
                                background: `linear-gradient(90deg, ${task.color}15, rgba(30,30,40,0.5))`,
                                borderLeft: `4px solid ${task.color}`,
                                borderRadius: '10px',
                                padding: '15px',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                            <span style={{ color: task.color }}>{task.icon}</span>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{task.title}</h4>
                                        </div>
                                        <p style={{ margin: '0 0 5px 0', color: '#ccc', fontWeight: 'bold' }}>{task.client}</p>
                                        <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>📍 {task.location}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            background: task.color, color: 'black', padding: '4px 8px',
                                            borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold'
                                        }}>
                                            {task.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#888' }}>
                    <div style={{ width: 10, height: 10, background: '#00d4ff' }}></div> DJ/Sonido
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#888' }}>
                    <div style={{ width: 10, height: 10, background: '#facc15' }}></div> Fotografía
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#888' }}>
                    <div style={{ width: 10, height: 10, background: '#bc6ff1' }}></div> Decoración
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#888' }}>
                    <div style={{ width: 10, height: 10, background: '#ff4d4d' }}></div> Recogida
                </span>
            </div>
        </div>
    );
};

export default LogisticsView;
