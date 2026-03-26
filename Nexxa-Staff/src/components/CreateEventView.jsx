import React, { useState, useEffect } from 'react';
import TimeInput from './TimeInput';

import {
    getDynamicExtras,
    getHours,
    subtractMinutes,
    formatPeso,
    formatInputNumber,
    parseInputNumber
} from '../utils/helpers';
import {
    IconArrowLeft,
    IconWhatsApp,
    IconTrash,
    IconServices,
    IconCheck,
    IconCalendar,
    IconFlow
} from './Icons';

const CreateEventView = ({
    newEvent,
    setNewEvent,
    handleCreateEvent,
    handleCreateQuotation,
    view,
    setView,
    catalog,
    appConfig
}) => {

    const [sectionState, setSectionState] = useState({ s1: true, s2: false, s3: false });

    console.log("CreateEventView Loaded - Fix V5 (Dynamic Hours) Applied");

    const toggleSection = (key) => setSectionState(prev => ({ ...prev, [key]: !prev[key] }));

    const getAlertStyle = (val) => ({
        border: !val ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.05)',
        background: !val ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
        color: !val ? '#ffcccc' : '#fff',
        transition: 'all 0.3s ease'
    });

    // Dynamic detection of required schedules based on package features
    const needsPhoto = (pName) => {
        if (!pName) return false;
        const low = pName.toLowerCase();
        return low.includes('onix') || low.includes('multii') || low.includes('kaizen') || low.includes('silver') || low.includes('elite') || low.includes('diamond');
    };
    const needsDecor = (pName) => {
        if (!pName) return false;
        const low = pName.toLowerCase();
        return low.includes('multii') || low.includes('kaizen') || low.includes('elite') || low.includes('diamond');
    };

    // AUTO-SYNC INICIAL Y AL CAMBIAR PAQUETE
    useEffect(() => {
        if (!newEvent || !newEvent.startTime || !newEvent.endTime) return;

        try {
            const hasPhoto = needsPhoto(newEvent.packName);
            const hasDecor = needsDecor(newEvent.packName);

            let updates = {};
            let hasChanges = false;

            // Sync Foto
            if (hasPhoto) {
                const photoStartEmpty = !newEvent.photoStartTime || newEvent.photoStartTime === '00:00';
                const photoEndEmpty = !newEvent.photoEndTime || newEvent.photoEndTime === '00:00';

                if (photoStartEmpty) {
                    updates.photoStartTime = newEvent.startTime;
                    hasChanges = true;
                }
                if (photoEndEmpty) {
                    updates.photoEndTime = newEvent.endTime;
                    hasChanges = true;
                }
            }

            // Sync Decor
            if (hasDecor) {
                const decorStartEmpty = !newEvent.decorStartTime || newEvent.decorStartTime === '00:00';
                const decorEndEmpty = !newEvent.decorEndTime || newEvent.decorEndTime === '00:00';

                if (decorStartEmpty) {
                    updates.decorStartTime = subtractMinutes(newEvent.startTime, 60);
                    hasChanges = true;
                }
                if (decorEndEmpty) {
                    updates.decorEndTime = subtractMinutes(newEvent.startTime, -60);
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                setNewEvent(prev => ({ ...prev, ...updates }));
            }
        } catch (err) {
            console.error("Error in auto-sync effect:", err);
        }
    }, [newEvent?.packName, newEvent?.startTime, newEvent?.endTime]);

    // --- PARSER DE WHATSAPP ---
    const handlePasteFromWhatsApp = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return alert('Portapapeles vacío');

            const newData = { ...newEvent };

            const sectionStartRegex = /(?:👤|📅|⏰|📍|👥|📦|➕|🎉|💰|📝|🚚|Cliente|Ofrece|Fecha|Horario|Ubicación|Dirección|Lugar|Invitados|Paquete|Extras|Adicionales|Ocasión|Valor|Total|Costo|Indicaciones|Recibir|Material|Nombre|Titular|Servicios|Incluye)/i;

            const getSection = (startPattern, text) => {
                const r = new RegExp(`(?:^|\\n|\\r)(?:[^:\\n]{0,50})[\\*\\s]*${startPattern.source}[\\*\\s]*(?::|\\s+)\\s*([\\s\\S]*?)(?=(?:\\n|\\s+)[*_]*${sectionStartRegex.source}|$)`, 'i');
                const m = text.match(r);
                return m ? m[1].trim() : null;
            };

            const rawClient = getSection(/(?:👤|Cliente|Nombre|Titular|Quien reserva)/, text);
            const rawDate = getSection(/(?:📅|Fecha|Día)/, text);
            const rawTime = getSection(/(?:⏰|Horario|Hora)/, text);
            const rawLoc = getSection(/(?:📍|Ubicación|Dirección|Lugar)/, text);
            const rawGuests = getSection(/(?:👥|Invitados|Personas)/, text);
            const rawPack = getSection(/(?:📦|Paquete|Servicio)/, text);
            const rawExtras = getSection(/(?:➕|Extras|Adicionales|Incluye|Servicios)/, text);
            const rawOccasion = getSection(/(?:🎉|Ocasión|Motivo)/, text);
            const rawExtraRate = getSection(/(?:💰|Valor Hora Extra|Total|Valor|Costo)/, text);
            const rawIndications = getSection(/(?:📝|Indicaciones|Notas|Observaciones)/, text);
            const rawMaterials = getSection(/(?:🚚|Recibir material)/, text);

            if (rawClient) newData.clientName = rawClient.split('\n')[0].trim();
            if (rawDate) newData.date = rawDate.split('\n')[0].trim();

            if (rawTime) {
                const tMatch = rawTime.match(/(\d{1,2}(?::\d{2})?)\s?(AM|PM).*?(\d{1,2}(?::\d{2})?)\s?(AM|PM)/i);
                if (tMatch) {
                    const parseTime = (t, ap) => {
                        if (!t) return "00:00";
                        const cleaned = t.replace(/[^0-9:]/g, '');
                        let [hStr, mStr] = cleaned.includes(':') ? cleaned.split(':') : [cleaned, '00'];
                        let h = parseInt(hStr, 10);
                        let m = parseInt(mStr, 10);
                        if (isNaN(h)) h = 0;
                        if (isNaN(m)) m = 0;
                        if (ap && ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                        if (ap && ap.toUpperCase() === 'AM' && h === 12) h = 0;
                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    }
                    newData.startTime = parseTime(tMatch[1], tMatch[2]);
                    newData.endTime = parseTime(tMatch[3], tMatch[4]);
                }
            }

            if (rawLoc) newData.location = rawLoc.replace(/\n/g, ', ').trim();
            if (rawGuests) newData.guestCount = rawGuests.match(/\d+/)?.[0] || '10';

            if (rawPack) {
                const pName = rawPack.toLowerCase();
                if (pName.includes('essential')) newData.packName = 'Essential';
                else if (pName.includes('onix') || pName.includes('silver')) newData.packName = 'Onix';
                else if (pName.includes('multii') || pName.includes('elite')) newData.packName = 'Multii';
                else if (pName.includes('kaizen') || pName.includes('diamond')) newData.packName = 'Kaizen';
                else newData.packName = 'Personalizado';
            }

            if (rawOccasion) newData.occasion = rawOccasion.trim();
            if (rawExtraRate) newData.extraHourPrice = rawExtraRate.replace(/[$.]/g, '').trim();
            if (rawIndications) newData.indications = rawIndications.trim();

            if (rawMaterials) {
                const mMatch = rawMaterials.match(/(\d{1,2}(?::\d{2})?)\s?(AM|PM)/i);
                if (mMatch) {
                    const parseTime = (t, ap) => {
                        if (!t) return "00:00";
                        const cleaned = t.replace(/[^0-9:]/g, '');
                        let [hStr, mStr] = cleaned.includes(':') ? cleaned.split(':') : [cleaned, '00'];
                        let h = parseInt(hStr, 10);
                        let m = parseInt(mStr, 10);
                        if (isNaN(h)) h = 0;
                        if (isNaN(m)) m = 0;
                        if (ap) {
                            if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                            if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
                        }
                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    }
                    newData.materialsTime = parseTime(mMatch[1], mMatch[2]);
                }
            }

            const newExtras = {};
            if (rawExtras) {
                const exText = rawExtras.toLowerCase();
                const hasMakeup = /makeup|maquillaje|neon|artista/i.test(exText);
                const hasEssential = /acc_essential|essential/i.test(exText) && exText.includes('accesorios');
                const hasMemories = /acc_memories|memories/i.test(exText) && exText.includes('accesorios');
                const hasCelebration = /acc_celebration|celebration|full/i.test(exText) && exText.includes('accesorios');

                const idEssential = exText.includes('acc_essential');
                const idMemories = exText.includes('acc_memories');
                const idCelebration = exText.includes('acc_celebration');

                if (hasMakeup) newExtras['extra_makeup'] = true;
                if (hasEssential || idEssential) newExtras['acc_essential'] = true;
                if (hasMemories || idMemories) newExtras['acc_memories'] = true;
                if (hasCelebration || idCelebration) newExtras['acc_celebration'] = true;
            }
            newData.selectedExtras = newExtras;

            if (!newData.clientName) alert(`⚠️ Advertencia: No se detectó el nombre del Cliente.\n\nContenido detectado (Inicio): "${text.substring(0, 50)}..."`);
            alert(`✅ Datos Importados:\nCliente: ${newData.clientName || 'No detectado'}\nPaquete: ${newData.packName || 'No detectado'}\nExtras Detectados: ${Object.keys(newExtras).length}`);

            setNewEvent(newData);
            setTimeout(() => updateEvent('recalc', null), 100);

        } catch (err) {
            console.error(err);
            alert('No se pudo leer el portapapeles. Asegúrate de dar permiso.');
        }
    };

    // Smart Updater
    const updateEvent = (field, value) => {
        let updated = { ...newEvent };

        if (field === 'toggleExtra') {
            const currentExtras = { ...updated.selectedExtras };
            currentExtras[value] = !currentExtras[value];
            updated.selectedExtras = currentExtras;
        } else if (field === 'changeExtraQty') {
            const { id, q } = value;
            const currentQtys = { ...(updated.extraQtys || {}) };
            currentQtys[id] = Math.max(1, q);
            updated.extraQtys = currentQtys;
        } else if (field === 'changeMakeupCount') {
            updated.makeupCount = value;
        } else if (field === 'guestCount') {
            updated.guestCount = value;
            // Quitamos el reset de makeupCount para que no salte el precio si el usuario ya lo ajustó
        } else if (field === 'packName') {
            updated.packName = value;
        } else if (field === 'startTime') {
            const prevStart = newEvent.startTime; // Valor anterior
            updated.startTime = value;

            // Lógica Inteligente:
            // Solo sincronizamos si el usuario NO ha tocado los horarios manualmente.
            // ¿Cómo sabemos si los tocó?
            // 1. Si están vacíos o son 00:00 -> Sincronizar (Primera vez)
            // 2. Si coinciden EXACTAMENTE con el horario anterior del DJ -> Sincronizar (Significa que seguían "atados")

            // FOTO INICIO
            const photoIsEmpty = !updated.photoStartTime || updated.photoStartTime === '00:00';
            const photoWasSynced = updated.photoStartTime === prevStart; // ¿Era igual al DJ antes del cambio?

            if (photoIsEmpty || photoWasSynced) {
                updated.photoStartTime = value;
            }

            // DECOR INICIO (El decorador entra 1 hora antes)
            const decorIsEmpty = !updated.decorStartTime || updated.decorStartTime === '00:00';
            // Verificamos si estaba sincronizado (1h antes del DJ)
            const decorWasSynced = updated.decorStartTime === subtractMinutes(prevStart, 60);

            if (decorIsEmpty || decorWasSynced) {
                updated.decorStartTime = subtractMinutes(value, 60);
            }

            // DECOR FIN (El decorador sale 1 hora después del INICIO del evento para montaje)
            // OJO: Tu regla decía "solo trabaja 2 hrs".
            // Si el montaje es 1h antes y dura 2h, entonces termina 1h después del inicio.
            const decorEndIsEmpty = !updated.decorEndTime || updated.decorEndTime === '00:00';
            const decorEndWasSynced = updated.decorEndTime === subtractMinutes(prevStart, -60);

            if (decorEndIsEmpty || decorEndWasSynced) {
                updated.decorEndTime = subtractMinutes(value, -60);
            }

        } else if (field === 'endTime') {
            const prevEnd = newEvent.endTime;
            updated.endTime = value;

            // FOTO FIN
            const photoEndIsEmpty = !updated.photoEndTime || updated.photoEndTime === '00:00';
            const photoEndWasSynced = updated.photoEndTime === prevEnd; // ¿Era igual al DJ?

            if (photoEndIsEmpty || photoEndWasSynced) {
                updated.photoEndTime = value;
            }

        } else if (field === 'photoStartTime') {
            updated.photoStartTime = value;
        } else if (field === 'photoEndTime') {
            updated.photoEndTime = value;
        } else if (field === 'decorStartTime') {
            updated.decorStartTime = value;
        } else if (field === 'decorEndTime') {
            updated.decorEndTime = value;

        } else if (field !== 'recalc') {
            updated[field] = value;
        }

        if (updated.photoStartTime && updated.photoEndTime) {
            const autoDur = getHours(updated.photoStartTime, updated.photoEndTime);
            updated.photoDuration = parseFloat(autoDur.toFixed(1));
        }

        const pack = updated.packName;
        const start = updated.startTime;
        const end = updated.endTime;
        const guests = Number(updated.guestCount) || 10;
        const total = Number(newEvent.totalValue) || 0;
        const dep = Number(newEvent.deposit) || 0;

        // Auto-Precio si no hay manual
        if (!total && catalog) {
            const pkg = catalog.packages.find(p => p.name === newEvent.packName);
            if (pkg) {
                // Update newEvent totalValue if needed
            }
        }
        const selExtras = updated.selectedExtras || {};
        const pDuration = Number(updated.photoDuration) || 0;

        const currentExtrasList = getDynamicExtras(guests, updated.makeupCount);

        if (catalog && pack && start && end && pack !== 'Personalizado') {
            const conf = catalog.packages.find(p => p.name === pack);
            if (conf) {
                const duration = getHours(start, end);
                const extraEventHours = Math.max(0, Math.ceil(duration - appConfig.baseHours));
                const basePrice = conf.price;
                const djExtraPrice = conf.extraDJ || 0;
                const photoExtraPrice = conf.extraPhoto || 0;

                let totalExtrasValue = 0;
                totalExtrasValue += extraEventHours * djExtraPrice;

                const hasPhoto = (pack === 'Memories' || pack === 'Celebration');
                if (hasPhoto) {
                    if (pDuration > 0) {
                        const extraPhotoHours = Math.max(0, Math.ceil(pDuration - appConfig.baseHours));
                        totalExtrasValue += extraPhotoHours * photoExtraPrice;
                    } else {
                        totalExtrasValue += extraEventHours * photoExtraPrice;
                    }
                }

                let calculatedTotal = basePrice + totalExtrasValue;
                const allPossibleExtras = [
                    ...(catalog?.extras || []).filter(e => !['acc_essential', 'acc_memories', 'acc_celebration', 'makeup'].includes(e.id)),
                    ...currentExtrasList
                ];
                allPossibleExtras.forEach(ex => {
                    if (selExtras[ex.id]) calculatedTotal += ex.price;
                });

                // Round to nearest 5000 (Sync with Web Stitch)
                updated.totalValue = Math.round(calculatedTotal / 5000) * 5000;

                if (pDuration > 0 && hasPhoto) {
                    updated.extraHourPrice = djExtraPrice;
                } else {
                    updated.extraHourPrice = djExtraPrice + (hasPhoto ? photoExtraPrice : 0);
                }
            }

        } else if (pack === 'Personalizado') {
            if (!updated.totalValue && !newEvent.id) {
                let sum = 0;
                currentExtrasList.forEach(ex => { if (selExtras[ex.id]) sum += ex.price; });
                updated.totalValue = Math.round(sum / 5000) * 5000;
            }
        }

        if (updated.totalValue > 0) {
            updated.deposit = Math.round((updated.totalValue * appConfig.depositPercentage) / 5000) * 5000;
        }

        setNewEvent(updated);
    };

    // Logic: Constant Sync for Extra Hour Price
    useEffect(() => {
        try {
            if (newEvent?.packName && catalog) {
                const pkg = catalog.packages.find(p => p.name === newEvent.packName);
                if (pkg) {
                    const correctRate = (pkg.extraDJ || 0) + (pkg.extraPhoto || 0) || appConfig.defaultExtraHourPrice;
                    if (Number(newEvent.extraHourPrice) !== correctRate && !newEvent.id) {
                        // Only auto-correct for NEW/DRAFT events
                        setNewEvent(prev => ({ ...prev, extraHourPrice: correctRate }));
                    }
                }
            }
        } catch (error) {
            console.error("Error in pricing sync effect:", error);
        }
    }, [newEvent.packName, newEvent.id, setNewEvent, catalog, appConfig]);

    try {
        const getNormPack = (name) => {
          const n = String(name || '').toUpperCase();
          if (n.includes('ESSENTIAL')) return 'Essential';
          if (n.includes('ONIX') || n.includes('SILVER')) return 'Onix';
          if (n.includes('MULTII') || n.includes('ELITE')) return 'Multii';
          if (n.includes('KAIZEN') || n.includes('DIAMOND')) return 'Kaizen';
          return 'Essential'; 
        };
        const currentConf = (catalog?.packages || []).find(p => p.name === getNormPack(newEvent.packName)) || { price: 0 };
        const duration = newEvent.startTime && newEvent.endTime ? getHours(newEvent.startTime, newEvent.endTime) : 0;
        const extrasKy = Math.max(0, Math.ceil(duration - (appConfig?.baseHours || 4)));
        const isEventMode = newEvent.id?.startsWith('EVT');

        return (
            <div className="fade-in container">
                <div className="header-row" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setView(newEvent.id?.startsWith('EVT') ? 'events' : 'quotations')}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '10px 15px',
                                color: 'var(--primary-cyan)',
                                fontSize: '0.75rem',
                                fontWeight: '900',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            <IconArrowLeft size={16} /> Volver
                        </button>

                        <button
                            onClick={handlePasteFromWhatsApp}
                            className="action-btn"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <IconWhatsApp /> Pegar WhatsApp
                        </button>

                        <button
                            onClick={() => {
                                if (window.confirm('¿Descartar cambios y limpiar formulario?')) {
                                    const emptyState = { id: null, clientName: '', clientPhone: '', clientPhone2: '', date: '', startTime: '', endTime: '', location: '', neighborhood: '', packName: 'SONIDO ESSENTIAL ($450k)', totalValue: '', deposit: '', leadSource: '', guestCount: '', occasion: '', extraHourPrice: (appConfig?.defaultExtraHourPrice || 85000), indications: 'Ninguna', materialsTime: '', warehouseTime: '', materialExplanation: '' };
                                    setNewEvent(emptyState);
                                    localStorage.removeItem('nexxa_draft_event');
                                }
                            }}
                            className="action-btn"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconTrash /> Limpiar
                        </button>
                    </div>

                    <div style={{ textAlign: 'right', flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold' }}>{isEventMode ? 'EDITANDO EVENTO' : 'NUEVA COTIZACIÓN'}</span>
                    </div>
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); handleCreateEvent(e); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                            e.preventDefault();
                        }
                    }}
                    className="create-form"
                >

                    {/* SECTION 1: PACKAGE & TIMES */}
                    <div className="form-section premium-card" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        padding: '25px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '20px',
                        transition: 'all 0.3s ease'
                    }}>
                        <div
                            onClick={() => toggleSection('s1')}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s1 ? '20px' : '0' }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>1. Paquete y Horarios</h3>
                            <span style={{ fontSize: '1.2rem', color: 'var(--primary-cyan)', transition: 'transform 0.3s ease', transform: sectionState.s1 ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                        </div>
                        {sectionState.s1 && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>1. Selecciona el Plan</label>
                                        <select
                                            value={newEvent.packName}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const pkg = catalog?.packages.find(p => p.name === val);
                                                const basePrice = pkg?.price || 0;
                                                const extraPrice = pkg?.extraHourPrice || pkg?.extraDJ || (appConfig?.defaultExtraHourPrice || 85000);
                                                setNewEvent({ ...newEvent, packName: val, totalValue: basePrice, extraHourPrice: extraPrice });
                                                if (!newEvent.guestCount) setTimeout(() => document.getElementById('guest-input')?.focus(), 100);
                                            }}
                                            style={{ width: '100%', padding: '15px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '900', fontSize: '1.2rem', appearance: 'none' }}
                                        >
                                            {catalog?.packages.map(pkg => (
                                                <option key={pkg.id} value={pkg.name} style={{ background: '#000' }}>{pkg.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label style={{ fontSize: '0.65rem', color: 'var(--primary-cyan)', fontWeight: 'bold', display: 'block' }}>👥 Invitados (Fundamental)</label>
                                        <input
                                            id="guest-input"
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="Ej: 50"
                                            value={newEvent.guestCount || ''}
                                            onChange={e => updateEvent('guestCount', e.target.value)}
                                            style={{ width: '100%', borderColor: !newEvent.guestCount ? '#ff4d4d' : 'rgba(255,255,255,0.1)', animation: !newEvent.guestCount ? 'pulse 2s infinite' : 'none', ...getAlertStyle(newEvent.guestCount) }}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>¿Cómo nos conoció?</label>
                                        <select
                                            style={{ width: '100%', ...getAlertStyle(newEvent.leadSource) }}
                                            value={newEvent.leadSource || ''}
                                            onChange={e => updateEvent('leadSource', e.target.value)}
                                        >
                                            <option value="">Selecciona...</option>
                                            <option value="Facebook">📘 Facebook</option>
                                            <option value="Instagram">📸 Instagram</option>
                                            <option value="Google">🔍 Google</option>
                                            <option value="Recomendación">👥 Recomendación</option>
                                            <option value="WhatsApp">💬 WhatsApp</option>
                                            <option value="TikTok">🎵 TikTok</option>
                                            <option value="Otro">🌐 Otro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>Fecha del Evento</label>
                                        <input
                                            required
                                            type="date"
                                            value={newEvent.date}
                                            onChange={e => updateEvent('date', e.target.value)}
                                            style={{ width: '100%', ...getAlertStyle(newEvent.date) }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>Ocasión</label>
                                        <input
                                            placeholder="Boda, 15s..."
                                            value={newEvent.occasion}
                                            onChange={e => updateEvent('occasion', e.target.value)}
                                            style={{ width: '100%', ...getAlertStyle(newEvent.occasion) }}
                                        />
                                    </div>

                                    <TimeInput label="🕛 Inicio DJ" value={newEvent.startTime} onChange={(val) => updateEvent('startTime', val)} />
                                    <TimeInput label="🕛 Fin DJ" value={newEvent.endTime} onChange={(val) => updateEvent('endTime', val)} />
                                </div>

                                {duration > 0 && (
                                    <div style={{ marginBottom: '10px', padding: '4px 8px', background: duration < (appConfig?.baseHours || 4) ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 212, 255, 0.1)', borderRadius: '14px', fontSize: '0.75rem', textAlign: 'center', color: duration < (appConfig?.baseHours || 4) ? '#ff4d4d' : '#00d4ff', border: duration < (appConfig?.baseHours || 4) ? '1px solid #ff4d4d' : 'none' }}>
                                        ⏳ <strong>{(Number(duration) || 0).toFixed(1)}h</strong> (DJ/Sonido)
                                        {duration < (appConfig?.baseHours || 4) && <span> ⚠️ Mínimo {(appConfig?.baseHours || 4)} Horas requeridas</span>}
                                        {extrasKy > 0 && <span style={{ color: '#facc15', marginLeft: '5px' }}> (+{extrasKy}h extra)</span>}
                                    </div>
                                )}

                                <div style={{ marginTop: '15px' }}>
                                    {needsPhoto(newEvent.packName) && (
                                        <h4 style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>1.1 Asignación Operativa</h4>
                                    )}
                                    {needsPhoto(newEvent.packName) && (
                                        <div style={{ padding: '15px', background: 'rgba(255, 150, 0, 0.05)', borderRadius: '15px', border: '1px solid rgba(255, 150, 0, 0.2)', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#facc15' }}>
                                                <IconCalendar size={14} />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Fotografía (OBLIGATORIO)</span>
                                            </div>
                                            {/* Implementación Maestro-Espejo: Se llenan con DJ por defecto, se desvinculan al editar manual */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <TimeInput label="Inicio Foto" value={newEvent.photoStartTime} onChange={(val) => updateEvent('photoStartTime', val)} />
                                                <TimeInput label="Fin Foto" value={newEvent.photoEndTime} onChange={(val) => updateEvent('photoEndTime', val)} />
                                            </div>
                                        </div>
                                    )}
                                    {needsDecor(newEvent.packName) && (
                                        <div style={{ padding: '15px', background: 'rgba(188, 111, 241, 0.05)', borderRadius: '15px', border: '1px solid rgba(188, 111, 241, 0.2)', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary-purple)' }}>
                                                <IconFlow size={14} />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Horario Decoración (OBLIGATORIO)</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <TimeInput label="Inicio Decor" value={newEvent.decorStartTime} onChange={(val) => updateEvent('decorStartTime', val)} />
                                                <TimeInput label="Fin Decor" value={newEvent.decorEndTime} onChange={(val) => updateEvent('decorEndTime', val)} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        required
                                        placeholder="Barrio"
                                        value={newEvent.neighborhood || ''}
                                        onChange={e => updateEvent('neighborhood', e.target.value)}
                                        style={getAlertStyle(newEvent.neighborhood)}
                                    />
                                    <input
                                        required
                                        placeholder="Dirección Exacta"
                                        value={newEvent.location}
                                        onChange={e => updateEvent('location', e.target.value)}
                                        style={getAlertStyle(newEvent.location)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* SECTION 2: EXTRAS */}
                    <div className="form-section premium-card" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        padding: '25px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '20px',
                        transition: 'all 0.3s ease'
                    }}>
                        <div
                            onClick={() => toggleSection('s2')}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s2 ? '20px' : '0' }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>2. Extras</h3>
                            <span style={{ fontSize: '1.2rem', color: 'var(--primary-cyan)', transition: 'transform 0.3s ease', transform: sectionState.s2 ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                        </div>

                        {sectionState.s2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {Object.entries(
                                    getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount, newEvent).reduce((acc, ex) => {
                                        acc[ex.category] = acc[ex.category] || [];
                                        acc[ex.category].push(ex);
                                        return acc;
                                    }, {})
                                ).map(([category, catExtras]) => (
                                    <div key={category}>
                                        <label style={{ fontSize: '0.65rem', color: 'var(--primary-cyan)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', opacity: 0.7 }}>{category}</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {catExtras.map(extra => {
                                                const isActive = !!(newEvent.selectedExtras && newEvent.selectedExtras[extra.id]);
                                                const isAcc = extra.id.startsWith('acc_') && !extra.isItem;
                                                const qty = isAcc ? Math.ceil(Number(newEvent.guestCount || 10) / 10) : extra.qty;
                                                return (
                                                    <div key={extra.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div
                                                            onClick={() => updateEvent('toggleExtra', extra.id)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px',
                                                                background: isActive ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                                                                border: '1px solid', borderColor: isActive ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)',
                                                                borderRadius: '12px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#fff' : '#ccc' }}>
                                                                    {extra?.name || 'Extra'} {isActive && isAcc && <span style={{ color: 'var(--primary-cyan)', marginLeft: '8px', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>x{qty}</span>}
                                                                </span>
                                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{extra.details || extra.desc}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? 'var(--primary-cyan)' : '#666' }}>
                                                                    + ${(extra.displayPrice || extra.price).toLocaleString()}
                                                                </span>
                                                                {isActive && (extra.isMakeup || extra.isItem) && (
                                                                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '2px 5px' }}>
                                                                        <small onClick={() => updateEvent(extra.isMakeup ? 'changeMakeupCount' : 'changeExtraQty', extra.isMakeup ? Math.max(1, (extra.qty || 1) - 1) : { id: extra.id, q: (extra.qty || 1) - 1 })} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>-</small>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{extra.qty}</span>
                                                                        <small onClick={() => updateEvent(extra.isMakeup ? 'changeMakeupCount' : 'changeExtraQty', extra.isMakeup ? (extra.qty || 1) + 1 : { id: extra.id, q: (extra.qty || 1) + 1 })} style={{ padding: '0 5px', cursor: 'pointer', fontSize: '1rem' }}>+</small>
                                                                    </div>
                                                                )}
                                                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: isActive ? 'var(--primary-cyan)' : '#444', background: isActive ? 'var(--primary-cyan)' : 'transparent' }}></div>
                                                            </div>
                                                        </div>
                                                        {isActive && (extra.id === 'extra_cam360' || extra.id === 'extra_photo') && (
                                                            <input 
                                                                type="text" 
                                                                placeholder="Franja Horaria Téc. (Ej: 8-10pm)"
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', color: '#fff', marginTop: '2px' }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: CLIENT */}
                    <div className="form-section premium-card" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        padding: '25px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '20px',
                        transition: 'all 0.3s ease'
                    }}>
                        <div
                            onClick={() => toggleSection('s3')}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: sectionState.s3 ? '20px' : '0' }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>3. Datos del Cliente</h3>
                            <span style={{ fontSize: '1.2rem', color: 'var(--primary-cyan)', transition: 'transform 0.3s ease', transform: sectionState.s3 ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                        </div>

                        {sectionState.s3 && (
                            <>
                                <input
                                    required
                                    placeholder="Nombre Cliente"
                                    value={newEvent.clientName}
                                    onChange={e => updateEvent('clientName', e.target.value)}
                                    style={{ width: '100%', marginBottom: '6px', ...getAlertStyle(newEvent.clientName) }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                                    <input
                                        placeholder="WhatsApp P."
                                        value={newEvent.clientPhone}
                                        onChange={e => updateEvent('clientPhone', e.target.value)}
                                        type="tel"
                                        style={getAlertStyle(newEvent.clientPhone)}
                                    />
                                    <input
                                        placeholder="WhatsApp S."
                                        value={newEvent.clientPhone2}
                                        onChange={e => updateEvent('clientPhone2', e.target.value)}
                                        type="tel"
                                        style={getAlertStyle(newEvent.clientPhone2)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* SECTION 4: MISSION DETAILS */}
                    {isEventMode && (
                        <div className="form-section premium-card" style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '28px',
                            padding: '25px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: '900', color: '#fff' }}>4. Detalles de la Misión</h3>
                            <label style={{ fontSize: '0.75rem', color: '#666' }}>Indicaciones Especiales (Venue/Acceso)</label>
                            <textarea
                                placeholder="Ej: Ingreso por sótano, llevar mantel blanco, etc."
                                value={newEvent.indications}
                                onChange={e => updateEvent('indications', e.target.value)}
                                style={{ width: '100%', minHeight: '60px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', padding: '10px', fontSize: '0.9rem', marginBottom: '10px' }}
                            />
                            <label style={{ fontSize: '0.75rem', color: '#666' }}>Explicación del Material (Inventario/Uso)</label>
                            <textarea
                                placeholder="Notas sobre el material asignado o uso específico..."
                                value={newEvent.materialExplanation}
                                onChange={e => updateEvent('materialExplanation', e.target.value)}
                                style={{ width: '100%', minHeight: '60px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '12px', padding: '10px', fontSize: '0.9rem' }}
                            />
                        </div>
                    )}

                    {/* SECTION 5: FINAL QUOTATION */}
                    <div className="form-section premium-card" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '28px',
                        padding: '25px',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        marginBottom: '20px',
                        boxShadow: '0 0 30px rgba(0, 242, 255, 0.05)'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: '900', color: 'var(--primary-cyan)' }}>5. Cotización Final</h3>
                        <div className="money-row">
                            <div style={{ flex: 1, fontSize: '0.8rem', color: '#ccc', background: '#222', padding: '10px', borderRadius: '8px', marginRight: '10px' }}>
                                {newEvent.packName !== 'Personalizado' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                                            <span>Paquete {newEvent.packName} ({(appConfig?.baseHours || 4)}h Base):</span>
                                            <strong>${(Number(currentConf.price) || 0).toLocaleString()}</strong>
                                        </div>
                                        {extrasKy > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15' }}>
                                                <span>+ {extrasKy}h Extras (${(Number(newEvent.extraHourPrice) || 0).toLocaleString()} c/u):</span>
                                                <strong>${(extrasKy * (Number(newEvent.extraHourPrice) || 0)).toLocaleString()}</strong>
                                            </div>
                                        )}
                                        {(() => {
                                            const activeExtras = getDynamicExtras(Number(newEvent.guestCount) || 10, newEvent.makeupCount).filter(
                                                ex => newEvent.selectedExtras?.[ex.id]
                                            );
                                            if (activeExtras.length === 0) return null;
                                            return activeExtras.map(ex => (
                                                <div key={ex.id} style={{ marginBottom: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bc6ff1' }}>
                                                        <span>+ {ex?.name || 'Extra'}:</span>
                                                        <strong>${(Number(ex.price) || 0).toLocaleString()}</strong>
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#999', paddingLeft: '10px', fontStyle: 'italic' }}>
                                                        {ex.details}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', paddingTop: '10px' }}>
                                            <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>TOTAL COTIZACIÓN:</span>
                                            <strong style={{ fontSize: '0.9rem', color: '#00d4ff' }}>${(Number(newEvent.totalValue) || 0).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                ) : <div>Tarifa Manual</div>}
                            </div>

                            <div style={{ flex: 1 }}>
                                <small style={{ color: '#888', marginBottom: '2px' }}>Valor Total (Calculado):</small>
                                <input
                                    required
                                    placeholder="$ 0"
                                    type="text"
                                    value={formatInputNumber(newEvent.totalValue)}
                                    onChange={e => updateEvent('totalValue', parseInputNumber(e.target.value))}
                                    style={{ fontWeight: 'bold', color: '#00d4ff', fontSize: '1.4rem', height: '50px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'flex-end', overflow: 'visible' }}>
                            <div style={{ width: '40% !important', position: 'relative', minWidth: '120px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Abono (30%)</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        key="input_money_icon_force"
                                        required
                                        placeholder="0"
                                        type="tel"
                                        inputMode="numeric"
                                        value={formatInputNumber(newEvent.deposit)}
                                        onChange={e => updateEvent('deposit', parseInputNumber(e.target.value))}
                                        style={{
                                            paddingLeft: '12px !important',
                                            paddingRight: '10px !important',
                                            width: '100% !important',
                                            fontSize: '1.1rem',
                                            fontWeight: '900',
                                            color: 'var(--primary-cyan)',
                                            height: '42px',
                                            margin: 0,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Canal</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                    {[
                                        { id: 'Nequi', color: '#ff007a' },
                                        { id: 'Davi', color: '#ff4d4d' },
                                        { id: 'Efect', color: '#4dff88' }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => updateEvent('paymentMethod', m.id.replace('Davi', 'Daviplata').replace('Efect', 'Efectivo'))}
                                            style={{
                                                padding: '12px 2px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.1)',
                                                background: newEvent.paymentMethod?.includes(m.id) ? `${m.color}22` : 'rgba(255,255,255,0.03)',
                                                color: newEvent.paymentMethod?.includes(m.id) ? m.color : 'rgba(255,255,255,0.3)',
                                                fontSize: '0.6rem',
                                                fontWeight: '800',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {m.id.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="action-buttons-row" style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                        <button type="button" className="action-btn primary-btn" style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handleCreateQuotation('SENT')}>
                            <IconServices /> {newEvent.id ? 'Guardar Cambios' : 'Cotizar'}
                        </button>

                        {!newEvent.id && (
                            <button type="submit" className="action-btn primary-btn" style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <IconCheck /> Confirmar
                            </button>
                        )}
                    </div>
                </form >
            </div >
        );
    } catch (error) {
        console.error("Critical error in CreateEventView:", error);
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#fff' }}>
                <h2 style={{ color: '#ff3860', fontSize: '1.5rem', marginBottom: '10px' }}>⚠️ Error de Datos</h2>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'left' }}>
                    <code style={{ fontSize: '0.7rem', color: '#ff8a8a', whiteSpace: 'pre-wrap' }}>{error.message}</code>
                </div>
                <p style={{ opacity: 0.7, marginBottom: '30px' }}>Esta cotización contiene información dañada o incompleta que impide su visualización.</p>
                <button
                    onClick={() => setView('quotations')}
                    style={{ padding: '12px 24px', borderRadius: '14px', background: 'var(--brand-gradient)', border: 'none', color: '#000', fontWeight: '950', cursor: 'pointer' }}
                >
                    VOLVER A VENTAS
                </button>
            </div>
        );
    }
};

export default CreateEventView;
