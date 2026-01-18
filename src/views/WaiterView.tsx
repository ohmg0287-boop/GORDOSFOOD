import React, { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/layout/AppHeader';
import { CategoryTabs } from '@/components/waiter/CategoryTabs';
import { ProductCard } from '@/components/waiter/ProductCard';
import { CartSheet } from '@/components/waiter/CartSheet';
import { OrderTypeSelector } from '@/components/waiter/OrderTypeSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { OrderType } from '@/types/database';

export const WaiterView: React.FC = () => {
  const { products, categories, loading } = useProducts();
  const cart = useCart();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOrderType, setShowOrderType] = useState(false);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    setShowOrderType(true);
  };

  const handleConfirmOrder = async (data: {
    type: OrderType;
    tableNumber?: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
  }) => {
    if (!user) return;

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: data.type,
          table_number: data.tableNumber,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_address: data.customerAddress,
          subtotal_usd: cart.getTotal(),
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price_usd: item.product.price_usd,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('¡Comanda enviada!', {
        description: `Orden #${order.order_number} creada`
      });

      cart.clearCart();
      setShowOrderType(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error al crear orden', { description: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 p-4 pb-24">
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={cart.addItem}
              />
            ))}
          </div>
        )}
      </main>

      <CartSheet
        items={cart.items}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onUpdateNotes={cart.updateNotes}
        getTotal={cart.getTotal}
        getItemCount={cart.getItemCount}
        onCheckout={handleCheckout}
      />

      <OrderTypeSelector
        open={showOrderType}
        onClose={() => setShowOrderType(false)}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
};
