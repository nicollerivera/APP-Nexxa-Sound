import React, { useState } from 'react';
import { configService } from '../services/configService';
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from './Icons';

const ConfigManagerView = ({ setView, appConfig, catalog }) => {
    const [localConfig, setLocalConfig] = useState({
        ...appConfig,
        roles: (appConfig?.roles && appConfig.roles.length > 0) ? appConfig.roles : [
            { id: 'dj', name: 'DJ', base: 35000, hourly: 13000, extra: 85000, edition: 0 },
            { id: 'foto', name: 'Fotografía', base: 0, hourly: 13000, extra: 50000, edition: 0 },
            { id: 'decor', name: 'Decoración', base: 0, hourly: 20000, extra: 35000, edition: 0 },
            { id: 'logistica', name: 'Logística / Equipo', base: 25000, hourly: 10000, extra: 50000, edition: 0 }
        ]
    });

    const updateRole = (index, field, value) => {
        const newRoles = [...(localConfig.roles || [])];
        newRoles[index] = { ...newRoles[index], [field]: value };
        setLocalConfig({ ...localConfig, roles: newRoles });
    };

    const addRole = () => {
        const newRole = { id: `role_${Date.now()}`, name: "Nuevo Rol", base: 0, hourly: 0, extra: 50000, edition: 0 };
        setLocalConfig({ ...localConfig, roles: [...(localConfig.roles || []), newRole] });
    };

    const removeRole = (index) => {
        if (!window.confirm("¿Eliminar este rol?")) return;
        const newRoles = localConfig.roles.filter((_, i) => i !== index);
        setLocalConfig({ ...localConfig, roles: newRoles });
    };
    const [localCatalog, setLocalCatalog] = useState(catalog);
    const [saving, setSaving] = useState(false);

    // Auto-fix old prices on load
    React.useEffect(() => {
        if (localCatalog && localCatalog.extras) {
            let changed = false;
            const updatedExtras = localCatalog.extras.map(ex => {
                if (ex.id === 'acc_essential' && ex.price === 80000) { changed = true; return { ...ex, price: 38000 }; }
                if (ex.id === 'acc_memories' && ex.price === 160000) { changed = true; return { ...ex, price: 76000 }; }
                if (ex.id === 'acc_celebration' && ex.price === 280000) { changed = true; return { ...ex, price: 114000 }; }
                return ex;
            });
            if (changed) {
                setLocalCatalog(prev => ({ ...prev, extras: updatedExtras }));
            }
        }
    }, [catalog]);


    const handleSave = async () => {
        setSaving(true);
        try {
            await configService.updateRules(localConfig);
            await configService.updateCatalog(localCatalog);
            alert("✅ Configuración guardada en la nube con éxito. Todos los cambios se reflejarán en ambas apps.");
        } catch (error) {
            console.error(error);
            alert("❌ Error al guardar la configuración.");
        } finally {
            setSaving(false);
        }
    };

    const updatePackage = (index, field, value) => {
        const newPkg = [...localCatalog.packages];
        newPkg[index] = { ...newPkg[index], [field]: value };
        setLocalCatalog({ ...localCatalog, packages: newPkg });
    };

    const removePackage = (index) => {
        if (!window.confirm("¿Eliminar este paquete?")) return;
        const newPkg = localCatalog.packages.filter((_, i) => i !== index);
        setLocalCatalog({ ...localCatalog, packages: newPkg });
    };

    const addPackage = () => {
        const newPkg = {
            id: `pkg_${Date.now()}`,
            name: "Nuevo Paquete",
            price: 0,
            img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
            extraDJ: 85000,
            extraPhoto: 0,
            features: [],
            highlight: false
        };
        setLocalCatalog({ ...localCatalog, packages: [...localCatalog.packages, newPkg] });
    };

    const updateExtra = (index, field, value) => {
        const newExtras = [...localCatalog.extras];
        newExtras[index] = { ...newExtras[index], [field]: value };
        setLocalCatalog({ ...localCatalog, extras: newExtras });
    };

    return (
        <div className="fade-in container" style={{ paddingBottom: '100px' }}>
            <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0' }}>
                <button onClick={() => setView('settings')} className="nav-btn" style={{ background: 'transparent', border: 'none', color: 'var(--primary-cyan)', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconArrowLeft size={16} /> VOLVER
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-1px' }}>CONTROL <span style={{ color: 'var(--primary-cyan)' }}>MAESTRO</span></h2>
                    <small style={{ opacity: 0.5, fontWeight: '700' }}>Sincronización Global Nexxa</small>
                </div>
                <button onClick={handleSave} disabled={saving} className="action-btn" style={{ background: 'var(--brand-gradient)', color: '#000', padding: '12px 25px', borderRadius: '15px', fontWeight: '950', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,212,255,0.2)' }}>
                    {saving ? 'GUARDANDO...' : 'APLICAR CAMBIOS'}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* 1. REGLAS DE NEGOCIO */}
                <section className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ color: 'var(--primary-purple)', marginBottom: '15px', fontSize: '0.8rem', fontWeight: '950', letterSpacing: '1px' }}>1. VARIABLES DE COSTOS GENERALES</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                        {[
                            { label: 'HORAS PAQUETE (EJ: 4)', key: 'baseHours' },
                            { label: 'CALCULO EXTRA DEFECTO ($)', key: 'defaultExtraHourPrice' }
                        ].map(item => (
                            <div key={item.key} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ fontSize: '0.55rem', fontWeight: '900', opacity: 0.4, display: 'block', marginBottom: '2px' }}>{item.label}</label>
                                <input
                                    type="number"
                                    value={localConfig[item.key] !== undefined ? localConfig[item.key] : ''}
                                    placeholder="0"
                                    onChange={e => setLocalConfig({ ...localConfig, [item.key]: Number(e.target.value) })}
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '900', outline: 'none', padding: 0, margin: 0 }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: 'var(--primary-purple)', margin: 0, fontSize: '0.8rem', fontWeight: '950', letterSpacing: '1px' }}>ESQUEMA DE NÓMINA (ROLES)</h3>
                        <button onClick={addRole} style={{ background: 'rgba(188, 111, 241, 0.1)', color: 'var(--primary-purple)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.65rem' }}>
                            + NUEVO ROL
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <style>{`
                            .dynamic-role-card {
                                padding: 6px 10px 6px 16px;
                                border-radius: 8px;
                                display: flex;
                                flex-direction: column;
                                gap: 6px;
                                border: 1px solid rgba(255, 255, 255, 0.05);
                                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                                background: rgba(255, 255, 255, 0.015);
                            }
                            .dynamic-role-card:hover {
                                background: rgba(255, 255, 255, 0.04) !important;
                                transform: translateY(-2px);
                                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                                border-color: rgba(255, 255, 255, 0.15) !important;
                            }
                            .dynamic-role-card input {
                                border-bottom: 1px solid transparent !important;
                                transition: all 0.3s ease;
                            }
                            .dynamic-role-card input:focus {
                                border-bottom: 1px solid var(--primary-cyan) !important;
                                transform: scale(1.02);
                            }
                            .btn-trash-hover {
                                transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.2s;
                            }
                            .btn-trash-hover:hover {
                                transform: scale(1.2) rotate(10deg);
                                opacity: 1 !important;
                            }
                        `}</style>
                        {(localConfig.roles || []).map((role, rIdx) => {
                            const currentName = role.name || '';
                            const isFoto = currentName.toLowerCase().includes('foto');
                            const isDecor = currentName.toLowerCase().includes('decor');
                            const isLog = currentName.toLowerCase().includes('log');
                            const hideBase = isFoto || isDecor;

                            const brandColor = isFoto ? 'var(--primary-purple)' : isDecor ? '#ff007f' : isLog ? '#00e676' : 'var(--primary-cyan)';

                            return (
                                <div key={role.id || rIdx} className="dynamic-role-card" style={{ borderLeft: `3px solid ${brandColor}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <label style={{ fontSize: '0.55rem', color: brandColor, fontWeight: '800', letterSpacing: '0.5px', marginBottom: 0 }}>ROL</label>
                                            <input value={currentName} onChange={e => updateRole(rIdx, 'name', e.target.value)} placeholder="Ej: DJ" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '600', outline: 'none', width: '100%', minWidth: '0', padding: '0' }} />
                                        </div>
                                        <button className="btn-trash-hover" onClick={() => removeRole(rIdx)} style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}>
                                            <IconTrash size={16} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
                                        {!hideBase && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <label style={{ fontSize: '0.5rem', color: '#888', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>VALOR BASE ($)</label>
                                                <input type="text" placeholder="0" value={role.base !== undefined ? Number(role.base).toLocaleString('es-CO') : ''} onChange={e => updateRole(rIdx, 'base', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '100%', minWidth: '0', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '500', outline: 'none', padding: '0 0 2px 0' }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <label style={{ fontSize: '0.5rem', color: '#888', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>VALOR HORA ($)</label>
                                            <input type="text" placeholder="0" value={role.hourly !== undefined ? Number(role.hourly).toLocaleString('es-CO') : ''} onChange={e => updateRole(rIdx, 'hourly', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '100%', minWidth: '0', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '500', outline: 'none', padding: '0 0 2px 0' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <label style={{ fontSize: '0.5rem', color: brandColor, fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>VALOR EXTRA ($)</label>
                                            <input type="text" placeholder="0" value={role.extra !== undefined ? Number(role.extra).toLocaleString('es-CO') : ''} onChange={e => updateRole(rIdx, 'extra', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '100%', minWidth: '0', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '700', outline: 'none', padding: '0 0 2px 0' }} />
                                        </div>

                                        {isFoto && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', transition: 'opacity 0.2s ease' }}>
                                                <label style={{ fontSize: '0.5rem', color: 'var(--primary-purple)', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>EDICIÓN FOTOS ($)</label>
                                                <input type="text" placeholder="0" value={role.edition !== undefined ? Number(role.edition).toLocaleString('es-CO') : ''} onChange={e => updateRole(rIdx, 'edition', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '100%', minWidth: '0', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '700', outline: 'none', padding: '0 0 2px 0' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* 2. CATÁLOGO DE PAQUETES */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--primary-cyan)', margin: 0, fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px' }}>2. CATÁLOGO DE PAQUETES</h3>
                        <button onClick={addPackage} style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--primary-cyan)', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>
                            + NUEVO PAQUETE
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                        <style>{`
                            .dynamic-pkg-card {
                                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                            }
                            .dynamic-pkg-card:hover {
                                transform: translateY(-3px);
                                box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                                background: rgba(255, 255, 255, 0.035) !important;
                                border-color: rgba(255, 255, 255, 0.1) !important;
                            }
                            .dynamic-pkg-card input, .dynamic-pkg-card textarea {
                                transition: all 0.3s ease;
                            }
                            .dynamic-pkg-card textarea:focus, .dynamic-pkg-card input[placeholder*="Ej"]:focus {
                                border-color: var(--focus-color) !important;
                            }
                        `}</style>
                        {localCatalog.packages.map((pkg, idx) => {
                            const colors = ['var(--primary-cyan)', 'var(--primary-purple)', '#ff007f', '#00e676', '#ff9100'];
                            const brandColor = colors[idx % colors.length];

                            return (
                                <div key={pkg.id} className="dynamic-pkg-card" style={{ '--focus-color': brandColor, background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${brandColor}`, position: 'relative' }}>
                                    <button className="btn-trash-hover" onClick={() => removePackage(idx)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,56,96,0.1)', color: '#ff3860', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}>
                                        <IconTrash size={12} />
                                    </button>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingRight: '22px' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <label style={{ fontSize: '0.45rem', color: brandColor, letterSpacing: '0.5px', fontWeight: '800', whiteSpace: 'nowrap', marginBottom: 0 }}>PLAN</label>
                                                <input value={pkg.name} onChange={e => updatePackage(idx, 'name', e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: '900', outline: 'none', minWidth: '0', padding: 0, margin: 0 }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '6px', alignItems: 'flex-end' }}>
                                                <label style={{ fontSize: '0.4rem', opacity: 0.5, letterSpacing: '0.5px', fontWeight: '800', marginBottom: 0 }}>PRECIO ($)</label>
                                                <input type="text" placeholder="0" value={pkg.price !== undefined ? Number(pkg.price).toLocaleString('es-CO') : ''} onChange={e => updatePackage(idx, 'price', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '80px', background: 'transparent', border: 'none', color: 'var(--success-green)', fontWeight: '900', fontSize: '0.8rem', outline: 'none', textAlign: 'right', padding: 0, margin: 0 }} />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.45rem', color: brandColor, opacity: 0.8, letterSpacing: '0.5px', fontWeight: '800', display: 'block', marginBottom: '2px' }}>URL IMAGEN</label>
                                            <input value={pkg.img} onChange={e => updatePackage(idx, 'img', e.target.value)} placeholder="Ej: https://unsplash.com/foto..." style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#aaa', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', outline: 'none', margin: 0 }} />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.45rem', color: brandColor, opacity: 0.8, letterSpacing: '0.5px', fontWeight: '800', display: 'block', marginBottom: '2px' }}>DESCRIPCIÓN / SERVICIOS</label>
                                            <textarea value={pkg.desc || ''} onChange={e => updatePackage(idx, 'desc', e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#ddd', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', minHeight: '36px', resize: 'vertical', outline: 'none', margin: 0, lineHeight: '1.2' }} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* 3. EXTRAS */}
                <section className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ color: 'var(--primary-cyan)', marginBottom: '20px', fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px' }}>3. SERVICIOS ADICIONALES (EXTRAS)</h3>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                        <button onClick={() => {
                            const newExtra = {
                                id: `extra_${Date.now()}`,
                                name: "Nuevo Servicio",
                                desc: "Descripción",
                                price: 0,
                                role: "DJ",
                                isAddon: true
                            };
                            setLocalCatalog({ ...localCatalog, extras: [newExtra, ...localCatalog.extras] });
                        }} style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--primary-cyan)', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>
                            + NUEVO EXTRA
                        </button>
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {localCatalog.extras.map((extra, idx) => (
                            <div key={extra.id} className="dynamic-pkg-card" style={{ '--focus-color': 'var(--primary-cyan)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid var(--primary-cyan)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <button className="btn-trash-hover" onClick={() => {
                                    const newExtras = [...localCatalog.extras];
                                    newExtras.splice(idx, 1);
                                    setLocalCatalog({ ...localCatalog, extras: newExtras });
                                }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,56,96,0.1)', color: '#ff3860', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', zIndex: 10 }}>
                                    <IconTrash size={12} />
                                </button>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '28px' }}>
                                    <input value={extra.name} onChange={e => updateExtra(idx, 'name', e.target.value)} placeholder="Nombre del Extra" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: '900', display: 'block', width: '100%', outline: 'none', padding: 0, margin: 0, lineHeight: 1.2 }} />
                                    <input value={extra.desc} onChange={e => updateExtra(idx, 'desc', e.target.value)} placeholder="Descripción (Ej: Pinturas, maquillador...)" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', width: '100%', outline: 'none', padding: 0, margin: 0, lineHeight: 1.2 }} />
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.45rem', color: 'var(--primary-cyan)', opacity: 0.8, letterSpacing: '0.5px', fontWeight: '800', display: 'block', marginBottom: '2px', textTransform: 'uppercase', textAlign: 'center' }}>ROL ASIGNADO</label>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', width: '100%', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <select value={extra.role || 'DJ'} onChange={e => updateExtra(idx, 'role', e.target.value)} style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.75rem', cursor: 'pointer', padding: 0, margin: 0, textAlign: 'center' }}>
                                                <option value="DJ" style={{ color: '#000' }}>DJ</option>
                                                <option value="FOTO" style={{ color: '#000' }}>Fotografía</option>
                                                <option value="DECOR" style={{ color: '#000' }}>Decoración</option>
                                                <option value="LOGISTICA" style={{ color: '#000' }}>Logística / Equipo</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.45rem', color: 'var(--primary-cyan)', opacity: 0.8, letterSpacing: '0.5px', fontWeight: '800', display: 'block', marginBottom: '2px', textAlign: 'center' }}>PRECIO ($)</label>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', width: '100%', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <input type="text" placeholder="0" value={extra.price !== undefined ? Number(extra.price).toLocaleString('es-CO') : ''} onChange={e => updateExtra(idx, 'price', Number(e.target.value.toString().replace(/\D/g, '')))} style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'var(--success-green)', fontWeight: '900', fontSize: '0.75rem', outline: 'none', padding: 0, margin: 0, textAlign: 'center' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ConfigManagerView;
