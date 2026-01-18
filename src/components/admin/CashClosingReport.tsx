import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { DollarSign, Banknote, CreditCard, Smartphone, FileText, Loader2 } from 'lucide-react';

interface PaymentSummary {
  usd_cash: number;
  bs_cash: number;
  zelle: number;
  pago_movil: number;
  punto: number;
  total_usd: number;
}

export const CashClosingReport: React.FC = () => {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState('');
  const { user } = useAuth();
  const { getCurrentRate } = useExchangeRate();

  const fetchTodayPayments = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('payments')
      .select('method, amount, currency, amount_usd')
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Error fetching payments:', error);
      setLoading(false);
      return;
    }

    const summary: PaymentSummary = {
      usd_cash: 0,
      bs_cash: 0,
      zelle: 0,
      pago_movil: 0,
      punto: 0,
      total_usd: 0
    };

    data?.forEach((payment) => {
      summary.total_usd += payment.amount_usd;
      
      switch (payment.method) {
        case 'usd_cash':
          summary.usd_cash += payment.amount;
          break;
        case 'bs_cash':
          summary.bs_cash += payment.amount;
          break;
        case 'zelle':
          summary.zelle += payment.amount;
          break;
        case 'pago_movil':
          summary.pago_movil += payment.amount;
          break;
        case 'punto':
          summary.punto += payment.amount;
          break;
      }
    });

    setSummary(summary);
    setLoading(false);
  };

  useEffect(() => {
    fetchTodayPayments();
  }, []);

  const handleCloseCash = async () => {
    if (!summary || !user) return;

    setClosing(true);
    try {
      const { error } = await supabase.from('cash_closings').insert({
        closing_date: new Date().toISOString().split('T')[0],
        total_sales_usd: summary.total_usd,
        usd_cash: summary.usd_cash,
        bs_cash: summary.bs_cash,
        zelle: summary.zelle,
        pago_movil: summary.pago_movil,
        punto: summary.punto,
        exchange_rate: getCurrentRate(),
        notes: notes || null,
        closed_by: user.id
      });

      if (error) throw error;

      toast.success('Cierre de caja registrado');
      setNotes('');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error al cerrar caja', { description: err.message });
    }
    setClosing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const exchangeRate = getCurrentRate();

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumen del Día
          </CardTitle>
          <CardDescription>
            Reporte de ventas y pagos de hoy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Sales */}
          <div className="bg-primary/10 rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Ventas Totales del Día</p>
            <p className="text-4xl font-bold text-primary">
              ${summary?.total_usd.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Bs. {((summary?.total_usd || 0) * exchangeRate).toFixed(2)}
            </p>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div>
            <h3 className="font-semibold mb-4">Desglose por Método de Pago</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* USD Section */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                    <DollarSign className="w-4 h-4" />
                    Dólares en Caja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">USD Efectivo</span>
                      <span className="font-semibold">${summary?.usd_cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Zelle</span>
                      <span className="font-semibold">${summary?.zelle.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total USD</span>
                      <span className="text-green-700">
                        ${((summary?.usd_cash || 0) + (summary?.zelle || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VES Section */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                    <Banknote className="w-4 h-4" />
                    Bolívares en Banco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm flex items-center gap-1">
                        <Banknote className="w-3 h-3" /> Efectivo Bs
                      </span>
                      <span className="font-semibold">Bs. {summary?.bs_cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Pago Móvil
                      </span>
                      <span className="font-semibold">Bs. {summary?.pago_movil.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Punto
                      </span>
                      <span className="font-semibold">Bs. {summary?.punto.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Bs</span>
                      <span className="text-blue-700">
                        Bs. {((summary?.bs_cash || 0) + (summary?.pago_movil || 0) + (summary?.punto || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Close Cash Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas del Cierre (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones, faltantes, sobrantes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCloseCash}
              disabled={closing}
              className="w-full"
              size="lg"
            >
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Registrar Cierre de Caja'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
