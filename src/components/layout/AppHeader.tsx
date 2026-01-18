import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, Utensils } from 'lucide-react';
import { AppRole } from '@/types/database';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const roleLabels: Record<AppRole, string> = {
  owner: 'Dueño',
  cashier: 'Cajero',
  waiter: 'Mesero',
  cook: 'Cocinero'
};

const roleColors: Record<AppRole, string> = {
  owner: 'bg-purple-500',
  cashier: 'bg-blue-500',
  waiter: 'bg-green-500',
  cook: 'bg-orange-500'
};

interface AppHeaderProps {
  onOpenSettings?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenSettings }) => {
  const { signOut, userRole } = useAuth();
  const { getCurrentRate, exchangeRate } = useExchangeRate();

  return (
    <header className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Utensils className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Dónde Manolo</h1>
          <div className="flex items-center gap-2">
            {userRole && (
              <Badge className={`${roleColors[userRole]} text-white text-xs`}>
                {roleLabels[userRole]}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Tasa: {getCurrentRate().toFixed(2)} Bs/{exchangeRate.active.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onOpenSettings && (
          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
