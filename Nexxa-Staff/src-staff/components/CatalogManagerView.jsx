import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  IconBox, IconPlus, IconTrash, IconEdit, IconCheck, 
  IconArrowLeft, IconServices, IconStaff, IconInventory 
} from './Icons.jsx';
import { formatPeso, formatInputNumber, parseInputNumber } from '../utils/helpers.js';

const CatalogManagerView = ({ onBack }) => {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [activeCategory, setActiveCategory] = useState('paquetes');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_config', 'catalog'), (docSnap) => {
      if (docSnap.exists()) {
        setCatalog(docSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateCatalog = async (updatedItem) => {
    try {
      const newServices = (catalog.services || []).map(s => s.id === updatedItem.id ? updatedItem : s);
      const newPackages = (catalog.packages || []).map(p => p.id === updatedItem.id ? updatedItem : p);
      
      // If it's a new item, add to appropriate array
      if (!newServices.some(s => s.id === updatedItem.id) && !newPackages.some(p => p.id === updatedItem.id)) {
        if (updatedItem.category === 'paquetes') newPackages.push(updatedItem);
        else newServices.push(updatedItem);
      }

      await updateDoc(doc(db, 'app_config', 'catalog'), {
        services: newServices,
        packages: newPackages,
        updatedAt: new Date().toISOString()
      });
      setEditingService(null);
    } catch (error) {
      console.error("Error updating catalog:", error);
      alert("Error al actualizar catálogo");
    }
  };

  const saveService = () => {
    handleUpdateCatalog(editingService);
  };

  const deleteService = (id) => {
    if (confirm('¿Eliminar este servicio del catálogo?')) {
      const newServices = (catalog.services || []).filter(s => s.id !== id);
      const newPackages = (catalog.packages || []).filter(p => p.id !== id);
      updateDoc(doc(db, 'app_config', 'catalog'), {
        services: newServices,
        packages: newPackages,
        updatedAt: new Date().toISOString()
      });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-white">Cargando Protocolos...</div>;

  const allItems = [...(catalog?.packages || []), ...(catalog?.services || [])];
  const filteredServices = allItems.filter(s => s.category === activeCategory) || [];

  return (
    <div className="catalog-manager" style={{ padding: '20px', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '12px', color: '#fff' }}>
            <IconArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '950', margin: 0, letterSpacing: '-1px' }}>GESTOR DE CATÁLOGO</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: 0 }}>Sincronización Nexxa Sound × Stitch</p>
          </div>
        </div>
        <button 
          onClick={() => setEditingService({ id: `new_${Date.now()}`, name: '', price: 0, category: activeCategory, includesDetail: [], requiredRoles: [], materialArea: [] })}
          style={{ background: 'var(--primary-cyan)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '15px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconPlus size={18} /> NUEVO SERVICIO
        </button>
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' }}>
        {['paquetes', 'decoraciones', 'audiovisual', 'camara360', 'fotografia', 'accesorios'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: activeCategory === cat ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid ' + (activeCategory === cat ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.1)'),
              color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: '800',
              textTransform: 'uppercase',
              fontSize: '0.7rem'
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredServices.map(s => (
          <div key={s.id} className="service-card-admin" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden' }}>
                 <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditingService(s)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'var(--primary-cyan)' }}><IconEdit size={16}/></button>
                <button onClick={() => deleteService(s.id)} style={{ padding: '8px', background: 'rgba(255,56,96,0.1)', border: 'none', borderRadius: '8px', color: '#ff3860' }}><IconTrash size={16}/></button>
              </div>
            </div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '900' }}>{s.name}</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', opacity: 0.5, lineHeight: '1.3' }}>{s.desc}</p>
            <div style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--primary-cyan)' }}>{formatPeso(s.price)}</div>
            
            <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {s.requiredRoles?.map(role => (
                <span key={role} style={{ fontSize: '0.6rem', padding: '3px 8px', background: 'rgba(0,212,255,0.1)', color: 'var(--primary-cyan)', borderRadius: '5px', fontWeight: '800' }}>👤 {role.toUpperCase()}</span>
              ))}
              {s.materialArea?.map(area => (
                <span key={area} style={{ fontSize: '0.6rem', padding: '3px 8px', background: 'rgba(188,111,241,0.1)', color: 'var(--primary-purple)', borderRadius: '5px', fontWeight: '800' }}>📦 {area.toUpperCase()}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingService && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ background: '#111', width: '100%', maxWidth: '600px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 30px 0', fontWeight: '950' }}>{editingService.id.startsWith('new_') ? 'CREAR SERVICIO' : 'EDITAR SERVICIO'}</h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.4, marginBottom: '8px', fontWeight: '900' }}>NOMBRE DEL SERVICIO</label>
                <input 
                  value={editingService.name} 
                  onChange={e => setEditingService({...editingService, name: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.4, marginBottom: '8px', fontWeight: '900' }}>PRECIO BASE</label>
                <input 
                  value={formatInputNumber(editingService.price)} 
                  onChange={e => setEditingService({...editingService, price: parseInputNumber(e.target.value)})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', color: 'var(--primary-cyan)', fontSize: '1.5rem', fontWeight: '900' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', opacity: 0.4, marginBottom: '8px', fontWeight: '900' }}>DESCRIPCIÓN CORTA</label>
                <textarea 
                  value={editingService.desc} 
                  onChange={e => setEditingService({...editingService, desc: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '15px', color: '#fff', minHeight: '80px' }}
                />
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary-cyan)', marginBottom: '15px', fontWeight: '900' }}>LOGÍSTICA: ROLES REQUERIDOS</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {['dj', 'foto', 'decor', 'logistica', 'cam360', 'av'].map(role => {
                    const active = editingService.requiredRoles?.includes(role);
                    return (
                      <button 
                        key={role}
                        onClick={() => {
                          const roles = editingService.requiredRoles || [];
                          setEditingService({ ...editingService, requiredRoles: active ? roles.filter(r => r !== role) : [...roles, role] });
                        }}
                        style={{ padding: '8px 15px', borderRadius: '10px', background: active ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.05)', color: active ? '#000' : '#fff', border: 'none', fontSize: '0.7rem', fontWeight: '900' }}
                      >
                        {role === 'cam360' ? '360°' : role === 'av' ? 'AV' : role.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

               <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--primary-purple)', marginBottom: '15px', fontWeight: '900' }}>LOGÍSTICA: ÁREAS DE MATERIAL</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {['DJ', 'PHOTO', 'DECORACIÓN', 'VIDEO360', 'ACCESORIOS'].map(area => {
                    const active = editingService.materialArea?.includes(area);
                    return (
                      <button 
                        key={area}
                        onClick={() => {
                          const areas = editingService.materialArea || [];
                          setEditingService({ ...editingService, materialArea: active ? areas.filter(a => a !== area) : [...areas, area] });
                        }}
                        style={{ padding: '8px 15px', borderRadius: '10px', background: active ? 'var(--primary-purple)' : 'rgba(255,255,255,0.05)', color: active ? '#fff' : '#fff', border: 'none', fontSize: '0.7rem', fontWeight: '900' }}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                <button onClick={() => setEditingService(null)} style={{ flex: 1, padding: '20px', borderRadius: '20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontWeight: '900' }}>CANCELAR</button>
                <button onClick={saveService} style={{ flex: 1.5, padding: '20px', borderRadius: '20px', background: 'var(--primary-cyan)', border: 'none', color: '#000', fontWeight: '900' }}>GUARDAR CAMBIOS</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManagerView;
