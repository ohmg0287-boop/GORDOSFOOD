import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order, OrderStatus } from '@/types/database';
import { UtensilsCrossed, Truck, ShoppingBag, Clock, ChefHat, CheckCircle, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  showPayButton?: boolean;
  onPay?: (order: Order) => void;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; class: string }> = {
  pending: { label: 'Pendiente', icon: <Clock className="w-4 h-4" />, class: 'order-status-pending' },
  preparing: { label: 'En Preparación', icon: <ChefHat className="w-4 h-4" />, class: 'order-status-preparing' },
  ready: { label: 'Listo', icon: <CheckCircle className="w-4 h-4" />, class: 'order-status-ready' },
  paid: { label: 'Pagado', icon: <CreditCard className="w-4 h-4" />, class: 'order-status-paid' },
  cancelled: { label: 'Cancelado', icon: null, class: 'bg-muted' }
};

const orderTypeIcons: Record<string, React.ReactNode> = {
  table: <UtensilsCrossed className="w-4 h-4" />,
  delivery: <Truck className="w-4 h-4" />,
  pickup: <ShoppingBag className="w-4 h-4" />
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  showPayButton = false,
  onPay
}) => {
  const config = statusConfig[order.status];
  const timeAgo = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: es
  });

  const getNextStatus = (): OrderStatus | null => {
    switch (order.status) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {orderTypeIcons[order.order_type]}
            <span className="font-bold">
              {order.order_type === 'table' ? `Mesa ${order.table_number}` : 
               order.customer_name || `Orden #${order.order_number}`}
            </span>
          </div>
          <Badge className={config.class}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                <span className="font-medium">{item.quantity}x</span> {item.product?.name}
              </span>
              <span className="text-muted-foreground">
                ${(item.unit_price_usd * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        {order.notes && (
          <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
            📝 {order.notes}
          </p>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-bold">${order.subtotal_usd.toFixed(2)}</span>
          <div className="flex gap-2">
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, nextStatus)}
              >
                {nextStatus === 'preparing' ? 'Preparar' : 'Marcar Listo'}
              </Button>
            )}
            {showPayButton && order.status === 'ready' && onPay && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onPay(order)}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Cobrar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
