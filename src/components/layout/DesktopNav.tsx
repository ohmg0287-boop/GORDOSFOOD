import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  ChefHat, 
  CreditCard, 
  Package, 
  UtensilsCrossed,
  Users,
  ShoppingCart,
  BarChart3,
  Settings
} from 'lucide-react';
import { AppRole } from '@/types/database';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['owner', 'cashier'] },
  { id: 'kitchen', label: 'Cocina', icon: <ChefHat className="w-5 h-5" />, roles: ['owner', 'cook'] },
  { id: 'pos', label: 'Caja', icon: <CreditCard className="w-5 h-5" />, roles: ['owner', 'cashier'] },
  { id: 'orders', label: 'Pedidos', icon: <UtensilsCrossed className="w-5 h-5" />, roles: ['owner', 'waiter'] },
  { id: 'inventory', label: 'Inventario', icon: <Package className="w-5 h-5" />, roles: ['owner'] },
  { id: 'purchases', label: 'Compras', icon: <ShoppingCart className="w-5 h-5" />, roles: ['owner'] },
  { id: 'menu', label: 'Menú', icon: <UtensilsCrossed className="w-5 h-5" />, roles: ['owner'] },
  { id: 'staff', label: 'Personal', icon: <Users className="w-5 h-5" />, roles: ['owner'] },
  { id: 'reports', label: 'Reportes', icon: <BarChart3 className="w-5 h-5" />, roles: ['owner', 'cashier'] },
  { id: 'settings', label: 'Ajustes', icon: <Settings className="w-5 h-5" />, roles: ['owner'] }
];

interface DesktopNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ currentView, onNavigate }) => {
  const { hasAccess } = useAuth();

  const visibleItems = navItems.filter(item => hasAccess(item.roles));

  return (
    <nav className="w-64 bg-sidebar border-r flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">Dónde Manolo</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema POS</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 space-y-1">
        {visibleItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'secondary' : 'ghost'}
            className={`w-full justify-start gap-3 ${
              currentView === item.id 
                ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    </nav>
  );
};
