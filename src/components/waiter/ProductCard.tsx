import React, { useState, useEffect } from 'react';
import { Product } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const { checkAvailability } = useProducts();
  const { convertUsdToBs } = useExchangeRate();

  useEffect(() => {
    checkAvailability(product.id, 1).then(setIsAvailable);
  }, [product.id, checkAvailability]);

  const priceBs = convertUsdToBs(product.price_usd);

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${!isAvailable ? 'opacity-60' : 'hover:shadow-lg active:scale-[0.98]'}`}>
      <div className="aspect-[4/3] relative bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Sin stock</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-lg font-bold text-primary">${product.price_usd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bs. {priceBs.toFixed(2)}</p>
          </div>
          <Button
            size="icon"
            disabled={!isAvailable}
            onClick={() => onAdd(product)}
            className="h-10 w-10 rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
