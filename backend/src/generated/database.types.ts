export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          slug: string;
          email: string;
          name: string;
          account_type: 'individual' | 'professional' | 'internal';
          primary_role: string;
          status: 'active' | 'suspended' | 'pending_verification' | 'banned' | 'archived' | 'deleted';
          avatar_url: string | null;
          phone: string | null;
          city: string | null;
          postal_code: string | null;
          department: string | null;
          region: string | null;
          country: string;
          bio: string | null;
          is_verified: boolean;
          is_identity_verified: boolean;
          is_phone_verified: boolean;
          is_email_verified: boolean;
          is_business_verified: boolean;
          rating: number;
          review_count: number;
          response_rate_percent: number;
          response_time_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          slug: string;
          email: string;
          name: string;
          account_type?: 'individual' | 'professional' | 'internal';
          primary_role?: string;
          status?: 'active' | 'suspended' | 'pending_verification' | 'banned' | 'archived' | 'deleted';
          avatar_url?: string | null;
          phone?: string | null;
          city?: string | null;
          postal_code?: string | null;
          department?: string | null;
          region?: string | null;
          country?: string;
          bio?: string | null;
          is_verified?: boolean;
          is_identity_verified?: boolean;
          is_phone_verified?: boolean;
          is_email_verified?: boolean;
          is_business_verified?: boolean;
          rating?: number;
          review_count?: number;
          response_rate_percent?: number;
          response_time_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          store_id: string | null;
          category_id: string;
          title: string;
          description: string;
          price: number;
          original_price: number | null;
          currency: string;
          status: 'draft' | 'published' | 'reserved' | 'sold' | 'archived' | 'rejected' | 'flagged';
          condition: string;
          brand: string | null;
          model: string | null;
          market_code: string;
          city: string;
          postal_code: string;
          department: string | null;
          region: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          allowed_delivery: string[];
          shipping_cost: number | null;
          package_weight_kg: number | null;
          is_urgent: boolean;
          is_featured: boolean;
          urgent_expires_at: string | null;
          featured_expires_at: string | null;
          bumped_at: string | null;
          view_count: number;
          favorite_count: number;
          safety_risk_score: number;
          attributes: Json;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          store_id?: string | null;
          category_id: string;
          title: string;
          description: string;
          price: number;
          original_price?: number | null;
          currency?: string;
          status?: 'draft' | 'published' | 'reserved' | 'sold' | 'archived' | 'rejected' | 'flagged';
          condition?: string;
          brand?: string | null;
          model?: string | null;
          market_code?: string;
          city: string;
          postal_code: string;
          department?: string | null;
          region?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          allowed_delivery?: string[];
          shipping_cost?: number | null;
          package_weight_kg?: number | null;
          is_urgent?: boolean;
          is_featured?: boolean;
          urgent_expires_at?: string | null;
          featured_expires_at?: string | null;
          bumped_at?: string | null;
          view_count?: number;
          favorite_count?: number;
          safety_risk_score?: number;
          attributes?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database['public']['Tables']['listings']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          transaction_type: 'DIRECT_PURCHASE' | 'RESERVATION';
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status: string;
          item_amount: number;
          protection_fee: number;
          shipping_fee: number;
          total_charged: number;
          escrow_secured_amount: number;
          deposit_amount: number | null;
          remaining_balance: number | null;
          delivery_method: string;
          shipping_address: Json | null;
          handover_pin: string | null;
          pin_attempts: number;
          is_pin_verified: boolean;
          delivery_confirmed_at: string | null;
          funds_released_at: string | null;
          payment_method: string;
          payment_intent_id: string | null;
          dispute_reason: string | null;
          dispute_details: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          transaction_type?: 'DIRECT_PURCHASE' | 'RESERVATION';
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status?: string;
          item_amount: number;
          protection_fee?: number;
          shipping_fee?: number;
          total_charged: number;
          escrow_secured_amount: number;
          deposit_amount?: number | null;
          remaining_balance?: number | null;
          delivery_method?: string;
          shipping_address?: Json | null;
          handover_pin?: string | null;
          pin_attempts?: number;
          is_pin_verified?: boolean;
          delivery_confirmed_at?: string | null;
          funds_released_at?: string | null;
          payment_method?: string;
          payment_intent_id?: string | null;
          dispute_reason?: string | null;
          dispute_details?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      markets: {
        Row: {
          code: string;
          name: string;
          currency: string;
          currency_symbol: string;
          locale: string;
          is_active: boolean;
          is_base_market: boolean;
          protection_fee_rate: number;
          protection_fixed_fee: number;
          free_listings_limit: number;
          allowed_delivery_methods: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name: string;
          currency?: string;
          currency_symbol?: string;
          locale?: string;
          is_active?: boolean;
          is_base_market?: boolean;
          protection_fee_rate?: number;
          protection_fixed_fee?: number;
          free_listings_limit?: number;
          allowed_delivery_methods?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['markets']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_label: string | null;
          parent_id: string | null;
          icon_name: string;
          sort_order: number;
          is_active: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          short_label?: string | null;
          parent_id?: string | null;
          icon_name?: string;
          sort_order?: number;
          is_active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          user_id: string | null;
          status: 'requested' | 'blocked' | 'completed';
          reason: string | null;
          blocked_reason: string | null;
          requested_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status: 'requested' | 'blocked' | 'completed';
          reason?: string | null;
          blocked_reason?: string | null;
          requested_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['account_deletion_requests']['Insert']>;
        Relationships: [];
      };
      blocked_users: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blocked_users']['Insert']>;
        Relationships: [];
      };
      push_device_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          app_version: string | null;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          app_version?: string | null;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_device_tokens']['Insert']>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          target_user_id: string;
          author_id: string;
          order_id: string | null;
          rating: number;
          comment: string;
          listing_title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_user_id: string;
          author_id: string;
          order_id?: string | null;
          rating: number;
          comment: string;
          listing_title?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_account_deletion: {
        Args: { p_user_id: string; p_reason?: string | null };
        Returns: Database['public']['Tables']['profiles']['Row'][];
      };
      release_order_escrow: {
        Args: { p_order_id: string; p_actor_id: string };
        Returns: Json;
      };
    };
    Enums: {
      platform_role: string;
      account_status: 'active' | 'suspended' | 'pending_verification' | 'banned' | 'archived' | 'deleted';
      listing_status: string;
      transaction_status: string;
      boost_type: string;
    };
  };
}
