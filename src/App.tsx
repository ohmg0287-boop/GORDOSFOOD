import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Conexión
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0, parallel: 0 });
  const [loading, setLoading] = useState(true);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: prod } = await supabase.from('products').select('*');
    const { data: inv } = await supabase.from('ingredients').select('*');
    const { data: set } = await supabase.from('settings').select('*').eq('key', 'exchange_rate').single();
    
    if (prod) setProductos(prod);
    if (inv) setInventario(inv);
    if (set) setTasa(set.value);
    setLoading(false);
  }

  // FUNCIONES DE INTERFAZ
  const actualizarTasa = async (nuevaTasa) => {
    const { error } = await supabase.from('settings').update({ value: nuevaTasa }).eq('key', 'exchange_rate');
    if (!error) {
      setTasa(nuevaTasa);
      alert("Tasa actualizada");
    }
  };

  const totalUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Cargando Sistema Donde Manolo...</div>;

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      {/* NAVEGACIÓN PRINCIPAL */}
      <nav style={{ background: '#2c3e50', padding: '15px', display: 'flex', gap: '20px', color: 'white' }}>
        <h2 style={{ margin: 0, color: '#f39c12' }}>🍔 Donde Manolo</h2>
        <button onClick={() => setActiveTab('ventas')} style={navBtnStyle}>Caja (Ventas)</button>
        <button onClick={() => setActiveTab('menu')} style={navBtnStyle}>Menú</button>
        <button onClick={() => setActiveTab('inventario')} style={navBtnStyle}>Inventario</button>
        <button onClick={() => setActiveTab('config')} style={navBtnStyle}>Configuración (Tasa)</button>
      </nav>

      <main style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
        
        {/* PANEL DE VENTAS */}
        {activeTab === 'ventas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
            <div>
              <h3>Punto de Venta</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {productos.map(p => (
                  <div key={p.id} onClick={() => setCarrito([...carrito, p])} style={cardStyle}>
                    <strong>{p.name}</strong><br/>
                    <span style={{color: '#27ae60'}}>${p.price_usd}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={sidebarStyle}>
              <h3>Cuenta</h3>
              {carrito.map((item, i) => <div key={i} style={{display:'flex', justifyContent:'space-between'}}><span>{item.name}</span><span>${item.price_usd}</span></div>)}
              <hr/>
              <h2>Total: ${totalUSD.toFixed(2)}</h2>
              <p style={{color: '#7f8c8d'}}>Bs. {(totalUSD * tasa.bcv).toLocaleString()}</p>
              <button style={payBtnStyle}>REGISTRAR PAGO</button>
              <button onClick={() => setCarrito([])} style={{width:'100%', marginTop:'10px'}}>Limpiar</button>
            </div>
          </div>
        )}

        {/* PANEL DE MENÚ */}
        {activeTab === 'menu' && (
          <section style={panelStyle}>
            <h3>Gestión de Menú</h3>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead><tr style={{borderBottom: '2px solid #ddd'}}><th>Producto</th><th>Precio ($)</th><th>Estado</th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><input type="number" defaultValue={p.price_usd} style={{width:'60px'}} /></td>
                    <td>{p.is_available ? '✅ Activo' : '❌ Agotado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{marginTop:'20px', padding:'10px 20px', background:'#f39c12', border:'none', borderRadius:'5px'}}>+ Agregar Nuevo Producto</button>
          </section>
        )}

        {/* PANEL DE INVENTARIO */}
        {activeTab === 'inventario' && (
          <section style={panelStyle}>
            <h3>Control de Inventario</h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px'}}>
              {inventario.map(ing => (
                <div key={ing.id} style={{padding:'15px', border:'1px solid #ddd', borderRadius:'8px', background: ing.stock_actual < ing.stock_minimo ? '#fff3cd' : '#fff'}}>
                  <strong>{ing.name}</strong><br/>
                  Cantidad: {ing.stock_actual} {ing.unit}<br/>
                  <small>Mínimo: {ing.stock_minimo}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PANEL DE CONFIGURACIÓN (TASA) */}
        {activeTab === 'config' && (
          <section style={panelStyle}>
            <h3>Configuración de Tasa de Cambio</h3>
            <div style={{maxWidth: '300px'}}>
              <label>Tasa BCV (Bs):</label>
              <input 
                type="number" 
                value={tasa.bcv} 
                onChange={(e) => setTasa({...tasa, bcv: parseFloat(e.target.value)})} 
                style={inputStyle} 
              />
              <label>Tasa Paralelo (Bs):</label>
              <input 
                type="number" 
                value={tasa.parallel} 
                onChange={(e) => setTasa({...tasa, parallel: parseFloat(e.target.value)})} 
                style={inputStyle} 
              />
              <button onClick={() => actualizarTasa(tasa)} style={saveBtnStyle}>Guardar Tasa en DB</button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

// ESTILOS RÁPIDOS (CSS-in-JS)
const navBtnStyle = { background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' };
const cardStyle = { padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' };
const sidebarStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const payBtnStyle = { width: '100%', padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const panelStyle = { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px', margin: '10px 0 20px 0', borderRadius: '5px', border: '1px solid #ccc' };
const saveBtnStyle = { background: '#2980b9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' };
