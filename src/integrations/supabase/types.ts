export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cash_closings: {
        Row: {
          bs_cash: number
          closed_by: string
          closing_date: string
          created_at: string
          exchange_rate: number
          id: string
          notes: string | null
          pago_movil: number
          punto: number
          total_sales_usd: number
          usd_cash: number
          zelle: number
        }
        Insert: {
          bs_cash?: number
          closed_by: string
          closing_date: string
          created_at?: string
          exchange_rate: number
          id?: string
          notes?: string | null
          pago_movil?: number
          punto?: number
          total_sales_usd: number
          usd_cash?: number
          zelle?: number
        }
        Update: {
          bs_cash?: number
          closed_by?: string
          closing_date?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          notes?: string | null
          pago_movil?: number
          punto?: number
          total_sales_usd?: number
          usd_cash?: number
          zelle?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          costo_promedio: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          stock_actual: number
          stock_minimo: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          costo_promedio?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          stock_actual?: number
          stock_minimo?: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          costo_promedio?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          stock_actual?: number
          stock_minimo?: number
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          unit_price_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          unit_price_usd: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal_usd: number
          table_number: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          order_type: Database["public"]["Enums"]["order_type"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_usd?: number
          table_number?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_usd?: number
          table_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_usd: number
          created_at: string
          currency: string
          exchange_rate: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          processed_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          amount_usd: number
          created_at?: string
          currency: string
          exchange_rate: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          processed_by: string
          reference?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number
          created_at?: string
          currency?: string
          exchange_rate?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          processed_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          name: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          name: string
          price_usd: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          name?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          purchase_id: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          purchase_id: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          purchase_id?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          notes: string | null
          registered_by: string
          supplier_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          registered_by: string
          supplier_id?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          registered_by?: string
          supplier_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "cashier" | "waiter" | "cook"
      order_status: "pending" | "preparing" | "ready" | "paid" | "cancelled"
      order_type: "table" | "delivery" | "pickup"
      payment_method: "usd_cash" | "bs_cash" | "zelle" | "pago_movil" | "punto"
      unit_type: "gr" | "kg" | "ml" | "lt" | "und"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "cashier", "waiter", "cook"],
      order_status: ["pending", "preparing", "ready", "paid", "cancelled"],
      order_type: ["table", "delivery", "pickup"],
      payment_method: ["usd_cash", "bs_cash", "zelle", "pago_movil", "punto"],
      unit_type: ["gr", "kg", "ml", "lt", "und"],
    },
  },
} as const
