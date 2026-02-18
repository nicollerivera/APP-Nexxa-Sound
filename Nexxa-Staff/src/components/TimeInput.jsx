import React, { useState, useEffect } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    // 1. ESTADO LOCAL: Inicializamos con valores seguros
    const [localH, setLocalH] = useState('12');
    const [localM, setLocalM] = useState('00');

    // 2. ESTADO DE EDICIÓN: Para evitar que el useEffect sobrescriba mientras escribes
    const [isEditingH, setIsEditingH] = useState(false);
    const [isEditingM, setIsEditingM] = useState(false);

    // Helper: Parsear HH:MM a formato visual (12h)
    const parseTime = (val) => {
        if (!val || typeof val !== 'string' || !val.includes(':')) {
            return { h: '12', m: '00', period: 'AM' };
        }
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

    // 3. SINCRONIZACIÓN: Solo si NO se está editando
    useEffect(() => {
        if (!isEditingH && !isEditingM) {
            const { h, m } = parseTime(value);
            setLocalH(h);
            setLocalM(m);
        }
    }, [value, isEditingH, isEditingM]);

    const { period } = parseTime(value);
    const isAM = period === 'AM';

    // 4. MANEJADORES DE CAMBIO (SIMPLIFICADOS AL MÁXIMO)
    const handleHChange = (e) => {
        // En móviles, e.target.value puede traer basura si type="number". Usamos text.
        const raw = e.target.value;
        // Limpiar: solo dígitos
        const clean = raw.replace(/[^0-9]/g, '');
        // Limitar a 2 caracteres
        const final = clean.slice(0, 2);
        setLocalH(final);
    };

    const handleMChange = (e) => {
        const raw = e.target.value;
        const clean = raw.replace(/[^0-9]/g, '');
        const final = clean.slice(0, 2);
        setLocalM(final);
    };

    // 5. VALIDACIÓN FINAL (ON BLUR)
    const handleBlur = (type) => {
        // Desactivar modo edición
        if (type === 'h') setIsEditingH(false);
        if (type === 'm') setIsEditingM(false);

        // Obtener valores actuales (con fallback si están vacíos)
        let hVal = localH;
        let mVal = localM;

        if (hVal === '') {
            const { h } = parseTime(value);
            hVal = h; // Restaurar valor anterior si se deja vacío
        }
        if (mVal === '') {
            const { m } = parseTime(value);
            mVal = m;
        }

        let hInt = parseInt(hVal);
        let mInt = parseInt(mVal);

        if (isNaN(hInt)) hInt = 12;
        if (isNaN(mInt)) mInt = 0;

        // Reglas de negocio
        if (type === 'h') {
            if (hInt < 1) hInt = 1;
            if (hInt > 12) hInt = 12;
        }
        if (type === 'm') {
            if (mInt < 0) mInt = 0;
            if (mInt > 59) mInt = 59;
            // Redondear a 15 min
            mInt = Math.round(mInt / 15) * 15;
            if (mInt === 60) mInt = 0;
        }

        // Convertir a 24h para guardar
        let h24 = hInt;

        // Preservar AM/PM actual
        if (period === 'PM' && h24 !== 12) h24 += 12;
        if (period === 'AM' && h24 === 12) h24 = 0;

        const timeString = `${String(h24).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;

        // Actualizar Padre
        onChange(timeString);

        // Actualizar Local Visualmente
        if (type === 'h') setLocalH(String(hInt).padStart(2, '0'));
        if (type === 'm') setLocalM(String(mInt).padStart(2, '0'));
    };

    const togglePeriod = () => {
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

            {/* CONTENEDOR FLEX CENTRADO */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 'normal',
                height: '32px'
            }}>
                {/* INPUT HORA */}
                <input
                    type="text" // TEXTO SIMPLE PARA MÁXIMA COMPATIBILIDAD
                    inputMode="numeric" // TECLADO NUMÉRICO EN MÓVIL
                    value={localH}
                    onChange={handleHChange}
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
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none'
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
                    height: '100%'
                }}>:</span>

                {/* INPUT MINUTOS */}
                <input
                    type="text"
                    inputMode="numeric"
                    value={localM}
                    onChange={handleMChange}
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
                        justifyContent: 'center',
                        outline: 'none'
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
