import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { IconArrowLeft, IconPlus, IconEdit, IconTrash, IconStaff } from './Icons';

const RolesView = ({ setView }) => {
    const [roles, setRoles] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRole, setCurrentRole] = useState({
        id: '',
        label: '',
        base: '',
        hourly: '',
        extra: ''
    });

    // 1. Fetch Roles Real-time
    React.useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "job_titles"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // If empty, maybe seeding default values? We can do that manually or let user add them.
            setRoles(data);
        });
        return () => unsubscribe();
    }, []);

    // 2. Format Currency
    const formatPeso = (num) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(num);
    };

    // 3. Handlers
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const docId = currentRole.id || `ROLE-${Date.now()}`;
            const cleanData = {
                label: currentRole.label.toUpperCase(),
                base: Number(currentRole.base) || 0,
                hourly: Number(currentRole.hourly) || 0,
                extra: Number(currentRole.extra) || 0
            };

            await setDoc(doc(db, "job_titles", docId), cleanData);
            setIsEditing(false);
            setCurrentRole({ id: '', label: '', base: '', hourly: '', extra: '' });
        } catch (err) {
            console.error("Error saving role:", err);
            alert("Error al guardar cargo");
        }
    };

    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este cargo? Esto no afectará pagos pasados.')) {
            await deleteDoc(doc(db, "job_titles", id));
        }
    };

    const handleEdit = (role) => {
        setCurrentRole(role);
        setIsEditing(true);
    };

    return (
        <div className="fade-in container" style={{ paddingBottom: '100px' }}>
            <header className="main-header" style={{ padding: '40px 0 20px 0' }}>
                <button
                    onClick={() => setView('settings')} // Go back to Settings first
                    className="nav-btn"
                    style={{ background: 'transparent', border: 'none', paddingLeft: 0, fontWeight: '900', fontSize: '0.8rem', color: 'var(--primary-purple)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px' }}
                >
                    <IconArrowLeft size={14} /> VOLVER A AJUSTES
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: '#fff' }}>Gestión de <span style={{ color: 'var(--primary-purple)' }}>Nómina</span></h2>
                        <small style={{ color: '#888', fontWeight: '700', letterSpacing: '1px', fontSize: '0.6rem' }}>TARIFAS Y CARGOS</small>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentRole({ id: '', label: '', base: '', hourly: '', extra: '' });
                            setIsEditing(true);
                        }}
                        style={{ background: 'var(--primary-purple)', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 20px rgba(188, 111, 241, 0.3)' }}
                    >
                        <IconPlus size={24} />
                    </button>
                </div>
            </header>

            {/* LIST OF ROLES */}
            <div style={{ display: 'grid', gap: '15px' }}>
                {roles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No hay cargos configurados.</div>
                ) : (
                    roles.map(role => (
                        <div key={role.id} style={{ background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{role.label}</h3>
                                <div style={{ display: 'flex', gap: '15px', opacity: 0.6 }}>
                                    <div>
                                        <span style={{ fontSize: '0.5rem', fontWeight: '900', display: 'block' }}>BASE</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>{formatPeso(role.base)}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.5rem', fontWeight: '900', display: 'block' }}>/HORA</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>{formatPeso(role.hourly)}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.5rem', fontWeight: '900', display: 'block' }}>EXTRA</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>{formatPeso(role.extra)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleEdit(role)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>
                                    <IconEdit size={16} />
                                </button>
                                <button onClick={() => handleDelete(role.id)} style={{ background: 'rgba(255,56,96,0.1)', border: 'none', color: '#ff3860', padding: '10px', borderRadius: '12px' }}>
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* EDIT/ADD MODAL */}
            {isEditing && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="fade-in" style={{ width: '90%', maxWidth: '400px', background: '#111', padding: '30px', borderRadius: '30px', border: '1px solid #333' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{currentRole.id ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900', display: 'block', marginBottom: '5px' }}>NOMBRE DEL CARGO</label>
                                <input
                                    type="text"
                                    value={currentRole.label}
                                    onChange={e => setCurrentRole({ ...currentRole, label: e.target.value })}
                                    placeholder="EJ: DJ JUNIOR"
                                    required
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900', display: 'block', marginBottom: '5px' }}>TARIFA BASE</label>
                                    <input
                                        type="number"
                                        value={currentRole.base}
                                        onChange={e => setCurrentRole({ ...currentRole, base: e.target.value })}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900', display: 'block', marginBottom: '5px' }}>POR HORA</label>
                                    <input
                                        type="number"
                                        value={currentRole.hourly}
                                        onChange={e => setCurrentRole({ ...currentRole, hourly: e.target.value })}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900', display: 'block', marginBottom: '5px' }}>VALOR HORA EXTRA</label>
                                <input
                                    type="number"
                                    value={currentRole.extra}
                                    onChange={e => setCurrentRole({ ...currentRole, extra: e.target.value })}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: 'transparent', border: '1px solid #333', color: '#888', fontWeight: '900' }}>CANCELAR</button>
                                <button type="submit" style={{ flex: 1.5, padding: '15px', borderRadius: '15px', background: 'var(--primary-purple)', border: 'none', color: '#fff', fontWeight: '900' }}>GUARDAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesView;
