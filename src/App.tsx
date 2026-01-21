import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, ChefHat, LayoutDashboard, DollarSign, Users, Package, Trash2, Printer, RefreshCw, LogOut, Edit3 } from 'lucide-react';

// --- CONEXIÓN ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// --- MATRIZ DE RECETAS (EXTRAÍDA DE TU EXCEL) ---
// Formato: "Nombre Producto": { "Nombre Insumo": Cantidad a descontar }
const RECIPES_MATRIX = {
  "Mamandini de Carne": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 1, "Papel Envolver (Und)": 1 },
  "Mamandini de Pollo": { "Pan Batata hamb (Und)": 1, "Pollo 120g (Und)": 1, "Papel Envolver (Und)": 1 },
  "Mitad de Quincena Doble carne": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 2, "Papel Envolver (Und)": 1 },
  "Mitad de Quincena Doble Pollo": { "Pan Batata hamb (Und)": 1, "Pollo 120g (Und)": 2, "Papel Envolver (Und)": 1 },
  "Mitad de Quincena Carne y Pollo": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 1, "Pollo 120g (Und)": 1, "Papel Envolver (Und)": 1 },
  "Viaje a Roma": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 1, "tocineta": 1, "Papel Envolver (Und)": 1 },
  "La Buchona": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 1, "Chuleta 120g (Und)": 1, "tocineta": 1, "Papel Envolver (Und)": 1 },
  "Big Manolo": { "Pan Gigante (Und)": 1, "Carne 120g (Und)": 3, "Pollo 120g (Und)": 1, "Chuleta 120g (Und)": 1, "tocineta": 2, "Jamon": 2, "Papel Envolver (Und)": 2 },
  "La Callejera": { "Pan Batata hamb (Und)": 1, "Carne 120g (Und)": 1, "Chorizo de ajo": 1, "Papel Envolver (Und)": 1 },
  "Salva Patria": { "Pan Batata perro (Und)": 1, "salchicha figos": 1, "Papel Envolver (Und)": 1 },
  "El Resuelve": { "Pan Batata perro (Und)": 1, "Salchicha Ahumada": 1, "Papel Envolver (Und)": 1 },
  "El Sifrino": { "Pan Batata perro (Und)": 1, "Salchicha Ahumada": 1, "tocineta": 1, "queso chedar reb": 1, "Bandeja Anime (Und)": 1 },
  "Pepito Mitad Quincena": { "Pan pepito (Und)": 1, "Porciones pep 150": 1, "Papel Envolver (Und)": 1 },
  "Pepito Hoy Cobre": { "Pan pepito (Und)": 1, "Porciones pep 250": 1, "tocineta": 1, "queso chedar br": 1, "Papel Envolver (Und)": 1 },
  "El antojito (6und)": { "tequeños racion": 0.5, "Bandeja Anime (Und)": 1 }, // Aprox media racion
  "El antojito (8und)": { "tequeños racion": 0.7, "Bandeja Anime (Und)": 1 },
  "El antojito (14und)": { "tequeños racion": 1, "Bandeja Anime (Und)": 1 },
  "La Acompañante": { "Papas (Porción 150g)": 1, "Bandeja Anime (Und)": 1 },
  "Nestea Pequeño": { "Vaso Plástico p (Und)": 1 },
  "Nestea Grande": { "Vaso Plástico g (Und)": 1, "Nestea Grande": 1 },
  "Agua Personal": { "Agua Personal": 1 },
  "Refresco 1 Litros": { "refresco 1l": 1 },
  "Refresco 1.5 Litros": { "Refresco 1.5L (Bot)": 1 }
};

