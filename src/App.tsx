import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONEXIÓN SUPABASE ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

// --- TIPOS Y ESTADOS ---
export default function DondeManoloApp() {
  // Sesión y Navegación
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // login, dashboard, pos_mesero, pos_caja, cocina, inventario
  const [loading, setLoading] = useState(false);

  // Datos Maestros
  const [staff, setStaff] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [tasa, setTasa] = useState(0); // Tasa BCV actual

  // Operativos
  const [orders, setOrders] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({ type: 'Mesa', info: '' });

  // Caja / Multipago
  const [orderToPay, setOrderToPay] = useState(null);
  const [pagosActuales, setPagosActuales] = useState([]); // [{method, amount_usd, amount_bs}]
  const [montoInput, setMontoInput] = useState('');
  const [metodoPago, setMetodoPago] = useState('usd_efectivo');

  // Reportes y Admin
  const [rangoFechas, setRangoFechas] = useState({ inicio: new Date().toISOString().split('T')[0], fin: new Date().toISOString().split('T')[0] });
  const [reporteData, setReporteData] = useState(null);
  const [nuevoGasto, setNuevoGasto] = useState({ desc: '', monto: '', cat: 'Varios' });
  const [nuevaCompra, setNuevaCompra] = useState({ ing: '', cant: '', costo: '' });
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ name: '', role: 'mesero', pin: '' });

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    fetchStaff();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProducts();
      if (['admin', 'caja', 'cocina'].includes(currentUser.role)) {
        fetchOrders(); // Carga inicial
        const interval = setInterval(fetchOrders, 10000); // Refresco tiempo real
        return () => clearInterval(interval);
      }
    }
  }, [currentUser]);

  // --- FUNCIONES DE BASE DE DATOS ---
  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').eq('active', true);
    if (data) setStaff(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (data) setTasa(data.value.bcv || 0);
  };

  const fetchProducts = async () => {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: i } = await supabase.from('ingredients').select('*').order('name');
    if (p) setProductos(p);
    if (i) setIngredientes(i);
  };

  const fetchOrders = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    let query = supabase.from('orders')
      .select('*, order_items(*, product:products(name)), payments(*)')
      .order('created_at', { ascending: false });
    
    // Mesero no necesita ver historial de días anteriores en esta carga masiva
    if (currentUser?.role === 'cocina') query = query.eq('status', 'pendiente');
    
    const { data } = await query;
    if (data) setOrders(data);
  };

  // --- LÓGICA DE USUARIO ---
  const handleLogin = (pinAttempt) => {
    const user = staff.find(u => u.pin === pinAttempt);
    if (user) {
      setCurrentUser(user);
      if (tasa === 0 && user.role === 'admin') {
        alert("⚠️ ATENCIÓN: La tasa de cambio es 0. Por favor configúrela inmediatamente.");
        setActiveTab('dashboard');
      } else if (user.role === 'admin') setActiveTab('dashboard');
      else if (user.role === 'caja') setActiveTab('pos_caja');
      else if (user.role === 'mesero') setActiveTab('pos_mesero');
      else if (user.role === 'cocina') setActiveTab('cocina');
    } else {
      alert("PIN Incorrecto");
    }
  };

  // --- MESERO: TOMA DE PEDIDOS ---
  const addToCart = (product) => {
    // Estructura de item en carrito
    const item = {
      ...product,
      tempId: Date.now() + Math.random(),
      notes: ''
    };
    setCarrito([...carrito, item]);
  };

  const sendOrder = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (!serviceDetails.info) return alert("Indique mesa o cliente");

    setLoading(true);
    try {
      // 1. Crear Orden
      const { data: order, error } = await supabase.from('orders').insert([{
        total_usd: carrito.reduce((sum, item) => sum + item.price_usd, 0),
        status: 'pendiente',
        service_type: serviceDetails.type,
        table_number: serviceDetails.type === 'Mesa' ? serviceDetails.info : null,
        customer_name: serviceDetails.type !== 'Mesa' ? serviceDetails.info : null,
        created_by: currentUser.name,
        exchange_rate: tasa // Tasa Congelada Inicial
      }]).select().single();

      if (error) throw error;

      // 2. Crear Items
      const itemsToInsert = carrito.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: 1,
        price_at_time: item.price_usd,
        notes: item.notes
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      alert("Pedido enviado a cocina 👨‍🍳");
      setCarrito([]);
      setServiceDetails({ type: 'Mesa', info: '' });
      fetchOrders();
    } catch (error) {
      alert("Error enviando pedido: " + error.message);
    }
    setLoading(false);
  };

  // --- COCINA ---
  const markReady = async (orderId) => {
    await supabase.from('orders').update({ status: 'listo' }).eq('id', orderId);
    fetchOrders();
  };

  // --- CAJA: MULTIPAGO Y CÁLCULOS ---
  const iniciarCobro = (order) => {
    setOrderToPay(order);
    setPagosActuales([]);
    // Si la orden ya tenía tasa (ej: creada hace horas), usamos esa. Si no, la actual.
    // NOTA: Para este requerimiento, usamos la tasa actual para calcular la conversión AHORA,
    // pero guardaremos la tasa final en el pago.
  };

  const agregarPago = () => {
    const val = parseFloat(montoInput);
    if (!val && metodoPago !== 'obsequio') return;

    let montoUSD = 0;
    // Conversión a USD según metodo
    if (metodoPago === 'obsequio') {
        // Obsequio cubre todo el restante
        const pagado = pagosActuales.reduce((acc, p) => acc + p.amount_usd, 0);
        montoUSD = orderToPay.total_usd - pagado;
    } else if (['bs_efectivo', 'pago_movil', 'punto'].includes(metodoPago)) {
        montoUSD = val / tasa;
    } else {
        montoUSD = val; // usd_efectivo, zelle
    }

    setPagosActuales([...pagosActuales, {
        method: metodoPago,
        amount_original: metodoPago === 'obsequio' ? 0 : val,
        amount_usd: montoUSD
    }]);
    setMontoInput('');
  };

  const finalizarVenta = async () => {
    const totalPagado = pagosActuales.reduce((acc, p) => acc + p.amount_usd, 0);
    const esObsequio = pagosActuales.some(p => p.method === 'obsequio');
    
    // Validación de margen de error pequeño por decimales
    if (totalPagado < orderToPay.total_usd - 0.05 && !esObsequio) {
        return alert("El monto no cubre la cuenta");
    }

    setLoading(true);
    try {
        // 1. Guardar Pagos
        const inserts = pagosActuales.map(p => ({
            order_id: orderToPay.id,
            method: p.method,
            amount_usd: p.amount_usd,
            amount_original: p.amount_original,
            exchange_rate: tasa // TASA CONGELADA AL MOMENTO DEL PAGO
        }));
        await supabase.from('payments').insert(inserts);

        // 2. Cerrar Orden (El Trigger SQL descontará inventario)
        await supabase.from('orders').update({
            status: 'pagado',
            is_courtesy: esObsequio,
            exchange_rate: tasa // Actualizamos la tasa de cierre de la orden
        }).eq('id', orderToPay.id);

        alert("Venta procesada exitosamente 💰");
        setOrderToPay(null);
        setPagosActuales([]);
        fetchOrders();
    } catch (e) {
        alert("Error: " + e.message);
    }
    setLoading(false);
  };

  // Cálculos de vuelto
  const totalAbonadoUSD = pagosActuales.reduce((acc, p) => acc + p.amount_usd, 0);
  const restanteUSD = orderToPay ? orderToPay.total_usd - totalAbonadoUSD : 0;
  const restanteBS = restanteUSD * tasa;

  // --- ADMIN: INVENTARIO Y GASTOS ---
  const registrarCompra = async () => {
    if(!nuevaCompra.ing || !nuevaCompra.cant) return;
    await supabase.from('purchases').insert([{
        ingredient_name: nuevaCompra.ing,
        quantity: nuevaCompra.cant,
        cost_usd: nuevaCompra.costo,
        created_by: currentUser.name
    }]);
    alert("Compra registrada. Stock actualizado.");
    setNuevaCompra({ing:'', cant:'', costo:''});
    fetchProducts(); // Refrescar stock visual
  };

  const registrarGasto = async () => {
    await supabase.from('expenses').insert([{
        description: nuevoGasto.desc,
        amount_usd: nuevoGasto.monto,
        category: nuevoGasto.cat,
        created_by: currentUser.name
    }]);
    alert("Gasto registrado");
    setNuevoGasto({desc:'', monto:'', cat:'Varios'});
  };

  // --- REPORTES ---
  const generarReporte = async () => {
    // Buscar órdenes pagadas en rango
    const { data: ventas } = await supabase.from('orders')
        .select('*, payments(*)')
        .gte('created_at', rangoFechas.inicio + 'T00:00:00')
        .lte('created_at', rangoFechas.fin + 'T23:59:59')
        .eq('status', 'pagado');

    const { data: gastos } = await supabase.from('expenses')
        .gte('created_at', rangoFechas.inicio + 'T00:00:00')
        .lte('created_at', rangoFechas.fin + 'T23:59:59');

    if (!ventas) return;

    // Consolidación de Totales por Método
    const totales = {
        total_venta_usd: 0,
        metodos: {
            usd_efectivo: 0,
            bs_efectivo: 0,
            zelle: 0,
            pago_movil: 0,
            punto: 0,
            obsequio: 0
        },
        gastos_usd: gastos ? gastos.reduce((a,b)=>a+b.amount_usd, 0) : 0,
        conteo: ventas.length
    };

    ventas.forEach(orden => {
        totales.total_venta_usd += orden.total_usd;
        orden.payments.forEach(pago => {
            if (totales.metodos[pago.method] !== undefined) {
                // Sumamos el monto original reportado (ej: Bs si fue Bs)
                totales.metodos[pago.method] += pago.amount_original > 0 ? pago.amount_original : pago.amount_usd; 
            }
        });
    });

    setReporteData({ ventas, totales, rango: rangoFechas });
  };

  // --- INTERFAZ (RENDER) ---
  if (!currentUser) return (
    <div style={styles.loginContainer}>
        <h1 style={styles.title}>DONDE MANOLO</h1>
        <p>Sistema de Gestión</p>
        <div style={styles.pinGrid}>
            {staff.map(u => (
                <button key={u.id} onClick={() => handleLogin(prompt(`Ingrese PIN para ${u.name}:`))} style={styles.userBtn}>
                    {u.name} <br/><small>{u.role.toUpperCase()}</small>
                </button>
            ))}
        </div>
    </div>
  );

  return (
    <div className="notranslate" style={styles.mainContainer}>
        {/* NAVBAR */}
        <nav style={styles.navbar} className="no-print">
            <div>Hola, <b>{currentUser.name}</b></div>
            <div style={{display:'flex', gap:'10px'}}>
                {currentUser.role === 'admin' && (
                    <>
                        <button onClick={()=>setActiveTab('dashboard')} style={styles.navBtn}>📊 Dashboard</button>
                        <button onClick={()=>setActiveTab('inventario')} style={styles.navBtn}>📦 Inventario</button>
                        <button onClick={()=>setActiveTab('personal')} style={styles.navBtn}>👥 Personal</button>
                    </>
                )}
                {(currentUser.role === 'caja' || currentUser.role === 'admin') && (
                    <button onClick={()=>setActiveTab('pos_caja')} style={styles.navBtn}>💰 Caja</button>
                )}
                <button onClick={()=>setActiveTab('pos_mesero')} style={styles.navBtn}>📝 Pedidos</button>
                <button onClick={()=>setActiveTab('cocina')} style={styles.navBtn}>👨‍🍳 Cocina</button>
                <button onClick={()=>window.print()} style={{...styles.navBtn, background:'#444'}}>🖨️ Imprimir</button>
                <button onClick={()=>window.location.reload()} style={{...styles.navBtn, background:'red'}}>Salir</button>
            </div>
        </nav>

        <div style={styles.content}>
            
            {/* VISTA: DASHBOARD ADMIN */}
            {activeTab === 'dashboard' && currentUser.role === 'admin' && (
                <div style={styles.grid2}>
                    <div style={styles.card}>
                        <h3>⚙️ Configuración Diaria</h3>
                        <div style={{padding:'10px', background:'#fff3cd', border:'1px solid #ffeeba'}}>
                            <label>Tasa BCV del Día:</label>
                            <input type="number" value={tasa} onChange={e=>setTasa(parseFloat(e.target.value))} style={styles.input} />
                            <button onClick={async ()=>{
                                await supabase.from('settings').upsert({key:'exchange_rate', value:{bcv: tasa}});
                                alert("Tasa actualizada");
                            }} style={styles.actionBtn}>Guardar Tasa</button>
                        </div>
                    </div>
                    <div style={styles.card}>
                        <h3>📈 Reportes Gerenciales</h3>
                        <div style={{display:'flex', gap:'5px'}}>
                            <input type="date" value={rangoFechas.inicio} onChange={e=>setRangoFechas({...rangoFechas, inicio:e.target.value})} style={styles.input}/>
                            <input type="date" value={rangoFechas.fin} onChange={e=>setRangoFechas({...rangoFechas, fin:e.target.value})} style={styles.input}/>
                        </div>
                        <button onClick={generarReporte} style={styles.actionBtn}>Generar Reporte</button>
                    </div>
                    {reporteData && (
                        <div style={{...styles.card, gridColumn:'span 2'}} id="print-area">
                            <center><h2>DONDE MANOLO - REPORTE DE GESTIÓN</h2></center>
                            <p>Del {reporteData.rango.inicio} al {reporteData.rango.fin}</p>
                            <hr/>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr'}}>
                                <div>
                                    <h4>Ingresos por Método:</h4>
                                    <p>💵 $ Efectivo: <b>${reporteData.totales.metodos.usd_efectivo.toFixed(2)}</b></p>
                                    <p>💵 Bs Efectivo: <b>Bs {reporteData.totales.metodos.bs_efectivo.toFixed(2)}</b></p>
                                    <p>📱 Pago Móvil: <b>Bs {reporteData.totales.metodos.pago_movil.toFixed(2)}</b></p>
                                    <p>💳 Punto Venta: <b>Bs {reporteData.totales.metodos.punto.toFixed(2)}</b></p>
                                    <p>🏦 Zelle: <b>${reporteData.totales.metodos.zelle.toFixed(2)}</b></p>
                                    <p>🎁 Obsequios: <b>${reporteData.totales.metodos.obsequio.toFixed(2)}</b></p>
                                </div>
                                <div style={{textAlign:'right'}}>
                                    <h4>Resumen:</h4>
                                    <p>Total Ventas (Valor USD): <b>${reporteData.totales.total_venta_usd.toFixed(2)}</b></p>
                                    <p>Total Gastos: <b style={{color:'red'}}>-${reporteData.totales.gastos_usd.toFixed(2)}</b></p>
                                    <h3>Balance: ${(reporteData.totales.total_venta_usd - reporteData.totales.gastos_usd).toFixed(2)}</h3>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA: POS MESERO / CAJERA (Toma de pedidos) */}
            {activeTab === 'pos_mesero' && (
                <div style={styles.grid2}>
                    <div style={{overflowY:'auto', maxHeight:'80vh'}}>
                        <h3>🍔 Menú</h3>
                        <div style={styles.productGrid}>
                            {productos.map(p => (
                                <div key={p.id} onClick={()=>addToCart(p)} style={styles.productCard}>
                                    <b>{p.name}</b><br/>${p.price_usd}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={styles.card}>
                        <h3>📝 Nueva Orden</h3>
                        <select style={styles.input} value={serviceDetails.type} onChange={e=>setServiceDetails({...serviceDetails, type:e.target.value})}>
                            <option>Mesa</option><option>Delivery</option><option>Pickup</option>
                        </select>
                        <input placeholder="Nro Mesa o Nombre Cliente" value={serviceDetails.info} onChange={e=>setServiceDetails({...serviceDetails, info:e.target.value})} style={styles.input} />
                        
                        <div style={{borderTop:'1px solid #eee', marginTop:'10px', maxHeight:'40vh', overflowY:'auto'}}>
                            {carrito.map(item => (
                                <div key={item.tempId} style={{padding:'10px', borderBottom:'1px solid #eee'}}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <b>{item.name}</b>
                                        <span onClick={()=>setCarrito(carrito.filter(c=>c.tempId!==item.tempId))} style={{color:'red', cursor:'pointer'}}>✖</span>
                                    </div>
                                    <input 
                                        placeholder="Nota: Sin cebolla, extra queso..." 
                                        value={item.notes} 
                                        onChange={e => setCarrito(carrito.map(c => c.tempId===item.tempId ? {...c, notes:e.target.value} : c))}
                                        style={{...styles.input, fontSize:'0.8em', marginTop:'5px'}} 
                                    />
                                </div>
                            ))}
                        </div>
                        <h3 style={{textAlign:'right'}}>Total: ${carrito.reduce((a,b)=>a+b.price_usd,0).toFixed(2)}</h3>
                        <button onClick={sendOrder} disabled={loading} style={styles.actionBtn}>
                            {loading ? 'Enviando...' : 'ENVIAR A COCINA'}
                        </button>
                    </div>
                </div>
            )}

            {/* VISTA: CAJA (Cobro) */}
            {activeTab === 'pos_caja' && (
                <div style={styles.grid2}>
                    <div style={styles.card}>
                        <h3>📄 Órdenes Pendientes de Pago</h3>
                        {orders.filter(o => o.status !== 'pagado').map(o => (
                            <div key={o.id} onClick={()=>iniciarCobro(o)} style={{
                                padding:'10px', borderBottom:'1px solid #ccc', cursor:'pointer',
                                background: o.status === 'listo' ? '#d4edda' : '#fff'
                            }}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <span>{o.service_type}: {o.table_number || o.customer_name}</span>
                                    <b>${o.total_usd}</b>
                                </div>
                                <small style={{color: o.status==='listo'?'green':'orange'}}>{o.status.toUpperCase()}</small>
                            </div>
                        ))}
                    </div>

                    {orderToPay && (
                        <div style={styles.card}>
                            <h3>Cobrar: {orderToPay.customer_name || orderToPay.table_number}</h3>
                            <div style={{textAlign:'center', padding:'10px', background:'#f8f9fa', borderRadius:'5px'}}>
                                <h2 style={{margin:0}}>Total: ${orderToPay.total_usd.toFixed(2)}</h2>
                                <h4 style={{margin:0}}>({(orderToPay.total_usd * tasa).toFixed(2)} Bs)</h4>
                            </div>

                            <div style={{marginTop:'20px'}}>
                                <p style={{fontWeight:'bold', color: restanteUSD > 0.05 ? 'red' : 'green'}}>
                                    {restanteUSD > 0 ? 'Faltan' : 'Vuelto'}: ${Math.abs(restanteUSD).toFixed(2)} 
                                    <span style={{color:'gray', fontSize:'0.8em'}}> (Bs {Math.abs(restanteBS).toFixed(2)})</span>
                                </p>
                                
                                <div style={{display:'flex', gap:'5px'}}>
                                    <input type="number" placeholder="Monto" value={montoInput} onChange={e=>setMontoInput(e.target.value)} style={{width:'80px', padding:'5px'}}/>
                                    <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} style={{flex:1, padding:'5px'}}>
                                        <option value="usd_efectivo">$ Efectivo</option>
                                        <option value="bs_efectivo">Bs Efectivo</option>
                                        <option value="pago_movil">Pago Móvil</option>
                                        <option value="punto">Punto</option>
                                        <option value="zelle">Zelle</option>
                                        {(currentUser.role === 'admin' || currentUser.role === 'caja') && <option value="obsequio">Obsequio</option>}
                                    </select>
                                    <button onClick={agregarPago} style={{background:'black', color:'white', border:'none', borderRadius:'5px'}}>+</button>
                                </div>

                                <ul style={{listStyle:'none', padding:0, marginTop:'10px'}}>
                                    {pagosActuales.map((p, i) => (
                                        <li key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'0.9em', borderBottom:'1px solid #eee'}}>
                                            <span>{p.method}</span>
                                            <span>${p.amount_usd.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button onClick={finalizarVenta} style={styles.actionBtn}>CERRAR CUENTA</button>
                                <button onClick={()=>setOrderToPay(null)} style={{...styles.actionBtn, background:'#6c757d', marginTop:'5px'}}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA: COCINA */}
            {activeTab === 'cocina' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'15px'}}>
                    {orders.filter(o => o.status === 'pendiente').map(o => (
                        <div key={o.id} style={{background:'white', borderLeft:'6px solid orange', padding:'15px', borderRadius:'5px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                            <h3>{o.service_type} - {o.table_number || o.customer_name}</h3>
                            <ul style={{paddingLeft:'20px'}}>
                                {o.order_items.map(item => (
                                    <li key={item.id} style={{marginBottom:'5px'}}>
                                        <b>{item.product.name}</b>
                                        {item.notes && <div style={{background:'yellow', padding:'2px', fontSize:'0.9em'}}>⚠️ {item.notes}</div>}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={()=>markReady(o.id)} style={styles.actionBtn}>LISTO PARA ENTREGAR ✅</button>
                        </div>
                    ))}
                    {orders.filter(o=>o.status==='pendiente').length === 0 && <p>No hay pedidos pendientes 👨‍🍳</p>}
                </div>
            )}

            {/* VISTA: INVENTARIO Y GASTOS */}
            {activeTab === 'inventario' && (
                <div style={styles.grid2}>
                    <div style={styles.card}>
                        <h3>📦 Inventario Vivo</h3>
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead><tr style={{textAlign:'left'}}><th>Ingrediente</th><th>Stock</th><th>Uni</th></tr></thead>
                            <tbody>
                                {ingredientes.map(i => (
                                    <tr key={i.id} style={{borderBottom:'1px solid #eee'}}>
                                        <td>{i.name}</td>
                                        <td style={{fontWeight:'bold', color: i.stock < 10 ? 'red':'black'}}>{Number(i.stock).toFixed(2)}</td>
                                        <td>{i.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                        <div style={styles.card}>
                            <h3>🛒 Cargar Compra</h3>
                            <select style={styles.input} onChange={e=>setNuevaCompra({...nuevaCompra, ing:e.target.value})}>
                                <option value="">Seleccione...</option>
                                {ingredientes.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}
                            </select>
                            <input placeholder="Cantidad" type="number" value={nuevaCompra.cant} onChange={e=>setNuevaCompra({...nuevaCompra, cant:e.target.value})} style={styles.input}/>
                            <input placeholder="Costo Total $" type="number" value={nuevaCompra.costo} onChange={e=>setNuevaCompra({...nuevaCompra, costo:e.target.value})} style={styles.input}/>
                            <button onClick={registrarCompra} style={styles.actionBtn}>Registrar Ingreso</button>
                        </div>
                        <div style={styles.card}>
                            <h3>💸 Registrar Gasto</h3>
                            <input placeholder="Descripción" value={nuevoGasto.desc} onChange={e=>setNuevoGasto({...nuevoGasto, desc:e.target.value})} style={styles.input}/>
                            <input placeholder="Monto USD" type="number" value={nuevoGasto.monto} onChange={e=>setNuevoGasto({...nuevoGasto, monto:e.target.value})} style={styles.input}/>
                            <button onClick={registrarGasto} style={{...styles.actionBtn, background:'#dc3545'}}>Registrar Egreso</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* VISTA: GESTIÓN PERSONAL */}
            {activeTab === 'personal' && currentUser.role === 'admin' && (
                 <div style={styles.card}>
                    <h3>Gestión de Usuarios</h3>
                    <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                        <input placeholder="Nombre" value={nuevoEmpleado.name} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, name:e.target.value})} style={styles.input}/>
                        <select value={nuevoEmpleado.role} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, role:e.target.value})} style={styles.input}>
                            <option value="mesero">Mesero</option><option value="caja">Caja</option><option value="cocina">Cocina</option><option value="admin">Admin</option>
                        </select>
                        <input placeholder="PIN" value={nuevoEmpleado.pin} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, pin:e.target.value})} style={styles.input}/>
                        <button onClick={async ()=>{
                            await supabase.from('staff').insert([nuevoEmpleado]);
                            setNuevoEmpleado({name:'', role:'mesero', pin:''});
                            fetchStaff();
                            alert("Usuario Creado");
                        }} style={styles.actionBtn}>Crear</button>
                    </div>
                    <ul>
                        {staff.map(s => <li key={s.id}>{s.name} - {s.role} (PIN: ****)</li>)}
                    </ul>
                 </div>
            )}

        </div>
        
        {/* ESTILOS DE IMPRESIÓN */}
        <style>{`
            @media print {
                .no-print { display: none !important; }
                body { background: white; color: black; }
                #print-area { display: block !important; position: absolute; top:0; left:0; width: 100%; }
                input, select, button { border: none; appearance: none; }
            }
        `}</style>
    </div>
  );
}

// --- ESTILOS CSS-IN-JS ---
const styles = {
    mainContainer: { minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Arial, sans-serif' },
    loginContainer: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#b22222', color: 'white' },
    title: { fontSize: '2.5rem', marginBottom: '10px' },
    pinGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '300px' },
    userBtn: { padding: '20px', borderRadius: '10px', border: 'none', background: 'white', color: '#b22222', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' },
    navbar: { background: '#222', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    navBtn: { background: '#444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' },
    content: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    grid2: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
    card: { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
    productCard: { padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: '0.2s' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', marginBottom: '10px', boxSizing: 'border-box' },
    actionBtn: { width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }
};
