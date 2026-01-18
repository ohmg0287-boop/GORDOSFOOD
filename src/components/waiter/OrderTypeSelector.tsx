import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, Truck, ShoppingBag } from 'lucide-react';
import { OrderType } from '@/types/database';

interface OrderTypeData {
  type: OrderType;
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

interface OrderTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: OrderTypeData) => void;
}

export const OrderTypeSelector: React.FC<OrderTypeSelectorProps> = ({
  open,
  onClose,
  onConfirm
}) => {
  const [orderType, setOrderType] = useState<OrderType>('table');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const handleConfirm = () => {
    const data: OrderTypeData = { type: orderType };

    if (orderType === 'table') {
      data.tableNumber = parseInt(tableNumber) || undefined;
    } else {
      data.customerName = customerName || undefined;
      data.customerPhone = customerPhone || undefined;
      if (orderType === 'delivery') {
        data.customerAddress = customerAddress || undefined;
      }
    }

    onConfirm(data);
    // Reset form
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo de Orden</DialogTitle>
        </DialogHeader>

        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="table" className="flex flex-col gap-1 py-3">
              <UtensilsCrossed className="w-5 h-5" />
              <span className="text-xs">Mesa</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex flex-col gap-1 py-3">
              <Truck className="w-5 h-5" />
              <span className="text-xs">Delivery</span>
            </TabsTrigger>
            <TabsTrigger value="pickup" className="flex flex-col gap-1 py-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs">Pickup</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Número de Mesa</Label>
              <Input
                id="tableNumber"
                type="number"
                placeholder="1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                min="1"
              />
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre del Cliente</Label>
              <Input
                id="customerName"
                placeholder="Juan Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Teléfono</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="0414-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Dirección</Label>
              <Input
                id="customerAddress"
                placeholder="Calle 123, Edificio ABC"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="pickup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pickupName">Nombre del Cliente</Label>
              <Input
                id="pickupName"
                placeholder="Juan Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupPhone">Teléfono</Label>
              <Input
                id="pickupPhone"
                type="tel"
                placeholder="0414-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handleConfirm} className="w-full mt-4">
          Confirmar y Enviar
        </Button>
      </DialogContent>
    </Dialog>
  );
};
