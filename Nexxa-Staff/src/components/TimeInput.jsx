import React, { useState, useEffect } from 'react';

const TimeInput = ({ value, onChange, label }) => {
    // Estado local para lo que el usuario está escribiendo
    const [localH, setLocalH] = useState('12');
    const [localM, setLocalM] = useState('00');
    const [isEditingH, setIsEditingH] = useState(false);
    const [isEditingM, setIsEditingM] = useState(false);

    // Sincronizar estado local cuando cambia la prop value (si no estamos editando)
    useEffect(() => {
        if (!isEditingH && !isEditingM) {
            const { h, m } = parseTime(value);
            setLocalH(h);
            setLocalM(m);
        }
    }, [value, isEditingH, isEditingM]);

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

    const { period } = parseTime(value);
    const isAM = period === 'AM';

    // Manejar cambios mientras se escribe (permite borrar y escribir libremente)
    const handleLocalChange = (setter) => (e) => {
        let val = e.target.value;
        // Limitar a 2 dígitos para evitar inputs largos
        if (val.length > 2) val = val.slice(0, 2);
        setter(val);
    };

    // Validar y guardar al perder el foco (onBlur)
    const handleBlur = (type) => {
        if (type === 'h') setIsEditingH(false);
        if (type === 'm') setIsEditingM(false);

        let hInt = parseInt(localH);
        let mInt = parseInt(localM);

        // Si no son números válidos, revertir al valor actual
        if (isNaN(hInt) || isNaN(mInt)) {
            const current = parseTime(value);
            setLocalH(current.h);
            setLocalM(current.m);
            return;
        }

        // Validar rangos
        if (type === 'h') {
            if (hInt < 1) hInt = 1;
            if (hInt > 12) hInt = 12;
        }
        if (type === 'm') {
            if (mInt < 0) mInt = 0;
            if (mInt > 59) mInt = 59;
            // Redondear minutos a 15
            mInt = Math.round(mInt / 15) * 15;
            if (mInt === 60) {
                mInt = 0;
                // Si redondea a 60, incrementar hora visualmente es complejo porque 
                // requeriría cambiar la hora también. Para simplicidad de UI inline,
                // mantenemos la hora y ponemos min en 00, o el usuario ajusta la hora.
                // Opcional: hInt += 1;
            }
        }

        // Convertir a 24h para guardar
        let h24 = hInt;
        if (period === 'PM' && h24 !== 12) h24 += 12;
        if (period === 'AM' && h24 === 12) h24 = 0;

        const timeString = `${String(h24).padStart(2, '0')}:${String(mInt).padStart(2, '0')}`;
        onChange(timeString);
    };

    const togglePeriod = () => {
        let { h, m } = parseTime(value); // Obtener valor actual limpio
        let hInt = parseInt(h);
        let h24 = hInt;

        // Invertir periodo
        const newPeriod = period === 'AM' ? 'PM' : 'AM';

        if (newPeriod === 'PM' && h24 !== 12) h24 += 12;
        if (newPeriod === 'AM' && h24 === 12) h24 = 0;

        // Si era PM (ej 14:00 -> 2 PM) y paso a AM -> 2 AM (02:00)
        // Si era AM (ej 02:00 -> 2 AM) y paso a PM -> 2 PM (14:00)
        // La logica de h24 ya maneja esto basado en el *nuevo* periodo
        // Pero necesitamos partir de la hora visual (1-12)

        // Corrección de lógica de toggle:
        // Si visualmente es "02:00 AM" (24h: 02:00) y toco -> "02:00 PM" (24h: 14:00)
        // Si visualmente es "12:00 PM" (24h: 12:00) y toco -> "12:00 AM" (24h: 00:00)

        if (hInt === 12) {
            h24 = newPeriod === 'AM' ? 0 : 12;
        } else {
            h24 = newPeriod === 'AM' ? hInt : hInt + 12;
        }

        const timeString = `${String(h24).padStart(2, '0')}:${m}`;
        onChange(timeString);
    };

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '6px 8px',
            border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.2)' : 'rgba(188, 111, 241, 0.2)'}`,
            minHeight: '55px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Centrado vertical del contenido del contenedor
            gap: '2px'
        }}>
            {/* LABEL */}
            <span style={{
                fontSize: '0.45rem',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textAlign: 'left', // Alinear etiqueta sutilmente
                paddingLeft: '2px'
            }}>
                {label}
            </span>

            {/* CONTENEDOR DE INPUTS */}
            <div style={{
                display: 'flex',
                alignItems: 'center', // ALINEACIÓN VERTICAL CRÍTICA
                gap: '4px',
                height: '30px' // Altura fija para asegurar alineación
            }}>
                <input
                    type="number"
                    value={localH}
                    onChange={handleLocalChange(setLocalH)}
                    onFocus={() => setIsEditingH(true)}
                    onBlur={() => handleBlur('h')}
                    style={{
                        width: '36px',
                        padding: '0', // Eliminar padding interno para mejor control
                        fontSize: '1.2rem',
                        fontWeight: '400',
                        textAlign: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: 'system-ui',
                        appearance: 'textfield', // Quitar flechas de número
                        margin: 0,
                        lineHeight: '1', // Resetear altura de línea
                        height: '100%' // Ocupar altura del contenedor flex
                    }}
                />

                {/* DOS PUNTOS CENTRADOS */}
                <span style={{
                    fontSize: '1.2rem',
                    color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                    opacity: 0.8,
                    lineHeight: '1',
                    paddingBottom: '2px', // Ajuste fino visual
                    display: 'flex',
                    alignItems: 'center'
                }}>:</span>

                <input
                    type="number"
                    value={localM}
                    onChange={handleLocalChange(setLocalM)}
                    onFocus={() => setIsEditingM(true)}
                    onBlur={() => handleBlur('m')}
                    style={{
                        width: '36px',
                        padding: '0',
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
                        height: '100%'
                    }}
                />

                {/* BOTÓN AM/PM */}
                <button
                    onClick={togglePeriod}
                    style={{
                        padding: '0 8px',
                        height: '24px', // Altura específica
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        background: isAM ? 'rgba(0, 242, 255, 0.15)' : 'rgba(188, 111, 241, 0.15)',
                        border: `1px solid ${isAM ? 'rgba(0, 242, 255, 0.4)' : 'rgba(188, 111, 241, 0.4)'}`,
                        borderRadius: '6px',
                        color: isAM ? 'var(--primary-cyan)' : 'var(--primary-purple)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        minWidth: '38px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center', // Centrado vertical interno del texto del botón
                        justifyContent: 'center',
                        marginLeft: '4px', // Separación visual
                        lineHeight: '1'
                    }}
                >
                    {period}
                </button>
            </div>

            {/* Estilos para quitar las flechas del input number */}
            <style jsx>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
        </div>
    );
};

export default TimeInput;
