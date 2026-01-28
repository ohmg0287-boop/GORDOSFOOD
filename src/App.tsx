import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, LayoutDashboard, DollarSign, Users, Package, Trash2, Printer, LogOut, Edit3, TrendingDown, TrendingUp, PlusCircle, Save } from 'lucide-react';

// --- CONEXIÓN ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// --- MATRIZ DE RECETAS ---
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
  "El antojito (6und)": { "tequeños racion": 0.5, "Bandeja Anime (Und)": 1 },
  "El antojito (8und)": { "tequeños racion": 0.7, "Bandeja Anime (Und)": 1 },
  "El antojito (14und)": { "tequeños racion": 1, "Bandeja Anime (Und)": 1 },
  "La Acompañante": { "Papas (Porción 150g)": 1, "Bandeja Anime (Und)": 1 },
  "Nestea Pequeño": { "Vaso Plástico p (Und)": 1 },
  "Nestea Grande": { "Vaso Plástico g (Und)": 1, "Nestea Grande": 1 },
  "Agua Personal": { "Agua Personal": 1 },
  "Refresco 1 Litros": { "refresco 1l": 1 },
  "Refresco 1.5 Litros": { "Refresco 1.5L (Bot)": 1 },
  "Propina bien Gastada": {},
  "Cuota feliz (4und)": {},
  "Cuota feliz (6und)": {},
  "Cuota feliz (12und)": {},
  "Gustazo del mes": {},
  "Capricho de quincena": {},
  "Malta lata": {}
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
  const [expenses, setExpenses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  // Operativo
  const [cart, setCart] = useState([]);
  const [serviceInfo, setServiceInfo] = useState({ type: 'Mesa', val: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [lastOrderTicket, setLastOrderTicket] = useState(null); 
  
  // Caja y Gastos
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('usd_efectivo');
  const [currentPayments, setCurrentPayments] = useState([]);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', category: 'Otros', isStock: false, ingredientId: '', quantity: '' });

  // Reportes
  const [reportFilter, setReportFilter] = useState('today'); 
  const [paymentBreakdown, setPaymentBreakdown] = useState({});

 // CAMBIO: Ahora Caja y Gerencia también refrescan pedidos automáticamente
useEffect(() => {
  if (user) {
    loadData();
    // Agregamos 'caja', 'owner' y 'manager' al auto-refresco cada 5 segundos
    if (user.role === 'cocina' || user.role === 'caja' || user.role === 'owner' || user.role === 'manager') {
      const i = setInterval(fetchOrders, 5000);
      return () => clearInterval(i);
    }
  }
}, [user]);
  // --- CARGA DE DATOS ---
  const fetchRate = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'tasa').maybeSingle();
    if (data) setTasa(data.value.usd);
  };

  const loadData = async () => {
    setLoading(true);
    const p = await supabase.from('products').select('*').order('name');
    const i = await supabase.from('ingredients').select('*').order('name');
    const o = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    const e = await supabase.from('expenses').select('*').order('date', { ascending: false });
    
    // Solo cargamos staff si es dueño (owner)
    if (user && user.role === 'owner') {
        const s = await supabase.from('staff').select('*').order('name');
        if (s.data) setStaffList(s.data);
    }
    
    if (p.data) setProducts(p.data);
    if (i.data) setIngredients(i.data);
    if (o.data) setOrders(o.data);
    if (e.data) setExpenses(e.data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  // --- LOGIN CORREGIDO ---
  const login = async (pin) => {
    // Usamos maybeSingle para evitar crash si hay duplicados, aunque no debería.
    const { data, error } = await supabase.from('staff').select('*').eq('pin', pin).maybeSingle();
    
    if (error || !data) {
      alert("PIN Incorrecto o Usuario no encontrado");
      return;
    }

    setUser(data);
    
    // MAPEO EXACTO SEGÚN TU TABLA DE SUPABASE
    if (data.role === 'owner') setView('dashboard');      // Dueño Total
    else if (data.role === 'manager') setView('dashboard'); // Gerencia (Admin limitado)
    else if (data.role === 'caja') setView('caja');
    else if (data.role === 'mesero') setView('pedidos');
    else if (data.role === 'cocina') setView('cocina');
    else {
        alert("Rol desconocido: " + data.role);
        setUser(null);
    }
  };

  // --- PEDIDOS & TICKET ---
  const sendOrder = async () => {
    if (cart.length === 0 || !serviceInfo.val) return alert("Carrito vacío o falta Mesa/Cliente");
    setLoading(true);
    const total = cart.reduce((sum, item) => sum + item.price_usd, 0);

    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: total, service_type: serviceInfo.type, info: serviceInfo.val, created_by: user.name, status: 'pendiente'
    }]).select().single();

    if (error) { alert("Error al crear orden"); setLoading(false); return; }

    const items = cart.map(i => ({
      order_id: order.id, product_name: i.name, quantity: 1, price_at_time: i.price_usd, notes: i.notes || ''
    }));
    await supabase.from('order_items').insert(items);

    // Descontar Inventario
    for (let item of cart) {
      const recipe = RECIPES_MATRIX[item.name];
      if (recipe) {
        for (let [ingName, qty] of Object.entries(recipe)) {
            const dbIng = ingredients.find(i => i.name === ingName);
            if (dbIng) {
                const newStock = parseFloat(dbIng.stock) - qty;
                await supabase.from('ingredients').update({ stock: newStock }).eq('id', dbIng.id);
            }
        }
      }
    }
    
    // Generar Ticket para Impresión
    setLastOrderTicket({ ...order, items: items });

    setCart([]); setServiceInfo({ type: 'Mesa', val: '' }); loadData(); setLoading(false);
  };

  // --- PAGOS ---
  const handlePayment = async () => {
    const totalPaid = currentPayments.reduce((s, p) => s + p.amount_usd, 0);
    const remaining = selectedOrder.total_usd - totalPaid;
    if (remaining > 0.01) return alert("Falta cubrir el monto total");

    setLoading(true);
    const paymentsToSave = currentPayments.map(p => ({
        order_id: selectedOrder.id, method: p.method, amount_usd: p.amount_usd, amount_bs: p.amount_bs, rate_used: tasa
    }));
    await supabase.from('payments').insert(paymentsToSave);
    await supabase.from('orders').update({ status: 'pagado' }).eq('id', selectedOrder.id);
    alert("Venta Cobrada Exitosamente 💰");
    setSelectedOrder(null); setCurrentPayments([]); fetchOrders(); setLoading(false);
  };

  // --- GESTIÓN (DUEÑO) ---
  const registerExpenseTransaction = async () => {
    if (!newExpense.desc || !newExpense.amount) return alert("Faltan datos");
    setLoading(true);
    
    await supabase.from('expenses').insert([{
        description: newExpense.desc,
        amount: parseFloat(newExpense.amount),
        category: newExpense.isStock ? 'Compra Inventario' : newExpense.category,
        registered_by: user.name
    }]);

    if (newExpense.isStock && newExpense.ingredientId && newExpense.quantity) {
        const ing = ingredients.find(i => i.id === newExpense.ingredientId);
        if (ing) {
            const newStock = parseFloat(ing.stock) + parseFloat(newExpense.quantity);
            await supabase.from('ingredients').update({ stock: newStock }).eq('id', ing.id);
        }
    }

    alert("Registrado correctamente");
    setNewExpense({ desc: '', amount: '', category: 'Otros', isStock: false, ingredientId: '', quantity: '' });
    loadData(); setLoading(false);
  };

  const handleStaff = async (action, staffData) => {
    if (user.role !== 'owner') return alert("Acceso denegado");
    if (action === 'add') {
        const pin = prompt("Asignar PIN:");
        if (!pin) return;
        await supabase.from('staff').insert([{ name: staffData.name, role: staffData.role, pin }]);
    } else if (action === 'updatePin') {
        const newPin = prompt("Nuevo PIN:");
        if (newPin) await supabase.from('staff').update({ pin: newPin }).eq('id', staffData.id);
    } else if (action === 'delete') {
        if(confirm("¿Eliminar empleado?")) await supabase.from('staff').delete().eq('id', staffData.id);
    }
    loadData();
  };

  const handleAddIngredient = async () => {
      const name = prompt("Nombre del nuevo insumo:");
      if (!name) return;
      const unit = prompt("Unidad (Und, Kg, Litro):");
      await supabase.from('ingredients').insert([{ name, unit, stock: 0 }]);
      loadData();
  };

  // --- LÓGICA DE REPORTES ---
  const getFilteredData = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let filterDate = startOfDay;
    if (reportFilter === 'week') filterDate = startOfWeek;
    if (reportFilter === 'month') filterDate = startOfMonth;

    const filteredOrders = orders.filter(o => new Date(o.created_at) >= filterDate && o.status === 'pagado');
    const filteredExpenses = expenses.filter(e => new Date(e.date) >= filterDate);
    
    return { filteredOrders, filteredExpenses };
  };

  useEffect(() => {
      if (view === 'reportes') {
          const fetchPayments = async () => {
              const { filteredOrders } = getFilteredData();
              const ids = filteredOrders.map(o => o.id);
              if(ids.length === 0) { setPaymentBreakdown({}); return; }
              
              const { data } = await supabase.from('payments').select('*').in('order_id', ids);
              if(data) {
                  const breakdown = data.reduce((acc, curr) => {
                      acc[curr.method] = (acc[curr.method] || 0) + curr.amount_usd;
                      return acc;
                  }, {});
                  setPaymentBreakdown(breakdown);
              }
          };
          fetchPayments();
      }
  }, [view, reportFilter, orders]);


  // --- INTERFAZ LOGIN (BOTONES SEPARADOS) ---
  if (!user) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-8 text-yellow-500">DONDE MANOLO</h1>
      <div className="grid grid-cols-2 gap-6 w-full max-w-md px-4">
        {/* BOTONES INDIVIDUALES Y CLAROS */}
        <button onClick={() => { const p = prompt("PIN Dueño:"); if(p) login(p); }} className="p-6 bg-yellow-600 rounded-xl hover:bg-yellow-500 text-lg font-bold shadow-lg transform hover:scale-105 transition">
             👑 DUEÑO
        </button>
        <button onClick={() => { const p = prompt("PIN Gerencia:"); if(p) login(p); }} className="p-6 bg-blue-600 rounded-xl hover:bg-blue-500 text-lg font-bold shadow-lg transform hover:scale-105 transition">
             👔 GERENCIA
        </button>
        <button onClick={() => { const p = prompt("PIN Caja:"); if(p) login(p); }} className="p-6 bg-green-600 rounded-xl hover:bg-green-500 text-lg font-bold shadow-lg transform hover:scale-105 transition">
             💵 CAJA
        </button>
        <button onClick={() => { const p = prompt("PIN Mesero:"); if(p) login(p); }} className="p-6 bg-purple-600 rounded-xl hover:bg-purple-500 text-lg font-bold shadow-lg transform hover:scale-105 transition">
             🍽️ MESERO
        </button>
        <button onClick={() => { const p = prompt("PIN Cocina:"); if(p) login(p); }} className="col-span-2 p-4 bg-gray-700 rounded-xl hover:bg-gray-600 font-bold border border-gray-500">
             🔥 COCINA
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-gray-100 font-sans">
      {/* NAVBAR */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg no-print">
        <div className="font-bold text-lg text-yellow-400">MANOLO <span className="text-xs text-gray-400">({user.role})</span></div>
        <div className="flex gap-2">
            {(user.role === 'owner' || user.role === 'manager') && (
                <>
                <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view==='dashboard'?'bg-yellow-600':'bg-gray-700'}`}><LayoutDashboard size={20}/></button>
                <button onClick={() => setView('inventario')} className={`p-2 rounded ${view==='inventario'?'bg-yellow-600':'bg-gray-700'}`}><Package size={20}/></button>
                <button onClick={() => setView('reportes')} className={`p-2 rounded ${view==='reportes'?'bg-yellow-600':'bg-gray-700'}`}><TrendingUp size={20}/></button>
                </>
            )}
            {(user.role === 'owner' || user.role === 'caja' || user.role === 'manager') && (
                <button onClick={() => setView('caja')} className={`p-2 rounded ${view==='caja'?'bg-yellow-600':'bg-gray-700'}`}><DollarSign size={20}/></button>
            )}
            {user.role !== 'cocina' && (
                <button onClick={() => setView('pedidos')} className={`p-2 rounded ${view==='pedidos'?'bg-yellow-600':'bg-gray-700'}`}><ShoppingCart size={20}/></button>
            )}
            <button onClick={() => window.location.reload()} className="p-2 bg-red-600 rounded"><LogOut size={20}/></button>
        </div>
      </nav>

      {/* --- TICKET MODAL --- */}
{lastOrderTicket && (
  <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center">
    
    {/* 1. ESTE ES EL TICKET INVISIBLE QUE SE IMPRIME (Solo para la impresora) */}
    <div className="hidden">
      <div id="ticket-print" style={{ width: '58mm', textAlign: 'center', color: 'black', background: 'white' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>*** COCINA ***</div>
        <div style={{ fontSize: '12px' }}>{new Date().toLocaleTimeString()}</div>
        
        {/* Mesa en Grande */}
        <div style={{ fontSize: '30px', fontWeight: '900', border: '2px solid black', margin: '5px 0' }}>
          {lastOrderTicket.info}
        </div>

        <div style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

        {/* Productos en Grande para el Cocinero */}
        <div style={{ textAlign: 'left' }}>
          {lastOrderTicket.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {item.quantity} x {item.product_name}
              </div>
              {item.notes && (
                <div style={{ fontSize: '14px', fontStyle: 'italic', marginLeft: '10px' }}>
                  ** {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed black', margin: '10px 0' }}></div>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>--- FIN DE ORDEN ---</div>
        <br />.
      </div>
    </div>

    {/* 2. ESTE ES EL MODAL QUE VES EN PANTALLA (No se imprime) */}
    <div className="bg-white p-4 w-80 text-black font-mono text-sm shadow-2xl rounded-lg">
        <div className="text-center font-bold text-lg border-b border-dashed pb-2 mb-2">VISTA PREVIA</div>
        <div className="mb-2">MESA/CLIENTE: <span className="font-bold">{lastOrderTicket.info}</span></div>
        <div className="mb-2">FECHA: {new Date().toLocaleTimeString()}</div>
        <div className="border-b border-dashed mb-2"></div>
        
        <div className="max-h-60 overflow-y-auto">
            {lastOrderTicket.items.map((item, idx) => (
                <div key={idx} className="mb-1 border-b border-gray-100 pb-1">
                    <div className="font-bold text-base">{item.quantity} x {item.product_name}</div>
                    {item.notes && <div className="text-xs italic text-blue-600">Nota: {item.notes}</div>}
                </div>
            ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
            <button 
                onClick={handleEnviarCocina} 
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-lg font-bold text-lg shadow-md transition-colors">
                👨‍🍳 ENVIAR A COCINA
            </button>
            <button 
                onClick={() => setLastOrderTicket(null)} 
                className="bg-gray-200 text-black p-2 rounded font-semibold text-sm">
                CERRAR
            </button>
        </div>
    </div>
  </div>
)}
      <div className="max-w-7xl mx-auto p-4">
        
        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
            <div className="space-y-6">
                {/* TASA */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex justify-between items-center">
                    <div><h2 className="text-xl font-bold text-gray-700">Tasa del día</h2></div>
                    <div className="flex gap-4 items-center">
                        <span className="text-2xl font-bold text-green-600">1 USD =</span>
                        <input type="number" value={tasa} onChange={e => setTasa(e.target.value)} className="border p-2 rounded text-xl w-32" />
                        <button onClick={async () => { await supabase.from('settings').upsert({ key:'tasa', value: { usd: tasa }}); alert("Guardado"); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold"><Save size={20}/></button>
                    </div>
                </div>

                {/* GASTOS */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingDown className="text-red-500"/> Registrar Compra/Gasto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                        <input placeholder="Descripción" className="border p-2 rounded w-full" value={newExpense.desc} onChange={e => setNewExpense({...newExpense, desc: e.target.value})} />
                        <div className="flex gap-2">
                             <input type="number" placeholder="Monto ($)" className="border p-2 rounded w-full" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                             <select className="border p-2 rounded" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                                 <option>Nomina</option><option>Servicios</option><option>Mantenimiento</option><option>Otros</option>
                             </select>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2 border-t pt-2 mt-2">
                            <input type="checkbox" id="isStock" checked={newExpense.isStock} onChange={e => setNewExpense({...newExpense, isStock: e.target.checked})} className="w-5 h-5"/>
                            <label htmlFor="isStock" className="font-bold text-gray-700">¿Es Compra de Inventario? (Suma Stock)</label>
                        </div>
                        {newExpense.isStock && (
                            <div className="md:col-span-2 flex gap-2">
                                <select className="border p-2 rounded w-full" onChange={e => setNewExpense({...newExpense, ingredientId: e.target.value})}>
                                    <option value="">Seleccione Insumo...</option>
                                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <input type="number" placeholder="Cant" className="border p-2 rounded w-24" onChange={e => setNewExpense({...newExpense, quantity: e.target.value})} />
                            </div>
                        )}
                        <button onClick={registerExpenseTransaction} className="md:col-span-2 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Registrar Salida</button>
                    </div>
                </div>

                {/* PERSONAL - SOLO VISIBLE PARA EL OWNER */}
                {user.role === 'owner' ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Users/> Gestión de Personal (Solo Dueño)</h3>
                            <button onClick={() => handleStaff('add', { name: prompt("Nombre:"), role: prompt("Rol (owner, manager, caja, mesero, cocina):") })} className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"><PlusCircle size={16}/> Nuevo</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {staffList.map(s => (
                                <div key={s.id} className="border p-3 rounded flex justify-between items-center bg-gray-50">
                                    <div><div className="font-bold">{s.name}</div><div className="text-xs text-gray-500 uppercase">{s.role}</div></div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStaff('updatePin', s)} className="text-blue-500">🔑</button>
                                        <button onClick={() => handleStaff('delete', s)} className="text-red-500">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">⚠️ La gestión de usuarios está reservada solo para el Dueño.</div>}
            </div>
        )}

        {/* --- REPORTES --- */}
        {(view === 'reportes' || (view === 'caja' && user.role === 'caja')) && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded shadow-lg no-print">
                    <div className="flex gap-4 justify-center mb-6">
                        <button onClick={() => setReportFilter('today')} className={`px-4 py-2 rounded font-bold ${reportFilter==='today'?'bg-blue-600 text-white':'bg-gray-200'}`}>Hoy</button>
                        <button onClick={() => setReportFilter('week')} className={`px-4 py-2 rounded font-bold ${reportFilter==='week'?'bg-blue-600 text-white':'bg-gray-200'}`}>Semana</button>
                        <button onClick={() => setReportFilter('month')} className={`px-4 py-2 rounded font-bold ${reportFilter==='month'?'bg-blue-600 text-white':'bg-gray-200'}`}>Mes</button>
                        <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2"><Printer size={16}/> Imprimir</button>
                    </div>
                </div>

                {/* VISTA DE IMPRESIÓN */}
                <div className="bg-white p-8 rounded shadow-lg" id="reporte-imprimible">
                    <div className="text-center mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold">REPORTE DE GESTIÓN</h1>
                        <p className="text-gray-500 capitalize">Periodo: {reportFilter}</p>
                    </div>
                    {/* Resumen Métodos de Pago */}
                    <div className="mb-8">
                        <h3 className="font-bold border-b mb-2">Ingresos por Método de Pago</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.entries(paymentBreakdown).map(([method, amount]) => (
                                <div key={method} className="bg-green-50 p-2 rounded border border-green-200 text-center">
                                    <div className="text-xs text-gray-500 uppercase">{method.replace('_', ' ')}</div>
                                    <div className="font-bold text-lg">${amount.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-right text-xl font-bold text-green-700">
                             Total Ventas: ${Object.values(paymentBreakdown).reduce((a,b)=>a+b, 0).toFixed(2)}
                        </div>
                    </div>
                    {/* Gastos */}
                    <div>
                        <h3 className="font-bold border-b mb-2">Gastos Registrados</h3>
                        <table className="w-full text-sm">
                             <tbody>
                                 {getFilteredData().filteredExpenses.map(e => (
                                     <tr key={e.id}>
                                         <td>{e.description}</td>
                                         <td className="text-right text-red-600">-${e.amount.toFixed(2)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- INVENTARIO --- */}
        {view === 'inventario' && (
            <div className="bg-white p-6 rounded shadow-lg">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-2xl font-bold">Inventario</h2>
                    <div className="flex gap-2">
                         <button onClick={handleAddIngredient} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><PlusCircle size={16}/> Nuevo Item</button>
                         <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded"><Printer size={16}/></button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-gray-100 border-b"><th className="p-3">Ingrediente</th><th className="p-3">Stock</th><th className="p-3">Unidad</th>{user.role === 'owner' && <th className="p-3 no-print">Ajuste</th>}</tr></thead>
                        <tbody>
                            {ingredients.map(ing => (
                                <tr key={ing.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{ing.name}</td>
                                    <td className={`p-3 font-bold ${ing.stock < 10 ? 'text-red-600' : 'text-gray-800'}`}>{Number(ing.stock).toFixed(2)}</td>
                                    <td className="p-3 text-sm text-gray-500">{ing.unit}</td>
                                    {/* SOLO EL OWNER PUEDE VER EL BOTÓN EDITAR */}
                                    {user.role === 'owner' && (
                                        <td className="p-3 no-print"><button onClick={async () => { const val = prompt(`Nuevo stock para ${ing.name}:`, ing.stock); if(val) { await supabase.from('ingredients').update({stock: val}).eq('id', ing.id); loadData(); }}} className="text-blue-600 hover:text-blue-800"><Edit3 size={18}/></button></td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- PEDIDOS --- */}
        {view === 'pedidos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
                <div className="md:col-span-2 overflow-y-auto bg-white p-4 rounded shadow-lg">
                    <h2 className="font-bold text-xl mb-4">Menú</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map(p => (
                            <div key={p.id} onClick={() => setCart([...cart, { ...p, tempId: Math.random() }])} 
                                className="cursor-pointer border hover:border-yellow-500 p-4 rounded-lg bg-gray-50 hover:bg-yellow-50 transition">
                                <h3 className="font-bold text-gray-800">{p.name}</h3>
                                <p className="text-green-600 font-bold">${p.price_usd}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded shadow-lg flex flex-col h-full">
                    <h2 className="font-bold text-xl mb-2">Orden Actual</h2>
                    <div className="flex gap-2 mb-4">
                        <select className="border p-2 rounded" onChange={e => setServiceInfo({...serviceInfo, type: e.target.value})}>
                            <option>Mesa</option><option>Para Llevar</option><option>Delivery</option>
                        </select>
                        <input placeholder="Info Cliente/Mesa" className="border p-2 rounded w-full" onChange={e => setServiceInfo({...serviceInfo, val: e.target.value})} value={serviceInfo.val} />
                    </div>
                    <div className="flex-1 overflow-y-auto border-t border-b py-2 space-y-2">
                        {cart.map((item, idx) => (
                            <div key={item.tempId} className="flex justify-between items-start text-sm">
                                <div><span className="font-bold">{item.name}</span> <div className="text-xs text-gray-500">${item.price_usd}</div><input placeholder="Notas..." className="text-xs border-b w-full mt-1 focus:outline-none" onChange={e => { const newCart = [...cart]; newCart[idx].notes = e.target.value; setCart(newCart); }}/></div>
                                <button onClick={() => setCart(cart.filter(x => x.tempId !== item.tempId))} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-xl font-bold mb-4"><span>Total:</span><span>${cart.reduce((s, i) => s + i.price_usd, 0).toFixed(2)}</span></div>
                        <button onClick={sendOrder} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50">{loading ? '...' : 'ENVIAR Y TICKET'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- COCINA --- */}
        {view === 'cocina' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {orders.filter(o => o.status === 'pendiente').map(o => (
                    <div key={o.id} className="bg-white rounded-lg shadow-md overflow-hidden border-l-8 border-yellow-500">
                        <div className="bg-yellow-50 p-3 border-b border-yellow-100 flex justify-between items-center"><span className="font-bold text-lg text-gray-800">{o.service_type}</span><span className="text-sm font-bold bg-white px-2 rounded border">{o.info}</span></div>
                        <div className="p-4"><ul className="space-y-3">{o.order_items.map(item => (<li key={item.id} className="text-gray-800 leading-tight"><div className="font-bold text-lg">• {item.product_name}</div>{item.notes && <div className="text-red-600 text-sm bg-red-50 p-1 rounded mt-1">⚠️ {item.notes}</div>}</li>))}</ul></div>
                        <button onClick={async () => { await supabase.from('orders').update({status:'listo'}).eq('id', o.id); fetchOrders(); }} className="w-full bg-green-600 text-white font-bold py-3 hover:bg-green-700">MARCAR LISTO ✅</button>
                    </div>
                ))}
            </div>
        )}
        
        {/* --- CAJA --- */}
        {view === 'caja' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">Por Cobrar</h2>{user.role === 'caja' && <button onClick={() => setView('reportes')} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded font-bold">Ver Cierre Diario</button>}</div>
                    {orders.filter(o => o.status !== 'pagado').map(o => (
                        <div key={o.id} onClick={() => { setSelectedOrder(o); setCurrentPayments([]); }} className={`p-4 border-b cursor-pointer hover:bg-blue-50 flex justify-between items-center ${selectedOrder?.id === o.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}>
                            <div><div className="font-bold text-lg">{o.service_type} - {o.info}</div><span className={`text-xs px-2 py-1 rounded ${o.status==='listo'?'bg-green-200 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{o.status.toUpperCase()}</span></div>
                            <div className="text-right"><div className="font-bold text-xl">${o.total_usd}</div></div>
                        </div>
                    ))}
                </div>
                {selectedOrder && (
                    <div className="bg-white p-6 rounded shadow-lg h-fit sticky top-20">
                        <h2 className="text-2xl font-bold text-center mb-6 border-b pb-4">Cobrar</h2>
                        <div className="mb-6 bg-gray-50 p-4 rounded"><div className="flex justify-between text-lg mb-2"><span>Total:</span><span className="font-bold">${selectedOrder.total_usd.toFixed(2)}</span></div><div className="flex justify-between text-lg mb-2 text-blue-600"><span>Bolívares:</span><span className="font-bold">Bs {(selectedOrder.total_usd * tasa).toFixed(2)}</span></div></div>
                        <div className="mb-6">
                            <div className="flex gap-2 mb-2"><input type="number" placeholder="Monto" className="border p-2 rounded flex-1 text-lg" value={payAmount} onChange={e => setPayAmount(e.target.value)} /><select className="border p-2 rounded bg-white" value={payMethod} onChange={e => setPayMethod(e.target.value)}><option value="usd_efectivo">$ Efectivo</option><option value="bs_efectivo">Bs Efectivo</option><option value="pago_movil">Pago Móvil</option><option value="punto">Punto</option><option value="zelle">Zelle</option></select></div>
                            <button onClick={() => { const val = parseFloat(payAmount); if (!val) return; const isBs = payMethod.startsWith('bs') || payMethod === 'pago_movil' || payMethod === 'punto'; const usdEquiv = isBs ? val / tasa : val; setCurrentPayments([...currentPayments, { method: payMethod, amount_usd: usdEquiv, amount_bs: isBs ? val : 0 }]); setPayAmount(''); }} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Agregar Pago</button>
                        </div>
                        <div className="space-y-2 mb-6">{currentPayments.map((p, i) => (<div key={i} className="flex justify-between border-b pb-1 text-sm"><span>{p.method}</span><span>${p.amount_usd.toFixed(2)} {p.amount_bs > 0 && `(Bs ${p.amount_bs})`}</span></div>))}</div>
                        <div className="border-t pt-4"><div className="flex justify-between font-bold text-lg mb-4"><span>Restante:</span>{(() => { const paid = currentPayments.reduce((s, p) => s + p.amount_usd, 0); const rest = selectedOrder.total_usd - paid; return ( <div className="text-right"><div className={rest > 0.01 ? 'text-red-600' : 'text-green-600'}>${Math.max(0, rest).toFixed(2)}</div></div> ) })()}</div><button onClick={handlePayment} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-xl shadow-lg hover:bg-green-700">FINALIZAR VENTA</button></div>
                    </div>
                )}
            </div>
        )}
      </div>
      <style>{` @media print { .no-print { display: none !important; } body { background: white; } #reporte-imprimible { box-shadow: none; } } `}</style>
   {/* --- TICKET DE COCINA PROFESIONAL 80MM --- */}
<div id="ticket-cocina" className="hidden">
  <div className="ticket-header">
    <p>*** DONDE MANOLO ***</p>
    <p>ORDEN DE COCINA</p>
    <p>--------------------------------</p>
  </div>
  
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
    <span>FECHA: {new Date().toLocaleDateString()}</span>
    <span>HORA: {new Date().toLocaleTimeString()}</span>
  </div>

  <div style={{ borderBottom: '2px solid black', marginBottom: '10px' }}></div>

  {/* Aquí mapeas tus productos de la orden actual */}
  <div className="ticket-body">
    {currentOrder.map((item, index) => (
      <div key={index} className="ticket-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{item.quantity} x {item.name}</span>
      </div>
    ))}
  </div>

  <div style={{ borderTop: '2px solid black', marginTop: '10px', paddingTop: '5px' }}>
    <p style={{ textAlign: 'center', fontSize: '14px' }}>-- Fin de la Comanda --</p>
  </div>
</div> </div>
  );
}
