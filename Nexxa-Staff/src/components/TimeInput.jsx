import React from 'react';

const TimeInput = ({ value, onChange, label }) => {
    // Parsing value (HH:mm)
    let h = '08';
    let m = '00';
    let period = 'PM';

    if (value) {
        let [hVal, mVal] = value.split(':').map(Number);
        if (!isNaN(hVal)) {
            if (hVal >= 12) {
                period = 'PM';
                if (hVal > 12) hVal -= 12;
            } else {
                period = 'AM';
                if (hVal === 0) hVal = 12;
            }
            h = String(hVal).padStart(2, '0');
            m = String(mVal).padStart(2, '0');
        }
    }

    const updateTime = (newH12, newM, newPeriod) => {
        let hour = parseInt(newH12);
        if (newPeriod === 'PM' && hour !== 12) hour += 12;
        if (newPeriod === 'AM' && hour === 12) hour = 0;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        onChange(timeStr);
    };

    const selectStyle = {
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: '1.6rem', // Larger for better readability
        fontWeight: '900',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none', // Crucial for removing default arrows
        MozAppearance: 'none',
        outline: 'none',
        textAlign: 'center',
        textAlignLast: 'center', // Align selected option center
        padding: '0',
        width: '45px', // Fixed width to prevent stacking/squishing
        fontFamily: 'inherit'
    };

    const h12 = h;

    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px 10px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90px' }}>
            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {/* HOUR */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={h12}
                        onChange={e => updateTime(e.target.value, m, period)}
                        style={selectStyle}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                            const s = String(num).padStart(2, '0');
                            return <option key={s} value={s} style={{ background: '#111', color: '#fff' }}>{s}</option>;
                        })}
                    </select>
                </div>

                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'rgba(255,255,255,0.2)', margin: '0 2px', paddingBottom: '4px' }}>:</span>

                {/* MINUTE */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={m}
                        onChange={e => updateTime(h12, e.target.value, period)}
                        style={selectStyle}
                    >
                        {['00', '15', '30', '45'].map(v => (
                            <option key={v} value={v} style={{ background: '#111', color: '#fff' }}>{v}</option>
                        ))}
                    </select>
                </div>

                <div style={{ position: 'relative', marginLeft: '6px' }}>
                    <select
                        value={period}
                        onChange={e => updateTime(h12, m, e.target.value)}
                        style={{ ...selectStyle, fontSize: '0.9rem', color: period === 'AM' ? '#00d4ff' : 'var(--primary-purple)', width: 'auto', minWidth: '35px', padding: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                    >
                        <option value="AM" style={{ background: '#111' }}>AM</option>
                        <option value="PM" style={{ background: '#111' }}>PM</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default TimeInput;
