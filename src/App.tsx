import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 }); 
  const [tipoServicio, setTipoServicio] = useState('Mesa'); 
  const [detalleServicio, setDetalleServicio] = useState(''); 
  const [loading, setLoading] = useState(true);

  // Lógica de Multipago
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('usd_cash');

  useEffect(() => { 
    if (supabaseUrl && supabaseAnonKey) fetchData(); 
    else setLoading(false);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').order('name');
      const { data: inv } = await supabase.from('ingredients').select('*').order('name');
      const { data: stg } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
      if (prod) setProductos(prod);
      if (inv) setInventario(inv);
      if (stg) setTasa(stg.value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const totalOrdenUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);
  const totalPagadoUSD = pagosRealizados.reduce((acc, p) => acc + p.montoUSD, 0);
  const restanteUSD = Math.max(0, totalOrdenUSD - totalPagadoUSD);

  const agregarPago = () => {
    const monto = parseFloat(montoIngresado);
    if (!monto || monto <= 0) return;
    let montoCalcUSD = (metodoSeleccionado === 'usd_cash' || metodoSeleccionado === 'zelle') ? monto : monto / tasa.bcv;
    setPagosRealizados([...pagosRealizados, { metodo: metodoSeleccionado, montoOriginal: monto, montoUSD: montoCalcUSD }]);
    setMontoIngresado('');
  };

  const finalizarVenta = async () => {
    if (restanteUSD > 0.05) return alert("Falta dinero para completar el pago.");
    setLoading(true);
    try {
      const { data: order, error: orderErr } = await supabase.from('orders').insert([{
        total_usd: totalOrdenUSD,
        service_type: tipoServicio,
        table_number: tipoServicio === 'Mesa' ? detalleServicio : null,
        customer_name: tipoServicio !== 'Mesa' ? detalleServicio : 'Local',
        status: 'completed'
      }]).select().single();

      if (orderErr) throw orderErr;

      const items = carrito.map(p => ({ order_id: order.id, product_id: p.id, quantity: 1, price_at_time: p.price_usd }));
      await supabase.from('order_items').insert(items);
      
      alert("Venta procesada. Inventario descontado.");
      setCarrito([]); setPagosRealizados([]); setDetalleServicio('');
      fetchData();
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div lang="es" className="notranslate" style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <nav style={{ background: '#b22222', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>🍔 DONDE MANOLO</h2>
        <div>
          <button onClick={() => setActiveTab('ventas')} style={navBtn}>Caja</button>
          <button onClick={() => setActiveTab('inventario')} style={navBtn}>Inventario</button>
          <button onClick={() => setActiveTab('config')} style={navBtn}>Tasa: {tasa.bcv} Bs</button>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
        {loading ? <p>Cargando...</p> : (
          activeTab === 'ventas' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {productos.map(p => (
                  <div key={p.id} onClick={() => setCarrito([...carrito, p])} style={cardStyle} className="notranslate">
                    <strong>{p.name}</strong><br/>
                    <span style={{color:'green'}}>${p.price_usd}</span>
                  </div>
                ))}
              </div>

              <div style={sidebarStyle}>
                <h3>Servicio: {tipoServicio}</h3>
                <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={inputStyle}>
                  <option value="Mesa">Mesa</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Llevar">Llevar (Pickup)</option>
                </select>
                <input placeholder="Detalle (Mesa # o Nombre)" value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} style={inputStyle} />
                
                <div style={{ borderBottom: '1px solid #ddd', minHeight: '100px', marginBottom: '10px' }}>
                  {carrito.map((c, i) => <div key={i} style={{display:'flex', justifyContent:'space-between'}}><span>{c.name}</span><span>${c.price_usd}</span></div>)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h2 style={{margin:0}}>Total: ${totalOrdenUSD.toFixed(2)}</h2>
                  <small>Bs. {(totalOrdenUSD * tasa.bcv).toLocaleString()}</small>
                </div>

                <div style={{ background: '#eee', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="number" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} placeholder="Monto" style={{flex:1}} />
                    <select value={metodoSeleccionado} onChange={(e) => setMetodoSeleccionado(e.target.value)}>
                      <option value="usd_cash">$ Efectivo</option>
                      <option value="bs_cash">Bs Efectivo</option>
                      <option value="pago_movil">Pago Móvil</option>
                      <option value="zelle">Zelle</option>
                    </select>
                    <button onClick={agregarPago} style={{background:'#b22222', color:'#fff', border:'none', padding:'0 10px'}}>+</button>
                  </div>
                  {pagosRealizados.map((p, i) => <div key={i} style={{fontSize:'0.8em', color:'green'}}>✔ {p.metodo}: {p.montoOriginal}</div>)}
                  <h4 style={{ color: restanteUSD > 0 ? 'red' : 'green', margin: '10px 0 0 0' }}>Resta: ${restanteUSD.toFixed(2)}</h4>
                </div>

                <button disabled={restanteUSD > 0.05 || carrito.length === 0} onClick={finalizarVenta} style={payBtn}>FINALIZAR VENTA</button>
              </div>
            </div>
          ) : activeTab === 'inventario' ? (
             <div style={sidebarStyle}>
               <h3>Inventario</h3>
               <table style={{width:'100%', textAlign:'left'}}>
                 <thead><tr><th>Insumo</th><th>Stock</th></tr></thead>
                 <tbody>
                   {inventario.map(item => (
                     <tr key={item.id}><td>{item.name}</td><td>{item.stock} {item.unit}</td></tr>
                   ))}
                 </tbody>
               </table>
             </div>
          ) : (
            <div style={sidebarStyle}>
              <h3>Configuración de Tasa</h3>
              <input type="number" value={tasa.bcv} onChange={(e) => setTasa({bcv: parseFloat(e.target.value)})} style={inputStyle} />
              <button onClick={async () => {
                await supabase.from('settings').upsert({key:'exchange_rate', value: tasa});
                alert("Tasa guardada");
              }} style={payBtn}>Guardar Tasa</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const navBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '15px', fontWeight: 'bold' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: '1px solid #ddd' };
const sidebarStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const payBtn = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
