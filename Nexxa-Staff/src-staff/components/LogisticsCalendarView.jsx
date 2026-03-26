import React, { useState, useMemo } from 'react';
import { 
  IconArrowLeft, 
  IconArrowRight, 
  IconCalendar, 
  IconClock, 
  IconUser,
  IconLocation
} from './Icons';
import { formatT, months } from '../utils/helpers';

const LogisticsCalendarView = ({ events = [], onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1).getDay();
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Days from previous month to fill the first week
    const prevDaysInMonth = new Date(year, month, 0).getDate();
    const prevMonthPadding = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      prevMonthPadding.push({ day: prevDaysInMonth - i, current: false, date: new Date(year, month - 1, prevDaysInMonth - i) });
    }
    
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    
    // Fill the rest with next month padding to make a square grid if desired, but 7-col grid is enough
    const totalCells = prevMonthPadding.length + currentMonthDays.length;
    const nextMonthPadding = [];
    const remaining = 42 - totalCells; // 6 rows of 7 days
    for (let i = 1; i <= remaining; i++) {
        nextMonthPadding.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return [...prevMonthPadding, ...currentMonthDays, ...nextMonthPadding];
  }, [currentDate]);

  const changeMonth = (offset) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(next);
    setSelectedDay(null);
  };

  const dayEvents = useMemo(() => {
    const map = {};
    events.forEach(evt => {
        const d = evt.eventDetails?.date;
        if (d) {
            if (!map[d]) map[d] = [];
            map[map[d].push(evt)];
        }
    });
    return map;
  }, [events]);

  const getEventsForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    return events.filter(e => e.eventDetails?.date === isoDate);
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="fade-in" style={{ padding: '20px', paddingBottom: '140px', color: '#fff', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '12px', borderRadius: '14px', color: '#fff', cursor: 'pointer' }}>
            <IconArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '950', margin: 0, letterSpacing: '-1.5px' }}>LOGÍSTICA</h2>
            <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0, fontWeight: '700', letterSpacing: '1px' }}>DISPONIBILIDAD Y AGENDA</p>
          </div>
        </div>
      </header>

      {/* MONTH SELECTOR */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'rgba(255,255,255,0.03)', 
        padding: '15px 20px', 
        borderRadius: '24px', 
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '20px'
      }}>
        <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><IconArrowLeft /></button>
        <span style={{ fontSize: '1.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {months[currentDate.getMonth()]} <span style={{ opacity: 0.3 }}>{currentDate.getFullYear()}</span>
        </span>
        <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><IconArrowRight /></button>
      </div>

      {/* CALENDAR GRID */}
      <div style={{ 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: '30px', 
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '20px',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '15px' }}>
          {weekDays.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: '900', opacity: 0.3, textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {calendarData.map((item, idx) => {
            const dateEvents = getEventsForDate(item.date);
            const isToday = new Date().toDateString() === item.date.toDateString();
            const isSelected = selectedDay && selectedDay.toDateString() === item.date.toDateString();
            const hasConflict = dateEvents.length > 0;

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDay(item.date)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  background: isSelected ? 'var(--primary-cyan)' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent'),
                  border: isToday ? '1px solid rgba(0, 242, 255, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: item.current ? 1 : 0.2,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? '950' : (hasConflict ? '900' : '600'), color: isSelected ? '#000' : (hasConflict ? '#fff' : '#ccc') }}>
                  {item.day}
                </span>
                {hasConflict && !isSelected && (
                    <div style={{ 
                        width: '4px', 
                        height: '4px', 
                        background: 'var(--primary-cyan)', 
                        borderRadius: '50%', 
                        marginTop: '4px',
                        boxShadow: '0 0 10px var(--primary-cyan)'
                    }}></div>
                )}
                {isSelected && dateEvents.length > 0 && (
                    <div style={{ position: 'absolute', top: '15%', right: '15%', background: '#000', color: '#fff', fontSize: '0.5rem', fontWeight: '950', width: '12px', height: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {dateEvents.length}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DAY DETAIL */}
      {selectedDay && (
        <div className="fade-in" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '950', margin: 0 }}>
              {selectedDay.getDate()} {months[selectedDay.getMonth()]}
            </h3>
            <span style={{ fontSize: '0.7rem', padding: '5px 12px', background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary-cyan)', borderRadius: '10px', fontWeight: '900' }}>
              {getEventsForDate(selectedDay).length} EVENTOS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {getEventsForDate(selectedDay).length > 0 ? getEventsForDate(selectedDay).map(evt => (
              <div key={evt.id} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.06)', 
                borderRadius: '24px', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>{evt.logistics?.packName || 'Plan Nexxa'}</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: '900' }}>{evt.client?.name || evt.clientName}</h4>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(24acc15, 0.1)', color: '#facc15', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconClock size={14} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '900' }}>{formatT(evt.eventDetails.startTime)} - {formatT(evt.eventDetails.endTime)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                    <IconLocation size={14} color="var(--primary-cyan)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                      {evt.eventDetails.neighborhood && evt.eventDetails.location 
                        ? `${evt.eventDetails.neighborhood} — ${evt.eventDetails.location}`
                        : (evt.eventDetails.neighborhood || evt.eventDetails.location || 'Ubicación por definir')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                    <IconUser size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{evt.logistics?.managerName || 'Sin asignar'}</span>
                  </div>
                </div>

                {/* SUB-SCHEDULES BREAKDOWN */}
                <div style={{ 
                  marginTop: '5px', 
                  paddingTop: '10px', 
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {evt.eventDetails.photoStartTime && (
                    <div style={{ fontSize: '0.65rem', padding: '4px 8px', background: 'rgba(255,150,0,0.1)', color: '#facc15', borderRadius: '8px', border: '1px solid rgba(255,150,0,0.2)' }}>
                      📸 <b>FOTO:</b> {formatT(evt.eventDetails.photoStartTime)}-{formatT(evt.eventDetails.photoEndTime)}
                    </div>
                  )}
                  {evt.eventDetails.decorStartTime && (
                    <div style={{ fontSize: '0.65rem', padding: '4px 8px', background: 'rgba(188,111,241,0.1)', color: '#bc6ff1', borderRadius: '8px', border: '1px solid rgba(188,111,241,0.2)' }}>
                      🎈 <b>DECOR:</b> {formatT(evt.eventDetails.decorStartTime)}-{formatT(evt.eventDetails.decorEndTime)}
                    </div>
                  )}
                  {evt.eventDetails.camStartTime && (
                    <div style={{ fontSize: '0.65rem', padding: '4px 8px', background: 'rgba(0,242,255,0.1)', color: '#00f2ff', borderRadius: '8px', border: '1px solid rgba(0,242,255,0.2)' }}>
                      📹 <b>360:</b> {formatT(evt.eventDetails.camStartTime)}-{formatT(evt.eventDetails.camEndTime)}
                    </div>
                  )}
                  {evt.eventDetails.avStartTime && (
                    <div style={{ fontSize: '0.65rem', padding: '4px 8px', background: 'rgba(255,56,96,0.1)', color: '#ff3860', borderRadius: '8px', border: '1px solid rgba(255,56,96,0.2)' }}>
                      📺 <b>AV:</b> {formatT(evt.eventDetails.avStartTime)}-{formatT(evt.eventDetails.avEndTime)}
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                background: 'rgba(255,255,255,0.01)', 
                borderRadius: '30px', 
                border: '1px dashed rgba(255,255,255,0.1)',
                opacity: 0.4
              }}>
                <IconCalendar size={30} style={{ marginBottom: '15px' }} />
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Día disponible para eventos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsCalendarView;
