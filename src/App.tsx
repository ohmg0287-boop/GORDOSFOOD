import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, LayoutDashboard, DollarSign, Users, Package, Trash2, Printer, LogOut, Edit3, TrendingDown, TrendingUp, PlusCircle, Save, FileText, Search, XCircle, Gift, ChefHat } from 'lucide-react';

// --- CONEXIÓN ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

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
  const [recipes, setRecipes] = useState({}); // Ahora es dinámico
  
  // Operativo
  const [cart, setCart] = useState([]);
  const [serviceInfo, setServiceInfo] = useState({ type: 'Mesa', val: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [lastOrderTicket, setLastOrderTicket] = useState(null);
  const [ticketType, setTicketType] = useState('full'); 
  const [closingData, setClosingData] = useState(null); 
  
  // Caja y Modificaciones
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('usd_efectivo');
  const [tenderAmount, setTenderAmount] = useState(''); // Monto del billete entregado
  const [changeCurrency, setChangeCurrency] = useState('bs_efectivo'); // En qué damos el vuelto
  const [currentPayments, setCurrentPayments] = useState([]);
  const [isEditingOrder, setIsEditingOrder] = useState(false); 
  const [itemSearch, setItemSearch] = useState(''); 

  // Gastos
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', category: 'Otros', isStock: false, ingredientId: '', quantity: '' });

  // Nuevo Producto (Solo Dueño)
  const [newProduct, setNewProduct] = useState({ name: '', price: '', ingredients: [] });
  const [newProdIng, setNewProdIng] = useState({ id: '', qty: '' });

  // Reportes
  const [reportFilter, setReportFilter] = useState('today'); 
  const [paymentBreakdown, setPaymentBreakdown] = useState({});

  // Auto-refresco
  useEffect(() => {
    if (user) {
      loadData();
      if (['cocina', 'caja', 'owner', 'manager', 'mesero'].includes(user.role)) {
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
    await fetchRate();
    const p = await supabase.from('products').select('*').order('name');
    const i = await supabase.from('ingredients').select('*').order('name');
    const o = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    const e = await supabase.from('expenses').select('*').order('date', { ascending: false });
    
    // Cargar Recetas Dinámicas
    const r = await supabase.from('product_ingredients').select('*');
    if (r.data) {
        const recipeMap = {};
        r.data.forEach(item => {
            if (!recipeMap[item.product_name]) recipeMap[item.product_name] = {};
            // Buscamos el nombre del ingrediente basado en su ID
            const ingName = i.data?.find(ing => ing.id === item.ingredient_id)?.name;
            if (ingName) {
                recipeMap[item.product_name][ingName] = item.quantity;
            }
        });
        setRecipes(recipeMap);
    }
    
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
    if (selectedOrder) {
        const updated = data?.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
    }
  };

  // --- LOGIN ---
  const login = async (pin) => {
    const { data, error } = await supabase.from('staff').select('*').eq('pin', pin).maybeSingle();
    if (error || !data) { alert("PIN Incorrecto"); return; }
    setUser(data);
    if (data.role === 'owner' || data.role === 'manager') setView('dashboard');
    else if (data.role === 'caja') setView('caja');
    else if (data.role === 'mesero') setView('pedidos');
    else if (data.role === 'cocina') setView('cocina');
    else setUser(null);
  };

  // --- CARRITO ---
  const addToCart = (product) => setCart(prev => [...prev, { ...product, tempId: Date.now() + Math.random() }]);
  const removeFromCart = (tempId) => setCart(prev => prev.filter(item => item.tempId !== tempId));
  const updateCartNote = (tempId, note) => setCart(prev => prev.map(item => item.tempId === tempId ? { ...item, notes: note } : item));

  const sendOrder = async () => {
    if (cart.length === 0 || !serviceInfo.val) return alert("Faltan datos");
    setLoading(true);
    const total = cart.reduce((sum, item) => sum + item.price_usd, 0);

    const { data: order, error } = await supabase.from('orders').insert([{
      total_usd: total, service_type: serviceInfo.type, info: serviceInfo.val, created_by: user.name, status: 'pendiente'
    }]).select().single();

    if (error) { alert("Error"); setLoading(false); return; }

    const items = cart.map(i => ({
      order_id: order.id, product_name: i.name, quantity: 1, price_at_time: i.price_usd, notes: i.notes || ''
    }));
    await supabase.from('order_items').insert(items);

    // Descontar Inventario usando recipes dinámicas
    for (let item of cart) {
      const recipe = recipes[item.name];
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
    
    setTicketType('full');
    setLastOrderTicket({ ...order, items: items });
    setClosingData(null); 
    setCart([]); setServiceInfo({ type: 'Mesa', val: '' }); loadData(); setLoading(false);
  };

  // --- MODIFICACIÓN ORDENES ---
  const handleAddItemToOrder = async (product) => {
      if (!selectedOrder) return;
      if (!confirm(`¿Agregar ${product.name}?`)) return;
      setLoading(true);

      await supabase.from('order_items').insert([{
          order_id: selectedOrder.id, product_name: product.name, quantity: 1, price_at_time: product.price_usd, notes: 'ANEXO'
      }]);

      await supabase.from('orders').update({ 
          total_usd: selectedOrder.total_usd + product.price_usd, status: 'pendiente' 
      }).eq('id', selectedOrder.id);

      const recipe = recipes[product.name];
      if (recipe) {
          for (let [ingName, qty] of Object.entries(recipe)) {
              const dbIng = ingredients.find(i => i.name === ingName);
              if (dbIng) await supabase.from('ingredients').update({ stock: parseFloat(dbIng.stock) - qty }).eq('id', dbIng.id);
          }
      }

      if(confirm("¿Imprimir Ticket de Anexo?")) {
          setTicketType('anexo');
          setLastOrderTicket({ ...selectedOrder, items: [{ product_name: product.name, quantity: 1, notes: 'ANEXO / AGREGADO' }] });
          setTimeout(() => window.print(), 500);
      }
      setItemSearch(''); fetchOrders(); setLoading(false);
  };

  const handleRemoveItemFromOrder = async (item) => {
      const allowedRoles = ['owner', 'manager', 'caja', 'mesero'];
      if (!allowedRoles.includes(user.role)) return alert("⛔ ACCESO DENEGADO.");
      if (!confirm(`¿Eliminar ${item.product_name}?`)) return;
      setLoading(true);

      await supabase.from('order_items').delete().eq('id', item.id);
      await supabase.from('orders').update({ total_usd: Math.max(0, selectedOrder.total_usd - item.price_at_time) }).eq('id', selectedOrder.id);

      const recipe = recipes[item.product_name];
      if (recipe) {
          for (let [ingName, qty] of Object.entries(recipe)) {
              const dbIng = ingredients.find(i => i.name === ingName);
              if (dbIng) await supabase.from('ingredients').update({ stock: parseFloat(dbIng.stock) + qty }).eq('id', dbIng.id);
          }
      }
      fetchOrders(); setLoading(false);
  };

  // --- GESTIÓN DE NUEVOS PRODUCTOS (DUEÑO) ---
  const handleCreateProduct = async () => {
      if(user.role !== 'owner') return;
      if(!newProduct.name || !newProduct.price) return alert("Nombre y Precio obligatorios");
      
      setLoading(true);
      // 1. Crear producto
      await supabase.from('products').insert([{ name: newProduct.name, price_usd: parseFloat(newProduct.price) }]);
      
      // 2. Crear receta
      if (newProduct.ingredients.length > 0) {
          const recipeItems = newProduct.ingredients.map(ing => ({
              product_name: newProduct.name,
              ingredient_id: ing.id,
              quantity: ing.qty
          }));
          await supabase.from('product_ingredients').insert(recipeItems);
      }
      
      alert("Producto Creado Exitosamente");
      setNewProduct({ name: '', price: '', ingredients: [] });
      loadData(); setLoading(false);
  };

  const addIngToNewProduct = () => {
      if(!newProdIng.id || !newProdIng.qty) return;
      const fullIng = ingredients.find(i => i.id == newProdIng.id);
      setNewProduct(prev => ({
          ...prev, ingredients: [...prev.ingredients, { ...fullIng, qty: newProdIng.qty }]
      }));
      setNewProdIng({ id: '', qty: '' });
  };

  // --- PAGOS AVANZADOS (VUELTO Y CORTESÍA) ---
  const addPayment = () => {
      let amountToAdd = parseFloat(payAmount);
      if (!amountToAdd && payMethod !== 'obsequio' && payMethod !== 'personal') return;

      // Lógica de Obsequio/Personal
      if (payMethod === 'obsequio' || payMethod === 'personal') {
          amountToAdd = selectedOrder.total_usd; // Cubre todo el saldo restante
      }

      // Lógica de Vuelto
      let paymentsBatch = [];
      const isCash = payMethod === 'usd_efectivo';
      const tender = parseFloat(tenderAmount);

      if (isCash && tender > amountToAdd) {
          // El cliente pagó con un billete mayor
          const change = tender - amountToAdd;
          
          // 1. Registramos la entrada COMPLETA del billete (Ej: +$20)
          paymentsBatch.push({ 
              method: 'usd_efectivo', 
              amount_usd: tender, 
              amount_bs: 0,
              is_gift: false
          });

          // 2. Registramos la SALIDA del vuelto
          if (changeCurrency === 'bs_efectivo') {
              // Vuelto en Bs: Salida de Caja Bs, equivalente al cambio en USD
              const bsAmount = change * tasa;
              paymentsBatch.push({ 
                  method: 'bs_efectivo', 
                  amount_usd: -change, // Negativo para restar del saldo de orden? No.
                                       // Truco: Para que cuadre la orden, el total sumado debe ser 'amountToAdd' ($15).
                                       // 20 (Entrada) - 5 (Salida) = 15. Correcto.
                  amount_bs: -bsAmount,
                  is_gift: false 
              });
          } else {
              // Vuelto en USD
              paymentsBatch.push({ 
                  method: 'usd_efectivo', 
                  amount_usd: -change, 
                  amount_bs: 0,
                  is_gift: false
              });
          }
      } else {
          // Pago exacto o digital
          paymentsBatch.push({ 
              method: payMethod, 
              amount_usd: amountToAdd, 
              amount_bs: ['pago_movil','punto','bs_efectivo'].includes(payMethod) ? amountToAdd * tasa : 0,
              is_gift: (payMethod === 'obsequio' || payMethod === 'personal')
          });
      }

      setCurrentPayments([...currentPayments, ...paymentsBatch]);
      setPayAmount('');
      setTenderAmount('');
  };

  const handlePayment = async () => {
    // Verificar saldo
    const totalPaid = currentPayments.reduce((s, p) => s + p.amount_usd, 0);
    // Permitir un pequeño margen de error por decimales o regalos
    const remaining = selectedOrder.total_usd - totalPaid;
    
    if (remaining > 0.05) return alert("Falta cubrir el monto total");

    setLoading(true);
    const paymentsToSave = currentPayments.map(p => ({
        order_id: selectedOrder.id, 
        method: p.method, 
        amount_usd: p.amount_usd, 
        amount_bs: p.amount_bs, 
        rate_used: tasa,
        // Agregamos una marca en metadata o usamos un método especifico si es regalo
    }));

    await supabase.from('payments').insert(paymentsToSave);
    await supabase.from('orders').update({ status: 'pagado' }).eq('id', selectedOrder.id);
    alert("Procesado Exitosamente 💰");
    setSelectedOrder(null); setCurrentPayments([]); fetchOrders(); setLoading(false);
  };

  // --- CIERRE DE CAJA ---
  const handleDailyClose = async () => {
    setLoading(true);
    const now = new Date();
    const shiftStart = new Date(now);
    if (now.getHours() < 6) shiftStart.setDate(shiftStart.getDate() - 1);
    shiftStart.setHours(6, 0, 0, 0); 
    const shiftEnd = new Date(shiftStart); shiftEnd.setDate(shiftEnd.getDate() + 1);

    const shiftOrders = orders.filter(o => {
        const d = new Date(o.created_at); return d >= shiftStart && d < shiftEnd && o.status === 'pagado';
    });
    const shiftExpenses = expenses.filter(e => {
        const d = new Date(e.date); return d >= shiftStart && d < shiftEnd;
    });

    const orderIds = shiftOrders.map(o => o.id);
    let shiftPayments = [];
    if (orderIds.length > 0) {
        const { data } = await supabase.from('payments').select('*').in('order_id', orderIds);
        if (data) shiftPayments = data;
    }

    // Calcular Totales
    // Omitimos regalos de la "Venta Neta de Caja" pero los contamos en "Consumo"
    const realPayments = shiftPayments.filter(p => p.method !== 'obsequio' && p.method !== 'personal');
    const giftPayments = shiftPayments.filter(p => p.method === 'obsequio' || p.method === 'personal');
    
    const totalSalesCash = realPayments.reduce((s, p) => s + p.amount_usd, 0);
    const totalGifts = giftPayments.reduce((s, p) => s + p.amount_usd, 0);
    const totalExpenses = shiftExpenses.reduce((s, e) => s + e.amount, 0);
    
    const breakdown = shiftPayments.reduce((acc, curr) => {
        acc[curr.method] = (acc[curr.method] || 0) + curr.amount_usd;
        return acc;
    }, {});

    // Efectivo en Mano (Suma las entradas positivas de efectivo y resta las negativas de vuelto)
    const cashInUsd = shiftPayments.filter(p => p.method === 'usd_efectivo').reduce((s, p) => s + p.amount_usd, 0);
    const cashInBs = shiftPayments.filter(p => p.method === 'bs_efectivo').reduce((s, p) => s + p.amount_bs, 0);

    setClosingData({
        dateStr: shiftStart.toLocaleDateString(),
        printDate: now.toLocaleString(),
        sales: totalSalesCash,
        gifts: totalGifts,
        expenses: totalExpenses,
        net: totalSalesCash - totalExpenses,
        breakdown,
        cashInUsd,
        cashInBs,
        expensesList: shiftExpenses,
        orderCount: shiftOrders.length
    });
    setLastOrderTicket(null); setLoading(false);
    setTimeout(() => window.print(), 500);
  };

  // --- UI START ---
  if (!user) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-8 text-yellow-500">DONDE MANOLO</h1>
      <div className="grid grid-cols-2 gap-6 w-full max-w-md px-4">
        <button onClick={() => { const p = prompt("PIN Dueño:"); if(p) login(p); }} className="p-6 bg-yellow-600 rounded-xl hover:bg-yellow-500 font-bold shadow-lg">👑 DUEÑO</button>
        <button onClick={() => { const p = prompt("PIN Gerencia:"); if(p) login(p); }} className="p-6 bg-blue-600 rounded-xl hover:bg-blue-500 font-bold shadow-lg">👔 GERENCIA</button>
        <button onClick={() => { const p = prompt("PIN Caja:"); if(p) login(p); }} className="p-6 bg-green-600 rounded-xl hover:bg-green-500 font-bold shadow-lg">💵 CAJA</button>
        <button onClick={() => { const p = prompt("PIN Mesero:"); if(p) login(p); }} className="p-6 bg-purple-600 rounded-xl hover:bg-purple-500 font-bold shadow-lg">🍽️ MESERO</button>
        <button onClick={() => { const p = prompt("PIN Cocina:"); if(p) login(p); }} className="col-span-2 p-4 bg-gray-700 rounded-xl border border-gray-500 font-bold">🔥 COCINA</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-gray-100 font-sans">
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg no-print">
        <div className="font-bold text-lg text-yellow-400">MANOLO <span className="text-xs text-gray-400">({user.role})</span></div>
        <div className="flex gap-2">
            {(user.role === 'owner' || user.role === 'manager') && (
                <>
                <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view==='dashboard'?'bg-yellow-600':'bg-gray-700'}`}><LayoutDashboard size={20}/></button>
                {/* INVENTARIO: Solo Dueño */}
                {user.role === 'owner' && <button onClick={() => setView('inventario')} className={`p-2 rounded ${view==='inventario'?'bg-yellow-600':'bg-gray-700'}`}><Package size={20}/></button>}
                <button onClick={() => setView('reportes')} className={`p-2 rounded ${view==='reportes'?'bg-yellow-600':'bg-gray-700'}`}><TrendingUp size={20}/></button>
                </>
            )}
            {user.role !== 'cocina' && (
                <>
                <button onClick={() => setView('caja')} className={`p-2 rounded ${view==='caja'?'bg-yellow-600':'bg-gray-700'}`}><DollarSign size={20}/></button>
                <button onClick={() => setView('pedidos')} className={`p-2 rounded ${view==='pedidos'?'bg-yellow-600':'bg-gray-700'}`}><ShoppingCart size={20}/></button>
                </>
            )}
            <button onClick={() => window.location.reload()} className="p-2 bg-red-600 rounded"><LogOut size={20}/></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        {view === 'dashboard' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-700">Tasa del día: <span className="text-green-600 font-mono">1$ = {tasa} Bs</span></h2>
                    <button onClick={async () => { const n = prompt("Nueva Tasa:"); if(n) { await supabase.from('settings').upsert({ key:'tasa', value: { usd: n }}); fetchRate(); }}} className="bg-blue-600 text-white px-4 py-2 rounded font-bold"><Edit3 size={16}/></button>
                </div>

                {/* MODULO CREAR PRODUCTO (SOLO DUEÑO) */}
                {user.role === 'owner' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ChefHat/> Crear Nuevo Plato / Producto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-50 p-4 rounded mb-4">
                            <input placeholder="Nombre del Plato" className="border p-2 rounded" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                            <input type="number" placeholder="Precio ($)" className="border p-2 rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                        </div>
                        <div className="bg-gray-50 p-4 rounded mb-4">
                            <h4 className="font-bold text-sm mb-2">Agregar Ingredientes a la Receta:</h4>
                            <div className="flex gap-2 mb-2">
                                <select className="border p-2 rounded w-full" onChange={e => setNewProdIng({...newProdIng, id: e.target.value})}>
                                    <option value="">Seleccione Insumo...</option>
                                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                </select>
                                <input type="number" placeholder="Cant" className="border p-2 rounded w-24" value={newProdIng.qty} onChange={e => setNewProdIng({...newProdIng, qty: e.target.value})} />
                                <button onClick={addIngToNewProduct} className="bg-green-600 text-white px-3 rounded">+</button>
                            </div>
                            <ul className="text-sm text-gray-600 list-disc pl-5">
                                {newProduct.ingredients.map((ing, idx) => (
                                    <li key={idx}>{ing.qty} {ing.unit} de {ing.name}</li>
                                ))}
                            </ul>
                        </div>
                        <button onClick={handleCreateProduct} className="w-full bg-yellow-600 text-white font-bold py-2 rounded hover:bg-yellow-700">GUARDAR NUEVO PRODUCTO EN MENÚ</button>
                    </div>
                )}

                {/* GASTOS (SOLO DUEÑO, MANAGER EXCLUIDO) */}
                {user.role === 'owner' ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-600"><TrendingDown/> Registrar Compra/Gasto</h3>
                        <div className="flex gap-2 flex-wrap">
                            <input placeholder="Descripción" className="border p-2 rounded flex-1" value={newExpense.desc} onChange={e => setNewExpense({...newExpense, desc: e.target.value})} />
                            <input type="number" placeholder="Monto ($)" className="border p-2 rounded w-32" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                            <select className="border p-2 rounded" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}><option>Nomina</option><option>Servicios</option><option>Mercancía</option><option>Otros</option></select>
                            <button onClick={async () => {
                                if(!newExpense.desc || !newExpense.amount) return;
                                await supabase.from('expenses').insert([{ description: newExpense.desc, amount: parseFloat(newExpense.amount), category: newExpense.category, registered_by: user.name }]);
                                alert("Registrado"); setNewExpense({ ...newExpense, desc: '', amount: '' }); loadData();
                            }} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Registrar</button>
                        </div>
                    </div>
                ) : user.role === 'manager' && <div className="p-4 bg-gray-200 rounded text-center text-gray-500">Gestión de Gastos restringida al Dueño</div>}
            </div>
        )}

        {view === 'inventario' && user.role === 'owner' && (
            <div className="bg-white p-6 rounded shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Inventario (Solo Dueño)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-gray-100 border-b"><th className="p-3">Ingrediente</th><th className="p-3">Stock</th><th className="p-3">Unidad</th><th className="p-3">Ajuste</th></tr></thead>
                        <tbody>
                            {ingredients.map(ing => (
                                <tr key={ing.id} className="border-b">
                                    <td className="p-3">{ing.name}</td>
                                    <td className={`p-3 font-bold ${ing.stock < 10 ? 'text-red-600' : ''}`}>{Number(ing.stock).toFixed(2)}</td>
                                    <td className="p-3">{ing.unit}</td>
                                    <td className="p-3"><button onClick={async () => { const v = prompt("Nuevo Stock:", ing.stock); if(v) { await supabase.from('ingredients').update({stock:v}).eq('id',ing.id); loadData(); }}} className="text-blue-500"><Edit3 size={18}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'caja' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="font-bold text-lg mb-4">Pedidos Activos</h2>
                    {orders.filter(o => o.status !== 'pagado').map(o => (
                        <div key={o.id} onClick={() => { setSelectedOrder(o); setCurrentPayments([]); setIsEditingOrder(false); }} className={`p-4 border-b cursor-pointer hover:bg-blue-50 flex justify-between ${selectedOrder?.id === o.id ? 'bg-blue-100' : ''}`}>
                            <div><div className="font-bold">{o.service_type} - {o.info}</div><div className="text-xs text-gray-500">{o.status}</div></div>
                            <div className="font-bold">${o.total_usd.toFixed(2)}</div>
                        </div>
                    ))}
                </div>
                
                {selectedOrder && (
                    <div className="bg-white p-6 rounded shadow-lg h-fit sticky top-20">
                        <div className="flex justify-between border-b pb-2 mb-4">
                             {(user.role !== 'mesero') && <button onClick={() => setIsEditingOrder(false)} className={`flex-1 font-bold py-2 ${!isEditingOrder ? 'border-b-4 border-blue-600 text-blue-800':'text-gray-400'}`}>COBRAR</button>}
                             <button onClick={() => setIsEditingOrder(true)} className={`flex-1 font-bold py-2 ${isEditingOrder || user.role === 'mesero' ? 'border-b-4 border-yellow-500 text-yellow-800':'text-gray-400'}`}>EDITAR</button>
                        </div>
                        
                        {!isEditingOrder && (user.role !== 'mesero') ? (
                            <>
                                <div className="mb-4 bg-gray-50 p-4 rounded text-center">
                                    <div className="text-sm text-gray-500">Total a Pagar</div>
                                    <div className="text-3xl font-bold text-gray-800">${selectedOrder.total_usd.toFixed(2)}</div>
                                    <div className="text-blue-600 font-bold">Bs {(selectedOrder.total_usd * tasa).toFixed(2)}</div>
                                </div>
                                <div className="mb-4 space-y-3">
                                    <div className="flex gap-2">
                                        <select className="border p-2 rounded bg-white flex-1" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                                            <option value="usd_efectivo">💵 $ Efectivo (Billete)</option>
                                            <option value="bs_efectivo">🇻🇪 Bs Efectivo</option>
                                            <option value="pago_movil">📱 Pago Móvil</option>
                                            <option value="punto">💳 Punto de Venta</option>
                                            <option value="zelle">🇺🇸 Zelle</option>
                                            {/* SOLO DUEÑO Y GERENTE VEN ESTAS OPCIONES */}
                                            {(user.role === 'owner' || user.role === 'manager') && (
                                                <>
                                                <option value="obsequio">🎁 CORTESÍA / REGALO</option>
                                                <option value="personal">👨‍🍳 COMIDA PERSONAL</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    
                                    {/* Lógica normal de pago */}
                                    {!['obsequio', 'personal'].includes(payMethod) && (
                                        <>
                                            {payMethod === 'usd_efectivo' ? (
                                                // INTERFAZ ESPECIAL PARA EFECTIVO USD (VUELTO)
                                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>Monto a cubrir:</span>
                                                        <span className="font-bold">${(selectedOrder.total_usd - currentPayments.reduce((s,p)=>s+p.amount_usd,0)).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm">Billete Recibido ($):</span>
                                                        <input type="number" className="border p-2 rounded w-24 font-bold" value={tenderAmount} onChange={e => { setTenderAmount(e.target.value); setPayAmount((selectedOrder.total_usd - currentPayments.reduce((s,p)=>s+p.amount_usd,0)).toFixed(2)); }} />
                                                    </div>
                                                    {parseFloat(tenderAmount) > parseFloat(payAmount || 0) && (
                                                        <div className="mt-2 text-sm">
                                                            <div className="flex justify-between font-bold text-red-600 mb-1">
                                                                <span>VUELTO A DAR:</span>
                                                                <span>${(parseFloat(tenderAmount) - parseFloat(payAmount)).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span>¿Vuelto entregado en?:</span>
                                                                <select className="border p-1 rounded text-xs" value={changeCurrency} onChange={e => setChangeCurrency(e.target.value)}>
                                                                    <option value="bs_efectivo">🇻🇪 Bolívares</option>
                                                                    <option value="usd_efectivo">💵 Dólares</option>
                                                                </select>
                                                            </div>
                                                            {changeCurrency === 'bs_efectivo' && <div className="text-right text-blue-600 font-bold mt-1">Dar: Bs {((parseFloat(tenderAmount) - parseFloat(payAmount)) * tasa).toFixed(2)}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <input type="number" placeholder="Monto a pagar ($)" className="border p-2 rounded w-full" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                            )}
                                        </>
                                    )}

                                    <button onClick={addPayment} className="w-full bg-blue-600 text-white py-2 rounded font-bold">
                                        {['obsequio','personal'].includes(payMethod) ? 'PROCESAR SIN COSTO' : 'AGREGAR PAGO'}
                                    </button>
                                </div>

                                <div className="space-y-2 mb-6">
                                    {currentPayments.map((p, i) => (
                                        <div key={i} className={`flex justify-between border-b pb-1 text-sm ${p.amount_usd < 0 ? 'text-red-500' : ''}`}>
                                            <span>{p.amount_usd < 0 ? `VUELTO (${p.method})` : p.method.toUpperCase()}</span>
                                            <span>${Math.abs(p.amount_usd).toFixed(2)} {p.amount_bs !== 0 && `(Bs ${Math.abs(p.amount_bs).toFixed(2)})`}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handlePayment} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg">CERRAR CUENTA</button>
                            </>
                        ) : (
                            // MODO EDICION (IGUAL QUE ANTES)
                            <>
                                {selectedOrder.order_items?.map(item => (
                                    <div key={item.id} className="flex justify-between p-2 border-b">
                                        <div><div className="font-bold">{item.product_name}</div><div className="text-xs">${item.price_at_time}</div></div>
                                        <button onClick={() => handleRemoveItemFromOrder(item)} className="text-red-500"><XCircle/></button>
                                    </div>
                                ))}
                                <div className="mt-4 border-t pt-2">
                                    <input className="border p-2 rounded w-full mb-2" placeholder="Buscar producto..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                                    <div className="h-32 overflow-y-auto grid grid-cols-2 gap-2">
                                        {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                                            <button key={p.id} onClick={() => handleAddItemToOrder(p)} className="text-xs p-2 border rounded hover:bg-green-50 text-left">
                                                <div className="font-bold">{p.name}</div><div className="text-green-600">${p.price_usd}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        )}
        
        {/* --- PEDIDOS (Crea ordenes) --- */}
        {view === 'pedidos' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
                <div className="md:col-span-2 overflow-y-auto bg-white p-4 rounded shadow-lg">
                    <h2 className="font-bold text-xl mb-4">Menú</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map(p => (
                            <div key={p.id} onClick={() => addToCart(p)} className="cursor-pointer border hover:border-yellow-500 p-4 rounded-lg bg-gray-50 hover:bg-yellow-50">
                                <h3 className="font-bold text-gray-800">{p.name}</h3><p className="text-green-600 font-bold">${p.price_usd}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded shadow-lg flex flex-col h-full">
                    <h2 className="font-bold text-xl mb-2">Comanda</h2>
                    <div className="flex gap-2 mb-4">
                        <select className="border p-2 rounded" onChange={e => setServiceInfo({...serviceInfo, type: e.target.value})}><option>Mesa</option><option>Llevar</option><option>Delivery</option></select>
                        <input placeholder="Cliente / Mesa" className="border p-2 rounded w-full" onChange={e => setServiceInfo({...serviceInfo, val: e.target.value})} value={serviceInfo.val} />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {cart.map((item) => (
                            <div key={item.tempId} className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded">
                                <div><span className="font-bold">{item.name}</span> <div className="text-xs text-gray-500">${item.price_usd}</div><input placeholder="Notas..." className="text-xs border-b w-full bg-transparent" value={item.notes || ''} onChange={e => updateCartNote(item.tempId, e.target.value)}/></div>
                                <button onClick={() => removeFromCart(item.tempId)} className="text-red-500"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={sendOrder} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-4">ENVIAR COCINA</button>
                </div>
            </div>
        )}

        {view === 'reportes' && closingData && (
             <div className="bg-white p-8 rounded shadow-lg">
                <div className="text-center mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold">REPORTE DE CIERRE</h1>
                    <p className="text-gray-500">{closingData.printDate}</p>
                </div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="border p-4 bg-green-50 rounded">
                        <h3 className="font-bold border-b pb-2 mb-2">VENTAS Y CAJA</h3>
                        <div className="flex justify-between"><span>Venta Neta (Dinero):</span><span className="font-bold">${closingData.sales.toFixed(2)}</span></div>
                        <div className="flex justify-between text-gray-500"><span>Regalos/Personal (No Dinero):</span><span>${closingData.gifts.toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-600 mt-2"><span>Gastos:</span><span>-${closingData.expenses.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-black"><span>GANANCIA:</span><span>${closingData.net.toFixed(2)}</span></div>
                    </div>
                    <div className="border p-4 bg-gray-50 rounded">
                        <h3 className="font-bold border-b pb-2 mb-2">ARQUEO FÍSICO (EN GAVETA)</h3>
                        <div className="text-center mb-2">
                            <div className="text-xs text-gray-500">DÓLARES</div>
                            <div className="text-2xl font-bold text-green-800">${closingData.cashInUsd.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">BOLÍVARES</div>
                            <div className="text-2xl font-bold text-blue-800">Bs {closingData.cashInBs.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                <table className="w-full text-sm mb-8">
                    <thead><tr><th className="text-left">Método</th><th className="text-right">Total ($)</th></tr></thead>
                    <tbody>
                        {Object.entries(closingData.breakdown).map(([m, a]) => (
                            <tr key={m} className="border-b">
                                <td className="uppercase py-1">{m.replace('_', ' ')}</td>
                                <td className="text-right font-bold">${a.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        )}
      </div>
    </div>
  );
}
