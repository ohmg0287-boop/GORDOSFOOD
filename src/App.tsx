import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, LayoutDashboard, DollarSign, Package, Trash2, LogOut, Edit3, TrendingDown, TrendingUp, ChefHat, XCircle, Printer, FileText } from 'lucide-react';

// --- CONEXIÓN SUPABASE ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function DondeManoloApp() {
  // --- ESTADOS ---
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [tasa, setTasa] = useState(0);

  // Datos de Base de Datos
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recipes, setRecipes] = useState({}); // Recetas dinámicas

  // Operativo
  const [cart, setCart] = useState([]);
  const [serviceInfo, setServiceInfo] = useState({ type: 'Mesa', val: '' });
  
  // Caja y Pagos
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('usd_efectivo');
  const [tenderAmount, setTenderAmount] = useState(''); // Billete entregado
  const [changeCurrency, setChangeCurrency] = useState('bs_efectivo'); // Moneda del vuelto
  const [currentPayments, setCurrentPayments] = useState([]);
  
  // Edición y Nuevos Productos
  const [isEditingOrder, setIsEditingOrder] = useState(false); 
  const [itemSearch, setItemSearch] = useState(''); 
  const [newProduct, setNewProduct] = useState({ name: '', price: '', ingredients: [] });
  const [newProdIng, setNewProdIng] = useState({ id: '', qty: '' });
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', category: 'Otros' });

  // IMPRESIÓN Y REPORTES (LO QUE FALTABA)
  const [ticketData, setTicketData] = useState(null); // Datos para imprimir ticket
  const [reportData, setReportData] = useState(null); // Datos para imprimir cierre

  // --- EFECTOS ---
  useEffect(() => {
    if (user) {
      loadData();
      const i = setInterval(fetchOrders, 5000);
      return () => clearInterval(i);
    }
  }, [user]);

  // --- CARGA DE DATOS ---
  const fetchRate = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'tasa').maybeSingle();
    if (data) setTasa(data.value.usd);
  };

  const loadData = async () => {
    setLoading(true);
    await fetchRate();
    const [p, i, o, e, r] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('product_ingredients').select('*')
    ]);

    // Procesar Recetas
    if (r.data && i.data) {
        const recipeMap = {};
        r.data.forEach(item => {
            if (!recipeMap[item.product_name]) recipeMap[item.product_name] = {};
            const ing = i.data.find(ing => ing.id === item.ingredient_id); // Ahora busca por ID UUID
            if (ing) recipeMap[item.product_name][ing.name] = item.quantity;
        });
        setRecipes(recipeMap);
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

  const login = async (pin) => {
    const { data } = await supabase.from('staff').select('*').eq('pin', pin).maybeSingle();
    if (!data) return alert("PIN Incorrecto");
    setUser(data);
    setView(data.role === 'caja' ? 'caja' : data.role === 'mesero' ? 'pedidos' : 'dashboard');
  };

  // --- LÓGICA DE PEDIDOS E INVENTARIO ---
  const addToCart = (product) => setCart(prev => [...prev, { ...product, tempId: Math.random() }]);
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.tempId !== id));

  const sendOrder = async () => {
    if (cart.length === 0 || !serviceInfo.val) return alert("Faltan datos");
    setLoading(true);
    
    // 1. Crear Orden
    const total = cart.reduce((s, i) => s + i.price_usd, 0);
    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: total, service_type: serviceInfo.type, info: serviceInfo.val, created_by: user.name, status: 'pendiente'
    }]).select().single();

    if (error) { alert("Error al crear orden"); setLoading(false); return; }

    // 2. Crear Items
    const items = cart.map(i => ({
      order_id: order.id, product_name: i.name, quantity: 1, price_at_time: i.price_usd, notes: i.notes || ''
    }));
    await supabase.from('order_items').insert(items);

    // 3. Descontar Inventario (Lógica Dinámica)
    for (let item of cart) {
      const recipe = recipes[item.name];
      if (recipe) {
        for (let [ingName, qty] of Object.entries(recipe)) {
            const dbIng = ingredients.find(i => i.name === ingName);
            if (dbIng) {
                await supabase.from('ingredients').update({ stock: parseFloat(dbIng.stock) - qty }).eq('id', dbIng.id);
            }
        }
      }
    }

    // 4. Preparar Ticket e Imprimir
    setReportData(null); // Limpiar reporte anterior
    setTicketData({ ...order, items: items, type: 'COMANDA' });
    setTimeout(() => window.print(), 500);

    setCart([]); setServiceInfo({ type: 'Mesa', val: '' }); loadData(); setLoading(false);
  };

  // --- LÓGICA DE NUEVOS PRODUCTOS (DUEÑO) ---
  const handleCreateProduct = async () => {
    if(!newProduct.name || !newProduct.price) return alert("Faltan datos");
    setLoading(true);

    // 1. Guardar Producto
    await supabase.from('products').insert([{ name: newProduct.name, price_usd: parseFloat(newProduct.price) }]);
    
    // 2. Guardar Receta
    if (newProduct.ingredients.length > 0) {
        const recipeItems = newProduct.ingredients.map(ing => ({
            product_name: newProduct.name,
            ingredient_id: ing.id, // UUID correcto
            quantity: ing.qty
        }));
        await supabase.from('product_ingredients').insert(recipeItems);
    }
    
    alert("Producto Creado");
    setNewProduct({ name: '', price: '', ingredients: [] });
    loadData(); setLoading(false);
  };

  const addIngToNewProduct = () => {
    if(!newProdIng.id || !newProdIng.qty) return;
    const ing = ingredients.find(i => i.id === newProdIng.id);
    setNewProduct(prev => ({
        ...prev, ingredients: [...prev.ingredients, { ...ing, qty: newProdIng.qty }]
    }));
    setNewProdIng({ id: '', qty: '' });
  };

  // --- LÓGICA DE PAGOS (VUELTO Y REGALOS) ---
  const addPayment = () => {
    let amountVal = parseFloat(payAmount);
    
    // Caso: Regalo / Personal (Cubre todo)
    if (payMethod === 'obsequio' || payMethod === 'personal') {
        amountVal = selectedOrder.total_usd; 
    } else if (!amountVal) return;

    let batch = [];
    const isCash = payMethod === 'usd_efectivo';
    const tender = parseFloat(tenderAmount);

    if (isCash && tender > amountVal) {
        // Lógica de Vuelto
        const change = tender - amountVal;
        
        // Entrada del billete completo
        batch.push({ method: 'usd_efectivo', amount_usd: tender, amount_bs: 0 });

        // Salida del vuelto
        if (changeCurrency === 'bs_efectivo') {
            const changeBs = change * tasa;
            batch.push({ method: 'bs_efectivo', amount_usd: -change, amount_bs: -changeBs }); // Restamos Bs
        } else {
            batch.push({ method: 'usd_efectivo', amount_usd: -change, amount_bs: 0 }); // Restamos USD
        }
    } else {
        // Pago normal o exacto
        batch.push({ 
            method: payMethod, 
            amount_usd: amountVal, 
            amount_bs: ['pago_movil','punto','bs_efectivo'].includes(payMethod) ? amountVal * tasa : 0 
        });
    }

    setCurrentPayments([...currentPayments, ...batch]);
    setPayAmount(''); setTenderAmount('');
  };

  const processOrderPayment = async () => {
      // Validar monto cubierto
      const paid = currentPayments.reduce((s, p) => s + p.amount_usd, 0);
      if ((selectedOrder.total_usd - paid) > 0.05) return alert("Falta dinero");

      setLoading(true);
      
      const paymentRecords = currentPayments.map(p => ({
          order_id: selectedOrder.id,
          method: p.method,
          amount_usd: p.amount_usd,
          amount_bs: p.amount_bs,
          rate_used: tasa
      }));

      await supabase.from('payments').insert(paymentRecords);
      await supabase.from('orders').update({ status: 'pagado' }).eq('id', selectedOrder.id);

      // Imprimir Ticket de Pago
      setReportData(null);
      setTicketData({ ...selectedOrder, items: selectedOrder.order_items, type: 'FACTURA', payments: currentPayments });
      setTimeout(() => window.print(), 500);

      setSelectedOrder(null); setCurrentPayments([]); fetchOrders(); setLoading(false);
  };

  // --- CIERRE DE CAJA (REPORTES) ---
  const handleDailyClose = async () => {
    setLoading(true);
    const now = new Date();
    // Definir turno (si es antes de las 6am, es el cierre del día anterior)
    const start = new Date(now);
    if (now.getHours() < 6) start.setDate(start.getDate() - 1);
    start.setHours(6,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    // Filtrar datos
    const shiftOrders = orders.filter(o => new Date(o.created_at) >= start && new Date(o.created_at) < end && o.status === 'pagado');
    const orderIds = shiftOrders.map(o => o.id);
    const { data: payments } = await supabase.from('payments').select('*').in('order_id', orderIds);
    const shiftExpenses = expenses.filter(e => new Date(e.date) >= start && new Date(e.date) < end);

    // Calcular
    const validPayments = payments || [];
    // Excluir regalos de la "Venta Neta"
    const realMoney = validPayments.filter(p => p.method !== 'obsequio' && p.method !== 'personal');
    const gifts = validPayments.filter(p => p.method === 'obsequio' || p.method === 'personal');

    const totalSales = realMoney.reduce((s,p) => s + p.amount_usd, 0);
    const totalGifts = gifts.reduce((s,p) => s + p.amount_usd, 0);
    const totalExp = shiftExpenses.reduce((s,e) => s + e.amount, 0);
    
    // Efectivo en Mano (Suma entradas y restas de vueltos)
    const cashUsd = validPayments.filter(p => p.method === 'usd_efectivo').reduce((s,p) => s + p.amount_usd, 0);
    const cashBs = validPayments.filter(p => p.method === 'bs_efectivo').reduce((s,p) => s + p.amount_bs, 0);

    const data = {
        date: now.toLocaleString(),
        sales: totalSales,
        gifts: totalGifts,
        expenses: totalExp,
        net: totalSales - totalExp,
        cashUsd,
        cashBs,
        expensesList: shiftExpenses,
        count: shiftOrders.length
    };

    setTicketData(null); // No queremos imprimir ticket de orden
    setReportData(data); // Queremos imprimir reporte
    setTimeout(() => window.print(), 500);
    setLoading(false);
  };

  // --- UI ---
  if (!user) return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-8 text-yellow-500">DONDE MANOLO</h1>
        <div className="flex gap-4">
            {['owner','manager','caja','mesero','cocina'].map(role => (
                <button key={role} onClick={() => { const p = prompt("PIN:"); if(p) login(p); }} className="p-4 bg-gray-700 rounded capitalize hover:bg-yellow-600">{role}</button>
            ))}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20 print:hidden">
      {/* HEADER */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between sticky top-0 z-50">
        <div className="font-bold text-yellow-400">MANOLO ({user.role})</div>
        <div className="flex gap-2">
            {(user.role === 'owner' || user.role === 'manager') && (
                <>
                <button onClick={() => setView('dashboard')} className="p-2 bg-gray-700 rounded"><LayoutDashboard/></button>
                <button onClick={() => setView('reportes')} className="p-2 bg-gray-700 rounded"><TrendingUp/></button>
                </>
            )}
            {user.role === 'owner' && <button onClick={() => setView('inventario')} className="p-2 bg-gray-700 rounded"><Package/></button>}
            <button onClick={() => setView('caja')} className="p-2 bg-gray-700 rounded"><DollarSign/></button>
            <button onClick={() => setView('pedidos')} className="p-2 bg-gray-700 rounded"><ShoppingCart/></button>
            <button onClick={() => window.location.reload()} className="p-2 bg-red-600 rounded"><LogOut/></button>
        </div>
      </nav>

      {/* DASHBOARD (DUEÑO/GERENTE) */}
      <div className="max-w-7xl mx-auto p-4">
        {view === 'dashboard' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded shadow border-l-4 border-blue-600 flex justify-between">
                    <h2 className="text-xl font-bold">Tasa: {tasa} Bs</h2>
                    <button onClick={async () => { const n = prompt("Tasa:"); if(n) { await supabase.from('settings').upsert({key:'tasa', value:{usd:n}}); fetchRate(); }}} className="text-blue-600"><Edit3/></button>
                </div>

                {/* MODULO CREAR PRODUCTO (SOLO DUEÑO) */}
                {user.role === 'owner' && (
                    <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
                        <h3 className="font-bold flex gap-2 mb-4"><ChefHat/> Crear Nuevo Plato</h3>
                        <div className="flex gap-4 mb-4">
                            <input placeholder="Nombre" className="border p-2 rounded w-full" value={newProduct.name} onChange={e=>setNewProduct({...newProduct, name:e.target.value})} />
                            <input type="number" placeholder="Precio ($)" className="border p-2 rounded w-32" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price:e.target.value})} />
                        </div>
                        <div className="bg-gray-50 p-4 rounded mb-4">
                            <h4 className="font-bold text-xs mb-2">Ingredientes (Receta):</h4>
                            <div className="flex gap-2">
                                <select className="border p-2 rounded flex-1" onChange={e=>setNewProdIng({...newProdIng, id:e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <input placeholder="Cant" className="border p-2 w-20" value={newProdIng.qty} onChange={e=>setNewProdIng({...newProdIng, qty:e.target.value})}/>
                                <button onClick={addIngToNewProduct} className="bg-green-600 text-white px-3 rounded">+</button>
                            </div>
                            <ul className="text-xs mt-2 list-disc pl-4">
                                {newProduct.ingredients.map((ing, i) => <li key={i}>{ing.qty} {ing.unit} de {ing.name}</li>)}
                            </ul>
                        </div>
                        <button onClick={handleCreateProduct} className="w-full bg-yellow-600 text-white font-bold py-2 rounded">GUARDAR PLATO</button>
                    </div>
                )}
            </div>
        )}

        {/* CAJA Y PAGOS */}
        {view === 'caja' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow h-[80vh] overflow-y-auto">
                    <h2 className="font-bold mb-4">Pedidos Activos</h2>
                    {orders.filter(o => o.status !== 'pagado').map(o => (
                        <div key={o.id} onClick={()=>{setSelectedOrder(o); setCurrentPayments([]);}} className={`p-4 border-b cursor-pointer flex justify-between hover:bg-blue-50 ${selectedOrder?.id===o.id?'bg-blue-100':''}`}>
                            <div><div className="font-bold">{o.service_type} - {o.info}</div><div className="text-xs text-gray-500">{o.status}</div></div>
                            <div className="font-bold">${o.total_usd.toFixed(2)}</div>
                        </div>
                    ))}
                </div>
                
                {selectedOrder && (
                    <div className="bg-white p-6 rounded shadow">
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold">${selectedOrder.total_usd.toFixed(2)}</h2>
                            <p className="text-blue-600 font-bold">Bs {(selectedOrder.total_usd * tasa).toFixed(2)}</p>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                            <select className="border p-2 w-full rounded" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                                <option value="usd_efectivo">💵 $ Efectivo (Billete)</option>
                                <option value="bs_efectivo">🇻🇪 Bs Efectivo</option>
                                <option value="pago_movil">📱 Pago Móvil</option>
                                <option value="punto">💳 Punto de Venta</option>
                                {(user.role === 'owner' || user.role === 'manager') && (
                                    <>
                                    <option value="obsequio">🎁 CORTESÍA</option>
                                    <option value="personal">👨‍🍳 PERSONAL</option>
                                    </>
                                )}
                            </select>

                            {/* INPUTS DE PAGO */}
                            {!['obsequio','personal'].includes(payMethod) && (
                                <>
                                    {payMethod === 'usd_efectivo' ? (
                                        <div className="bg-green-50 p-3 rounded border border-green-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-bold">Billete ($):</span>
                                                <input type="number" className="border p-2 w-24 font-bold" value={tenderAmount} onChange={e=>{
                                                    setTenderAmount(e.target.value);
                                                    const restante = selectedOrder.total_usd - currentPayments.reduce((s,p)=>s+p.amount_usd,0);
                                                    setPayAmount(restante.toFixed(2));
                                                }} />
                                            </div>
                                            {parseFloat(tenderAmount) > parseFloat(payAmount || 0) && (
                                                <div className="text-sm">
                                                    <div className="flex justify-between font-bold text-red-600 mb-1">
                                                        <span>VUELTO:</span>
                                                        <span>${(parseFloat(tenderAmount) - parseFloat(payAmount)).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span>Dar en:</span>
                                                        <select className="border p-1 text-xs" value={changeCurrency} onChange={e=>setChangeCurrency(e.target.value)}>
                                                            <option value="bs_efectivo">🇻🇪 Bolívares</option>
                                                            <option value="usd_efectivo">💵 Dólares</option>
                                                        </select>
                                                    </div>
                                                    {changeCurrency === 'bs_efectivo' && <div className="text-right text-blue-600 font-bold mt-1">Dar: Bs {((parseFloat(tenderAmount) - parseFloat(payAmount)) * tasa).toFixed(2)}</div>}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <input type="number" placeholder="Monto" className="border p-2 w-full" value={payAmount} onChange={e=>setPayAmount(e.target.value)} />
                                    )}
                                </>
                            )}
                            
                            <button onClick={addPayment} className="w-full bg-blue-600 text-white font-bold py-2 rounded">AGREGAR PAGO</button>
                        </div>

                        {/* LISTA DE PAGOS */}
                        <div className="bg-gray-50 p-2 rounded mb-4 space-y-2">
                            {currentPayments.map((p,i) => (
                                <div key={i} className={`flex justify-between text-sm ${p.amount_usd < 0 ? 'text-red-500' : ''}`}>
                                    <span>{p.method}</span>
                                    <span>${Math.abs(p.amount_usd).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        
                        <button onClick={processOrderPayment} className="w-full bg-green-600 text-white font-bold py-3 rounded text-xl">CERRAR CUENTA</button>
                    </div>
                )}
            </div>
        )}

        {/* PEDIDOS */}
        {view === 'pedidos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map(p => (
                        <div key={p.id} onClick={()=>addToCart(p)} className="bg-white p-4 rounded shadow cursor-pointer hover:bg-yellow-50">
                            <div className="font-bold">{p.name}</div><div className="text-green-600 font-bold">${p.price_usd}</div>
                        </div>
                    ))}
                 </div>
                 <div className="bg-white p-4 rounded shadow h-[80vh] flex flex-col">
                    <h2 className="font-bold mb-2">Comanda</h2>
                    <input className="border p-2 w-full mb-2" placeholder="Cliente/Mesa" value={serviceInfo.val} onChange={e=>setServiceInfo({...serviceInfo, val:e.target.value})} />
                    <div className="flex-1 overflow-y-auto">
                        {cart.map(i => (
                            <div key={i.tempId} className="flex justify-between border-b py-2">
                                <div>{i.name}</div>
                                <button onClick={()=>removeFromCart(i.tempId)} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={sendOrder} className="w-full bg-green-600 text-white py-3 font-bold mt-2">ENVIAR</button>
                 </div>
            </div>
        )}

        {/* REPORTES (Vista Previa) */}
        {view === 'reportes' && (
             <div className="bg-white p-6 rounded shadow max-w-2xl mx-auto text-center">
                 <h2 className="text-2xl font-bold mb-4">Cierre de Caja</h2>
                 <p className="mb-4 text-gray-600">Al pulsar el botón, se calculará el día operativo actual (de 6am a 6am) y se imprimirá el reporte.</p>
                 <button onClick={handleDailyClose} className="bg-blue-600 text-white px-8 py-3 rounded font-bold text-lg flex items-center justify-center gap-2 w-full"><Printer/> GENERAR Y IMPRIMIR CIERRE</button>
             </div>
        )}

        {/* INVENTARIO (Solo Dueño) */}
        {view === 'inventario' && (
             <div className="bg-white p-6 rounded shadow">
                 <table className="w-full text-left">
                     <thead><tr className="border-b"><th className="p-2">Ingrediente</th><th className="p-2">Stock</th><th className="p-2">Acción</th></tr></thead>
                     <tbody>
                         {ingredients.map(i => (
                             <tr key={i.id} className="border-b">
                                 <td className="p-2">{i.name} ({i.unit})</td>
                                 <td className={`p-2 font-bold ${i.stock < 5 ? 'text-red-500':''}`}>{Number(i.stock).toFixed(2)}</td>
                                 <td className="p-2"><button onClick={async()=>{const s=prompt("Stock:",i.stock); if(s) {await supabase.from('ingredients').update({stock:s}).eq('id',i.id); loadData();}}}><Edit3/></button></td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        )}
      </div>

      {/* --- SECCIÓN DE IMPRESIÓN (OCULTA EN PANTALLA) --- */}
      {/* Esta sección es CRUCIAL. No la borres. Maneja el diseño del papel térmico */}
      <div className="hidden print:block fixed top-0 left-0 w-full h-full bg-white z-[9999] p-2 text-black font-mono text-xs leading-tight">
          
          {/* PLANTILLA TICKET PEDIDO / FACTURA */}
          {ticketData && (
              <div className="w-[80mm] mx-auto">
                  <div className="text-center font-bold text-sm mb-2">DONDE MANOLO</div>
                  <div className="text-center mb-2">{new Date().toLocaleString()}</div>
                  <div className="border-b border-dashed border-black mb-2"></div>
                  
                  {ticketData.type === 'COMANDA' && <div className="text-xl font-bold text-center mb-2">{ticketData.service_type}: {ticketData.info}</div>}
                  
                  {ticketData.items?.map((item, i) => (
                      <div key={i} className="flex justify-between mb-1">
                          <span>{item.quantity} x {item.product_name}</span>
                          <span>${(item.quantity * item.price_at_time).toFixed(2)}</span>
                      </div>
                  ))}
                  
                  <div className="border-b border-dashed border-black my-2"></div>
                  <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL USD:</span>
                      <span>${ticketData.total_usd.toFixed(2)}</span>
                  </div>
                  <div className="text-center mt-4">¡Gracias por su compra!</div>
              </div>
          )}

          {/* PLANTILLA REPORTE DE CIERRE */}
          {reportData && (
              <div className="w-[80mm] mx-auto">
                  <div className="text-center font-bold text-lg mb-2">CIERRE DE CAJA</div>
                  <div className="text-center mb-2">{reportData.date}</div>
                  <div className="border-b border-black mb-2"></div>
                  
                  <div className="font-bold mt-2">RESUMEN FINANCIERO</div>
                  <div className="flex justify-between"><span>Ventas Reales:</span><span>${reportData.sales.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span>(Regalos/Personal):</span><span>${reportData.gifts.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Gastos:</span><span>-${reportData.expenses.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t border-black mt-1 pt-1"><span>GANANCIA NETA:</span><span>${reportData.net.toFixed(2)}</span></div>
                  
                  <div className="font-bold mt-4">DINERO EN MANO (ARQUEO)</div>
                  <div className="flex justify-between"><span>Dólares (Caja):</span><span>${reportData.cashUsd.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Bolívares (Caja):</span><span>Bs {reportData.cashBs.toFixed(2)}</span></div>
                  
                  <div className="border-t border-dashed border-black mt-4 pt-2 text-center text-xs">
                      Pedidos procesados: {reportData.count}
                  </div>
              </div>
          )}
      </div>

    </div>
  );
}
