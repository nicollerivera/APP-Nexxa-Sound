import React from 'react';

const TimeInput = ({ value, onChange, label }) => {

    const getDisplayTime = (val) => {
        if (!val) return { h: '00', m: '00', period: 'AM' };
        let [hStr, mStr] = val.split(':');
        let h = parseInt(hStr || 0);
        let m = mStr || "00";
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
        <div className="time-input-premium" style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '28px',
            padding: '25px 15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minHeight: '150px',
            cursor: 'pointer',
            overflow: 'hidden',
            boxShadow: isAM ? '0 15px 45px rgba(0, 242, 255, 0.1)' : '0 15px 45px rgba(188, 111, 241, 0.1)',
            transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
        }}>
            {/* DYNAMIC AM/PM BLOB BACKGROUND */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-20%',
                width: '100px',
                height: '100px',
                background: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                filter: 'blur(40px)',
                opacity: 0.15,
                zIndex: 0,
                transition: 'all 0.6s ease'
            }} />

            {/* LABEL WITH SPACING */}
            <span style={{
                position: 'relative',
                zIndex: 2,
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                fontWeight: '900',
                letterSpacing: '2.5px',
                marginBottom: '12px'
            }}>
                {label}
            </span>

            {/* MAIN CLOCK DISPLAY */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
                color: '#fff'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <span style={{
                        fontSize: '4.2rem',
                        fontWeight: '100',
                        lineHeight: '1',
                        fontFamily: 'system-ui',
                        letterSpacing: '-2px'
                    }}>
                        {h}
                    </span>
                </div>

                <span style={{
                    fontSize: '2.5rem',
                    fontWeight: '100',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.5,
                    marginBottom: '8px'
                }}>:</span>

                <div style={{ textAlign: 'center' }}>
                    <span style={{
                        fontSize: '4.2rem',
                        fontWeight: '100',
                        lineHeight: '1',
                        fontFamily: 'system-ui',
                        letterSpacing: '-2px'
                    }}>
                        {m}
                    </span>
                </div>
            </div>

            {/* PERIOD INDICATOR PILL */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                marginTop: '15px',
                fontSize: '0.75rem',
                fontWeight: '900',
                color: '#fff',
                background: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                padding: '5px 16px',
                borderRadius: '50px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                boxShadow: isAM ? '0 5px 15px rgba(0, 242, 255, 0.4)' : '0 5px 15px rgba(188, 111, 241, 0.4)',
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
                .time-input-premium:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-4px);
                }
                .time-input-premium:active {
                    transform: scale(0.96) translateY(0);
                }
            `}} />
        </div>
    );
};

export default TimeInput;

