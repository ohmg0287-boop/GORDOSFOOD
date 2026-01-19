import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

export default function DondeManoloApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [staff, setStaff] = useState([]);
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // ESTADO CARRITO (Mesero y Cajera)
  const [carrito, setCarrito] = useState([]);
  const [tipoServicio, setTipoServicio] = useState('Mesa');
  const [detalleServicio, setDetalleServicio] = useState('');

  // ESTADO MULTIPAGO (Caja)
  const [orderToPay, setOrderToPay] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [montoInput, setMontoInput] = useState('');
  const [metodo, setMetodo] = useState('usd_cash');
  const [refPago, setRefPago] = useState('');

  // ESTADO REPORTES Y COMPRAS (Admin)
  const [reporteHoy, setReporteHoy] = useState(null);
  const [nuevaCompra, setNuevaCompra] = useState({ ingrediente: '', cant: '', costo: '' });

  useEffect(() => {
    fetchStaff();
    if (currentUser) {
      fetchData();
      const interval = setInterval(fetchOrders, 10000); // Refresco cada 10s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').eq('active', true);
    if (data) setStaff(data);
  }

  async function fetchData() {
    setLoading(true);
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: i } = await supabase.from('ingredients').select('*').order('name');
    const { data: t } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (p) setProductos(p);
    if (i) setInventario(i);
    if (t) setTasa(t.value);
    await fetchOrders();
    setLoading(false);
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*, order_items(*, product:products(name))').order('created_at', { ascending: false });
    if (data) setOrders(data);
  }

  // --- LÓGICA DE ENVÍO DE PEDIDO (Mesero) ---
  const enviarPedido = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");
    if (!detalleServicio) return alert("Indique número de mesa o nombre del cliente");
    setLoading(true);
    try {
      const { data: order, error: errO } = await supabase.from('orders').insert([{
        total_usd: carrito.reduce((acc, item) => acc + Number(item.price_usd), 0),
        service_type: tipoServicio,
        table_number: tipoServicio === 'Mesa' ? detalleServicio : null,
        customer_name: tipoServicio !== 'Mesa' ? detalleServicio : null,
        status: 'pendiente',
        created_by: currentUser.name
      }]).select().single();

      if (errO) throw errO;

      const items = carrito.map(p => ({
        order_id: order.id,
        product_id: p.id,
        quantity: 1,
        price_at_time: p.price_usd,
        notes: p.nota || ''
      }));

      const { error: errI } = await supabase.from('order_items').insert(items);
      if (errI) throw errI;

      alert("🚀 Pedido enviado a Cocina");
      setCarrito([]); setDetalleServicio('');
      if (currentUser.role === 'caja') setActiveTab('caja');
      fetchOrders();
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  // --- LÓGICA DE COBRO (Caja) ---
  const totalPagadoUSD = pagos.reduce((acc, p) => acc + p.montoUSD, 0);
  const deudaRestanteUSD = orderToPay ? orderToPay.total_usd - totalPagadoUSD : 0;

  const agregarPago = () => {
    const m = parseFloat(montoInput);
    if (!m && metodo !== 'cortesia') return;
    let usd = (metodo === 'usd_cash' || metodo === 'zelle') ? m : (metodo === 'cortesia' ? deudaRestanteUSD : m / tasa.bcv);
    setPagos([...pagos, { metodo, montoUSD: usd, montoOriginal: m, detalle: refPago }]);
    setMontoInput(''); setRefPago('');
  };

  // --- RENDER ---
  if (!currentUser) return (
    <div style={{height:'100vh', background:'#b22222', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'}}>
      <h1 style={{fontSize:'3em'}}>🍔 DONDE MANOLO</h1>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', maxWidth:'600px'}}>
        {staff.map(u => (
          <button key={u.id} onClick={() => {
            const pin = prompt(`PIN para ${u.name}:`);
            if(pin === u.pin) {
              setCurrentUser(u);
              if(u.role === 'mesero') setActiveTab('tomar_pedido');
              else if(u.role === 'cocina') setActiveTab('cocina');
              else if(u.role === 'caja') setActiveTab('caja');
              else setActiveTab('dashboard');
            } else alert("PIN incorrecto");
          }} style={btnBig}>{u.name}<br/><small>{u.role.toUpperCase()}</small></button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="notranslate" style={{fontFamily:'sans-serif', background:'#f4f4f4', minHeight:'100vh'}}>
      <nav className="no-print" style={{background:'#333', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <b>{currentUser.name}</b>
        <div style={{display:'flex', gap:'10px'}}>
          {currentUser.role === 'mesero' && <button onClick={()=>setActiveTab('tomar_pedido')} style={navBtn}>Nuevo Pedido</button>}
          {currentUser.role === 'caja' && <><button onClick={()=>setActiveTab('caja')} style={navBtn}>Caja</button><button onClick={()=>setActiveTab('tomar_pedido')} style={navBtn}>+ Delivery/Llevar</button></>}
          {currentUser.role === 'admin' && <><button onClick={()=>setActiveTab('dashboard')} style={navBtn}>Dashboard</button><button onClick={()=>setActiveTab('inventario')} style={navBtn}>Inventario</button></>}
          {currentUser.role === 'cocina' && <button onClick={()=>setActiveTab('cocina')} style={navBtn}>Cocina</button>}
          <button onClick={()=>window.print()} style={{...navBtn, color:'#4caf50'}}>🖨️ Imprimir</button>
          <button onClick={()=>window.location.reload()} style={{...navBtn, color:'orange'}}>Cerrar Sesión</button>
        </div>
      </nav>

      <div style={{padding:'20px', maxWidth:'1200px', margin:'auto'}}>

        {/* VISTA: TOMAR PEDIDO (Mesero y Cajera) */}
        {activeTab === 'tomar_pedido' && (
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
            <div>
              <h3>Menú</h3>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'10px'}}>
                {productos.map(p => (
                  <div key={p.id} onClick={() => setCarrito([...carrito, {...p, nota: '', tmp: Date.now()+Math.random()}])} style={card}>
                    <b>{p.name}</b><br/><span style={{color:'green'}}>${p.price_usd}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={panel}>
              <h3>Orden Nueva</h3>
              <select style={input} value={tipoServicio} onChange={e=>setTipoServicio(e.target.value)}><option>Mesa</option><option>Delivery</option><option>Llevar</option></select>
              <input placeholder="Mesa # o Cliente" style={input} value={detalleServicio} onChange={e=>setDetalleServicio(e.target.value)} />
              <div style={{maxHeight:'300px', overflowY:'auto'}}>
                {carrito.map(item => (
                  <div key={item.tmp} style={{borderBottom:'1px solid #eee', marginBottom:'10px', paddingBottom:'5px'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><b>{item.name}</b> <span onClick={()=>setCarrito(carrito.filter(x=>x.tmp!==item.tmp))} style={{color:'red', cursor:'pointer'}}>X</span></div>
                    <input placeholder="Nota (ej. sin cebolla)" value={item.nota} onChange={e=>setCarrito(carrito.map(x=>x.tmp===item.tmp?{...x, nota:e.target.value}:x))} style={{width:'100%', fontSize:'0.8em'}} />
                  </div>
                ))}
              </div>
              <h3 style={{textAlign:'right'}}>Total: ${carrito.reduce((a,b)=>a+Number(b.price_usd),0).toFixed(2)}</h3>
              <button onClick={enviarPedido} disabled={loading} style={btnAction}>{loading ? 'Enviando...' : 'ENVIAR A COCINA'}</button>
            </div>
          </div>
        )}

        {/* VISTA: COCINA */}
        {activeTab === 'cocina' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
            {orders.filter(o=>o.status==='pendiente').map(o=>(
              <div key={o.id} style={{background:'white', padding:'15px', borderLeft:'8px solid orange', borderRadius:'8px'}}>
                <h3>{o.service_type}: {o.table_number || o.customer_name}</h3>
                <ul>{o.order_items.map(i=><li key={i.id}>{i.product.name} <br/> <small style={{color:'blue'}}>{i.notes}</small></li>)}</ul>
                <button onClick={async ()=>{await supabase.from('orders').update({status:'listo'}).eq('id',o.id); fetchOrders();}} style={btnAction}>LISTO ✅</button>
              </div>
            ))}
          </div>
        )}

        {/* VISTA: CAJA */}
        {activeTab === 'caja' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={panel}>
              <h3>Cuentas por Cobrar</h3>
              {orders.filter(o=>o.status!=='pagado').map(o=>(
                <div key={o.id} onClick={()=>{setOrderToPay(o); setPagos([]);}} style={{padding:'10px', border:'1px solid #ccc', cursor:'pointer', marginBottom:'5px', background:o.status==='listo'?'#d4edda':'white'}}>
                  <b>{o.service_type} {o.table_number || o.customer_name}</b> - ${o.total_usd} ({o.status})
                </div>
              ))}
            </div>
            {orderToPay && (
              <div style={panel}>
                <h3>Cobrando: {orderToPay.table_number || orderToPay.customer_name}</h3>
                <h2 style={{color:'red'}}>Faltan: ${deudaRestanteUSD.toFixed(2)}</h2>
                <p>Equivalente: {(deudaRestanteUSD * tasa.bcv).toFixed(2)} Bs</p>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input type="number" placeholder="Monto" value={montoInput} onChange={e=>setMontoInput(e.target.value)} style={{width:'80px'}} />
                  <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                    <option value="usd_cash">$ Efectivo</option><option value="bs_cash">Bs Efectivo</option>
                    <option value="pago_movil">Pago Móvil</option><option value="zelle">Zelle</option><option value="cortesia">Cortesía</option>
                  </select>
                  <button onClick={agregarPago} style={{padding:'0 15px'}}>+</button>
                </div>
                {pagos.map((p,i)=><div key={i}>✓ {p.metodo}: ${p.montoUSD.toFixed(2)}</div>)}
                <button onClick={async ()=>{
                    if(deudaRestanteUSD > 0.01 && !pagos.some(p=>p.metodo==='cortesia')) return alert("Falta cubrir el saldo");
                    await supabase.from('payments').insert(pagos.map(p=>({order_id:orderToPay.id, method:p.metodo, amount_usd:p.montoUSD, amount_original:p.montoOriginal, exchange_rate:tasa.bcv})));
                    await supabase.from('orders').update({status:'pagado', is_courtesy:pagos.some(p=>p.metodo==='cortesia')}).eq('id',orderToPay.id);
                    alert("¡Pagado con éxito!"); setOrderToPay(null); fetchData();
                }} style={btnAction}>CERRAR CUENTA</button>
              </div>
            )}
          </div>
        )}

        {/* VISTA: INVENTARIO Y COMPRAS */}
        {activeTab === 'inventario' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={panel}>
              <h3>📦 Stock Actual</h3>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'2px solid #ddd'}}><th>Ítem</th><th>Stock</th><th>Unidad</th></tr></thead>
                <tbody>{inventario.map(i=>(<tr key={i.id} style={{borderBottom:'1px solid #eee'}}><td>{i.name}</td><td>{Number(i.stock).toFixed(2)}</td><td>{i.unit}</td></tr>))}</tbody>
              </table>
            </div>
            <div style={panel}>
              <h3>🛒 Cargar Compra</h3>
              <select style={input} onChange={e=>setNuevaCompra({...nuevaCompra, ingrediente: e.target.value})}><option>Elegir...</option>{inventario.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}</select>
              <input type="number" placeholder="Cantidad" style={input} value={nuevaCompra.cant} onChange={e=>setNuevaCompra({...nuevaCompra, cant:e.target.value})} />
              <input type="number" placeholder="Costo Total $" style={input} value={nuevaCompra.costo} onChange={e=>setNuevaCompra({...nuevaCompra, costo:e.target.value})} />
              <button onClick={async ()=>{
                await supabase.from('purchases').insert([{ingredient_name: nuevaCompra.ingrediente, quantity: nuevaCompra.cant, cost_usd: nuevaCompra.costo}]);
                alert("Stock actualizado"); setNuevaCompra({ingrediente:'', cant:'', costo:''}); fetchData();
              }} style={btnAction}>REGISTRAR COMPRA</button>
            </div>
          </div>
        )}

        {/* VISTA: DASHBOARD / REPORTE */}
        {activeTab === 'dashboard' && (
          <div style={panel}>
            <h3>📊 Cierre de Caja</h3>
            <button onClick={async ()=>{
                const {data} = await supabase.from('orders').select('*, payments(*)').gte('created_at', new Date().toISOString().split('T')[0]);
                const pagadas = data.filter(o=>o.status==='pagado');
                setReporteHoy({
                    total: pagadas.reduce((a,b)=>a+b.total_usd,0),
                    cantidad: pagadas.length,
                    cortesias: data.filter(o=>o.is_courtesy)
                });
            }} style={btnAction}>VER VENTAS DE HOY</button>
            {reporteHoy && (
                <div id="print-area" style={{marginTop:'20px', border:'2px solid black', padding:'20px'}}>
                    <center><h2>DONDE MANOLO - CIERRE</h2></center>
                    <p>Cuentas Cobradas: {reporteHoy.cantidad}</p>
                    <h2>TOTAL VENDIDO: ${reporteHoy.total.toFixed(2)}</h2>
                    <hr/>
                    <h4>Cortesías:</h4>
                    {reporteHoy.cortesias.map(c=><p key={c.id}>- {c.customer_name || c.table_number}: ${c.total_usd}</p>)}
                </div>
            )}
          </div>
        )}

      </div>
      <style>{`@media print {.no-print, button, nav { display: none !important; } #print-area { display: block !important; }}`}</style>
    </div>
  );
}

// ESTILOS
const btnBig = { padding:'25px', borderRadius:'12px', background:'white', color:'#b22222', fontWeight:'bold', border:'none', cursor:'pointer', fontSize:'1.1em', boxShadow:'0 4px 6px rgba(0,0,0,0.2)' };
const navBtn = { background:'none', border:'none', color:'white', cursor:'pointer', fontWeight:'bold' };
const panel = { background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' };
const card = { background:'white', padding:'10px', borderRadius:'8px', textAlign:'center', cursor:'pointer', border:'1px solid #ddd', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' };
const input = { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'5px', border:'1px solid #ccc' };
const btnAction = { width:'100%', padding:'15px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer' };
