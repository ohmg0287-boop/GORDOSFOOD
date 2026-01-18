import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/database';

interface RegisterFormProps {
  onToggleMode: () => void;
}

const roleLabels: Record<AppRole, string> = {
  owner: 'Dueño / Encargado',
  cashier: 'Cajero',
  waiter: 'Mesero',
  cook: 'Cocinero'
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('waiter');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, fullName, role);

    if (error) {
      toast.error('Error al registrarse', {
        description: error.message
      });
    } else {
      toast.success('¡Cuenta creada exitosamente!', {
        description: 'Ya puedes iniciar sesión'
      });
      onToggleMode();
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
          <Utensils className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Dónde Manolo</CardTitle>
          <CardDescription>Crea tu cuenta</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Crear cuenta'
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
