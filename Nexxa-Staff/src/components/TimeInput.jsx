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
        <div className="time-input-compact" style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.15)' : 'rgba(188, 111, 241, 0.15)'}`,
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.55rem',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                fontWeight: '800',
                letterSpacing: '1.5px',
                marginBottom: '6px'
            }}>
                {label}
            </span>

            {/* CLOCK DISPLAY */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#fff'
            }}>
                <span style={{
                    fontSize: '1.8rem',
                    fontWeight: '300',
                    lineHeight: '1',
                    fontFamily: 'system-ui',
                    letterSpacing: '-1px'
                }}>
                    {h}
                </span>

                <span style={{
                    fontSize: '1.4rem',
                    fontWeight: '200',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.6
                }}>:</span>

                <span style={{
                    fontSize: '1.8rem',
                    fontWeight: '300',
                    lineHeight: '1',
                    fontFamily: 'system-ui',
                    letterSpacing: '-1px'
                }}>
                    {m}
                </span>
            </div>

            {/* PERIOD PILL */}
            <div style={{
                marginTop: '6px',
                fontSize: '0.5rem',
                fontWeight: '900',
                color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                padding: '3px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                background: isAM ? 'rgba(0, 242, 255, 0.1)' : 'rgba(188, 111, 241, 0.1)',
                border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.3)' : 'rgba(188, 111, 241, 0.3)'}`,
                transition: 'all 0.3s ease'
            }}>
                {period}
            </div>

            {/* NATIVE TIME PICKER OVERLAY */}
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

            <style dangerouslySetInnerHTML={{
                __html: `
                .time-input-compact:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .time-input-compact:active {
                    transform: scale(0.98) translateY(0);
                }
            `}} />
        </div>
    );
};

export default TimeInput;

