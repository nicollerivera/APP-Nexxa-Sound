import React, { useState, useEffect } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    // Estado local para lo que el usuario está escribiendo
    const [localH, setLocalH] = useState('12');
    const [localM, setLocalM] = useState('00');
    const [isEditingH, setIsEditingH] = useState(false);
    const [isEditingM, setIsEditingM] = useState(false);

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

    // Sincronizar estado local cuando cambia la prop value (si no estamos editando)
    useEffect(() => {
        if (!isEditingH && !isEditingM) {
            const { h, m } = parseTime(value);
            setLocalH(h);
            setLocalM(m);
        }
    }, [value, isEditingH, isEditingM]);

    const { period } = parseTime(value);
    const isAM = period === 'AM';

    // Manejar cambios mientras se escribe (permite borrar y escribir libremente)
    const handleLocalChange = (setter) => (e) => {
        let val = e.target.value;
        // Permitir cadena vacía o números hasta 2 dígitos
        if (val === '' || val.length <= 2) {
            setter(val);
        }
    };

    // Validar y guardar al perder el foco (onBlur)
    const handleBlur = (type) => {
        if (type === 'h') setIsEditingH(false);
        if (type === 'm') setIsEditingM(false);

        let hVal = type === 'h' ? localH : localH; // Usar el estado actual
        let mVal = type === 'm' ? localM : localM;

        // Si está vacío, revertir a los valores actuales o por defecto
        if (hVal === '') {
            const { h } = parseTime(value);
            hVal = h;
        }
        if (mVal === '') {
            const { m } = parseTime(value);
            mVal = m;
        }

        let hInt = parseInt(hVal);
        let mInt = parseInt(mVal);

        // Validaciones de seguridad
        if (isNaN(hInt)) hInt = 12;
        if (isNaN(mInt)) mInt = 0;

        // Validar rangos estrictos
        if (type === 'h') {
            if (hInt < 1) hInt = 1;
            if (hInt > 12) hInt = 12;
        }
        if (type === 'm') {
            if (mInt < 0) mInt = 0;
            if (mInt > 59) mInt = 59;
            // Redondear minutos a 15 min
            mInt = Math.round(mInt / 15) * 15;
            if (mInt === 60) {
                mInt = 0;
            }
        }

        // Convertir a formato 24h para guardar
        let h24 = hInt;
        if (period === 'PM' && h24 !== 12) h24 += 12;
        if (period === 'AM' && h24 === 12) h24 = 0;

        const timeString = `${String(h24).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;
        onChange(timeString);

        // Actualizar estado local formateado inmediatamente para feedback visual
        if (type === 'h') setLocalH(String(hInt).padStart(2, '0'));
        if (type === 'm') setLocalM(String(mInt).padStart(2, '0'));
    };

    const togglePeriod = () => {
        let { h } = parseTime(value); // Hora visual actual (1-12)
        let hInt = parseInt(h);

        // Invertir periodo
        const newPeriod = period === 'AM' ? 'PM' : 'AM';

        // Calcular nueva hora 24h manteniendo la hora visual
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
            gap: '0px'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.45rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textAlign: 'center', // CENTRADO
                marginBottom: '2px',
                display: 'block',
                width: '100%'
            }}>
                {label}
            </span>

            {/* CONTENEDOR DE INPUTS - Alineación perfecta */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // CENTRADO HORIZONTAL
                gap: '4px',
                height: '32px'
            }}>
                {/* INPUT HORA */}
                <input
                    type="number"
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
                        appearance: 'textfield',
                        margin: 0,
                        lineHeight: '1',
                        height: '24px',
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
                    lineHeight: '1',
                    fontWeight: '300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '24px',
                    fontFamily: 'system-ui',
                    margin: 0,
                    padding: 0
                }}>:</span>

                {/* INPUT MINUTOS */}
                <input
                    type="number"
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
                        appearance: 'textfield',
                        margin: 0,
                        lineHeight: '1',
                        height: '24px',
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
                        marginLeft: '4px',
                        lineHeight: '1'
                    }}
                >
                    {period}
                </button>
            </div>

            {/* Styles para quitar las flechas del input number */}
            <style dangerouslySetInnerHTML={{
                __html: `
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}} />
        </div>
    );
};

export default TimeInput;
