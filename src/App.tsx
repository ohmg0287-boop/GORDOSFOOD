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

  // ESTADO CARRITO
  const [carrito, setCarrito] = useState([]);
  const [tipoServicio, setTipoServicio] = useState('Mesa');
  const [detalleServicio, setDetalleServicio] = useState('');

  // ESTADO MULTIPAGO
  const [orderToPay, setOrderToPay] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [montoInput, setMontoInput] = useState('');
  const [metodo, setMetodo] = useState('usd_cash');
  const [refPago, setRefPago] = useState('');

  // ESTADO REPORTES Y COMPRAS
  const [reporteHoy, setReporteHoy] = useState(null);
  const [nuevaCompra, setNuevaCompra] = useState({ ingrediente: '', cant: '', costo: '' });

  useEffect(() => {
    fetchStaff();
    if (currentUser) {
      fetchData();
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').eq('active', true);
    if (data) setStaff(data);
  }

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: i } = await supabase.from('ingredients').select('*').order('name');
    const { data: t } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (p) setProductos(p);
    if (i) setInventario(i);
    if (t) setTasa(t.value);
    fetchOrders();
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*, order_items(*, product:products(name))').order('created_at', { ascending: false });
    if (data) setOrders(data);
  }

  // --- CALCULADORA DE PAGOS ---
  const totalPagadoUSD = pagos.reduce((acc, p) => acc + p.montoUSD, 0);
  const deudaRestanteUSD = orderToPay ? orderToPay.total_usd - totalPagadoUSD : 0;

  const agregarPago = () => {
    const m = parseFloat(montoInput);
    if (!m && metodo !== 'cortesia') return;
    let usd = 0;
    if (metodo === 'usd_cash' || metodo === 'zelle') usd = m;
    else if (metodo === 'cortesia') usd = deudaRestanteUSD;
    else usd = m / tasa.bcv;

    setPagos([...pagos, { metodo, montoUSD: usd, montoOriginal: m, detalle: refPago }]);
    setMontoInput(''); setRefPago('');
  };

  // --- REPORTES ---
  const generarReporteCierre = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    const { data: v } = await supabase.from('orders').select('*, payments(*)').gte('created_at', hoy);
    
    const pagadas = v.filter(o => o.status === 'pagado');
    const cortesias = v.filter(o => o.is_courtesy);
    const totalUSD = pagadas.reduce((a, b) => a + b.total_usd, 0);
    
    setReporteHoy({
      totalCuentas: pagadas.length,
      montoTotal: totalUSD,
      cortesias: cortesias,
      detalles: pagadas
    });
  };

  // --- COMPRAS ---
  const registrarCompra = async () => {
    if(!nuevaCompra.ingrediente || !nuevaCompra.cant) return alert("Complete los datos");
    await supabase.from('purchases').insert([{
        ingredient_name: nuevaCompra.ingrediente,
        quantity: parseFloat(nuevaCompra.cant),
        cost_usd: parseFloat(nuevaCompra.costo),
        created_by: currentUser.name
    }]);
    alert("Compra cargada e inventario actualizado");
    setNuevaCompra({ ingrediente: '', cant: '', costo: '' });
    fetchData();
  };

  if (!currentUser) return (
    <div style={{height:'100vh', background:'#b22222', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'}}>
      <h1>🍔 DONDE MANOLO</h1>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
        {staff.map(u => (
          <button key={u.id} onClick={() => {
            const pin = prompt(`PIN para ${u.name}:`);
            if(pin === u.pin) setCurrentUser(u);
            else alert("Error");
          }} style={btnBig}>{u.name}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="notranslate" style={{fontFamily:'sans-serif', background:'#f4f4f4', minHeight:'100vh'}}>
      <nav className="no-print" style={{background:'#333', color:'white', padding:'10px', display:'flex', justifyContent:'space-between'}}>
        <b>{currentUser.name}</b>
        <div>
          {currentUser.role === 'admin' && <><button onClick={()=>setActiveTab('dashboard')} style={navBtn}>Cierre/Ventas</button>
          <button onClick={()=>setActiveTab('inventario')} style={navBtn}>Inventario/Compras</button></>}
          {currentUser.role === 'caja' && <button onClick={()=>setActiveTab('caja')} style={navBtn}>Caja</button>}
          <button onClick={()=>window.print()} style={navBtn}>🖨️ Imprimir</button>
          <button onClick={()=>window.location.reload()} style={navBtn}>Salir</button>
        </div>
      </nav>

      <div style={{padding:'20px'}}>
        {/* REPORTE DE INVENTARIO Y COMPRAS */}
        {activeTab === 'inventario' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={panel}>
              <h3>📦 Reporte de Stock Actual</h3>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'2px solid #ddd'}}><th>Ingrediente</th><th>Quedan</th><th>Unidad</th></tr></thead>
                <tbody>
                  {inventario.map(i => (
                    <tr key={i.id} style={{borderBottom:'1px solid #eee'}}>
                      <td>{i.name}</td>
                      <td style={{color: i.stock < 5 ? 'red' : 'black', fontWeight:'bold'}}>{Number(i.stock).toFixed(2)}</td>
                      <td>{i.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={panel}>
              <h3>🛒 Cargar Compra (Suma al Stock)</h3>
              <select style={input} onChange={e=>setNuevaCompra({...nuevaCompra, ingrediente: e.target.value})}>
                <option>Seleccione ingrediente...</option>
                {inventario.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
              <input placeholder="Cantidad" type="number" value={nuevaCompra.cant} onChange={e=>setNuevaCompra({...nuevaCompra, cant:e.target.value})} style={input} />
              <input placeholder="Costo Total $" type="number" value={nuevaCompra.costo} onChange={e=>setNuevaCompra({...nuevaCompra, costo:e.target.value})} style={input} />
              <button onClick={registrarCompra} style={btnAction}>CARGAR COMPRA</button>
            </div>
          </div>
        )}

        {/* CAJA Y MULTIPAGO */}
        {activeTab === 'caja' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div style={panel}>
              <h3>Cuentas Pendientes</h3>
              {orders.filter(o=>o.status!=='pagado').map(o=>(
                <div key={o.id} onClick={()=>{setOrderToPay(o); setPagos([]);}} style={{padding:'10px', border:'1px solid #ccc', cursor:'pointer', marginBottom:'5px', background:o.status==='listo'?'#d4edda':'white'}}>
                  {o.service_type}: {o.table_number || o.customer_name} - <b>${o.total_usd}</b>
                </div>
              ))}
            </div>
            {orderToPay && (
              <div style={panel}>
                <h3>Cobrar: {orderToPay.customer_name || orderToPay.table_number}</h3>
                <h2 style={{color:'red'}}>Faltan: ${deudaRestanteUSD.toFixed(2)}</h2>
                <h4 style={{color:'blue'}}>Faltan en Bs: {(deudaRestanteUSD * tasa.bcv).toFixed(2)}</h4>
                <hr/>
                <div style={{display:'flex', gap:'5px'}}>
                  <input type="number" placeholder="Monto" value={montoInput} onChange={e=>setMontoInput(e.target.value)} style={{width:'80px'}} />
                  <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                    <option value="usd_cash">$ Efec</option><option value="bs_cash">Bs Efec</option>
                    <option value="pago_movil">P.Movil</option><option value="zelle">Zelle</option><option value="cortesia">Cortesía</option>
                  </select>
                  <button onClick={agregarPago} style={{background:'black', color:'white'}}>+</button>
                </div>
                {pagos.map((p,i)=><div key={i}>✓ {p.metodo}: ${p.montoUSD.toFixed(2)}</div>)}
                <button onClick={async ()=>{
                    if(deudaRestanteUSD > 0.01 && !pagos.some(p=>p.metodo==='cortesia')) return alert("Aún falta dinero");
                    await supabase.from('payments').insert(pagos.map(p=>({order_id:orderToPay.id, method:p.metodo, amount_usd:p.montoUSD, amount_original:p.montoOriginal, exchange_rate:tasa.bcv, detalle:p.detalle})));
                    await supabase.from('orders').update({status:'pagado', is_courtesy:pagos.some(p=>p.metodo==='cortesia')}).eq('id',orderToPay.id);
                    alert("Pagado"); setOrderToPay(null); fetchData();
                }} style={btnAction}>FINALIZAR VENTA</button>
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD Y CIERRE */}
        {activeTab === 'dashboard' && (
          <div style={panel}>
            <h3>📊 Cierre de Caja / Reporte de Ventas</h3>
            <button onClick={generarReporteCierre} style={btnAction}>GENERAR REPORTE DE HOY</button>
            {reporteHoy && (
              <div id="print-area" style={{marginTop:'20px'}}>
                <center><h2>DONDE MANOLO - REPORTE DE CIERRE</h2></center>
                <p>Fecha: {new Date().toLocaleDateString()}</p>
                <hr/>
                <h4>Resumen Económico:</h4>
                <p>Total Cuentas Cobradas: <b>{reporteHoy.totalCuentas}</b></p>
                <p>Monto Total Vendido: <b style={{fontSize:'1.5em'}}>${reporteHoy.montoTotal.toFixed(2)}</b></p>
                <p>Equivalente en Bs: <b>${(reporteHoy.montoTotal * tasa.bcv).toFixed(2)}</b></p>
                <hr/>
                <h4>Cuentas de Cortesía:</h4>
                {reporteHoy.cortesias.length === 0 ? <p>No hubo cortesías.</p> : 
                  reporteHoy.cortesias.map(c => <p key={c.id}>- {c.customer_name || c.table_number}: ${c.total_usd}</p>)
                }
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@media print {.no-print, button, nav { display: none !important; } #print-area { display: block !important; }}`}</style>
    </div>
  );
}

const btnBig = { padding:'20px', borderRadius:'10px', background:'white', color:'#b22222', fontWeight:'bold', border:'none', cursor:'pointer' };
const navBtn = { background:'none', border:'none', color:'white', cursor:'pointer', margin:'0 10px' };
const panel = { background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', marginBottom:'20px' };
const input = { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'5px', border:'1px solid #ccc' };
const btnAction = { width:'100%', padding:'12px', background:'#28a745', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer', marginTop:'10px' };
