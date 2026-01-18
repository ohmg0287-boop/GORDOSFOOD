import { useState, useCallback } from 'react';
import { CartItem, Product } from '@/types/database';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number = 1, notes?: string) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      
      return [...prev, { product, quantity, notes }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setItems(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const updateNotes = useCallback((productId: string, notes: string) => {
    setItems(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + (item.product.price_usd * item.quantity), 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    getTotal,
    getItemCount
  };
};
