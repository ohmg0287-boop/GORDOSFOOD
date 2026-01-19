import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

export default function DondeManoloApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [staff, setStaff] = useState([]); // Personal dinámico
  
  // DATOS GENERALES
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // CARRITO Y CAJA
  const [carrito, setCarrito] = useState([]);
  const [tipoServicio, setTipoServicio] = useState('Mesa');
  const [detalleServicio, setDetalleServicio] = useState('');
  const [orderToPay, setOrderToPay] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [montoInput, setMontoInput] = useState('');
  const [metodo, setMetodo] = useState('usd_cash');
  const [refPago, setRefPago] = useState('');

  // GESTIÓN DE STAFF (Admin)
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ name: '', role: 'mesero', pin: '' });

  useEffect(() => {
    fetchStaff();
    if (currentUser) {
      fetchData();
      if(['cocina','caja'].includes(currentUser.role)) {
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
      }
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
    let query = supabase.from('orders').select('*, order_items(*, product:products(name))').order('created_at', { ascending: false });
    if (currentUser.role === 'cocina') query = query.eq('status', 'pendiente');
    if (currentUser.role === 'caja') query = query.in('status', ['pendiente', 'listo']);
    const { data } = await query;
    if (data) setOrders(data);
  }

  // --- GESTIÓN DE EMPLEADOS ---
  const guardarEmpleado = async () => {
    if(!nuevoEmpleado.name || !nuevoEmpleado.pin) return alert("Faltan datos");
    await supabase.from('staff').insert([nuevoEmpleado]);
    alert("Empleado agregado");
    setNuevoEmpleado({ name: '', role: 'mesero', pin: '' });
    fetchStaff();
  };

  const desactivarEmpleado = async (id) => {
    if(confirm("¿Seguro que desea eliminar este acceso?")) {
        await supabase.from('staff').update({ active: false }).eq('id', id);
        fetchStaff();
    }
  };

  // --- LÓGICA DE PEDIDOS Y COBRO --- (Mantenemos la del paso anterior corregida)
  const enviarPedido = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    setLoading(true);
    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: carrito.reduce((a, b) => a + Number(b.price_usd), 0),
      service_type: tipoServicio,
      table_number: tipoServicio === 'Mesa' ? detalleServicio : null,
      customer_name: tipoServicio !== 'Mesa' ? detalleServicio : null,
      status: 'pendiente',
      created_by: currentUser.name
    }]).select().single();
    if (error) { alert(error.message); setLoading(false); return; }
    await supabase.from('order_items').insert(carrito.map(p => ({
      order_id: order.id, product_id: p.id, quantity: 1, price_at_time: p.price_usd, notes: p.nota || ''
    })));
    alert("✅ Enviado"); setCarrito([]); setDetalleServicio('');
    if(currentUser.role === 'caja') setActiveTab('caja_cobrar');
    fetchOrders(); setLoading(false);
  };

  const finalizarCobro = async () => {
    setLoading(true);
    const totalPagado = pagos.reduce((acc, p) => acc + p.montoUSD, 0);
    if (totalPagado < orderToPay.total_usd - 0.05 && !pagos.some(p=>p.metodo==='cortesia')) {
        alert("Falta cubrir el monto"); setLoading(false); return;
    }
    await supabase.from('payments').insert(pagos.map(p => ({
        order_id: orderToPay.id, method: p.metodo, amount_original: p.montoOriginal, amount_usd: p.montoUSD, exchange_rate: tasa.bcv, detalle: p.detalle
    })));
    await supabase.from('orders').update({ status: 'pagado' }).eq('id', orderToPay.id);
    alert("Cobro exitoso"); setOrderToPay(null); setPagos([]); fetchOrders(); setLoading(false);
  };

  // --- VISTAS ---
  if (!currentUser) return (
    <div style={{height:'100vh', background:'#b22222', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'}}>
      <h1 style={{marginBottom:'10px'}}>🍔 DONDE MANOLO</h1>
      <p>Seleccione su usuario:</p>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', maxWidth:'500px'}}>
        {staff.map(u => (
          <button key={u.id} onClick={() => {
            const pin = prompt(`Ingrese PIN para ${u.name}:`);
            if(pin === u.pin) {
                setCurrentUser(u);
                if(u.role === 'mesero') setActiveTab('tomar_pedido');
                else if(u.role === 'cocina') setActiveTab('cocina');
                else if(u.role === 'caja') setActiveTab('caja_cobrar');
                else setActiveTab('admin_dashboard');
            } else { alert("PIN Incorrecto"); }
          }} style={btnBig}>{u.name}<br/><small>{u.role.toUpperCase()}</small></button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="notranslate" style={{fontFamily:'sans-serif', background:'#f4f4f4', minHeight:'100vh'}}>
      <nav className="no-print" style={{background:'#333', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div><strong>{currentUser.name}</strong> ({currentUser.role})</div>
        <div style={{display:'flex', gap:'10px'}}>
           {currentUser.role === 'admin' && <button onClick={()=>setActiveTab('admin_dashboard')} style={navBtn}>Dashboard</button>}
           {currentUser.role === 'admin' && <button onClick={()=>setActiveTab('usuarios')} style={navBtn}>Personal</button>}
           {currentUser.role === 'admin' && <button onClick={()=>setActiveTab('inventario')} style={navBtn}>Inventario</button>}
           {currentUser.role === 'caja' && <button onClick={()=>setActiveTab('caja_cobrar')} style={navBtn}>Caja</button>}
           {currentUser.role === 'caja' && <button onClick={()=>setActiveTab('tomar_pedido')} style={navBtn}>+ Venta Delivery</button>}
           <button onClick={()=>window.print()} style={{...navBtn, color:'#4caf50'}}>🖨️ Imprimir</button>
           <button onClick={()=>window.location.reload()} style={{...navBtn, color:'yellow'}}>Cerrar Sesión</button>
        </div>
      </nav>

      <div style={{padding:'20px', maxWidth:'1200px', margin:'auto'}}>
        
        {/* MODULO ADMINISTRACIÓN DE PERSONAL */}
        {activeTab === 'usuarios' && currentUser.role === 'admin' && (
            <div style={panel}>
                <h3>👥 Gestión de Personal</h3>
                <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <input placeholder="Nombre" value={nuevoEmpleado.name} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, name:e.target.value})} style={input}/>
                    <select value={nuevoEmpleado.role} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, role:e.target.value})} style={input}>
                        <option value="mesero">Mesero</option><option value="caja">Cajera</option>
                        <option value="cocina">Cocinero</option><option value="admin">Administrador</option>
                    </select>
                    <input placeholder="PIN (4 nros)" value={nuevoEmpleado.pin} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, pin:e.target.value})} style={input}/>
                    <button onClick={guardarEmpleado} style={{background:'green', color:'white', border:'none', padding:'0 20px', borderRadius:'5px'}}>Añadir</button>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead><tr style={{textAlign:'left', borderBottom:'1px solid #ddd'}}><th>Nombre</th><th>Cargo</th><th>PIN</th><th>Acción</th></tr></thead>
                    <tbody>
                        {staff.map(s => (
                            <tr key={s.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:'10px'}}>{s.name}</td>
                                <td>{s.role}</td>
                                <td>****</td>
                                <td><button onClick={()=>desactivarEmpleado(s.id)} style={{color:'red', background:'none', border:'none', cursor:'pointer'}}>Eliminar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* --- AQUÍ SE MANTIENEN LAS OTRAS VISTAS (Inventario, Cocina, Caja) DEL PASO ANTERIOR --- */}
        {/* (Copia aquí el bloque de Tomar Pedido, Cocina y Caja del código anterior) */}
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
                  <h3>Orden</h3>
                  <select value={tipoServicio} onChange={e=>setTipoServicio(e.target.value)} style={input}><option>Mesa</option><option>Delivery</option><option>Llevar</option></select>
                  <input placeholder="Referencia Mesa/Cliente" value={detalleServicio} onChange={e=>setDetalleServicio(e.target.value)} style={input} />
                  <div style={{maxHeight:'300px', overflowY:'auto'}}>
                    {carrito.map(item => (
                        <div key={item.tmp} style={{borderBottom:'1px solid #eee', marginBottom:'10px'}}>
                          <div style={{display:'flex', justifyContent:'space-between'}}><b>{item.name}</b> <span onClick={()=>setCarrito(carrito.filter(x=>x.tmp!==item.tmp))} style={{color:'red', cursor:'pointer'}}>X</span></div>
                          <input placeholder="Sin cebolla, etc..." value={item.nota} onChange={e=>setCarrito(carrito.map(x=>x.tmp===item.tmp ? {...x, nota:e.target.value}:x))} style={{width:'100%'}} />
                        </div>
                    ))}
                  </div>
                  <button onClick={enviarPedido} style={btnAction}>CONFIRMAR</button>
                </div>
            </div>
        )}

        {activeTab === 'cocina' && (
          <div>
            <h3>Cocina</h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'15px'}}>
              {orders.map(o => (
                <div key={o.id} style={{background:'white', padding:'15px', borderLeft:'5px solid orange'}}>
                  <h4>{o.service_type} - {o.table_number || o.customer_name}</h4>
                  <ul>{o.order_items.map(i => <li key={i.id}>{i.quantity}x {i.product.name} {i.notes && <b style={{background:'yellow'}}>({i.notes})</b>}</li>)}</ul>
                  <button onClick={async ()=>{await supabase.from('orders').update({status:'listo'}).eq('id',o.id); fetchOrders();}} style={btnAction}>LISTO ✅</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'caja_cobrar' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div>
              <h3>Órdenes Pendientes</h3>
              {orders.filter(o => o.status !== 'pagado').map(o => (
                <div key={o.id} onClick={() => { setOrderToPay(o); setPagos([]); }} style={{padding:'10px', background: o.status === 'listo' ? '#d4edda' : '#fff3cd', border:'1px solid #ccc', margin:'5px 0', cursor:'pointer'}}>
                   <strong>{o.service_type} {o.table_number || o.customer_name}</strong> (${o.total_usd})
                </div>
              ))}
            </div>
            <div style={panel}>
              {orderToPay ? (
                <>
                  <h2>Total: ${orderToPay.total_usd}</h2>
                  <p>Bs. {(orderToPay.total_usd * tasa.bcv).toFixed(2)}</p>
                  <div style={{background:'#eee', padding:'10px', borderRadius:'5px'}}>
                    <input type="number" placeholder="Monto" value={montoInput} onChange={e=>setMontoInput(e.target.value)} style={{width:'80px'}} />
                    <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                       <option value="usd_cash">$ Efec</option><option value="bs_cash">Bs Efec</option>
                       <option value="pago_movil">P.Movil</option><option value="zelle">Zelle</option><option value="cortesia">Cortesía</option>
                    </select>
                    <button onClick={() => {
                        const m = parseFloat(montoInput);
                        if(m > 0 || metodo === 'cortesia') {
                            let usd = (metodo === 'usd_cash' || metodo === 'zelle') ? m : (metodo === 'cortesia' ? orderToPay.total_usd : m / tasa.bcv);
                            setPagos([...pagos, { metodo, montoUSD: usd, montoOriginal: m }]);
                            setMontoInput('');
                        }
                    }}>+</button>
                  </div>
                  {pagos.map((p,i)=><div key={i}>✓ {p.metodo}: ${p.montoUSD.toFixed(2)}</div>)}
                  <button onClick={finalizarCobro} style={btnAction}>CERRAR CUENTA</button>
                </>
              ) : <p>Seleccione una cuenta para cobrar</p>}
            </div>
          </div>
        )}

        {activeTab === 'inventario' && (
            <div style={panel}>
                <h3>Inventario de Insumos</h3>
                <table style={{width:'100%'}}>
                    <thead><tr style={{textAlign:'left'}}><th>Item</th><th>Stock</th><th>Ajuste</th></tr></thead>
                    <tbody>
                        {inventario.map(i => (
                            <tr key={i.id} style={{borderBottom:'1px solid #eee'}}>
                                <td>{i.name}</td>
                                <td>{Number(i.stock).toFixed(1)} {i.unit}</td>
                                <td><input type="number" placeholder="Nuevo" onBlur={async (e)=>{ if(e.target.value){ await supabase.from('ingredients').update({stock: e.target.value}).eq('id',i.id); fetchData(); }}} style={{width:'60px'}}/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'admin_dashboard' && (
            <div style={panel}>
                <h2>Resumen de Ventas</h2>
                <p>Tasa BCV: <input type="number" value={tasa.bcv} onChange={e=>setTasa({bcv:parseFloat(e.target.value)})} /> <button onClick={async ()=>{await supabase.from('settings').upsert({key:'exchange_rate', value:tasa}); alert('Ok')}}>Guardar</button></p>
                <button onClick={async ()=>{
                    const { data:v } = await supabase.from('orders').select('total_usd').eq('status','pagado');
                    const total = v?.reduce((a,b)=>a+b.total_usd,0) || 0;
                    alert("Ventas Totales: $" + total.toFixed(2));
                }} style={btnAction}>Generar Reporte de Hoy</button>
            </div>
        )}

      </div>
      <style>{`@media print {.no-print, button, nav { display: none !important; } body { background: white; }}`}</style>
    </div>
  );
}

const btnBig = { padding:'20px', fontSize:'1em', borderRadius:'8px', cursor:'pointer', background:'white', color:'#b22222', fontWeight:'bold', border:'none', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' };
const navBtn = { background:'none', border:'none', color:'white', cursor:'pointer', fontWeight:'bold', padding:'5px 10px' };
const panel = { background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' };
const card = { background:'white', padding:'10px', borderRadius:'8px', textAlign:'center', cursor:'pointer', border:'1px solid #ddd' };
const input = { padding:'8px', borderRadius:'5px', border:'1px solid #ccc' };
const btnAction = { width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer', marginTop:'15px' };
