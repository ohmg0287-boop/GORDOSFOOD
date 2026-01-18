import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Conexión con las variables que configuraste en Netlify
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function DondeManoloApp() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState(60); // Valor por defecto
  const [loading, setLoading] = useState(true);

  // 1. Cargar productos y tasa de cambio desde la DB
  useEffect(() => {
    async function fetchData() {
      const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true);
      const { data: settingsData } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
      
      if (prodData) setProductos(prodData);
      if (settingsData) setTasa(settingsData.value.bcv);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalUSD = carrito.reduce((acc, item) => acc + Number(item.price_usd), 0);

  // 2. Función para registrar la orden y el pago
  const finalizarVenta = async (metodo) => {
    try {
      // Crear la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          order_type: 'table', 
          status: 'paid', 
          subtotal_usd: totalUSD,
          created_by: (await supabase.auth.getUser()).data.user?.id // Si hay login
        }])
        .select().single();

      if (orderError) throw orderError;

      // Registrar el pago
      await supabase.from('payments').insert([{
        order_id: order.id,
        method: metodo,
        amount: metodo === 'usd_cash' ? totalUSD : totalUSD * tasa,
        currency: metodo === 'usd_cash' ? 'USD' : 'VES',
        exchange_rate: tasa,
        amount_usd: totalUSD,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }]);

      alert("¡Venta procesada con éxito!");
      setCarrito([]);
    } catch (err) {
      console.error(err);
      alert("Error al procesar. Verifica que el usuario esté autenticado.");
    }
  };

  if (loading) return <div style={{padding: '20px'}}>Cargando sistema de Donde Manolo...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '900px', margin: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
        <h1 style={{ color: '#d35400' }}>🍔 DONDE MANOLO</h1>
        <div style={{ textAlign: 'right' }}>
          <strong>Tasa BCV: {tasa} Bs.</strong>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        {/* LADO IZQUIERDO: PRODUCTOS */}
        <div>
          <h3>Menú</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {productos.length > 0 ? productos.map(p => (
              <button 
                key={p.id} 
                onClick={() => setCarrito([...carrito, p])}
                style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', textAlign: 'left' }}
              >
                <strong>{p.name}</strong><br/>
                <span style={{color: '#27ae60'}}>${p.price_usd}</span>
              </button>
            )) : <p>No hay productos activos. Agrégalos en Supabase.</p>}
          </div>
        </div>

        {/* LADO DERECHO: CARRITO Y PAGO */}
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h3>Pedido</h3>
          {carrito.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', marginBottom: '5px' }}>
              <span>{item.name}</span>
              <span>${item.price_usd}</span>
            </div>
          ))}
          <hr/>
          <h2 style={{ marginBottom: '0' }}>Total: ${totalUSD.toFixed(2)}</h2>
          <h3 style={{ marginTop: '5px', color: '#7f8c8d' }}>Bs. {(totalUSD * tasa).toLocaleString()}</h3>

          <div style={{ marginTop: '20px' }}>
            <p><strong>Método de Pago:</strong></p>
            <button onClick={() => finalizarVenta('usd_cash')} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px' }}>Efectivo $</button>
            <button onClick={() => finalizarVenta('pago_movil')} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '5px' }}>Pago Móvil</button>
            <button onClick={() => finalizarVenta('zelle')} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px' }}>Zelle</button>
            <button onClick={() => setCarrito([])} style={{ width: '100%', padding: '10px', background: '#ecf0f1', border: 'none', borderRadius: '5px' }}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
