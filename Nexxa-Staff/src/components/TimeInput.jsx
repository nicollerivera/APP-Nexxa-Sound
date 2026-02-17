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
            overflow: 'visible',
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

            {/* NATIVE TIME PICKER OVERLAY - ASEGURANDO QUE SEA CLICKEABLE */}
            <input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 100,
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                }}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .time-input-mobile:active {
                    transform: scale(0.97);
                    background: rgba(255, 255, 255, 0.05);
                }
                
                /* Asegurar que el input sea clickeable en móvil */
                .time-input-mobile input[type="time"] {
                    -webkit-tap-highlight-color: transparent;
                }
                
                .time-input-mobile input[type="time"]::-webkit-calendar-picker-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: auto;
                    height: auto;
                    color: transparent;
                    background: transparent;
                    cursor: pointer;
                }
            `}} />
        </div>
    );
};

export default TimeInput;

