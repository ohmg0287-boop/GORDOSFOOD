import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';
import { DollarSign, RefreshCw } from 'lucide-react';

export const ExchangeRateSettings: React.FC = () => {
  const { exchangeRate, updateExchangeRate, loading } = useExchangeRate();
  const [bcv, setBcv] = useState(exchangeRate.bcv.toString());
  const [parallel, setParallel] = useState(exchangeRate.parallel.toString());
  const [active, setActive] = useState<'bcv' | 'parallel'>(exchangeRate.active);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setBcv(exchangeRate.bcv.toString());
    setParallel(exchangeRate.parallel.toString());
    setActive(exchangeRate.active);
  }, [exchangeRate]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateExchangeRate({
      bcv: parseFloat(bcv) || 0,
      parallel: parseFloat(parallel) || 0,
      active
    });

    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Tasa actualizada');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tasa de Cambio del Día
          </CardTitle>
          <CardDescription>
            Configura las tasas de cambio USD/VES para el sistema de cobro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bcv">Tasa BCV</Label>
              <div className="relative">
                <Input
                  id="bcv"
                  type="number"
                  step="0.01"
                  value={bcv}
                  onChange={(e) => setBcv(e.target.value)}
                  className="pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  1 $ =
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Bolívares por 1 USD (BCV)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parallel">Tasa Paralelo</Label>
              <div className="relative">
                <Input
                  id="parallel"
                  type="number"
                  step="0.01"
                  value={parallel}
                  onChange={(e) => setParallel(e.target.value)}
                  className="pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  1 $ =
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Bolívares por 1 USD (Paralelo)</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tasa Activa para Cobros</Label>
            <RadioGroup
              value={active}
              onValueChange={(v) => setActive(v as 'bcv' | 'parallel')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bcv" id="rate-bcv" />
                <Label htmlFor="rate-bcv" className="font-normal cursor-pointer">
                  BCV ({parseFloat(bcv).toFixed(2)} Bs)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parallel" id="rate-parallel" />
                <Label htmlFor="rate-parallel" className="font-normal cursor-pointer">
                  Paralelo ({parseFloat(parallel).toFixed(2)} Bs)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSave} disabled={saving || loading} className="w-full">
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
