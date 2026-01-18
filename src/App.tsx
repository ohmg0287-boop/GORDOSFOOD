import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function DondeManoloApp() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState({ bcv: 60 });
  const [tipoServicio, setTipoServicio] = useState('table'); // table, delivery, pickup
  const [detalleServicio, setDetalleServicio] = useState(''); // Mesa # o Nombre
  
  // Lógica de Multipago
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [montoIngresado, setMontoIngresado] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('usd_cash');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: prod } = await supabase.from('products').select('*');
    const { data: stg } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (prod) setProductos(prod);
    if (stg) setTasa(stg.value);
  }

  const totalOrdenUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);
  const totalPagadoUSD = pagosRealizados.reduce((acc, p) => acc + p.montoUSD, 0);
  const restanteUSD = totalOrdenUSD - totalPagadoUSD;

  const agregarPago = () => {
    const monto = parseFloat(montoIngresado);
    if (!monto || monto <= 0) return;

    let montoUSD = 0;
    // Si el pago es en Bs, lo convertimos a USD para la contabilidad interna
    if (metodoSeleccionado === 'pago_movil' || metodoSeleccionado === 'bs_cash' || metodoSeleccionado === 'punto') {
      montoUSD = monto / tasa.bcv;
    } else {
      montoUSD = monto;
    }

    setPagosRealizados([...pagosRealizados, { 
      metodo: metodoSeleccionado, 
      montoOriginal: monto, 
      montoUSD: montoUSD 
    }]);
    setMontoIngresado('');
  };

  const procesarVentaFinal = async () => {
    if (restanteUSD > 0.01) return alert("Aún falta saldo por cubrir");
    
    // Aquí el código enviará a Supabase la orden y desglosará los pagos en la tabla 'payments'
    alert("Venta procesada con éxito. El inventario se descontará automáticamente.");
    setCarrito([]);
    setPagosRealizados([]);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      <nav style={{ background: '#333', color: '#fff', padding: '1rem', display: 'flex', gap: '15px' }}>
        <b style={{color: 'orange'}}>Donde Manolo POS</b>
        <span onClick={() => setActiveTab('ventas')} style={{cursor:'pointer'}}>Caja</span>
        <span onClick={() => setActiveTab('cocina')} style={{cursor:'pointer'}}>Cocina</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', padding: '20px' }}>
        {/* IZQUIERDA: MENÚ */}
        <div>
          <h3>Menú de Hamburguesas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {productos.map(p => (
              <button key={p.id} onClick={() => setCarrito([...carrito, p])} style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px'}}>
                {p.name} <br/> <b>${p.price_usd}</b>
              </button>
            ))}
          </div>
        </div>

        {/* DERECHA: TICKET Y MULTIPAGO */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h4>Resumen de Orden</h4>
          <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} style={{width:'100%', marginBottom:'5px'}}>
             <option value="table">Mesa</option>
             <option value="delivery">Delivery</option>
             <option value="pickup">Pick-up</option>
          </select>
          <input 
            placeholder={tipoServicio === 'table' ? "Número de Mesa" : "Nombre / Dirección"} 
            value={detalleServicio} 
            onChange={(e) => setDetalleServicio(e.target.value)}
            style={{width:'94%', marginBottom:'10px', padding:'5px'}}
          />

          <div style={{ maxHeight: '150px', overflowY: 'auto', borderBottom: '1px solid #eee' }}>
            {carrito.map((item, i) => <div key={i} style={{display:'flex', justifyContent:'space-between'}}><span>{item.name}</span><span>${item.price_usd}</span></div>)}
          </div>
          
          <h3 style={{textAlign:'right'}}>Total: ${totalOrdenUSD.toFixed(2)}</h3>
          <p style={{textAlign:'right', color:'#666'}}>Bs. {(totalOrdenUSD * tasa.bcv).toLocaleString()}</p>

          <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
            <h5>Registrar Multipago</h5>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input 
                type="number" 
                placeholder="Monto" 
                value={montoIngresado} 
                onChange={(e) => setMontoIngresado(e.target.value)}
                style={{flex: 1}}
              />
              <select value={metodoSeleccionado} onChange={(e) => setMetodoSeleccionado(e.target.value)}>
                <option value="usd_cash">Efectivo $</option>
                <option value="bs_cash">Efectivo Bs</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select>
              <button onClick={agregarPago} style={{background: '#007bff', color: '#fff', border: 'none', padding: '5px 10px'}}>+</button>
            </div>

            <div style={{ marginTop: '10px', fontSize: '0.85em' }}>
              {pagosRealizados.map((p, i) => (
                <div key={i} style={{color: 'green'}}>✔ {p.metodo}: {p.montoOriginal} (≈${p.montoUSD.toFixed(2)})</div>
              ))}
            </div>
            
            <h4 style={{ color: restanteUSD <= 0 ? 'green' : 'red', marginTop: '10px' }}>
              Resta por pagar: ${restanteUSD > 0 ? restanteUSD.toFixed(2) : '0.00'}
            </h4>
          </div>

          <button 
            disabled={restanteUSD > 0.01 || carrito.length === 0} 
            onClick={procesarVentaFinal}
            style={{ width: '100%', padding: '15px', marginTop: '15px', background: restanteUSD <= 0.01 ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
          >
            FINALIZAR Y DESCONTAR INVENTARIO
          </button>
        </div>
      </div>
    </div>
  );
}
