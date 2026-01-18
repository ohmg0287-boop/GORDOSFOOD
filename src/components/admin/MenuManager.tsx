import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Category, Product, Ingredient } from '@/types/database';
import { useExchangeRate } from '@/hooks/useExchangeRate';

export const MenuManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { convertUsdToBs } = useExchangeRate();

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price_usd: '',
    category_id: '',
    image_url: ''
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const fetchData = async () => {
    const [catRes, prodRes, ingRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('products').select('*, category:categories(*)').order('name'),
      supabase.from('ingredients').select('*').order('name')
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (prodRes.data) setProducts(prodRes.data as unknown as Product[]);
    if (ingRes.data) setIngredients(ingRes.data as Ingredient[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description || null,
        price_usd: parseFloat(productForm.price_usd),
        category_id: productForm.category_id || null,
        image_url: productForm.image_url || null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast.success('Producto creado');
      }

      setShowProductDialog(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price_usd: '', category_id: '', image_url: '' });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error', { description: err.message });
    }
  };

  const handleSaveCategory = async () => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: categoryForm.name,
          description: categoryForm.description || null
        });
      if (error) throw error;
      toast.success('Categoría creada');
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error', { description: err.message });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price_usd: product.price_usd.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || ''
    });
    setShowProductDialog(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Producto eliminado');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorías</CardTitle>
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Categoría</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveCategory} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="text-sm py-1 px-3">
                {cat.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos del Menú</CardTitle>
          <Dialog open={showProductDialog} onOpenChange={(open) => {
            setShowProductDialog(open);
            if (!open) {
              setEditingProduct(null);
              setProductForm({ name: '', description: '', price_usd: '', category_id: '', image_url: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio USD *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price_usd}
                      onChange={(e) => setProductForm({ ...productForm, price_usd: e.target.value })}
                    />
                    {productForm.price_usd && (
                      <p className="text-xs text-muted-foreground">
                        Bs. {convertUsdToBs(parseFloat(productForm.price_usd) || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={productForm.category_id}
                      onValueChange={(v) => setProductForm({ ...productForm, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL de Imagen</Label>
                  <Input
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleSaveProduct} className="w-full">
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio USD</TableHead>
                <TableHead className="text-right">Precio Bs</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category?.name && (
                      <Badge variant="outline">{product.category.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">${product.price_usd.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    Bs. {convertUsdToBs(product.price_usd).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
