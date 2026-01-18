import React, { useState } from 'react';

const PRODUCTOS = [
  { id: 1, nombre: 'Mamandini Carne', precio: 4 },
  { id: 2, nombre: 'Mamandini Pollo', precio: 4 },
  { id: 3, nombre: 'La Buchona', precio: 10 },
  { id: 4, nombre: 'Big Manolo', precio: 30 }
];

export default function DondeManoloApp() {
  const [carrito, setCarrito] = useState([]);
  const [tasa, setTasa] = useState(55); // Ejemplo tasa BCV

  const total = carrito.reduce((acc, item) => acc + item.precio, 0);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🍔 Donde Manolo - Punto de Venta</h1>
      <p>Tasa: 1 USD = {tasa} Bs.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>Menú</h2>
          {PRODUCTOS.map(p => (
            <button key={p.id} onClick={() => setCarrito([...carrito, p])} style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%' }}>
              {p.nombre} - ${p.precio}
            </button>
          ))}
        </div>

        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h2>Cuenta</h2>
          {carrito.map((item, i) => <p key={i}>{item.nombre} - ${item.precio}</p>)}
          <hr />
          <h3>Total USD: ${total}</h3>
          <h3>Total Bs: {total * tasa}</h3>
          <button onClick={() => alert('Venta Guardada en Supabase')} style={{ background: 'green', color: 'white', padding: '10px', width: '100%' }}>
            REGISTRAR PAGO
          </button>
          <button onClick={() => setCarrito([])} style={{ marginTop: '10px', width: '100%' }}>Vaciar</button>
        </div>
      </div>
    </div>
  );
}
