import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/database';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (data && !error) {
      setProducts(data as unknown as Product[]);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data && !error) {
      setCategories(data as Category[]);
    }
    setLoading(false);
  };

  const checkAvailability = async (productId: string, quantity: number): Promise<boolean> => {
    // Get product recipes
    const { data: recipes } = await supabase
      .from('product_recipes')
      .select(`
        quantity,
        ingredient:ingredients(stock_actual)
      `)
      .eq('product_id', productId);

    if (!recipes) return true;

    // Check if all ingredients have enough stock
    for (const recipe of recipes) {
      const ingredient = recipe.ingredient as unknown as { stock_actual: number };
      if (ingredient && ingredient.stock_actual < recipe.quantity * quantity) {
        return false;
      }
    }
    
    return true;
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]);
  }, []);

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId);
  };

  return {
    products,
    categories,
    loading,
    getProductsByCategory,
    checkAvailability,
    refetch: () => Promise.all([fetchProducts(), fetchCategories()])
  };
};
