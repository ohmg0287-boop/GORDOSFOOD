import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Asegura que las variables de entorno se carguen correctamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]); // Para la nueva pestaña de inventario
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 0 }); // Inicializamos en 0, se carga de la DB
  const [tipoServicio, setTipoServicio] = useState('table'); // 'table' (Colina Arriba), 'delivery' (Entregar), 'pickup' (Subir)
  const [detalleServicio, setDetalleServicio] = useState(''); // Número de mesa o nombre/dirección
  const [loading, setLoading] = useState(true); // Para mostrar un spinner mientras carga

  // Multipago
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('usd_cash');

  useEffect(() => { 
    if (supabaseUrl && supabaseAnonKey) {
      fetchData(); 
    } else {
      setLoading(false);
      console.error("Variables de entorno de Supabase no configuradas. Revisa Netlify.");
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch productos
      const { data: prod, error: prodErr } = await supabase.from('products').select('*').order('name');
      if (prodErr) throw prodErr;
      if (prod) setProductos(prod);

      // Fetch inventario
      const { data: inv, error: invErr } = await supabase.from('ingredients').select('*').order('name');
      if (invErr) throw invErr;
      if (inv) setInventario(inv);

      // Fetch tasa de cambio
      const { data: stg, error: stgErr } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
      if (stgErr && stgErr.code !== 'PGRST116') console.warn("La tabla 'settings' está vacía o no existe la clave 'exchange_rate'. Usando tasa por defecto.");
      if (stg) setTasa(stg.value);

    } catch (e) {
      console.error("Error cargando datos de Supabase:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- Lógica de Multipago y Totales ---
  const totalOrdenUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);
  const totalPagadoUSD = pagosRealizados.reduce((acc, p) => acc + p.montoUSD, 0);
  const restanteUSD = Math.max(0, totalOrdenUSD - totalPagadoUSD); // Asegura que no sea negativo

  const agregarPago = () => {
    const monto = parseFloat(montoIngresado);
    if (!monto || monto <= 0) return;

    let montoCalcUSD = 0;
    if (metodoSeleccionado === 'usd_cash' || metodoSeleccionado === 'zelle') {
      montoCalcUSD = monto;
    } else { // Pago en Bs (Pago Móvil, Bs Efectivo)
      if (tasa.bcv === 0) {
        alert("¡Error! La tasa de cambio en Bolívares es 0. Ajusta la tasa en la pestaña de Configuración.");
        return;
      }
      montoCalcUSD = monto / tasa.bcv;
    }

    setPagosRealizados([...pagosRealizados, { 
      metodo: metodoSeleccionado, 
      montoOriginal: monto, 
      montoUSD: montoCalcUSD 
    }]);
    setMontoIngresado(''); // Limpia el input después de agregar
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");
    if (restanteUSD > 0.05) return alert(`Aún falta por pagar: $${restanteUSD.toFixed(2)}`); // Pequeña tolerancia

    setLoading(true); // Bloquea la interfaz mientras se guarda
    try {
      // 1. Registrar la Orden Principal
      const { data: order, error: orderErr } = await supabase.from('orders').insert([{
        total_usd: totalOrdenUSD,
        service_type: tipoServicio,
        table_number: tipoServicio === 'table' ? detalleServicio : null, // Solo si es mesa
        customer_name: tipoServicio !== 'table' ? detalleServicio : null, // Solo si es delivery/pickup
        status: 'completed', // O 'pending' si quieres que la cocina la vea primero
      }]).select().single();

      if (orderErr) throw orderErr;

      // 2. Registrar los Ítems de la Orden (para el trigger de inventario)
      const itemsToInsert = carrito.map(p => ({ 
        order_id: order.id, 
        product_id: p.id, 
        quantity: 1, // Por ahora siempre 1 unidad, puedes cambiarlo para permitir más
        price_at_time: p.price_usd 
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // 3. Registrar los Pagos Realizados
      const paymentsToInsert = pagosRealizados.map(p => ({
        order_id: order.id,
        method: p.metodo,
        amount_original: p.montoOriginal,
        amount_usd: p.montoUSD,
        exchange_rate: p.metodo.includes('bs') || p.metodo === 'pago_movil' ? tasa.bcv : null // Guarda la tasa si se usó Bs
      }));
      const { error: paymentsErr } = await supabase.from('payments').insert(paymentsToInsert);
      if (paymentsErr) throw paymentsErr;

      alert("¡Venta procesada con éxito! El inventario se ha actualizado y los pagos registrados.");
      // Limpiar todo después de una venta exitosa
      setCarrito([]);
      setPagosRealizados([]);
      setMontoIngresado('');
      setDetalleServicio('');
      fetchData(); // Vuelve a cargar datos, importante para ver el inventario actualizado
      
    } catch (e: any) {
      alert("Error al procesar la venta: " + e.message);
      console.error("Error al finalizar venta:", e);
    } finally {
      setLoading(false);
    }
  };

  const actualizarTasaEnBD = async () => {
    if (tasa.bcv <= 0) {
      alert("La tasa de cambio debe ser un número positivo.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('settings').upsert(
        { key: 'exchange_rate', value: tasa }, 
        { onConflict: 'key' } // Actualiza si ya existe, inserta si no
      );
      if (error) throw error;
      alert("Tasa de cambio actualizada con éxito.");
    } catch (e: any) {
      alert("Error al guardar la tasa: " + e.message);
      console.error("Error al actualizar tasa:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div lang="es" className="notranslate" style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de estado de conexión */}
      {(!supabaseUrl || !supabaseAnonKey) && (
        <div style={{background: 'darkred', color: 'white', textAlign: 'center', padding: '10px', fontWeight: 'bold'}}>
          ⚠️ CONFIGURACIÓN NECESARIA: Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno de Netlify.
        </div>
      )}

      <nav style={{ background: '#b22222', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h2 style={{ margin: 0 }}>🍔 DONDE MANOLO</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setActiveTab('ventas')} style={navBtn}>Caja</button>
          <button onClick={() => setActiveTab('inventario')} style={navBtn}>Inventario</button>
          <button onClick={() => setActiveTab('config')} style={navBtn}>Tasa: {tasa.bcv.toFixed(2)} Bs</button>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto', flexGrow: 1, width: '100%' }}>
        {loading ? (
          <p style={{textAlign:'center', fontSize:'1.2em'}}>Cargando datos de Donde Manolo...</p>
        ) : (
          <>
            {/* PESTAÑA DE VENTAS (CAJA) */}
            {activeTab === 'ventas' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
                {/* MENÚ DE PRODUCTOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                  {productos.length > 0 ? productos.map(p => (
                    <div key={p.id} onClick={() => setCarrito([...carrito, p])} style={cardStyle}>
                      <strong>{p.name}</strong><br/>
                      <span style={{color:'green'}}>${p.price_usd.toFixed(2)}</span>
                    </div>
                  )) : <p>No hay productos en el menú. Revisa la base de datos.</p>}
                </div>

                {/* PANEL DE FACTURACIÓN Y MULTIPAGO */}
                <div style={sidebarStyle}>
                  <h3>Pedido Actual</h3>
                  <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={inputStyle}>
                    <option value="table">Colina arriba (Mesa)</option>
                    <option value="delivery">Entregar (Delivery)</option>
                    <option value="pickup">Subir (Pick-up)</option>
                  </select>
                  <input 
                    placeholder={tipoServicio === 'table' ? "Número de Mesa" : "Nombre / Dirección"} 
                    value={detalleServicio} 
                    onChange={(e) => setDetalleServicio(e.target.value)} 
                    style={inputStyle} 
                  />
                  
                  <div style={{ borderBottom: '1px solid #ddd', minHeight: '100px', marginBottom: '10px', overflowY: 'auto', maxHeight: '180px' }}>
                    {carrito.map((c, i) => <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}><span>{c.name}</span><span>${c.price_usd.toFixed(2)}</span></div>)}
                  </div>

                  <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                    <h2 style={{margin:0}}>Total: ${totalOrdenUSD.toFixed(2)}</h2>
                    <span style={{color:'#666'}}>Bs. {(totalOrdenUSD * tasa.bcv).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>

                  {/* SECCIÓN DE MULTIPAGO */}
                  <div style={{ background: '#eee', padding: '10px', borderRadius: '8px' }}>
                    <h4 style={{marginTop:0}}>Registrar Pagos:</h4>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input 
                        type="number" 
                        value={montoIngresado} 
                        onChange={(e) => setMontoIngresado(e.target.value)} 
                        placeholder="Monto" 
                        style={{flex:1, padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}} 
                      />
                      <select value={metodoSeleccionado} onChange={(e) => setMetodoSeleccionado(e.target.value)} style={{padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}>
                        <option value="usd_cash">$ Efectivo</option>
                        <option value="bs_cash">Bs Efectivo</option>
                        <option value="pago_movil">Pago Móvil</option>
                        <option value="zelle">Zelle</option>
                      </select>
                      <button onClick={agregarPago} style={{background:'#b22222', color:'#fff', border:'none', padding:'0 15px', borderRadius:'4px', cursor:'pointer'}}>➕</button>
                    </div>
                    <div style={{marginTop:'10px', maxHeight:'80px', overflowY:'auto'}}>
                      {pagosRealizados.map((p, i) => <div key={i} style={{fontSize:'0.85em', color:'green', display:'flex', justifyContent:'space-between', padding:'2px 0'}}><span>✔ {p.metodo}</span><span>{p.montoOriginal.toFixed(2)} (≈${p.montoUSD.toFixed(2)})</span></div>)}
                    </div>
                    <h4 style={{ color: restanteUSD > 0 ? 'darkred' : 'green', margin: '10px 0 0 0', textAlign: 'right' }}>
                      Resta: ${restanteUSD.toFixed(2)}
                    </h4>
                  </div>

                  <button 
                    disabled={restanteUSD > 0.05 || carrito.length === 0} 
                    onClick={finalizarVenta} 
                    style={payBtn}
                  >
                    FINALIZAR Y DESCONTAR INVENTARIO
                  </button>
                  <button onClick={() => {setCarrito([]); setPagosRealizados([]); setMontoIngresado('');}} style={clearCartBtn}>Vaciar Carrito / Reiniciar Pagos</button>
                </div>
              </div>
            )}

            {/* PESTAÑA DE INVENTARIO */}
            {activeTab === 'inventario' && (
              <div style={sidebarStyle}>
                <h3>Inventario Actual</h3>
                <div style={{maxHeight:'500px', overflowY:'auto', border:'1px solid #eee', borderRadius:'8px', padding:'10px'}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#f2f2f2'}}>
                        <th style={tableHeaderStyle}>Insumo</th>
                        <th style={tableHeaderStyle}>Unidad</th>
                        <th style={tableHeaderStyle}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventario.length > 0 ? inventario.map(item => (
                        <tr key={item.id}>
                          <td style={tableCellStyle}>{item.name}</td>
                          <td style={tableCellStyle}>{item.unit}</td>
                          <td style={tableCellStyle}>
                            <input 
                              type="number" 
                              value={item.stock !== null ? item.stock : ''} 
                              onChange={(e) => { /* Implementar función para actualizar stock */ }} 
                              style={{width:'60px', padding:'5px', borderRadius:'3px', border:'1px solid #ccc'}}
                            />
                          </td>
                        </tr>
                      )) : <tr><td colSpan={3}>Cargando inventario o vacío...</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p style={{marginTop:'15px', fontSize:'0.9em', color:'#555'}}>Para actualizar el stock, edita directamente la celda (funcionalidad de guardar pendiente).</p>
              </div>
            )}

            {/* PESTAÑA DE CONFIGURACIÓN DE TASA */}
            {activeTab === 'config' && (
              <div style={sidebarStyle}>
                <h3>Ajustar Tasa de Cambio (BCV)</h3>
                <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Valor del Dólar en Bolívares:</label>
                <input 
                  type="number" 
                  value={tasa.bcv === 0 ? '' : tasa.bcv} // No muestra 0 si está vacío
                  onChange={(e) => setTasa({bcv: parseFloat(e.target.value) || 0})} 
                  style={inputStyle} 
                  placeholder="Ej: 36.50"
                />
                <button onClick={actualizarTasaEnBD} style={payBtn}>GUARDAR TASA PARA TODO EL SISTEMA</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ESTILOS DE LA APLICACIÓN
const navBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '15px', fontWeight: 'bold', fontSize: '1em' };
const cardStyle = { 
  background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', 
  border: '1px solid #ddd', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.1s ease',
  '&:hover': { transform: 'translateY(-2px)' }
};
const sidebarStyle = { 
  background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
  display: 'flex', flexDirection: 'column', height: 'fit-content' // Ajuste de altura
};
const inputStyle = { width: '95%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const payBtn = { 
  width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', 
  borderRadius: '8px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer',
  '&:disabled': { background: '#ccc', cursor: 'not-allowed' }
};
const clearCartBtn = {
  width: '100%', padding: '10px', background: 'none', color: 'gray', border: '1px solid #ccc',
  borderRadius: '8px', marginTop: '10px', cursor: 'pointer'
};
const tableHeaderStyle = { padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left', background: '#f9f9f9' };
const tableCellStyle = { padding: '8px', borderBottom: '1px solid #eee' };
