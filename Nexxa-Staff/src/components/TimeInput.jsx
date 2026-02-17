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

    // Función para manejar cambios en el selector
    const handleTimeChange = (newH, newM, newPeriod) => {
        let hour24 = parseInt(newH);
        const minute = parseInt(newM);

        // Convertir a formato 24h
        if (newPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (newPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        const timeString = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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

            {/* SELECTORES INVISIBLES */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                opacity: 0,
                zIndex: 100
            }}>
                {/* Selector de Hora */}
                <select
                    value={h}
                    onChange={(e) => handleTimeChange(e.target.value, m, period)}
                    style={{
                        flex: 1,
                        opacity: 0,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent'
                    }}
                >
                    {[...Array(12)].map((_, i) => {
                        const hour = i + 1;
                        return <option key={hour} value={String(hour).padStart(2, '0')}>{String(hour).padStart(2, '0')}</option>;
                    })}
                </select>

                {/* Selector de Minutos (15 min intervals) */}
                <select
                    value={m}
                    onChange={(e) => handleTimeChange(h, e.target.value, period)}
                    style={{
                        flex: 1,
                        opacity: 0,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent'
                    }}
                >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                </select>

                {/* Selector de AM/PM */}
                <select
                    value={period}
                    onChange={(e) => handleTimeChange(h, m, e.target.value)}
                    style={{
                        flex: 1,
                        opacity: 0,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent'
                    }}
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>

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

