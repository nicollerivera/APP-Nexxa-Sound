import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import {
    IconArrowLeft,
    IconHistory,
    IconBox
} from './Icons';

const InventoryView = ({ inventory, setView }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- ACTIONS ---

    const handleAddInventory = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const category = e.target.category.value;
        const qty = Number(e.target.qty.value);

        const newItem = {
            category,
            name,
            total: qty,
            available: qty,
            status: 'OK',
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(collection(db, "inventory"), `inv-${Date.now()}`), newItem);
            setShowAddModal(false);
            alert('✅ Item agregado correctamente');
        } catch (error) {
            console.error("Error adding inventory:", error);
            alert('Error al agregar item: ' + error.message);
        }
    };

    const handleEditInventory = async (e) => {
        e.preventDefault();
        if (!e?.target || !editingItem) return;

        const name = e.target.name.value;
        const category = e.target.category.value;
        const total = Number(e.target.total.value);
        const available = Number(e.target.available.value);

        try {
            await updateDoc(doc(db, "inventory", editingItem.id), {
                name,
                category,
                total,
                available
            });
            setEditingItem(null);
        } catch (error) {
            console.error("Error updating inventory:", error);
            alert('Error al actualizar item: ' + error.message);
        }
    };

    const deleteInventoryItem = async (id) => {
        if (window.confirm('¿Estás seguro de ELIMINAR este item? Esta acción no se puede deshacer.')) {
            try {
                await deleteDoc(doc(db, "inventory", id));
            } catch (error) {
                console.error("Error deleting inventory:", error);
                alert('Error al eliminar item: ' + error.message);
            }
        }
    };

    // --- FILTERING ---
    const filteredInventory = inventory.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (item.name || '').toLowerCase().includes(term) ||
            (item.category || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="fade-in container" style={{ paddingBottom: '30px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px', flexDirection: 'column', gap: '15px' }}>
                <button onClick={() => setView('dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--primary-cyan)', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <IconArrowLeft size={18} /> VOLVER
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>Control <span style={{ opacity: 0.3 }}>Bodega</span></h2>
                    <button
                        className="primary-btn"
                        onClick={() => setShowAddModal(true)}
                        style={{ margin: 0, padding: '12px 24px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px' }}
                    >
                        + STOCK
                    </button>
                </div>
            </header>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '15px 25px', marginBottom: '35px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <IconHistory size={18} style={{ opacity: 0.3 }} />
                <input
                    placeholder="Buscar equipo o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ margin: 0, background: 'transparent', border: 'none', padding: '10px 0', fontSize: '1rem', color: '#fff', outline: 'none', width: '100%' }}
                />
            </div>

            <div className="control-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {filteredInventory.length === 0 ? (
                    <div className="empty-state" style={{ opacity: 0.2 }}>{searchTerm ? 'No se encontraron items.' : 'No hay items en inventario.'}</div>
                ) : filteredInventory.map((item, index) => {
                    if (!item) return null;

                    if (editingItem && editingItem.id === item.id) {
                        return (
                            <form key={item.id} onSubmit={handleEditInventory} className="control-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
                                <input name="name" defaultValue={item.name} placeholder="Nombre" required style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: 'white' }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input name="category" defaultValue={item.category} placeholder="Categoría" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: 'white' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#888' }}>Total</label>
                                        <input name="total" type="number" defaultValue={item.total} required style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#888' }}>Disp.</label>
                                        <input name="available" type="number" defaultValue={item.available} required style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: 'white' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    <button type="button" onClick={() => setEditingItem(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '8px', padding: '8px' }}>Cancelar</button>
                                    <button type="submit" style={{ flex: 1, background: 'var(--primary-cyan)', border: 'none', color: 'black', borderRadius: '8px', padding: '8px', fontWeight: 'bold' }}>Guardar</button>
                                </div>
                            </form>
                        )
                    }

                    return (
                        <div
                            key={item?.id || index}
                            className="control-item"
                            onDoubleClick={() => setEditingItem(item)}
                            style={{ cursor: 'pointer' }}
                            title="Doble click para editar"
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconBox size={24} style={{ opacity: 0.4 }} />
                            </div>
                            <div style={{ paddingLeft: '20px', flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{item?.name || 'Item sin nombre'}</h4>
                                <small style={{ opacity: 0.3, fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.8px', marginTop: '4px', display: 'block' }}>{item?.category || 'Sin categoría'}</small>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: (item?.available || 0) < 3 ? 'var(--danger-red)' : 'var(--primary-cyan)', lineHeight: 1 }}>{item?.available || 0}</div>
                                <small style={{ opacity: 0.3, fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.5px' }}>DISP DE {item?.total || 0}</small>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                                        style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.5, cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteInventoryItem(item.id); }}
                                        style={{ background: 'transparent', border: 'none', color: '#ff3860', opacity: 0.5, cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ADD ITEM MODAL */}
            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="fade-in" style={{ width: '90%', maxWidth: '350px', background: '#111', padding: '25px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '950', color: '#fff', textAlign: 'center' }}>Nuevo Item</h3>
                        <form onSubmit={handleAddInventory}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Nombre Item</label>
                                    <input name="name" type="text" placeholder="Ej: Cable XLR" required style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Categoría</label>
                                    <select name="category" required style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}>
                                        <option value="DJ">DJ / Sonido</option>
                                        <option value="ILUMINACION">Iluminación</option>
                                        <option value="FOTOGRAFIA">Fotografía</option>
                                        <option value="DECORACION">Decoración</option>
                                        <option value="LOGISTICA">Logística / Cables</option>
                                        <option value="MOBILIARIO">Mobiliario</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#666', fontWeight: '700' }}>Cantidad Total</label>
                                    <input name="qty" type="number" placeholder="0" required style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontWeight: 'bold' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', fontWeight: '800' }}>CANCELAR</button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#fff', border: 'none', color: '#000', fontWeight: '900' }}>AGREGAR</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
