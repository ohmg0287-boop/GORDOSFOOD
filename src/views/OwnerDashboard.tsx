import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { PaymentModal } from '@/components/checkout/PaymentModal';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { MenuManager } from '@/components/admin/MenuManager';
import { InventoryManager } from '@/components/admin/InventoryManager';
import { ExchangeRateSettings } from '@/components/admin/ExchangeRateSettings';
import { CashClosingReport } from '@/components/admin/CashClosingReport';
import { Order } from '@/types/database';
import { Loader2 } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
      case 'pos':
        return (
          <KanbanBoard
            orders={orders}
            onStatusChange={updateOrderStatus}
            onPay={handlePay}
            showPayButton
          />
        );
      case 'menu':
        return <MenuManager />;
      case 'inventory':
        return <InventoryManager />;
      case 'settings':
        return <ExchangeRateSettings />;
      case 'reports':
        return <CashClosingReport />;
      case 'kitchen':
        return (
          <KanbanBoard
            orders={orders.filter(o => o.status === 'pending' || o.status === 'preparing')}
            onStatusChange={updateOrderStatus}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Vista en desarrollo...
          </div>
        );
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard de Órdenes',
      kitchen: 'Cocina',
      pos: 'Punto de Venta',
      inventory: 'Gestión de Inventario',
      menu: 'Configuración de Menú',
      settings: 'Ajustes del Sistema',
      reports: 'Reportes y Cierre de Caja'
    };
    return titles[currentView] || 'Dónde Manolo';
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DesktopNav currentView={currentView} onNavigate={setCurrentView} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-semibold">{getTitle()}</h1>
        </header>
        
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
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
