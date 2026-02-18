import React, { useState, useEffect } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    // ESTADO LOCAL: Permite edición libre sin validación inmediata
    const [localH, setLocalH] = useState('12');
    const [localM, setLocalM] = useState('00');

    // Flags para saber si el usuario está enfocado en el input
    const [isEditingH, setIsEditingH] = useState(false);
    const [isEditingM, setIsEditingM] = useState(false);

    // Helper para parsear "HH:MM" a {h, m, period}
    const parseTime = (val) => {
        if (!val || !val.includes(':')) return { h: '12', m: '00', period: 'AM' };
        let [hStr, mStr] = val.split(':');
        let h = parseInt(hStr || 0);
        let m = parseInt(mStr || 0);

        let period = 'AM';
        if (h >= 12) {
            period = 'PM';
            if (h > 12) h -= 12;
        } else if (h === 0) {
            h = 12;
        }

        return {
            h: String(h).padStart(2, '0'),
            m: String(m).padStart(2, '0'),
            period
        };
    };

    // Sincronizar estado local con prop value SOLAMENTE si no se está editando
    useEffect(() => {
        if (!isEditingH && !isEditingM) {
            const { h, m } = parseTime(value);
            setLocalH(h);
            setLocalM(m);
        }
    }, [value, isEditingH, isEditingM]);

    const { period } = parseTime(value);
    const isAM = period === 'AM';

    // Manejador de cambios: PERMITE CADENA VACÍA y escribe libremente
    const handleLocalChange = (setter, nextRef) => (e) => {
        const val = e.target.value;
        // Solo permitir números (regex) o vacío
        if (val === '' || /^\d{0,2}$/.test(val)) {
            setter(val);
        }
        // Auto-focus al siguiente si escribe 2 dígitos (opcional, mejora UX)
        // if (val.length === 2 && nextRef) { nextRef.current.focus(); }
    };

    // Validación al salir del foco (onBlur)
    const handleBlur = (type) => {
        if (type === 'h') setIsEditingH(false);
        if (type === 'm') setIsEditingM(false);

        let hVal = type === 'h' ? localH : localH; // valor actual del estado
        let mVal = type === 'm' ? localM : localM;

        // Si está vacío, asignar valor por defecto
        if (hVal === '') {
            // Si el usuario deja vacío, volvemos a lo que había o 12
            const { h } = parseTime(value);
            hVal = h; // O '12' si prefieres resetear
        }
        if (mVal === '') {
            const { m } = parseTime(value); // o '00'
            mVal = m;
        }

        let hInt = parseInt(hVal);
        let mInt = parseInt(mVal);

        if (isNaN(hInt)) hInt = 12;
        if (isNaN(mInt)) mInt = 0;

        // Validar rangos 1-12
        if (type === 'h') {
            if (hInt < 1) hInt = 1;
            if (hInt > 12) hInt = 12;
        }
        // Validar minutos 0-59 y redondear a 15 min
        if (type === 'm') {
            if (mInt < 0) mInt = 0;
            if (mInt > 59) mInt = 59;
            mInt = Math.round(mInt / 15) * 15;
            if (mInt === 60) mInt = 0;
        }

        // Guardar en formato 24h
        let h24 = hInt;
        let currentPeriod = period;

        // Mantener periodo actual
        if (currentPeriod === 'PM' && h24 !== 12) h24 += 12;
        if (currentPeriod === 'AM' && h24 === 12) h24 = 0;

        const timeString = `${String(h24).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;
        onChange(timeString);

        // Actualizar estado visual inmediatamente
        if (type === 'h') setLocalH(String(hInt).padStart(2, '0'));
        if (type === 'm') setLocalM(String(mInt).padStart(2, '0'));
    };

    const togglePeriod = () => {
        // Toggle AM/PM sin cambiar la hora visual (1-12)
        let { h } = parseTime(value);
        let hInt = parseInt(h);
        const newPeriod = period === 'AM' ? 'PM' : 'AM';

        let h24 = hInt;
        if (newPeriod === 'PM' && h24 !== 12) h24 += 12;
        if (newPeriod === 'AM' && h24 === 12) h24 = 0;

        const { m } = parseTime(value);
        const timeString = `${String(h24).padStart(2, '0')}:${m}`;
        onChange(timeString);
    };

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '4px 8px',
            border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'}`,
            minHeight: '55px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0px'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.45rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textAlign: 'center',
                marginBottom: '2px',
                display: 'block',
                width: '100%'
            }}>
                {label}
            </span>

            {/* CONTENEDOR INPUTS - Alineación con Flexbox estricto */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 'normal', // Solicitado por usuario
                height: '32px'
            }}>
                {/* INPUT HORA */}
                <input
                    type="tel"
                    inputMode="numeric"
                    value={localH}
                    onChange={handleLocalChange(setLocalH)}
                    onFocus={() => setIsEditingH(true)}
                    onBlur={() => handleBlur('h')}
                    placeholder="12"
                    style={{
                        width: '32px',
                        padding: 0,
                        fontSize: '1.2rem',
                        fontWeight: '400',
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: 'system-ui',
                        margin: 0,
                        height: '100%', // Llenar altura del flex container
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                />

                {/* DOS PUNTOS */}
                <span style={{
                    fontSize: '1.2rem',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.8,
                    fontWeight: '300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui',
                    margin: '0 2px',
                    height: '100%',
                    paddingBottom: '2px' // Ajuste fino visual si es necesario, pero alineado con flex
                }}>:</span>

                {/* INPUT MINUTOS */}
                <input
                    type="tel"
                    inputMode="numeric"
                    value={localM}
                    onChange={handleLocalChange(setLocalM)}
                    onFocus={() => setIsEditingM(true)}
                    onBlur={() => handleBlur('m')}
                    placeholder="00"
                    style={{
                        width: '32px',
                        padding: 0,
                        fontSize: '1.2rem',
                        fontWeight: '400',
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: 'system-ui',
                        margin: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                />

                {/* BOTÓN AM/PM */}
                <button
                    onClick={togglePeriod}
                    style={{
                        padding: '0',
                        height: '20px',
                        width: '32px',
                        fontSize: '0.6rem',
                        fontWeight: '800',
                        background: isAM ? 'rgba(0, 242, 255, 0.15)' : 'rgba(188, 111, 241, 0.15)',
                        border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.4)' : 'rgba(188, 111, 241, 0.4)'}`,
                        borderRadius: '6px',
                        color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '4px'
                    }}
                >
                    {period}
                </button>
            </div>
        </div>
    );
};

export default TimeInput;
