import React from 'react';
import { useOrders } from '@/hooks/useOrders';
import { AppHeader } from '@/components/layout/AppHeader';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ChefHat, Loader2 } from 'lucide-react';

export const KitchenView: React.FC = () => {
  const { orders, loading, updateOrderStatus } = useOrders();

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 p-4">
        <Tabs defaultValue="pending" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pendientes ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="preparing" className="gap-2">
              <ChefHat className="w-4 h-4" />
              En Preparación ({preparingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateOrderStatus}
                  />
                ))}
                {pendingOrders.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No hay órdenes pendientes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preparing" className="mt-0">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateOrderStatus}
                  />
                ))}
                {preparingOrders.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No hay órdenes en preparación</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
