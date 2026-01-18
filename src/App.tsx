import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 });
  const [tipoServicio, setTipoServicio] = useState('table'); // colina arriba
  const [detalleServicio, setDetalleServicio] = useState('');
  
  // Multipago
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('usd_cash');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: prod } = await supabase.from('products').select('*').order('name');
    const { data: stg } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (prod) setProductos(prod);
    if (stg) setTasa(stg.value);
  }

  const actualizarTasaEnBD = async () => {
    const { error } = await supabase.from('settings').update({ value: tasa }).eq('key', 'exchange_rate');
    if (error) alert("Error al guardar: " + error.message);
    else alert("Tasa actualizada con éxito en el sistema");
  };

  const totalOrdenUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);
  const totalPagadoUSD = pagosRealizados.reduce((acc, p) => acc + p.montoUSD, 0);
  const restanteUSD = Math.max(0, totalOrdenUSD - totalPagadoUSD);

  const agregarPago = () => {
    const monto = parseFloat(montoIngresado);
    if (!monto || monto <= 0) return;
    let montoUSD = (metodoSeleccionado === 'usd_cash' || metodoSeleccionado === 'zelle') ? monto : monto / tasa.bcv;
    setPagosRealizados([...pagosRealizados, { metodo: metodoSeleccionado, montoOriginal: monto, montoUSD: montoUSD }]);
    setMontoIngresado('');
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <nav style={{ background: '#b22222', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🍔 DONDE MANOLO</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setActiveTab('ventas')} style={navBtn}>Ventas</button>
          <button onClick={() => setActiveTab('inventario')} style={navBtn}>Inventario</button>
          <button onClick={() => setActiveTab('config')} style={navBtn}>Tasa: {tasa.bcv} Bs.</button>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
        
        {activeTab === 'ventas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
            {/* MENÚ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {productos.map(p => (
                <div key={p.id} onClick={() => setCarrito([...carrito, p])} style={cardStyle}>
                  <strong>{p.name}</strong><br/>
                  <span style={{color:'#27ae60'}}>${p.price_usd}</span>
                </div>
              ))}
            </div>

            {/* CAJA / MULTIPAGO */}
            <div style={sidebarStyle}>
              <h3>Pedido Actual</h3>
              <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={inputStyle}>
                <option value="table">Colina arriba (Mesa)</option>
                <option value="delivery">Entregar (Delivery)</option>
                <option value="pickup">Subir (Pickup)</option>
              </select>
              <input placeholder="Detalle (Mesa # o Nombre)" value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} style={inputStyle} />
              
              <div style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '10px' }}>
                {carrito.map((c, i) => <div key={i} style={{fontSize:'0.9em'}}>{c.name} - ${c.price_usd}</div>)}
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{margin:0}}>Total: ${totalOrdenUSD.toFixed(2)}</h2>
                <small>Bs. {(totalOrdenUSD * tasa.bcv).toLocaleString()}</small>
              </div>

              {/* SECCIÓN MULTIPAGO */}
              <div style={{ marginTop: '20px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                <label>Registrar Pago:</label>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <input type="number" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} style={{flex:1}} placeholder="Monto" />
                  <select value={metodoSeleccionado} onChange={(e) => setMetodoSeleccionado(e.target.value)}>
                    <option value="usd_cash">$ Efectivo</option>
                    <option value="bs_cash">Bs Efectivo</option>
                    <option value="zelle">Zelle</option>
                    <option value="pago_movil">Pago Móvil</option>
                  </select>
                  <button onClick={agregarPago} style={{background:'#b22222', color:'#fff', border:'none', padding:'5px 10px'}}>+</button>
                </div>
                {pagosRealizados.map((p, i) => <div key={i} style={{fontSize:'0.8em', color:'green'}}>✔ {p.metodo}: {p.montoOriginal}</div>)}
                <h4 style={{ color: restanteUSD > 0 ? 'red' : 'green' }}>Resta: ${restanteUSD.toFixed(2)}</h4>
              </div>

              <button disabled={restanteUSD > 0.05 || carrito.length === 0} style={payBtn}>FINALIZAR VENTA</button>
              <button onClick={() => {setCarrito([]); setPagosRealizados([]);}} style={{width:'100%', marginTop:'10px', border:'none', background:'none', color:'gray', cursor:'pointer'}}>Vaciar</button>
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN DE TASA */}
        {activeTab === 'config' && (
          <div style={sidebarStyle}>
            <h3>Ajustar Tasa de Cambio</h3>
            <label>Valor del Dólar (BCV):</label>
            <input 
              type="number" 
              value={tasa.bcv} 
              onChange={(e) => setTasa({bcv: parseFloat(e.target.value)})} 
              style={inputStyle} 
            />
            <button onClick={actualizarTasaEnBD} style={payBtn}>GUARDAR TASA PARA TODO EL SISTEMA</button>
          </div>
        )}

      </div>
    </div>
  );
}

// ESTILOS
const navBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const sidebarStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const payBtn = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
