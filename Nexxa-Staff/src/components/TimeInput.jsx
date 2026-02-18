import React, { useState } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempHour, setTempHour] = useState('');
    const [tempMinute, setTempMinute] = useState('');
    const [tempPeriod, setTempPeriod] = useState('AM');

    const getDisplayTime = (val) => {
        if (!val || !val.includes(':')) return { h: '12', m: '00', period: 'AM' };
        let [hStr, mStr] = val.split(':');
        let h = parseInt(hStr || 0);
        let m = parseInt(mStr || 0);
        if (isNaN(h) || isNaN(m)) return { h: '12', m: '00', period: 'AM' };
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;

        return {
            h: String(h12).padStart(2, '0'),
            m: String(m).padStart(2, '0'),
            period
        };
    };

    const { h, m, period } = getDisplayTime(value);
    const isAM = period === 'AM';

    const handleEdit = () => {
        setTempHour(h);
        setTempMinute(m);
        setTempPeriod(period);
        setIsEditing(true);
    };

    const handleSave = () => {
        let hour24 = parseInt(tempHour);
        let minute = parseInt(tempMinute);

        if (isNaN(hour24) || isNaN(minute)) {
            setIsEditing(false);
            return;
        }

        // Validar rangos
        if (hour24 < 1 || hour24 > 12) hour24 = 12;
        if (minute < 0 || minute > 59) minute = 0;

        // Redondear minutos a intervalos de 15
        minute = Math.round(minute / 15) * 15;
        if (minute === 60) {
            minute = 0;
            hour24 += 1;
        }

        // Convertir a formato 24h
        if (tempPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (tempPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        if (hour24 >= 24) hour24 = 0;

        const timeString = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)'}`,
                minHeight: '70px',
                gap: '6px'
            }}>
                <span style={{
                    fontSize: '0.5rem',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '1px'
                }}>
                    {label}
                </span>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                        type="number"
                        value={tempHour}
                        onChange={(e) => setTempHour(e.target.value)}
                        placeholder="12"
                        min="1"
                        max="12"
                        style={{
                            width: '40px',
                            padding: '4px',
                            fontSize: '1rem',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: '#fff'
                        }}
                    />
                    <span style={{ color: '#fff' }}>:</span>
                    <input
                        type="number"
                        value={tempMinute}
                        onChange={(e) => setTempMinute(e.target.value)}
                        placeholder="00"
                        min="0"
                        max="59"
                        style={{
                            width: '40px',
                            padding: '4px',
                            fontSize: '1rem',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: '#fff'
                        }}
                    />
                    <select
                        value={tempPeriod}
                        onChange={(e) => setTempPeriod(e.target.value)}
                        style={{
                            padding: '4px 6px',
                            fontSize: '0.8rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: '#fff'
                        }}
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '4px 12px',
                            fontSize: '0.7rem',
                            background: 'var(--primary-cyan)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ✓
                    </button>
                    <button
                        onClick={handleCancel}
                        style={{
                            padding: '4px 12px',
                            fontSize: '0.7rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleEdit}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '8px 10px',
                cursor: 'pointer',
                overflow: 'hidden',
                border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'}`,
                transition: 'all 0.2s ease',
                minHeight: '70px',
                userSelect: 'none'
            }}
        >
            {/* LABEL */}
            <span style={{
                fontSize: '0.5rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '1px',
                marginBottom: '4px'
            }}>
                {label}
            </span>

            {/* CLOCK DISPLAY */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: '#fff'
            }}>
                <span style={{
                    fontSize: '1.4rem',
                    fontWeight: '300',
                    lineHeight: '1',
                    fontFamily: 'system-ui',
                    letterSpacing: '-0.5px'
                }}>
                    {h}
                </span>

                <span style={{
                    fontSize: '1rem',
                    fontWeight: '200',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.6
                }}>:</span>

                <span style={{
                    fontSize: '1.4rem',
                    fontWeight: '300',
                    lineHeight: '1',
                    fontFamily: 'system-ui',
                    letterSpacing: '-0.5px'
                }}>
                    {m}
                </span>
            </div>

            {/* PERIOD PILL */}
            <div style={{
                marginTop: '4px',
                fontSize: '0.45rem',
                fontWeight: '800',
                color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: isAM ? 'rgba(0, 242, 255, 0.15)' : 'rgba(188, 111, 241, 0.15)',
                border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.4)' : 'rgba(188, 111, 241, 0.4)'}`,
                transition: 'all 0.2s ease'
            }}>
                {period}
            </div>
        </div>
    );
};

export default TimeInput;
