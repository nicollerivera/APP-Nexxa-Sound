import React from 'react';

const TimeInput = ({ value, onChange, label }) => {

    // Helper to format for display (12h format)
    const getDisplayTime = (val) => {
        if (!val) return { time: '--:--', period: '' };
        let [h, m] = val.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return { time: '--:--', period: '' };

        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return {
            time: `${h12}:${String(m).padStart(2, '0')}`,
            period
        };
    };

    const { time, period } = getDisplayTime(value);

    return (
        <div style={{
            position: 'relative',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))',
            borderRadius: '24px',
            padding: '20px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            minHeight: '110px',
            overflow: 'hidden',
            transition: 'transform 0.2s',
            cursor: 'pointer'
        }}>
            {/* LABEL */}
            <label style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '800',
                letterSpacing: '1.5px',
                marginBottom: '5px'
            }}>
                {label}
            </label>

            {/* BIG TIME DISPLAY */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{
                    fontSize: '3.2rem',
                    fontWeight: '300', /* Thin font like iOS clock */
                    color: '#fff',
                    lineHeight: '1',
                    letterSpacing: '-1px',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {time}
                </span>
                <span style={{
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: period === 'AM' ? '#00d4ff' : '#bc6ff1',
                    textTransform: 'uppercase',
                    background: period === 'AM' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(188, 111, 241, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: period === 'AM' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'
                }}>
                    {period || '--'}
                </span>
            </div>

            {/* NATIVE INPUT OVERLAY - This makes it "Easy to change" on mobile */}
            <input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 10
                }}
            />

            {/* INTERACTION HINT */}
            <div style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.3)',
                marginTop: '8px',
                pointerEvents: 'none',
                fontWeight: '600'
            }}>
                Toca para editar
            </div>
        </div>
    );
};

export default TimeInput;
