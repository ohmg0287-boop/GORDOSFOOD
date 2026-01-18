-- ============================================
-- SISTEMA DE ROLES
-- ============================================

-- Enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('owner', 'cashier', 'waiter', 'cook');

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER para verificar roles (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- PERFILES DE USUARIO
-- ============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CATEGORÍAS DE MENÚ
-- ============================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- INGREDIENTES (INVENTARIO BASE)
-- ============================================

CREATE TYPE public.unit_type AS ENUM ('gr', 'kg', 'ml', 'lt', 'und');

CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit unit_type NOT NULL,
    stock_actual DECIMAL(10,3) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,3) NOT NULL DEFAULT 0,
    costo_promedio DECIMAL(10,4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ingredients"
ON public.ingredients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage ingredients"
ON public.ingredients FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- PRODUCTOS DEL MENÚ
-- ============================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_usd DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- RECETAS (VINCULA PRODUCTOS CON INGREDIENTES)
-- ============================================

CREATE TABLE public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, ingredient_id)
);

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipes"
ON public.product_recipes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage recipes"
ON public.product_recipes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- PROVEEDORES
-- ============================================

CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- COMPRAS DE INVENTARIO
-- ============================================

CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_number TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    registered_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view purchases"
ON public.purchases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can manage purchases"
ON public.purchases FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Detalle de compras
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view purchase items"
ON public.purchase_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can manage purchase items"
ON public.purchase_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- ============================================
-- CONFIGURACIÓN GLOBAL (TASA DE CAMBIO)
-- ============================================

CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage settings"
ON public.settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Insertar tasa de cambio inicial
INSERT INTO public.settings (key, value) VALUES 
('exchange_rate', '{"bcv": 60.00, "parallel": 62.00, "active": "bcv"}'::jsonb);

-- ============================================
-- ÓRDENES
-- ============================================

CREATE TYPE public.order_type AS ENUM ('table', 'delivery', 'pickup');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'paid', 'cancelled');

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    order_type order_type NOT NULL,
    table_number INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    status order_status NOT NULL DEFAULT 'pending',
    subtotal_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Waiters can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'waiter') OR 
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Staff can update orders based on role"
ON public.orders FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'waiter') OR 
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'cook') OR
    public.has_role(auth.uid(), 'owner')
);

-- Ítems de la orden
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_usd DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'waiter') OR 
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

-- ============================================
-- PAGOS (MULTI-MÉTODO)
-- ============================================

CREATE TYPE public.payment_method AS ENUM ('usd_cash', 'bs_cash', 'zelle', 'pago_movil', 'punto');

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    method payment_method NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL, -- 'USD' or 'VES'
    exchange_rate DECIMAL(10,4) NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL, -- Equivalente en USD
    reference TEXT, -- Para Pago Móvil, Zelle, etc.
    processed_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cashiers and owners can view payments"
ON public.payments FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Cashiers and owners can manage payments"
ON public.payments FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

-- ============================================
-- CIERRES DE CAJA
-- ============================================

CREATE TABLE public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_date DATE NOT NULL,
    total_sales_usd DECIMAL(10,2) NOT NULL,
    usd_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    bs_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    zelle DECIMAL(10,2) NOT NULL DEFAULT 0,
    pago_movil DECIMAL(10,2) NOT NULL DEFAULT 0,
    punto DECIMAL(10,2) NOT NULL DEFAULT 0,
    exchange_rate DECIMAL(10,4) NOT NULL,
    notes TEXT,
    closed_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cashiers and owners can view closings"
ON public.cash_closings FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Cashiers and owners can create closings"
ON public.cash_closings FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'cashier') OR 
    public.has_role(auth.uid(), 'owner')
);

-- ============================================
-- TRIGGERS PARA TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TRIGGER PARA DESCONTAR STOCK AL CONFIRMAR ORDEN
-- ============================================

CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE public.ingredients ing
        SET stock_actual = stock_actual - (
            SELECT COALESCE(SUM(oi.quantity * pr.quantity), 0)
            FROM public.order_items oi
            JOIN public.product_recipes pr ON pr.product_id = oi.product_id
            WHERE oi.order_id = NEW.id
            AND pr.ingredient_id = ing.id
        )
        WHERE ing.id IN (
            SELECT DISTINCT pr.ingredient_id
            FROM public.order_items oi
            JOIN public.product_recipes pr ON pr.product_id = oi.product_id
            WHERE oi.order_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER deduct_stock_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order_paid();

-- ============================================
-- TRIGGER PARA AUMENTAR STOCK EN COMPRAS
-- ============================================

CREATE OR REPLACE FUNCTION public.add_stock_on_purchase_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ingredients
    SET stock_actual = stock_actual + NEW.quantity,
        costo_promedio = (
            (costo_promedio * stock_actual + NEW.unit_cost * NEW.quantity) / 
            NULLIF(stock_actual + NEW.quantity, 0)
        )
    WHERE id = NEW.ingredient_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER add_stock_trigger
AFTER INSERT ON public.purchase_items
FOR EACH ROW
EXECUTE FUNCTION public.add_stock_on_purchase_item();

-- ============================================
-- FUNCIÓN PARA CREAR PERFIL AL REGISTRARSE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Habilitar realtime para órdenes
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;