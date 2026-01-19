import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

// --- CONFIGURACIÓN DE ROLES ---
const USERS = [
  { name: 'Manolo (Dueño)', role: 'admin' },
  { name: 'Administrador', role: 'admin' },
  { name: 'Cajera Principal', role: 'caja' },
  { name: 'Cocinero Jefe', role: 'cocina' },
  { name: 'Mesero 1', role: 'mesero' },
  { name: 'Mesero 2', role: 'mesero' }
];

export default function DondeManoloApp() {
  const [currentUser, setCurrentUser] = useState(null); // { name, role }
  const [activeTab, setActiveTab] = useState('');
  
  // Datos Generales
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 });
  const [orders, setOrders] = useState([]); // Para cocina y caja
  const [loading, setLoading] = useState(false);

  // Carrito (Mesero)
  const [carrito, setCarrito] = useState([]);
  const [tipoServicio, setTipoServicio] = useState('Mesa');
  const [detalleServicio, setDetalleServicio] = useState('');
  
  // Pagos (Caja)
  const [orderToPay, setOrderToPay] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [montoInput, setMontoInput] = useState('');
  const [metodo, setMetodo] = useState('usd_cash');
  const [cortesiaA, setCortesiaA] = useState('');

  // Reportes y Gestión (Admin)
  const [gastos, setGastos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ desc: '', monto: '', cat: 'Nomina' });
  const [nuevaCompra, setNuevaCompra] = useState({ ingrediente: '', cant: '', costo: '' });
  const [reporteSemanal, setReporteSemanal] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (currentUser.role === 'cocina' || currentUser.role === 'caja') {
        // Refresco automático para cocina y caja cada 30 seg
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [currentUser]);

  // --- CARGA DE DATOS ---
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
    // Trae ordenes de hoy que no estén completadas (o todas si es admin)
    let query = supabase.from('orders').select('*, order_items(*, product:products(name))').order('created_at', { ascending: false });
    if (currentUser.role === 'cocina') query = query.eq('status', 'pendiente');
    if (currentUser.role === 'caja') query = query.in('status', ['pendiente', 'listo']); // Cajera ve lo que falta cobrar
    const { data } = await query;
    if (data) setOrders(data);
  }

  // --- LÓGICA MESERO (TOMAR PEDIDO) ---
  const enviarPedidoCocina = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    setLoading(true);
    
    // 1. Crear Orden
    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: carrito.reduce((a, b) => a + Number(b.price_usd), 0),
      service_type: tipoServicio,
      table_number: tipoServicio === 'Mesa' ? detalleServicio : null,
      customer_name: tipoServicio !== 'Mesa' ? detalleServicio : null,
      status: 'pendiente', // Va a cocina
      created_by: currentUser.name
    }]).select().single();

    if (error) { alert("Error: " + error.message); setLoading(false); return; }

    // 2. Crear Items
    const items = carrito.map(p => ({
      order_id: order.id,
      product_id: p.id,
      quantity: 1,
      price_at_time: p.price_usd,
      notes: p.nota || ''
    }));
    await supabase.from('order_items').insert(items);

    alert("¡Pedido enviado a Cocina!");
    setCarrito([]); setDetalleServicio('');
    setLoading(false);
  };

  // --- LÓGICA COCINA ---
  const marcarListo = async (orderId) => {
    await supabase.from('orders').update({ status: 'listo' }).eq('id', orderId);
    fetchOrders(); // Recargar lista
  };

  // --- LÓGICA CAJA (COBRAR Y DESCONTAR INVENTARIO) ---
  const totalPagado = pagos.reduce((acc, p) => acc + p.montoUSD, 0);
  const restante = orderToPay ? Math.max(0, orderToPay.total_usd - totalPagado) : 0;

  const agregarPago = () => {
    const m = parseFloat(montoInput);
    if ((!m || m <= 0) && metodo !== 'cortesia') return;
    
    if (metodo === 'cortesia') {
      if (!cortesiaA) return alert("Especifique para quién es la cortesía");
      setPagos([...pagos, { metodo: 'cortesia', montoUSD: orderToPay.total_usd, montoOriginal: 0, detalle: cortesiaA }]);
    } else {
      let usd = (metodo === 'usd_cash' || metodo === 'zelle') ? m : m / tasa.bcv;
      setPagos([...pagos, { metodo, montoUSD: usd, montoOriginal: m }]);
    }
    setMontoInput('');
  };

  const finalizarCobro = async () => {
    if (restante > 0.05 && metodo !== 'cortesia') return alert("Falta pago");
    setLoading(true);

    try {
        // 1. Registrar Pagos
        const pagosFinales = pagos.map(p => ({
            order_id: orderToPay.id,
            method: p.metodo,
            amount_original: p.montoOriginal,
            amount_usd: p.montoUSD,
            exchange_rate: p.metodo.includes('bs') ? tasa.bcv : null
        }));
        await supabase.from('payments').insert(pagosFinales);

        // 2. Si es cortesía, actualizar la orden
        const esCortesia = pagos.some(p => p.metodo === 'cortesia');
        await supabase.from('orders').update({ 
            status: 'pagado', 
            is_courtesy: esCortesia,
            courtesy_for: esCortesia ? cortesiaA : null
        }).eq('id', orderToPay.id);

        // 3. DESCONTAR INVENTARIO (Aquí sucede la magia)
        // Buscamos los items de la orden -> sus recetas -> descontamos ingredientes
        const { data: items } = await supabase.from('order_items').select('product_id').eq('order_id', orderToPay.id);
        
        for (let item of items) {
             // Buscamos la receta del producto
             const { data: recipe } = await supabase.from('recipes').select('*').eq('product_id', item.product_id);
             if (recipe) {
                 for (let r of recipe) {
                     // SQL Query directa para restar stock de forma segura
                     const { error: invErr } = await supabase.rpc('descontar_stock', { 
                        ing_id: r.ingredient_id, 
                        qty: r.quantity 
                     });
                     // Si la función RPC no existe, usamos update normal (menos seguro pero funcional)
                     if (invErr) { 
                        // Fallback lógica frontend
                        const { data: ing } = await supabase.from('ingredients').select('stock').eq('id', r.ingredient_id).single();
                        if(ing) await supabase.from('ingredients').update({ stock: ing.stock - r.quantity }).eq('id', r.ingredient_id);
                     }
                 }
             }
        }

        alert("Cobro exitoso. Inventario actualizado.");
        setOrderToPay(null); setPagos([]); setCortesiaA('');
        fetchOrders();
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  // --- LÓGICA ADMIN (COMPRAS Y GASTOS) ---
  const registrarCompra = async () => {
    // 1. Guardar registro de compra
    await supabase.from('purchases').insert([{
        ingredient_name: nuevaCompra.ingrediente,
        quantity: nuevaCompra.cant,
        cost_usd: nuevaCompra.costo,
        created_by: currentUser.name
    }]);
    // 2. Aumentar Stock
    const { data: ing } = await supabase.from('ingredients').select('*').ilike('name', `%${nuevaCompra.ingrediente}%`).single();
    if (ing) {
        await supabase.from('ingredients').update({ stock: ing.stock + parseFloat(nuevaCompra.cant) }).eq('id', ing.id);
        alert("Stock aumentado y compra registrada");
    } else {
        alert("Compra registrada, pero el ingrediente no se encontró en inventario para sumar stock automáticamente.");
    }
    setNuevaCompra({ ingrediente: '', cant: '', costo: '' });
  };

  const registrarGasto = async () => {
    await supabase.from('expenses').insert([{
        description: nuevoGasto.desc,
        amount_usd: nuevoGasto.monto,
        category: nuevoGasto.cat,
        created_by: currentUser.name
    }]);
    alert("Gasto registrado");
    setNuevoGasto({ desc: '', monto: '', cat: 'Nomina' });
  };

  const generarReporteSemanal = async () => {
    // Traer ventas de los últimos 7 días
    const { data: v } = await supabase.from('orders').select('total_usd, created_at').eq('status', 'pagado').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const { data: g } = await supabase.from('expenses').select('amount_usd').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const { data: c } = await supabase.from('purchases').select('cost_usd').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const totalVentas = v?.reduce((a,b) => a + b.total_usd, 0) || 0;
    const totalGastos = g?.reduce((a,b) => a + b.amount_usd, 0) || 0;
    const totalCompras = c?.reduce((a,b) => a + b.cost_usd, 0) || 0;

    setReporteSemanal({ ventas: totalVentas, gastos: totalGastos, compras: totalCompras, utilidad: totalVentas - totalGastos - totalCompras });
  };


  // --- VISTAS ---

  // 1. LOGIN
  if (!currentUser) return (
    <div style={{height:'100vh', background:'#b22222', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'}}>
      <h1>🍔 DONDE MANOLO - LOGIN</h1>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
        {USERS.map(u => (
          <button key={u.name} onClick={() => { setCurrentUser(u); setActiveTab(u.role === 'mesero' ? 'tomar_pedido' : u.role === 'cocina' ? 'cocina' : u.role === 'caja' ? 'caja' : 'admin_dashboard'); }} style={btnBig}>
            {u.name} <br/><small>({u.role.toUpperCase()})</small>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div lang="es" className="notranslate" style={{fontFamily:'sans-serif', background:'#f4f4f4', minHeight:'100vh'}}>
      {/* HEADER */}
      <nav style={{background:'#333', color:'white', padding:'15px', display:'flex', justifyContent:'space-between'}}>
        <div><strong>{currentUser.name}</strong> ({currentUser.role})</div>
        <div style={{display:'flex', gap:'10px'}}>
           {currentUser.role === 'admin' && <button onClick={() => setActiveTab('admin_dashboard')} style={navBtn}>Dashboard</button>}
           {currentUser.role === 'admin' && <button onClick={() => setActiveTab('inventario')} style={navBtn}>Inventario</button>}
           <button onClick={() => {setCurrentUser(null); setOrders([]);}} style={{...navBtn, color:'yellow'}}>Cerrar Sesión</button>
        </div>
      </nav>

      <div style={{padding:'20px', maxWidth:'1200px', margin:'auto'}}>
        
        {/* VISTA MESERO */}
        {currentUser.role === 'mesero' && (
           <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
             <div>
               <h3>Menú</h3>
               <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'10px'}}>
                 {productos.map(p => (
                   <div key={p.id} onClick={() => setCarrito([...carrito, {...p, nota: '', tmp: Date.now()+Math.random()}])} style={card}>
                     <b>{p.name}</b><br/><span style={{color:'green'}}>${p.price_usd}</span>
                   </div>
                 ))}
               </div>
             </div>
             <div style={panel}>
               <h3>Orden Actual</h3>
               <select value={tipoServicio} onChange={e=>setTipoServicio(e.target.value)} style={input}><option>Mesa</option><option>Delivery</option><option>Llevar</option></select>
               <input placeholder="Mesa # / Cliente" value={detalleServicio} onChange={e=>setDetalleServicio(e.target.value)} style={input} />
               <div style={{maxHeight:'300px', overflowY:'auto'}}>
                 {carrito.map(item => (
                   <div key={item.tmp} style={{borderBottom:'1px solid #eee', marginBottom:'5px'}}>
                     <div style={{display:'flex', justifyContent:'space-between'}}><b>{item.name}</b> <span onClick={()=>setCarrito(carrito.filter(x=>x.tmp!==item.tmp))} style={{color:'red', cursor:'pointer'}}>X</span></div>
                     <input placeholder="Nota: Sin cebolla..." value={item.nota} onChange={e=>setCarrito(carrito.map(x=>x.tmp===item.tmp ? {...x, nota:e.target.value}:x))} style={{width:'90%', fontSize:'0.8em'}} />
                   </div>
                 ))}
               </div>
               <button onClick={enviarPedidoCocina} style={btnAction}>ENVIAR A COCINA</button>
             </div>
           </div>
        )}

        {/* VISTA COCINA */}
        {currentUser.role === 'cocina' && (
          <div>
            <h3>👨‍🍳 Pedidos Pendientes <button onClick={fetchOrders}>🔄</button></h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
              {orders.length === 0 ? <p>No hay pedidos pendientes.</p> : orders.map(o => (
                <div key={o.id} style={{background:'white', padding:'15px', borderLeft:'5px solid orange', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                  <h4>{o.service_type} - {o.table_number || o.customer_name}</h4>
                  <p><small>{new Date(o.created_at).toLocaleTimeString()}</small></p>
                  <ul>
                    {o.order_items.map(i => (
                      <li key={i.id} style={{fontSize:'1.1em'}}>
                        {i.quantity}x <b>{i.product.name}</b>
                        {i.notes && <div style={{background:'yellow', padding:'2px'}}>⚠️ {i.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => marcarListo(o.id)} style={btnAction}>MARCAR LISTO ✅</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA CAJA */}
        {currentUser.role === 'caja' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div>
              <h3>Órdenes por Cobrar <button onClick={fetchOrders}>🔄</button></h3>
              {orders.filter(o => o.status !== 'pagado').map(o => (
                <div key={o.id} onClick={() => { setOrderToPay(o); setPagos([]); }} style={{padding:'10px', background: o.status === 'listo' ? '#d4edda' : '#fff3cd', border:'1px solid #ccc', margin:'5px 0', cursor:'pointer'}}>
                   <strong>{o.service_type} {o.table_number || o.customer_name}</strong> - ${o.total_usd}
                   <br/><small>Estado: {o.status.toUpperCase()}</small>
                </div>
              ))}
            </div>
            
            <div style={panel}>
              {orderToPay ? (
                <>
                  <h3>Cobrando: {orderToPay.customer_name || orderToPay.table_number}</h3>
                  <h1 style={{textAlign:'right'}}>${orderToPay.total_usd}</h1>
                  <p>Bs. {(orderToPay.total_usd * tasa.bcv).toFixed(2)}</p>
                  <hr/>
                  <div style={{display:'flex', gap:'5px'}}>
                     <input type="number" placeholder="Monto" value={montoInput} onChange={e=>setMontoInput(e.target.value)} style={{flex:1}} />
                     <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                       <option value="usd_cash">$ Efec</option>
                       <option value="bs_cash">Bs Efec</option>
                       <option value="pago_movil">P. Móvil</option>
                       <option value="zelle">Zelle</option>
                       <option value="cortesia">Cortesía</option>
                     </select>
                     <button onClick={agregarPago} style={{background:'#333', color:'white', border:'none', padding:'0 10px'}}>+</button>
                  </div>
                  
                  {metodo === 'cortesia' && (
                     <input placeholder="Nombre del beneficiario de cortesía" value={cortesiaA} onChange={e=>setCortesiaA(e.target.value)} style={{...input, borderColor:'orange'}} />
                  )}

                  {pagos.map((p,i) => <div key={i} style={{color:'green'}}>✔ {p.metodo} ({p.detalle}): ${p.montoUSD.toFixed(2)}</div>)}
                  
                  <h3 style={{color: restante > 0 ? 'red' : 'green'}}>Resta: ${restante.toFixed(2)}</h3>
                  <button disabled={restante > 0.05 && metodo !== 'cortesia'} onClick={finalizarCobro} style={btnAction}>FINIQUITAR PAGO</button>
                  <button onClick={()=>setOrderToPay(null)} style={{marginTop:'10px'}}>Cancelar</button>
                </>
              ) : <p>Selecciona una orden de la izquierda para cobrar.</p>}
            </div>
          </div>
        )}

        {/* VISTA ADMIN (MANOLO) */}
        {currentUser.role === 'admin' && activeTab === 'admin_dashboard' && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div style={panel}>
                    <h3>⚙️ Configuración</h3>
                    <label>Tasa BCV:</label>
                    <input type="number" value={tasa.bcv} onChange={e=>setTasa({bcv:parseFloat(e.target.value)})} style={input}/>
                    <button onClick={async ()=>{await supabase.from('settings').upsert({key:'exchange_rate', value:tasa}); alert("Guardado");}} style={btnAction}>Guardar Tasa</button>
                </div>
                
                <div style={panel}>
                    <h3>📉 Registrar Gastos / Nómina</h3>
                    <input placeholder="Descripción (Ej: Pago Cocinero)" value={nuevoGasto.desc} onChange={e=>setNuevoGasto({...nuevoGasto, desc:e.target.value})} style={input}/>
                    <input type="number" placeholder="Monto USD" value={nuevoGasto.monto} onChange={e=>setNuevoGasto({...nuevoGasto, monto:e.target.value})} style={input}/>
                    <select value={nuevoGasto.cat} onChange={e=>setNuevoGasto({...nuevoGasto, cat:e.target.value})} style={input}>
                        <option>Nomina</option><option>Servicios</option><option>Mantenimiento</option><option>Proveedores</option>
                    </select>
                    <button onClick={registrarGasto} style={{...btnAction, background:'#d9534f'}}>Registrar Gasto</button>
                </div>

                <div style={panel}>
                    <h3>📦 Cargar Compra (Entrada Inv.)</h3>
                    <input placeholder="Ingrediente (Ej: Pan)" value={nuevaCompra.ingrediente} onChange={e=>setNuevaCompra({...nuevaCompra, ingrediente:e.target.value})} style={input}/>
                    <input type="number" placeholder="Cantidad a sumar" value={nuevaCompra.cant} onChange={e=>setNuevaCompra({...nuevaCompra, cant:e.target.value})} style={input}/>
                    <input type="number" placeholder="Costo Total USD" value={nuevaCompra.costo} onChange={e=>setNuevaCompra({...nuevaCompra, costo:e.target.value})} style={input}/>
                    <button onClick={registrarCompra} style={{...btnAction, background:'#0275d8'}}>Registrar Compra y Sumar Stock</button>
                </div>

                <div style={panel}>
                    <h3>📊 Reporte Semanal (Rentabilidad)</h3>
                    <button onClick={generarReporteSemanal} style={btnAction}>Generar Reporte</button>
                    {reporteSemanal && (
                        <div style={{marginTop:'15px'}}>
                            <p>Ventas Totales: <b style={{color:'green'}}>${reporteSemanal.ventas.toFixed(2)}</b></p>
                            <p>Gastos Operativos: <b style={{color:'red'}}>-${reporteSemanal.gastos.toFixed(2)}</b></p>
                            <p>Compras Insumos: <b style={{color:'orange'}}>-${reporteSemanal.compras.toFixed(2)}</b></p>
                            <hr/>
                            <h3>Utilidad Neta: <span style={{color: reporteSemanal.utilidad > 0 ? 'green' : 'red'}}>${reporteSemanal.utilidad.toFixed(2)}</span></h3>
                        </div>
                    )}
                </div>
            </div>
        )}

        {currentUser.role === 'admin' && activeTab === 'inventario' && (
            <div style={panel}>
                <h3>Inventario Actual (Solo Lectura)</h3>
                <button onClick={fetchData}>Actualizar</button>
                <table style={{width:'100%', marginTop:'10px'}}>
                    <thead><tr><th>Ingrediente</th><th>Stock</th><th>Unidad</th></tr></thead>
                    <tbody>
                        {inventario.map(i => (
                            <tr key={i.id}><td>{i.name}</td><td style={{fontWeight:'bold', color: i.stock < 20 ? 'red':'black'}}>{i.stock}</td><td>{i.unit}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

      </div>
    </div>
  );
}

// ESTILOS SIMPLES
const btnBig = { padding:'30px', margin:'10px', fontSize:'1.2em', borderRadius:'8px', border:'none', cursor:'pointer', background:'white', color:'#b22222', fontWeight:'bold' };
const navBtn = { background:'none', border:'none', color:'white', cursor:'pointer', fontWeight:'bold', fontSize:'1em' };
const panel = { background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' };
const card = { background:'white', padding:'15px', borderRadius:'8px', textAlign:'center', cursor:'pointer', border:'1px solid #ddd' };
const input = { width:'95%', padding:'10px', marginBottom:'10px', borderRadius:'5px', border:'1px solid #ccc' };
const btnAction = { width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer' };
