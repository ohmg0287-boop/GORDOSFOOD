import React from 'react';
import { Order, OrderStatus } from '@/types/database';
import { OrderCard } from './OrderCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, ChefHat, CheckCircle, CreditCard } from 'lucide-react';

interface KanbanBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onPay?: (order: Order) => void;
  showPayButton?: boolean;
}

const columns: { status: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'pending', label: 'Pendiente', icon: <Clock className="w-5 h-5" />, color: 'border-t-yellow-500' },
  { status: 'preparing', label: 'En Preparación', icon: <ChefHat className="w-5 h-5" />, color: 'border-t-blue-500' },
  { status: 'ready', label: 'Listo', icon: <CheckCircle className="w-5 h-5" />, color: 'border-t-green-500' },
  { status: 'paid', label: 'Pagado', icon: <CreditCard className="w-5 h-5" />, color: 'border-t-emerald-600' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  onStatusChange,
  onPay,
  showPayButton = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {columns.map((column) => {
        const columnOrders = orders.filter((o) => o.status === column.status);
        
        return (
          <div
            key={column.status}
            className={`bg-muted/30 rounded-xl border-t-4 ${column.color} flex flex-col`}
          >
            <div className="p-4 flex items-center gap-2 border-b">
              {column.icon}
              <h3 className="font-semibold">{column.label}</h3>
              <span className="ml-auto bg-muted rounded-full px-2 py-0.5 text-sm font-medium">
                {columnOrders.length}
              </span>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={onStatusChange}
                    showPayButton={showPayButton && column.status === 'ready'}
                    onPay={onPay}
                  />
                ))}
                {columnOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Sin órdenes
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
