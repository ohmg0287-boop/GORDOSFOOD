import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { PaymentModal } from '@/components/checkout/PaymentModal';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { Order } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface CashierViewProps {
  isMobile?: boolean;
}

export const CashierView: React.FC<CashierViewProps> = ({ isMobile = false }) => {
  const { orders, loading, updateOrderStatus, refetch } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const handlePay = (order: Order) => {
    setSelectedOrder(order);
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    setSelectedOrder(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 p-4 overflow-auto">
          <KanbanBoard
            orders={orders}
            onStatusChange={updateOrderStatus}
            onPay={handlePay}
            showPayButton
          />
        </main>
        <PaymentModal
          order={selectedOrder}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DesktopNav currentView={currentView} onNavigate={setCurrentView} />
      
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard de Órdenes</h1>
        </header>
        
        <main className="flex-1 p-6 overflow-auto">
          <KanbanBoard
            orders={orders}
            onStatusChange={updateOrderStatus}
            onPay={handlePay}
            showPayButton
          />
        </main>
      </div>

      <PaymentModal
        order={selectedOrder}
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
};
