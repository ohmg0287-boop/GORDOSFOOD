import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 });
  const [tipoServicio, setTipoServicio] = useState('Mesa'); 
  const [detalleServicio, setDetalleServicio] = useState(''); 
  const [loading, setLoading] = useState(true);

  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('usd_cash');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: prod } = await supabase.from('products').select('*').order('name');
    const { data: inv } = await supabase.from('ingredients').select('*').order('name');
    const { data: stg } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (prod) setProductos(prod);
    if (inv) setInventario(inv);
    if (stg) setTasa(stg.value);
    setLoading(false);
  }

  // Función para agregar al carrito con posibilidad de notas
  const agregarAlCarrito = (p) => {
    const itemConNota = { ...p, nota: '', tempId: Date.now() + Math.random() };
    setCarrito([...carrito, itemConNota]);
  };

  const actualizarNota = (tempId, nuevaNota) => {
    setCarrito(carrito.map(item => item.tempId === tempId ? { ...item, nota: nuevaNota } : item));
  };

  const eliminarDelCarrito = (tempId) => {
    setCarrito(carrito.filter(item => item.tempId !== tempId));
  };

  const totalUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);
  const totalPagadoUSD = pagosRealizados.reduce((acc, p) => acc + p.montoUSD, 0);
  const restanteUSD = Math.max(0, totalUSD - totalPagadoUSD);

  const finalizarVenta = async () => {
    if (restanteUSD > 0.05) return alert("Falta completar el pago.");
    setLoading(true);
    try {
      const { data: order, error: orderErr } = await supabase.from('orders').insert([{
        total_usd: totalUSD,
        service_type: tipoServicio,
        table_number: tipoServicio === 'Mesa' ? detalleServicio : null,
        customer_name: tipoServicio !== 'Mesa' ? detalleServicio : 'Local',
        status: 'completed'
      }]).select().single();

      if (orderErr) throw orderErr;

      // Guardamos items con sus notas (importante para cocina)
      const items = carrito.map(p => ({ 
        order_id: order.id, 
        product_id: p.id, 
        quantity: 1, 
        price_at_time: p.price_usd,
        notes: p.nota // Aquí se guarda el "Sin cebolla" o "Extra"
      }));
      await supabase.from('order_items').insert(items);
      
      alert("Venta guardada. Inventario actualizado.");
      setCarrito([]); setPagosRealizados([]); setDetalleServicio('');
      fetchData();
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div lang="es" className="notranslate" style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <nav style={{ background: '#b22222', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🍔 DONDE MANOLO</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setActiveTab('ventas')} style={navBtn}>Caja</button>
          <button onClick={() => setActiveTab('inventario')} style={navBtn}>Inventario</button>
          <button onClick={() => setActiveTab('config')} style={navBtn}>Tasa: {tasa.bcv} Bs</button>
          <button onClick={() => window.location.reload()} style={{...navBtn, color: '#ffeb3b'}}>Cerrar Sesión</button>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1300px', margin: 'auto' }}>
        {loading ? <p style={{textAlign:'center'}}>Cargando sistema...</p> : (
          activeTab === 'ventas' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '20px' }}>
              {/* MENÚ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {productos.map(p => (
                  <div key={p.id} onClick={() => agregarAlCarrito(p)} style={cardStyle}>
                    <strong style={{fontSize: '0.9em'}}>{p.name}</strong><br/>
                    <span style={{color:'green'}}>${p.price_usd}</span>
                  </div>
                ))}
              </div>

              {/* FACTURACIÓN */}
              <div style={sidebarStyle}>
                <h3 style={{marginTop:0}}>Pedido Actual</h3>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={{flex:1, padding:'8px'}}>
                    <option value="Mesa">Mesa</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Llevar">Llevar</option>
                  </select>
                  <input placeholder="Mesa # / Cliente" value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} style={{flex:1, padding:'8px'}} />
                </div>
                
                {/* ITEMS EN CARRITO CON NOTAS */}
                <div style={{ borderBottom: '1px solid #ddd', minHeight: '150px', maxHeight: '300px', overflowY: 'auto' }}>
                  {carrito.map((item) => (
                    <div key={item.tempId} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <strong>{item.name}</strong>
                        <button onClick={() => eliminarDelCarrito(item.tempId)} style={{border:'none', background:'none', color:'red', cursor:'pointer'}}>✕</button>
                      </div>
                      <input 
                        placeholder="Notas: sin cebolla, extra chuleta..." 
                        value={item.nota} 
                        onChange={(e) => actualizarNota(item.tempId, e.target.value)}
                        style={{width:'90%', fontSize:'0.8em', marginTop:'3px', padding:'4px'}}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <h2 style={{margin:0}}>Total: ${totalUSD.toFixed(2)}</h2>
                  <small>Bs. {(totalUSD * tasa.bcv).toLocaleString()}</small>
                </div>

                {/* MULTIPAGO */}
                <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px', marginTop: '10px', border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="number" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} placeholder="Monto" style={{flex:1}} />
                    <select value={metodoSeleccionado} onChange={(e) => setMetodoSeleccionado(e.target.value)}>
                      <option value="usd_cash">$ Efectivo</option>
                      <option value="bs_cash">Bs Efec</option>
                      <option value="pago_movil">P. Móvil</option>
                      <option value="zelle">Zelle</option>
                    </select>
                    <button onClick={() => {
                      const m = parseFloat(montoIngresado);
                      if(m > 0){
                        let usd = (metodoSeleccionado==='usd_cash'||metodoSeleccionado==='zelle') ? m : m/tasa.bcv;
                        setPagosRealizados([...pagosRealizados, {metodo:metodoSeleccionado, montoOriginal:m, montoUSD:usd}]);
                        setMontoIngresado('');
                      }
                    }} style={{background:'#b22222', color:'#fff', border:'none', padding:'0 10px'}}>+</button>
                  </div>
                  <h4 style={{ color: restanteUSD > 0 ? 'red' : 'green', margin: '10px 0' }}>Resta: ${restanteUSD.toFixed(2)}</h4>
                </div>

                <button disabled={restanteUSD > 0.05 || carrito.length === 0} onClick={finalizarVenta} style={payBtn}>FINALIZAR VENTA</button>
              </div>
            </div>
          ) : activeTab === 'inventario' ? (
            <div style={sidebarStyle}>
              <h3>Inventario Real</h3>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'2px solid #eee', textAlign:'left'}}><th>Insumo</th><th>Stock</th></tr></thead>
                <tbody>
                  {inventario.map(i => (
                    <tr key={i.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={{padding:'8px 0'}}>{i.name}</td>
                      <td style={{color: i.stock < 10 ? 'red' : 'black'}}>{Number(i.stock).toFixed(1)} {i.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={sidebarStyle}>
              <h3>Ajustes</h3>
              <label>Tasa BCV:</label>
              <input type="number" value={tasa.bcv} onChange={(e) => setTasa({bcv: parseFloat(e.target.value)})} style={inputStyle} />
              <button onClick={async () => {
                await supabase.from('settings').upsert({key:'exchange_rate', value: tasa});
                alert("Tasa actualizada");
              }} style={payBtn}>Guardar Tasa</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const navBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const cardStyle = { background: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const sidebarStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const payBtn = { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