export default function DondeManoloApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [tasa, setTasa] = useState(0);

  // Datos
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Operativo
  const [cart, setCart] = useState([]);
  const [serviceInfo, setServiceInfo] = useState({ type: 'Mesa', val: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Caja
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('usd_efectivo');
  const [currentPayments, setCurrentPayments] = useState([]);

  useEffect(() => {
    fetchRate();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      if (user.role === 'cocina') {
        const i = setInterval(fetchOrders, 5000);
        return () => clearInterval(i);
      }
    }
  }, [user]);

  // --- CARGA DE DATOS ---
  const fetchRate = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'tasa').single();
    if (data) setTasa(data.value.usd);
  };

  const loadData = async () => {
    setLoading(true);
    const p = await supabase.from('products').select('*').order('name');
    const i = await supabase.from('ingredients').select('*').order('name');
    const o = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    
    if (p.data) setProducts(p.data);
    if (i.data) setIngredients(i.data);
    if (o.data) setOrders(o.data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  // --- LÓGICA DE NEGOCIO ---
  const login = async (pin) => {
    const { data } = await supabase.from('staff').select('*').eq('pin', pin).single();
    if (data) {
      setUser(data);
      if (data.role === 'admin') setView('dashboard');
      else if (data.role === 'caja') setView('caja');
      else if (data.role === 'mesero') setView('pedidos');
      else if (data.role === 'cocina') setView('cocina');
    } else {
      alert("PIN Incorrecto");
    }
  };

  const sendOrder = async () => {
    if (cart.length === 0 || !serviceInfo.val) return alert("Carrito vacío o falta Mesa/Cliente");
    setLoading(true);

    const total = cart.reduce((sum, item) => sum + item.price_usd, 0);

    // 1. Crear Orden
    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: total,
      service_type: serviceInfo.type,
      info: serviceInfo.val,
      created_by: user.name,
      status: 'pendiente'
    }]).select().single();

    if (error) { alert("Error al crear orden"); setLoading(false); return; }

    // 2. Crear Items
    const items = cart.map(i => ({
      order_id: order.id,
      product_name: i.name,
      quantity: 1,
      price_at_time: i.price_usd,
      notes: i.notes || ''
    }));
    await supabase.from('order_items').insert(items);

    // 3. DESCONTAR INVENTARIO (MAGIA)
    // Recorremos el carrito y buscamos en la matriz
    for (let item of cart) {
      const recipe = RECIPES_MATRIX[item.name];
      if (recipe) {
        for (let [ingName, qty] of Object.entries(recipe)) {
            // Buscamos el ingrediente en el estado actual para tener su ID
            const dbIng = ingredients.find(i => i.name === ingName);
            if (dbIng) {
                // Llamada RPC o update directo. Haremos update directo por simplicidad
                // Nota: En producción idealmente se usa un procedimiento almacenado
                const newStock = parseFloat(dbIng.stock) - qty;
                await supabase.from('ingredients').update({ stock: newStock }).eq('id', dbIng.id);
            }
        }
      }
    }

    alert("Pedido Enviado a Cocina 👨‍🍳");
    setCart([]);
    setServiceInfo({ type: 'Mesa', val: '' });
    loadData(); // Recargar inventario visualmente
    setLoading(false);
  };

  const handlePayment = async () => {
    const totalPaid = currentPayments.reduce((s, p) => s + p.amount_usd, 0);
    const remaining = selectedOrder.total_usd - totalPaid;

    if (remaining > 0.01) return alert("Falta cubrir el monto total");

    setLoading(true);
    // Guardar pagos
    const paymentsToSave = currentPayments.map(p => ({
        order_id: selectedOrder.id,
        method: p.method,
        amount_usd: p.amount_usd,
        amount_bs: p.amount_bs,
        rate_used: tasa
    }));
    await supabase.from('payments').insert(paymentsToSave);
    await supabase.from('orders').update({ status: 'pagado' }).eq('id', selectedOrder.id);

    alert("Venta Cobrada Exitosamente 💰");
    setSelectedOrder(null);
    setCurrentPayments([]);
    fetchOrders();
    setLoading(false);
  };

  // --- UI COMPONENTS ---
  
  if (!user) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-8 text-yellow-500">DONDE MANOLO</h1>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
            <button key={i} onClick={() => {
                const pin = prompt("Ingrese su PIN:");
                if(pin) login(pin);
            }} className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-xl font-bold border border-gray-700">
                {['Dueño', 'Caja', 'Mesero', 'Cocina'][i]}
            </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* NAVBAR */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="font-bold text-lg text-yellow-400">DONDE MANOLO <span className="text-xs text-gray-400">({user.name})</span></div>
        <div className="flex gap-2">
            {user.role === 'admin' && (
                <>
                <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view==='dashboard'?'bg-yellow-600':'bg-gray-700'}`}><LayoutDashboard size={20}/></button>
                <button onClick={() => setView('inventario')} className={`p-2 rounded ${view==='inventario'?'bg-yellow-600':'bg-gray-700'}`}><Package size={20}/></button>
                </>
            )}
            {(user.role === 'admin' || user.role === 'caja') && (
                <button onClick={() => setView('caja')} className={`p-2 rounded ${view==='caja'?'bg-yellow-600':'bg-gray-700'}`}><DollarSign size={20}/></button>
            )}
            {user.role !== 'cocina' && (
                <button onClick={() => setView('pedidos')} className={`p-2 rounded ${view==='pedidos'?'bg-yellow-600':'bg-gray-700'}`}><ShoppingCart size={20}/></button>
            )}
            {(user.role === 'admin' || user.role === 'cocina') && (
                <button onClick={() => setView('cocina')} className={`p-2 rounded ${view==='cocina'?'bg-yellow-600':'bg-gray-700'}`}><ChefHat size={20}/></button>
            )}
            <button onClick={() => window.location.reload()} className="p-2 bg-red-600 rounded"><LogOut size={20}/></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-700">Configuración Global</h2>
                        <p className="text-gray-500">Tasa del día (BCV/Paralelo)</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <span className="text-2xl font-bold text-green-600">1 USD =</span>
                        <input type="number" value={tasa} onChange={e => setTasa(e.target.value)} className="border p-2 rounded text-xl w-32" />
                        <button onClick={async () => {
                            await supabase.from('settings').upsert({ key:'tasa', value: { usd: tasa }});
                            alert("Tasa actualizada");
                        }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Guardar</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users/> Gestión de Personal (Dueño)</h3>
                    {user.name === 'Manolo Dueño' ? (
                        <div className="flex gap-4">
                            <button onClick={async () => {
                                if(confirm("¿RESET TOTAL A 100 UNIDADES?")) {
                                    const { data } = await supabase.from('ingredients').select('id');
                                    for(let i of data) await supabase.from('ingredients').update({stock: 100}).eq('id', i.id);
                                    loadData();
                                    alert("Todo a 100");
                                }
                            }} className="bg-red-100 text-red-700 p-4 rounded border border-red-300 hover:bg-red-200">
                                ☢️ Reset Stock a 100
                            </button>
                            <button onClick={async () => {
                                if(confirm("¿BORRAR HISTORIAL DE VENTAS?")) {
                                    await supabase.from('order_items').delete().neq('quantity', 0);
                                    await supabase.from('payments').delete().neq('amount_usd', 0);
                                    await supabase.from('orders').delete().neq('total_usd', 0);
                                    alert("Historial borrado");
                                    loadData();
                                }
                            }} className="bg-orange-100 text-orange-700 p-4 rounded border border-orange-300 hover:bg-orange-200">
                                🗑️ Blanquear Ventas
                            </button>
                        </div>
                    ) : <p className="text-gray-400">Solo Manolo puede ver estas opciones.</p>}
                </div>
            </div>
        )}

        {/* --- PEDIDOS (MESERO / CAJA) --- */}
        {view === 'pedidos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
                {/* MENU */}
                <div className="md:col-span-2 overflow-y-auto bg-white p-4 rounded shadow-lg">
                    <h2 className="font-bold text-xl mb-4">Menú</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map(p => (
                            <div key={p.id} onClick={() => setCart([...cart, { ...p, tempId: Math.random() }])} 
                                className="cursor-pointer border hover:border-yellow-500 p-4 rounded-lg bg-gray-50 hover:bg-yellow-50 transition">
                                <h3 className="font-bold text-gray-800">{p.name}</h3>
                                <p className="text-green-600 font-bold">${p.price_usd}</p>
                                <span className="text-xs bg-gray-200 px-2 rounded text-gray-600">{p.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* COMANDA */}
                <div className="bg-white p-4 rounded shadow-lg flex flex-col h-full">
                    <h2 className="font-bold text-xl mb-2">Orden Actual</h2>
                    <div className="flex gap-2 mb-4">
                        <select className="border p-2 rounded" onChange={e => setServiceInfo({...serviceInfo, type: e.target.value})}>
                            <option>Mesa</option><option>Para Llevar</option><option>Delivery</option>
                        </select>
                        <input placeholder="# Mesa / Cliente" className="border p-2 rounded w-full" 
                            onChange={e => setServiceInfo({...serviceInfo, val: e.target.value})} value={serviceInfo.val} />
                    </div>
                    <div className="flex-1 overflow-y-auto border-t border-b py-2 space-y-2">
                        {cart.map((item, idx) => (
                            <div key={item.tempId} className="flex justify-between items-start text-sm">
                                <div>
                                    <span className="font-bold">{item.name}</span>
                                    <div className="text-xs text-gray-500">${item.price_usd}</div>
                                    <input placeholder="Notas (sin cebolla...)" className="text-xs border-b w-full mt-1 focus:outline-none" 
                                        onChange={e => {
                                            const newCart = [...cart];
                                            newCart[idx].notes = e.target.value;
                                            setCart(newCart);
                                        }}/>
                                </div>
                                <button onClick={() => setCart(cart.filter(x => x.tempId !== item.tempId))} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-xl font-bold mb-4">
                            <span>Total:</span>
                            <span>${cart.reduce((s, i) => s + i.price_usd, 0).toFixed(2)}</span>
                        </div>
                        <button onClick={sendOrder} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50">
                            {loading ? 'Enviando...' : 'ENVIAR A COCINA'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- CAJA (COBRO) --- */}
        {view === 'caja' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="font-bold text-lg mb-4">Pedidos Pendientes de Pago</h2>
                    {orders.filter(o => o.status !== 'pagado').map(o => (
                        <div key={o.id} onClick={() => { setSelectedOrder(o); setCurrentPayments([]); }}
                             className={`p-4 border-b cursor-pointer hover:bg-blue-50 flex justify-between items-center ${selectedOrder?.id === o.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}>
                            <div>
                                <div className="font-bold text-lg">{o.service_type} - {o.info}</div>
                                <span className={`text-xs px-2 py-1 rounded ${o.status==='listo'?'bg-green-200 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{o.status.toUpperCase()}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-xl">${o.total_usd}</div>
                                <div className="text-sm text-gray-500">{new Date(o.created_at).toLocaleTimeString()}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {selectedOrder && (
                    <div className="bg-white p-6 rounded shadow-lg h-fit sticky top-20">
                        <h2 className="text-2xl font-bold text-center mb-6 border-b pb-4">Cobrar Orden</h2>
                        
                        <div className="mb-6 bg-gray-50 p-4 rounded">
                            <div className="flex justify-between text-lg mb-2">
                                <span>Total a Pagar:</span>
                                <span className="font-bold">${selectedOrder.total_usd.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg mb-2 text-blue-600">
                                <span>En Bolívares:</span>
                                <span className="font-bold">Bs {(selectedOrder.total_usd * tasa).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* PAGO CALCULATOR */}
                        <div className="mb-6">
                            <div className="flex gap-2 mb-2">
                                <input type="number" placeholder="Monto" className="border p-2 rounded flex-1 text-lg" 
                                    value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                <select className="border p-2 rounded bg-white" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                                    <option value="usd_efectivo">$ Efectivo</option>
                                    <option value="bs_efectivo">Bs Efectivo</option>
                                    <option value="pago_movil">Pago Móvil</option>
                                    <option value="punto">Punto</option>
                                    <option value="zelle">Zelle</option>
                                </select>
                            </div>
                            <button onClick={() => {
                                const val = parseFloat(payAmount);
                                if (!val) return;
                                const isBs = payMethod.startsWith('bs') || payMethod === 'pago_movil' || payMethod === 'punto';
                                const usdEquiv = isBs ? val / tasa : val;
                                
                                setCurrentPayments([...currentPayments, {
                                    method: payMethod,
                                    amount_usd: usdEquiv,
                                    amount_bs: isBs ? val : 0
                                }]);
                                setPayAmount('');
                            }} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Agregar Pago</button>
                        </div>

                        {/* LISTA DE PAGOS */}
                        <div className="space-y-2 mb-6">
                            {currentPayments.map((p, i) => (
                                <div key={i} className="flex justify-between border-b pb-1 text-sm">
                                    <span>{p.method}</span>
                                    <span>${p.amount_usd.toFixed(2)} {p.amount_bs > 0 && `(Bs ${p.amount_bs})`}</span>
                                </div>
                            ))}
                        </div>

                        {/* RESULTADO FINAL */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between font-bold text-lg mb-4">
                                <span>Restante:</span>
                                {(() => {
                                    const paid = currentPayments.reduce((s, p) => s + p.amount_usd, 0);
                                    const rest = selectedOrder.total_usd - paid;
                                    return (
                                        <div className="text-right">
                                            <div className={rest > 0.01 ? 'text-red-600' : 'text-green-600'}>
                                                ${Math.max(0, rest).toFixed(2)}
                                            </div>
                                            {rest > 0.01 && (
                                                <div className="text-sm text-red-500">
                                                    Bs {(rest * tasa).toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                            <button onClick={handlePayment} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-xl shadow-lg hover:bg-green-700">
                                FINALIZAR VENTA
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- INVENTARIO (ADMIN) --- */}
        {view === 'inventario' && (
            <div className="bg-white p-6 rounded shadow-lg">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-2xl font-bold">Inventario Real</h2>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded"><Printer size={16}/> Imprimir</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3">Ingrediente</th>
                                <th className="p-3">Stock Actual</th>
                                <th className="p-3">Unidad</th>
                                {user.name === 'Manolo Dueño' && <th className="p-3 no-print">Ajuste Manual</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {ingredients.map(ing => (
                                <tr key={ing.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{ing.name}</td>
                                    <td className={`p-3 font-bold ${ing.stock < 10 ? 'text-red-600' : 'text-gray-800'}`}>{Number(ing.stock).toFixed(2)}</td>
                                    <td className="p-3 text-sm text-gray-500">{ing.unit}</td>
                                    {user.name === 'Manolo Dueño' && (
                                        <td className="p-3 no-print">
                                            <button onClick={async () => {
                                                const val = prompt(`Nuevo stock para ${ing.name}:`, ing.stock);
                                                if(val) {
                                                    await supabase.from('ingredients').update({stock: val}).eq('id', ing.id);
                                                    loadData();
                                                }
                                            }} className="text-blue-600 hover:text-blue-800"><Edit3 size={18}/></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- COCINA --- */}
        {view === 'cocina' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {orders.filter(o => o.status === 'pendiente').map(o => (
                    <div key={o.id} className="bg-white rounded-lg shadow-md overflow-hidden border-l-8 border-yellow-500">
                        <div className="bg-yellow-50 p-3 border-b border-yellow-100 flex justify-between items-center">
                            <span className="font-bold text-lg text-gray-800">{o.service_type}</span>
                            <span className="text-sm font-bold bg-white px-2 rounded border">{o.info}</span>
                        </div>
                        <div className="p-4">
                            <ul className="space-y-3">
                                {o.order_items.map(item => (
                                    <li key={item.id} className="text-gray-800 leading-tight">
                                        <div className="font-bold text-lg">• {item.product_name}</div>
                                        {item.notes && <div className="text-red-600 text-sm bg-red-50 p-1 rounded mt-1">⚠️ {item.notes}</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button onClick={async () => {
                            await supabase.from('orders').update({status:'listo'}).eq('id', o.id);
                            fetchOrders();
                        }} className="w-full bg-green-600 text-white font-bold py-3 hover:bg-green-700">MARCAR LISTO ✅</button>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}
