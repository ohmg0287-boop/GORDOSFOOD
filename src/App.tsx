import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

export default function DondeManoloApp() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [tasa, setTasa] = useState(54.50);

    // Estados de Datos
    const [staff, setStaff] = useState([]);
    const [productos, setProductos] = useState([]);
    const [ingredientes, setIngredientes] = useState([]);
    const [orders, setOrders] = useState([]);
    
    // Estados Operativos
    const [carrito, setCarrito] = useState([]);
    const [serviceDetails, setServiceDetails] = useState({ type: 'Mesa', info: '' });
    const [orderToPay, setOrderToPay] = useState(null);
    const [pagosActuales, setPagosActuales] = useState([]);
    const [montoInput, setMontoInput] = useState('');
    const [metodoPago, setMetodoPago] = useState('usd_efectivo');
    const [reporteData, setReporteData] = useState(null);

    useEffect(() => { fetchStaff(); fetchSettings(); }, []);

    useEffect(() => {
        if (currentUser) {
            fetchProducts();
            fetchOrders();
            fetchIngredients();
            if (currentUser.role === 'cocina') {
                const timer = setInterval(fetchOrders, 5000);
                return () => clearInterval(timer);
            }
        }
    }, [currentUser]);

    // --- FUNCIONES CORE ---
    const fetchStaff = async () => {
        const { data } = await supabase.from('staff').select('*').eq('active', true);
        if (data) setStaff(data);
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
        if (data) setTasa(data.value.bcv || 54.50);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('name');
        if (data) setProductos(data);
    };

    const fetchIngredients = async () => {
        const { data } = await supabase.from('ingredients').select('*').order('name');
        if (data) setIngredientes(data);
    };

    const fetchOrders = async () => {
        const { data } = await supabase.from('orders').select('*, order_items(*, product:products(name)), payments(*)').order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    // --- ACCIONES DUEÑO ---
    const updateStockManual = async (id, newStock) => {
        if (currentUser.name !== 'Manolo Dueño') return;
        await supabase.from('ingredients').update({ stock: newStock }).eq('id', id);
        fetchIngredients();
    };

    const resetStock100 = async () => {
        if (!confirm("¿Poner todos los ingredientes en 100 unidades?")) return;
        const { data } = await supabase.from('ingredients').select('id');
        for (let item of data) {
            await supabase.from('ingredients').update({ stock: 100 }).eq('id', item.id);
        }
        fetchIngredients();
        alert("Inventario reseteado a 100");
    };

    const deleteHistory = async () => {
        if (!confirm("¿BORRAR TODO EL HISTORIAL DE VENTAS? Esta acción no se puede deshacer.")) return;
        await supabase.from('orders').delete().neq('status', 'placeholder');
        fetchOrders();
        alert("Historial blanqueado");
    };

    const handleLogin = (pin) => {
        const user = staff.find(u => u.pin === pin);
        if (user) {
            setCurrentUser(user);
            if (user.role === 'cocina') setActiveTab('cocina');
            else if (user.role === 'caja') setActiveTab('pos_caja');
            else if (user.role === 'mesero') setActiveTab('pos_mesero');
            else setActiveTab('dashboard');
        } else alert("PIN Incorrecto");
    };

    // --- SISTEMA DE PEDIDOS ---
    const sendOrder = async () => {
        if (!serviceDetails.info || carrito.length === 0) return alert("Faltan datos");
        setLoading(true);
        try {
            const { data: order, error } = await supabase.from('orders').insert([{
                total_usd: carrito.reduce((s, i) => s + i.price_usd, 0),
                service_type: serviceDetails.type,
                table_number: serviceDetails.type === 'Mesa' ? serviceDetails.info : null,
                customer_name: serviceDetails.type !== 'Mesa' ? serviceDetails.info : null,
                created_by: currentUser.name,
                exchange_rate: tasa
            }]).select().single();
            
            if (error) throw error;

            const items = carrito.map(i => ({ order_id: order.id, product_id: i.id, quantity: 1, price_at_time: i.price_usd, notes: i.notes }));
            await supabase.from('order_items').insert(items);
            
            alert("Pedido Enviado");
            setCarrito([]);
            setServiceDetails({ type: 'Mesa', info: '' });
            fetchOrders();
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    // --- VISTA CAJA ---
    const totalAbonado = orderToPay ? pagosActuales.reduce((s, p) => s + p.amount_usd, 0) : 0;
    const restanteUSD = orderToPay ? orderToPay.total_usd - totalAbonado : 0;

    const finalizarPago = async () => {
        if (restanteUSD > 0.01) return alert("Falta saldo");
        setLoading(true);
        await supabase.from('payments').insert(pagosActuales.map(p => ({ ...p, order_id: orderToPay.id, exchange_rate: tasa })));
        await supabase.from('orders').update({ status: 'pagado' }).eq('id', orderToPay.id);
        setOrderToPay(null);
        setPagosActuales([]);
        fetchOrders();
        setLoading(false);
    };

    if (!currentUser) return (
        <div style={styles.loginPage}>
            <h1>DONDE MANOLO</h1>
            <div style={styles.pinGrid}>
                {staff.map(u => <button key={u.id} onClick={() => handleLogin(prompt(`PIN de ${u.name}`))} style={styles.userBtn}>{u.name}</button>)}
            </div>
        </div>
    );

    return (
        <div style={styles.appContainer}>
            <nav style={styles.nav} className="no-print">
                <span style={{fontWeight:'bold'}}>M&F - {currentUser.name}</span>
                <div style={{display:'flex', gap:'10px'}}>
                    {currentUser.role === 'admin' && <button onClick={() => setActiveTab('dashboard')} style={styles.navBtn}>📊 Panel</button>}
                    {currentUser.role === 'admin' && <button onClick={() => setActiveTab('inventario')} style={styles.navBtn}>📦 Stock</button>}
                    {(currentUser.role === 'admin' || currentUser.role === 'caja') && <button onClick={() => setActiveTab('pos_caja')} style={styles.navBtn}>💰 Caja</button>}
                    {(currentUser.role !== 'cocina') && <button onClick={() => setActiveTab('pos_mesero')} style={styles.navBtn}>📝 Pedidos</button>}
                    {(currentUser.role === 'admin' || currentUser.role === 'cocina') && <button onClick={() => setActiveTab('cocina')} style={styles.navBtn}>👨‍🍳 Cocina</button>}
                    <button onClick={() => window.location.reload()} style={{...styles.navBtn, background:'#d9534f'}}>Cerrar</button>
                </div>
            </nav>

            <div style={styles.content}>
                {/* --- DASHBOARD --- */}
                {activeTab === 'dashboard' && (
                    <div>
                        <div style={styles.card}>
                            <h3>Control Maestro</h3>
                            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                                <div>Tasa BCV: <input type="number" value={tasa} onChange={e => setTasa(e.target.value)} style={{width:'80px'}}/></div>
                                <button onClick={() => resetStock100()} style={{background:'green', color:'white'}}>Poner Todo en 100</button>
                                <button onClick={() => deleteHistory()} style={{background:'red', color:'white'}}>Blanquear Ventas</button>
                            </div>
                        </div>
                        <div style={styles.card} id="reporte-ventas">
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                <h3>Reporte de Ventas</h3>
                                <button onClick={() => window.print()} className="no-print">🖨️ Imprimir</button>
                            </div>
                            <table style={{width:'100%', borderCollapse:'collapse'}}>
                                <thead><tr style={{borderBottom:'2px solid #000'}}><th>Fecha</th><th>Ref</th><th>Total $</th><th>Estado</th></tr></thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id} style={{borderBottom:'1px solid #eee'}}>
                                            <td>{new Date(o.created_at).toLocaleTimeString()}</td>
                                            <td>{o.service_type} - {o.table_number || o.customer_name}</td>
                                            <td>${o.total_usd.toFixed(2)}</td>
                                            <td>{o.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- INVENTARIO --- */}
                {activeTab === 'inventario' && (
                    <div style={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3>Inventario de Ingredientes</h3>
                            <button onClick={() => window.print()} className="no-print">🖨️ Imprimir Stock</button>
                        </div>
                        <table style={{width:'100%'}}>
                            <thead><tr style={{textAlign:'left'}}><th>Nombre</th><th>Stock</th><th>Unidad</th>{currentUser.name === 'Manolo Dueño' && <th>Acción</th>}</tr></thead>
                            <tbody>
                                {ingredientes.map(i => (
                                    <tr key={i.id} style={{borderBottom:'1px solid #eee'}}>
                                        <td>{i.name}</td>
                                        <td style={{fontWeight:'bold', color: i.stock < 10 ? 'red' : 'black'}}>{i.stock}</td>
                                        <td>{i.unit}</td>
                                        {currentUser.name === 'Manolo Dueño' && (
                                            <td><button onClick={() => updateStockManual(i.id, prompt("Nuevo stock:", i.stock))}>✏️</button></td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- CAJA --- */}
                {activeTab === 'pos_caja' && (
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        <div style={styles.card}>
                            <h3>Cuentas Pendientes</h3>
                            {orders.filter(o => o.status !== 'pagado').map(o => (
                                <div key={o.id} onClick={() => {setOrderToPay(o); setPagosActuales([]);}} style={{padding:'10px', border:'1px solid #ddd', marginBottom:'5px', cursor:'pointer', background: o.status === 'listo' ? '#e9f7ef' : '#fff'}}>
                                    <b>{o.service_type} {o.table_number || o.customer_name}</b> - ${o.total_usd}
                                </div>
                            ))}
                        </div>
                        {orderToPay && (
                            <div style={styles.card}>
                                <h3>Cobrar: ${orderToPay.total_usd}</h3>
                                <div style={{background:'#f8f9fa', padding:'10px', borderRadius:'5px', marginBottom:'10px'}}>
                                    <p>Faltante $: <b>${restanteUSD.toFixed(2)}</b></p>
                                    <p>Faltante Bs: <b style={{color:'red'}}>{(restanteUSD * tasa).toFixed(2)} Bs</b></p>
                                </div>
                                <div style={{display:'flex', gap:'5px'}}>
                                    <input type="number" placeholder="Monto" value={montoInput} onChange={e => setMontoInput(e.target.value)} style={{width:'80px'}}/>
                                    <select onChange={e => setMetodoPago(e.target.value)}>
                                        <option value="usd_efectivo">$ Efectivo</option>
                                        <option value="bs_efectivo">Bs Efectivo</option>
                                        <option value="pago_movil">Pago Móvil</option>
                                        <option value="punto">Punto</option>
                                    </select>
                                    <button onClick={() => {
                                        const amt = parseFloat(montoInput);
                                        const usdVal = (metodoPago === 'usd_efectivo' || metodoPago === 'zelle') ? amt : amt / tasa;
                                        setPagosActuales([...pagosActuales, { method: metodoPago, amount_usd: usdVal, amount_original: amt }]);
                                        setMontoInput('');
                                    }}>Add</button>
                                </div>
                                <button onClick={finalizarPago} style={{...styles.actionBtn, marginTop:'20px'}}>Finalizar Venta</button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- MESERO --- */}
                {activeTab === 'pos_mesero' && (
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        <div style={styles.productGrid}>
                            {productos.map(p => (
                                <div key={p.id} onClick={() => setCarrito([...carrito, {...p, tempId: Math.random(), notes:''}])} style={styles.productCard}>
                                    {p.name} <br/> <b>${p.price_usd}</b>
                                </div>
                            ))}
                        </div>
                        <div style={styles.card}>
                            <h3>Pedido Actual</h3>
                            <input placeholder="Mesa / Cliente" onChange={e => setServiceDetails({...serviceDetails, info: e.target.value})} style={styles.input}/>
                            {carrito.map(item => (
                                <div key={item.tempId} style={{fontSize:'0.9em', borderBottom:'1px solid #eee'}}>
                                    {item.name} - ${item.price_usd}
                                    <input placeholder="Nota..." onChange={e => {item.notes = e.target.value}} style={{width:'100%', fontSize:'0.8em'}}/>
                                </div>
                            ))}
                            <button onClick={sendOrder} style={styles.actionBtn}>Enviar a Cocina</button>
                        </div>
                    </div>
                )}

                {/* --- COCINA --- */}
                {activeTab === 'cocina' && (
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px'}}>
                        {orders.filter(o => o.status === 'pendiente').map(o => (
                            <div key={o.id} style={{background:'white', padding:'10px', borderRadius:'8px', borderLeft:'5px solid #f0ad4e'}}>
                                <h4>{o.service_type}: {o.table_number || o.customer_name}</h4>
                                {o.order_items.map(i => <div key={i.id}>- {i.product.name} <br/> <small>{i.notes}</small></div>)}
                                <button onClick={async () => { await supabase.from('orders').update({status:'listo'}).eq('id', o.id); fetchOrders(); }} style={{marginTop:'10px', width:'100%'}}>LISTO ✅</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @media print { .no-print { display: none !important; } .card { border: none !important; box-shadow: none !important; } }
            `}</style>
        </div>
    );
}

const styles = {
    loginPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#8b0000', color: '#fff' },
    pinGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    userBtn: { padding: '20px', fontSize: '1.2em', cursor: 'pointer', borderRadius: '10px', border: 'none' },
    appContainer: { minHeight: '100vh', background: '#f4f4f4' },
    nav: { background: '#222', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    navBtn: { background: '#444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
    content: { padding: '20px' },
    card: { background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
    productCard: { background: '#fff', padding: '15px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ddd' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' },
    actionBtn: { width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }
};
