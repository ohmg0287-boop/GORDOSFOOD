import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Estas son las llaves que DEBEN estar en Netlify
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 60 }); // Valor por defecto
  const [tipoServicio, setTipoServicio] = useState('table');
  const [detalleServicio, setDetalleServicio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (supabaseUrl && supabaseAnonKey) {
      fetchData(); 
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').order('name');
      const { data: stg } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
      if (prod) setProductos(prod);
      if (stg) setTasa(stg.value);
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
    setLoading(false);
  }

  const totalOrdenUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Barra de estado de conexión */}
      {!supabaseUrl && (
        <div style={{background: 'red', color: 'white', textAlign: 'center', padding: '5px'}}>
          ⚠️ Error: Configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Netlify.
        </div>
      )}

      <nav style={{ background: '#b22222', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🍔 DONDE MANOLO</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setActiveTab('ventas')} style={navBtn}>Ventas</button>
          <button onClick={() => setActiveTab('config')} style={navBtn}>Tasa: {tasa.bcv} Bs.</button>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
        {loading ? (
          <p>Cargando Menú de Donde Manolo...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
            {/* MENÚ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {productos.length > 0 ? productos.map(p => (
                <div key={p.id} onClick={() => setCarrito([...carrito, p])} style={cardStyle}>
                  <strong>{p.name}</strong><br/>
                  <span style={{color:'#27ae60'}}>${p.price_usd}</span>
                </div>
              )) : <p>No hay productos. Revisa las políticas RLS en Supabase.</p>}
            </div>

            {/* CARRITO */}
            <div style={sidebarStyle}>
              <h3>Pedido: {tipoServicio === 'table' ? 'Colina arriba' : tipoServicio === 'delivery' ? 'Entregar' : 'Subir'}</h3>
              <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={inputStyle}>
                <option value="table">Colina arriba</option>
                <option value="delivery">Entregar</option>
                <option value="pickup">Subir</option>
              </select>
              <input placeholder="Mesa / Nombre" value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} style={inputStyle} />
              
              <div style={{ borderBottom: '1px solid #ddd', minHeight: '100px' }}>
                {carrito.map((c, i) => <div key={i} style={{fontSize:'0.9em', padding:'5px 0'}}>• {c.name} - ${c.price_usd}</div>)}
              </div>

              <h2 style={{textAlign: 'right'}}>Total: ${totalOrdenUSD.toFixed(2)}</h2>
              <button disabled={carrito.length === 0} style={payBtn}>FINALIZAR VENTA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const sidebarStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const payBtn = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
