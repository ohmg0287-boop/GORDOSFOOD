import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem } from '@/types/database';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CartSheetProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
  onCheckout: () => void;
}

export const CartSheet: React.FC<CartSheetProps> = ({
  items,
  onUpdateQuantity,
  onRemove,
  onUpdateNotes,
  getTotal,
  getItemCount,
  onCheckout
}) => {
  const { convertUsdToBs } = useExchangeRate();
  const total = getTotal();
  const totalBs = convertUsdToBs(total);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg" className="fixed bottom-4 right-4 h-14 px-6 rounded-full shadow-lg z-50">
          <ShoppingCart className="w-5 h-5 mr-2" />
          <span className="font-semibold">${total.toFixed(2)}</span>
          {getItemCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getItemCount()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Tu Pedido</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p>Tu carrito está vacío</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 bg-muted/50 rounded-xl p-3">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => onRemove(item.product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      ${(item.product.price_usd * item.quantity).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Notas (sin cebolla, etc.)"
                      value={item.notes || ''}
                      onChange={(e) => onUpdateNotes(item.product.id, e.target.value)}
                      className="mt-2 h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 pb-8 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <div className="text-right">
                  <p>${total.toFixed(2)}</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    Bs. {totalBs.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button onClick={onCheckout} className="w-full h-14 text-lg rounded-xl">
                Enviar Comanda
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
