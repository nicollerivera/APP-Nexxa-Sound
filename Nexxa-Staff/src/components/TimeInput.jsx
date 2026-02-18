import React, { useState } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    const [isEditing, setIsEditing] = useState(false);

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

    const handleTimeChange = (newH, newM, newPeriod) => {
        let hour24 = parseInt(newH);
        let minute = parseInt(newM);

        if (isNaN(hour24) || isNaN(minute)) return;
        if (hour24 < 1 || hour24 > 12) return;
        if (minute < 0 || minute > 59) return;

        // Redondear minutos a intervalos de 15
        minute = Math.round(minute / 15) * 15;
        if (minute === 60) {
            minute = 0;
            hour24 += 1;
        }

        // Convertir a formato 24h
        if (newPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (newPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        if (hour24 >= 24) hour24 = 0;

        const timeString = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
    };

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '6px 8px',
            border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'}`,
            minHeight: '55px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.45rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '0.5px'
            }}>
                {label}
            </span>

            {/* INPUTS INLINE */}
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <input
                    type="number"
                    value={h}
                    onChange={(e) => handleTimeChange(e.target.value, m, period)}
                    onFocus={() => setIsEditing(true)}
                    onBlur={() => setIsEditing(false)}
                    min="1"
                    max="12"
                    style={{
                        width: '32px',
                        padding: '3px',
                        fontSize: '1.1rem',
                        fontWeight: '300',
                        textAlign: 'center',
                        background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontFamily: 'system-ui'
                    }}
                />
                <span style={{
                    fontSize: '0.9rem',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.6
                }}>:</span>
                <input
                    type="number"
                    value={m}
                    onChange={(e) => handleTimeChange(h, e.target.value, period)}
                    onFocus={() => setIsEditing(true)}
                    onBlur={() => setIsEditing(false)}
                    min="0"
                    max="59"
                    style={{
                        width: '32px',
                        padding: '3px',
                        fontSize: '1.1rem',
                        fontWeight: '300',
                        textAlign: 'center',
                        background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontFamily: 'system-ui'
                    }}
                />
                <button
                    onClick={() => handleTimeChange(h, m, period === 'AM' ? 'PM' : 'AM')}
                    style={{
                        padding: '4px 8px',
                        fontSize: '0.6rem',
                        fontWeight: '800',
                        background: isAM ? 'rgba(0, 242, 255, 0.15)' : 'rgba(188, 111, 241, 0.15)',
                        border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.4)' : 'rgba(188, 111, 241, 0.4)'}`,
                        borderRadius: '8px',
                        color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        minWidth: '35px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {period}
                </button>
            </div>
        </div>
    );
};

export default TimeInput;
