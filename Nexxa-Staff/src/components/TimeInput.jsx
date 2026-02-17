import React from 'react';

const TimeInput = ({ value, onChange, label }) => {

    const getDisplayTime = (val) => {
        if (!val || !val.includes(':')) return { h: '00', m: '00', period: 'AM' };
        let [hStr, mStr] = val.split(':');
        let h = parseInt(hStr || 0);
        let m = parseInt(mStr || 0);
        if (isNaN(h) || isNaN(m)) return { h: '00', m: '00', period: 'AM' };
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

    // Manejar cambio del input nativo
    const handleNativeChange = (e) => {
        const newValue = e.target.value; // formato HH:MM en 24h
        if (!newValue || newValue.length === 0 || !newValue.includes(':')) return;

        let [hStr, mStr] = newValue.split(':');
        let hour = parseInt(hStr);
        let minute = parseInt(mStr);

        // Validar que sean números válidos
        if (isNaN(hour) || isNaN(minute)) return;

        // Redondear a intervalos de 15 minutos
        minute = Math.round(minute / 15) * 15;
        if (minute === 60) {
            minute = 0;
            hour += 1;
        }
        if (hour >= 24) hour = 0;

        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(timeString);
    };

    return (
        <div className="time-input-mobile" style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'}`,
            transition: 'all 0.2s ease',
            minHeight: '70px'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.5rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '1px',
                marginBottom: '4px',
                pointerEvents: 'none'
            }}>
                {label}
            </span>

            {/* CLOCK DISPLAY */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: '#fff',
                pointerEvents: 'none'
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
                transition: 'all 0.2s ease',
                pointerEvents: 'none'
            }}>
                {period}
            </div>

            {/* INPUT NATIVO INVISIBLE */}
            <input
                type="time"
                value={value || ''}
                onChange={handleNativeChange}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 100
                }}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .time-input-mobile:active {
                    transform: scale(0.97);
                    background: rgba(255, 255, 255, 0.05);
                }
            `}} />
        </div>
    );
};

export default TimeInput;
