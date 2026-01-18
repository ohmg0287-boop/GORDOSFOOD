import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, AlertTriangle } from 'lucide-react';
import { Ingredient, UnitType } from '@/types/database';

const unitLabels: Record<UnitType, string> = {
  gr: 'Gramos (gr)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  lt: 'Litros (lt)',
  und: 'Unidades (und)'
};

export const InventoryManager: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    unit: 'und' as UnitType,
    stock_actual: '',
    stock_minimo: '',
    costo_promedio: ''
  });

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data && !error) {
      setIngredients(data as Ingredient[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('ingredients').insert({
        name: form.name,
        unit: form.unit,
        stock_actual: parseFloat(form.stock_actual) || 0,
        stock_minimo: parseFloat(form.stock_minimo) || 0,
        costo_promedio: parseFloat(form.costo_promedio) || 0
      });

      if (error) throw error;

      toast.success('Ingrediente creado');
      setShowDialog(false);
      setForm({ name: '', unit: 'und', stock_actual: '', stock_minimo: '', costo_promedio: '' });
      fetchIngredients();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error', { description: err.message });
    }
  };

  const isLowStock = (ing: Ingredient) => ing.stock_actual <= ing.stock_minimo;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventario de Ingredientes</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nuevo Ingrediente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Ingrediente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select
                    value={form.unit}
                    onValueChange={(v) => setForm({ ...form, unit: v as UnitType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(unitLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stock Actual</Label>
                    <Input
                      type="number"
                      value={form.stock_actual}
                      onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Mínimo</Label>
                    <Input
                      type="number"
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Costo Promedio (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.costo_promedio}
                    onChange={(e) => setForm({ ...form, costo_promedio: e.target.value })}
                  />
                </div>
                <Button onClick={handleSave} className="w-full">Crear Ingrediente</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Stock Mínimo</TableHead>
                <TableHead className="text-right">Costo Promedio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ing) => (
                <TableRow key={ing.id} className={isLowStock(ing) ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ing.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{ing.stock_actual.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{ing.stock_minimo.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${ing.costo_promedio.toFixed(4)}</TableCell>
                  <TableCell>
                    {isLowStock(ing) ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Bajo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
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
