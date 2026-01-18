import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order, PaymentMethod } from '@/types/database';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DollarSign, Banknote, CreditCard, Smartphone, Trash2, Plus, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  currency: 'USD' | 'VES';
  reference?: string;
}

const paymentMethods: { method: PaymentMethod; label: string; currency: 'USD' | 'VES'; icon: React.ReactNode }[] = [
  { method: 'usd_cash', label: 'USD Efectivo', currency: 'USD', icon: <DollarSign className="w-4 h-4" /> },
  { method: 'zelle', label: 'Zelle', currency: 'USD', icon: <Smartphone className="w-4 h-4" /> },
  { method: 'bs_cash', label: 'Bs Efectivo', currency: 'VES', icon: <Banknote className="w-4 h-4" /> },
  { method: 'pago_movil', label: 'Pago Móvil', currency: 'VES', icon: <Smartphone className="w-4 h-4" /> },
  { method: 'punto', label: 'Punto de Venta', currency: 'VES', icon: <CreditCard className="w-4 h-4" /> }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  open,
  onClose,
  onComplete
}) => {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('usd_cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { getCurrentRate, convertBsToUsd } = useExchangeRate();
  const { user } = useAuth();

  const exchangeRate = getCurrentRate();
  const totalUsd = order?.subtotal_usd || 0;
  const totalBs = totalUsd * exchangeRate;

  const paidUsd = useMemo(() => {
    return payments.reduce((sum, p) => {
      if (p.currency === 'USD') {
        return sum + p.amount;
      } else {
        return sum + convertBsToUsd(p.amount);
      }
    }, 0);
  }, [payments, convertBsToUsd]);

  const remainingUsd = totalUsd - paidUsd;
  const remainingBs = remainingUsd * exchangeRate;

  const addPayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const methodConfig = paymentMethods.find(m => m.method === selectedMethod);
    if (!methodConfig) return;

    const newPayment: PaymentEntry = {
      id: crypto.randomUUID(),
      method: selectedMethod,
      amount: parseFloat(amount),
      currency: methodConfig.currency,
      reference: reference || undefined
    };

    setPayments(prev => [...prev, newPayment]);
    setAmount('');
    setReference('');
  };

  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleConfirm = async () => {
    if (!order || !user || remainingUsd > 0.01) return;

    setLoading(true);
    try {
      // Insert all payments
      const paymentRecords = payments.map(p => ({
        order_id: order.id,
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        exchange_rate: exchangeRate,
        amount_usd: p.currency === 'USD' ? p.amount : convertBsToUsd(p.amount),
        reference: p.reference,
        processed_by: user.id
      }));

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentRecords);

      if (paymentError) throw paymentError;

      // Update order status to paid
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast.success('¡Pago registrado!', {
        description: `Orden #${order.order_number} cobrada exitosamente`
      });

      setPayments([]);
      onComplete();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Error al procesar pago', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodConfig = paymentMethods.find(m => m.method === selectedMethod);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrar Orden #{order?.order_number}</DialogTitle>
        </DialogHeader>

        {/* Order Summary */}
        <Card className="p-4 bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total a cobrar:</span>
            <div className="text-right">
              <p className="text-2xl font-bold">${totalUsd.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Bs. {totalBs.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Tasa: 1 USD = {exchangeRate.toFixed(2)} Bs
          </div>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-3">
          <Label>Agregar Pago</Label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((pm) => (
              <Button
                key={pm.method}
                variant={selectedMethod === pm.method ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMethod(pm.method)}
                className="gap-1"
              >
                {pm.icon}
                {pm.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={`Monto en ${selectedMethodConfig?.currency}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            {(selectedMethod === 'pago_movil' || selectedMethod === 'zelle') && (
              <Input
                placeholder="Referencia"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-32"
              />
            )}
            <Button onClick={addPayment} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Payment List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <Label>Pagos agregados</Label>
            {payments.map((p) => {
              const config = paymentMethods.find(m => m.method === p.method);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {config?.icon}
                    <span className="font-medium">{config?.label}</span>
                    {p.reference && (
                      <Badge variant="secondary" className="text-xs">
                        Ref: {p.reference}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removePayment(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Balance */}
        <Card className={`p-4 ${remainingUsd <= 0.01 ? 'bg-green-500/10 border-green-500' : 'bg-yellow-500/10 border-yellow-500'}`}>
          <div className="flex justify-between items-center">
            <span>
              {remainingUsd <= 0.01 ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Pago completo
                </span>
              ) : (
                'Falta por cobrar:'
              )}
            </span>
            {remainingUsd > 0.01 && (
              <div className="text-right">
                <p className="font-bold text-lg">${remainingUsd.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Bs. {remainingBs.toFixed(2)}</p>
              </div>
            )}
            {remainingUsd < -0.01 && (
              <div className="text-right">
                <p className="font-bold text-lg text-green-600">
                  Vuelto: ${Math.abs(remainingUsd).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bs. {Math.abs(remainingBs).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={loading || remainingUsd > 0.01}
          className="w-full"
          size="lg"
        >
          {loading ? 'Procesando...' : 'Confirmar Cobro'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
