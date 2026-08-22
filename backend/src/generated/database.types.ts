export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GeneratedTable<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type CommercialConfigurationStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'active'
  | 'disabled'
  | 'archived';

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
          vertical_type: 'tutoring' | null;
          vertical_entity_id: string | null;
          vertical_schema_version: number | null;
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
          vertical_type?: 'tutoring' | null;
          vertical_entity_id?: string | null;
          vertical_schema_version?: number | null;
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
      course_market_configs: {
        Row: {
          market_code: string;
          schema_version: number;
          is_enabled: boolean;
          booking_enabled: boolean;
          payments_enabled: boolean;
          config_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          market_code: string;
          schema_version?: number;
          is_enabled?: boolean;
          booking_enabled?: boolean;
          payments_enabled?: boolean;
          config_payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['course_market_configs']['Insert']>;
        Relationships: [];
      };
      course_subject_levels: {
        Row: { id: string; market_code: string; label: string; sort_order: number; is_active: boolean; public_payload: Json; created_at: string; updated_at: string };
        Insert: { id: string; market_code: string; label: string; sort_order?: number; is_active?: boolean; public_payload: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_subject_levels']['Insert']>;
        Relationships: [];
      };
      course_subjects: {
        Row: { id: string; market_code: string; slug: string; parent_id: string | null; label: string; description: string | null; icon_name: string | null; sort_order: number; is_active: boolean; required_fields: Json; public_payload: Json; created_at: string; updated_at: string };
        Insert: { id: string; market_code: string; slug: string; parent_id?: string | null; label: string; description?: string | null; icon_name?: string | null; sort_order?: number; is_active?: boolean; required_fields?: Json; public_payload: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_subjects']['Insert']>;
        Relationships: [];
      };
      course_plans: {
        Row: { id: string; market_code: string; name: string; audience: 'individual' | 'organization'; monthly_price_minor: number | null; annual_price_minor: number | null; currency: string; tax_rate_bps: number; entitlements: Json; is_active: boolean; is_recommended: boolean; sort_order: number; public_payload: Json; created_at: string; updated_at: string };
        Insert: { id: string; market_code: string; name: string; audience: 'individual' | 'organization'; monthly_price_minor?: number | null; annual_price_minor?: number | null; currency: string; tax_rate_bps?: number; entitlements: Json; is_active?: boolean; is_recommended?: boolean; sort_order?: number; public_payload: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_plans']['Insert']>;
        Relationships: [];
      };
      course_tutor_profiles: {
        Row: { id: string; user_id: string; organization_id: string | null; market_code: string; schema_version: number; slug: string; profile_type: 'individual' | 'organization_member'; headline: string; biography: string; teaching_approach: string; experience_years: number; moderation_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended'; profile_completion_percent: number; plan_id: string; response_time_minutes: number | null; response_rate_percent: number | null; rating: number | null; review_count: number; rating_is_statistically_meaningful: boolean; is_featured: boolean; public_payload: Json; private_payload: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; organization_id?: string | null; market_code: string; schema_version?: number; slug: string; profile_type: 'individual' | 'organization_member'; headline: string; biography: string; teaching_approach: string; experience_years?: number; moderation_status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended'; profile_completion_percent?: number; plan_id: string; response_time_minutes?: number | null; response_rate_percent?: number | null; rating?: number | null; review_count?: number; rating_is_statistically_meaningful?: boolean; is_featured?: boolean; public_payload: Json; private_payload: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_tutor_profiles']['Insert']>;
        Relationships: [];
      };
      course_offers: {
        Row: { id: string; listing_id: string | null; tutor_profile_id: string; organization_id: string | null; schema_version: number; slug: string; title: string; description: string; subject_id: string; market_code: string; status: 'draft' | 'pending_review' | 'published' | 'paused' | 'suspended' | 'archived'; capacity_status: 'available' | 'limited' | 'full'; trial_lesson_available: boolean; from_price_minor: number; currency: string; public_payload: Json; private_payload: Json; published_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; listing_id?: string | null; tutor_profile_id: string; organization_id?: string | null; schema_version?: number; slug: string; title: string; description: string; subject_id: string; market_code: string; status?: 'draft' | 'pending_review' | 'published' | 'paused' | 'suspended' | 'archived'; capacity_status?: 'available' | 'limited' | 'full'; trial_lesson_available?: boolean; from_price_minor: number; currency: string; public_payload: Json; private_payload: Json; published_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_offers']['Insert']>;
        Relationships: [];
      };
      course_learner_requests: {
        Row: { id: string; requester_user_id: string | null; market_code: string; subject_id: string; level_id: string; objective: string; delivery_modes: string[]; preferred_schedule: string[]; city: string | null; radius_km: number | null; budget_min_minor: number | null; budget_max_minor: number | null; currency: string | null; desired_start_date: string; learner_age_band: 'under_13' | '13_15' | '16_17' | 'adult'; guardian_user_id: string | null; guardian_consent_confirmed_at: string | null; status: 'draft' | 'submitted' | 'matched' | 'closed' | 'expired'; private_payload: Json; expires_at: string; created_at: string; updated_at: string };
        Insert: { id?: string; requester_user_id?: string | null; market_code: string; subject_id: string; level_id: string; objective: string; delivery_modes: string[]; preferred_schedule: string[]; city?: string | null; radius_km?: number | null; budget_min_minor?: number | null; budget_max_minor?: number | null; currency?: string | null; desired_start_date: string; learner_age_band: 'under_13' | '13_15' | '16_17' | 'adult'; guardian_user_id?: string | null; guardian_consent_confirmed_at?: string | null; status?: 'draft' | 'submitted' | 'matched' | 'closed' | 'expired'; private_payload: Json; expires_at: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_learner_requests']['Insert']>;
        Relationships: [];
      };
      course_leads: {
        Row: { id: string; learner_request_id: string; tutor_profile_id: string; organization_id: string | null; state: 'offered' | 'viewed' | 'accepted' | 'declined' | 'contact_released' | 'converted' | 'expired' | 'invalid_disputed' | 'invalid_confirmed'; relevance_score: number; relevance_reasons: string[]; contact_release_status: 'withheld' | 'released' | 'revoked'; credit_cost: number; decline_reason: string | null; credit_restored_at: string | null; private_payload: Json; expires_at: string; responded_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; learner_request_id: string; tutor_profile_id: string; organization_id?: string | null; state?: 'offered' | 'viewed' | 'accepted' | 'declined' | 'contact_released' | 'converted' | 'expired' | 'invalid_disputed' | 'invalid_confirmed'; relevance_score: number; relevance_reasons?: string[]; contact_release_status?: 'withheld' | 'released' | 'revoked'; credit_cost?: number; decline_reason?: string | null; credit_restored_at?: string | null; private_payload: Json; expires_at: string; responded_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_leads']['Insert']>;
        Relationships: [];
      };
      course_bookings: {
        Row: { id: string; market_code: string; learner_user_id: string; tutor_profile_id: string; course_offer_id: string; starts_at: string; ends_at: string; timezone: string; delivery_mode: 'online' | 'in_person' | 'hybrid'; status: string; payment_status: string; price_minor: number; currency: string; platform_commission_minor: number; provider_payment_reference: string | null; payout_status: string; provider_payout_reference: string | null; cancellation_policy_version: string; private_payload: Json; created_at: string; updated_at: string };
        Insert: { id?: string; market_code: string; learner_user_id: string; tutor_profile_id: string; course_offer_id: string; starts_at: string; ends_at: string; timezone: string; delivery_mode: 'online' | 'in_person' | 'hybrid'; status?: string; payment_status?: string; price_minor: number; currency: string; platform_commission_minor?: number; provider_payment_reference?: string | null; payout_status?: string; provider_payout_reference?: string | null; cancellation_policy_version: string; private_payload: Json; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['course_bookings']['Insert']>;
        Relationships: [];
      };
      user_identities: {
        Row: { id: string; user_id: string; provider: Database['public']['Enums']['auth_provider']; provider_subject: string; provider_email: string | null; provider_email_verified: boolean; provider_display_name: string | null; is_private_relay: boolean; linked_at: string; last_authenticated_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; provider: Database['public']['Enums']['auth_provider']; provider_subject: string; provider_email?: string | null; provider_email_verified?: boolean; provider_display_name?: string | null; is_private_relay?: boolean; linked_at?: string; last_authenticated_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['user_identities']['Insert']>;
        Relationships: [];
      };
      auth_sessions: {
        Row: { id: string; user_id: string; refresh_token_hash: string; family_id: string; rotated_from: string | null; provider: Database['public']['Enums']['auth_provider']; device_label: string | null; ip_prefix: string | null; issued_at: string; last_reauthenticated_at: string | null; last_used_at: string | null; expires_at: string; revoked_at: string | null; revoked_reason: string | null };
        Insert: { id?: string; user_id: string; refresh_token_hash: string; family_id: string; rotated_from?: string | null; provider?: Database['public']['Enums']['auth_provider']; device_label?: string | null; ip_prefix?: string | null; issued_at?: string; last_reauthenticated_at?: string | null; last_used_at?: string | null; expires_at: string; revoked_at?: string | null; revoked_reason?: string | null };
        Update: Partial<Database['public']['Tables']['auth_sessions']['Insert']>;
        Relationships: [];
      };
      oauth_authorization_flows: {
        Row: { id: string; state_hash: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; intent: 'sign_in' | 'link'; user_id: string | null; session_id: string | null; return_to: string; client_kind: 'web' | 'native'; requested_account_type: 'individual' | 'professional' | null; nonce_hash: string; code_verifier: string; created_at: string; expires_at: string; consumed_at: string | null };
        Insert: { id?: string; state_hash: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; intent: 'sign_in' | 'link'; user_id?: string | null; session_id?: string | null; return_to?: string; client_kind?: 'web' | 'native'; requested_account_type?: 'individual' | 'professional' | null; nonce_hash: string; code_verifier: string; created_at?: string; expires_at: string; consumed_at?: string | null };
        Update: Partial<Database['public']['Tables']['oauth_authorization_flows']['Insert']>;
        Relationships: [];
      };
      oauth_native_exchanges: {
        Row: { id: string; code_hash: string; user_id: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; return_to: string; created_at: string; expires_at: string; consumed_at: string | null };
        Insert: { id?: string; code_hash: string; user_id: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; return_to?: string; created_at?: string; expires_at: string; consumed_at?: string | null };
        Update: Partial<Database['public']['Tables']['oauth_native_exchanges']['Insert']>;
        Relationships: [];
      };
      oauth_pending_registrations: {
        Row: { id: string; handle_hash: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; provider_subject: string; provider_email: string | null; provider_email_verified: boolean; provider_display_name: string | null; provider_avatar_url: string | null; requested_account_type: 'individual' | 'professional' | null; client_kind: 'web' | 'native'; return_to: string; created_at: string; expires_at: string; consumed_at: string | null };
        Insert: { id?: string; handle_hash: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; provider_subject: string; provider_email?: string | null; provider_email_verified?: boolean; provider_display_name?: string | null; provider_avatar_url?: string | null; requested_account_type?: 'individual' | 'professional' | null; client_kind: 'web' | 'native'; return_to: string; created_at?: string; expires_at: string; consumed_at?: string | null };
        Update: Partial<Database['public']['Tables']['oauth_pending_registrations']['Insert']>;
        Relationships: [];
      };
      oauth_provider_deletion_requests: {
        Row: { id: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; provider_subject: string; user_id: string | null; confirmation_code_hash: string; status: 'queued' | 'completed' | 'rejected'; requested_at: string; completed_at: string | null };
        Insert: { id?: string; provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; provider_subject: string; user_id?: string | null; confirmation_code_hash: string; status?: 'queued' | 'completed' | 'rejected'; requested_at?: string; completed_at?: string | null };
        Update: Partial<Database['public']['Tables']['oauth_provider_deletion_requests']['Insert']>;
        Relationships: [];
      };
      auth_rate_limits: {
        Row: { key_hash: string; action: string; attempts: number; window_started_at: string; reset_at: string; locked_until: string | null };
        Insert: { key_hash: string; action: string; attempts?: number; window_started_at?: string; reset_at: string; locked_until?: string | null };
        Update: Partial<Database['public']['Tables']['auth_rate_limits']['Insert']>;
        Relationships: [];
      };
      auth_action_tokens: {
        Row: { id: string; user_id: string; purpose: 'verify_email' | 'password_reset' | 'account_recovery'; token_hash: string; created_at: string; expires_at: string; consumed_at: string | null };
        Insert: { id?: string; user_id: string; purpose: 'verify_email' | 'password_reset' | 'account_recovery'; token_hash: string; created_at?: string; expires_at: string; consumed_at?: string | null };
        Update: Partial<Database['public']['Tables']['auth_action_tokens']['Insert']>;
        Relationships: [];
      };
      auth_audit_events: {
        Row: { id: string; user_id: string | null; event_type: string; provider: Database['public']['Enums']['auth_provider'] | null; failure_reason: string | null; ip_prefix: string | null; user_agent_family: string | null; metadata: Json; created_at: string };
        Insert: { id?: string; user_id?: string | null; event_type: string; provider?: Database['public']['Enums']['auth_provider'] | null; failure_reason?: string | null; ip_prefix?: string | null; user_agent_family?: string | null; metadata?: Json; created_at?: string };
        Update: Partial<Database['public']['Tables']['auth_audit_events']['Insert']>;
        Relationships: [];
      };
      commercial_rule_sets: GeneratedTable<{
        id: string; name: string; description: string; domain: string; created_at: string; updated_at: string;
      }>;
      commercial_configuration_versions: GeneratedTable<{
        id: string; rule_set_id: string; version_number: number; market_code: string;
        status: CommercialConfigurationStatus; change_reason: string; effective_from: string | null;
        effective_until: string | null; created_by: string | null; approved_by: string | null;
        published_at: string | null; conflicts: Json; snapshot: Json; snapshot_hash: string;
        created_at: string; updated_at: string;
      }>;
      commercial_rules: GeneratedTable<{
        id: string; version_id: string; rule_key: string; name: string; description: string;
        priority: number; is_mandatory: boolean; scope: Json; conditions: Json; outcome: Json;
        status: CommercialConfigurationStatus; effective_from: string | null; effective_until: string | null;
        created_at: string; updated_at: string;
      }>;
      monetization_products: GeneratedTable<{
        id: string; code: string;
        kind: 'standard_listing' | 'additional_listing' | 'premium_option' | 'subscription' | 'pack' | 'credit_pack' | 'service_fee' | 'commission' | 'verification_service' | 'sponsored_placement';
        created_at: string;
      }>;
      monetization_product_versions: GeneratedTable<{
        id: string; product_id: string; configuration_version_id: string; name: string; description: string;
        audience: 'guest' | 'individual' | 'professional' | 'organization' | 'all'; scope: Json;
        compatibility: Json; status: CommercialConfigurationStatus; is_recommended: boolean;
        source_consumers: string[]; effective_from: string | null; effective_until: string | null;
        created_at: string; updated_at: string;
      }>;
      monetization_prices: GeneratedTable<{
        id: string; product_version_id: string; amount_minor: number; currency: string;
        billing_period: 'once' | 'month' | 'year'; tax_rate_bps: number; price_includes_tax: boolean;
        duration_days: number | null; trial_days: number | null; effective_from: string | null;
        effective_until: string | null; created_at: string;
      }>;
      monetization_product_entitlements: GeneratedTable<{
        product_version_id: string; entitlement_key: string; label: string; entitlement_value: Json;
        unit: string | null; created_at: string;
      }>;
      monetization_promotions: GeneratedTable<{
        id: string; configuration_version_id: string; code: string; name: string;
        status: CommercialConfigurationStatus; scope: Json; discount_type: 'fixed' | 'percentage';
        discount_value: number; stacking_policy: 'exclusive' | 'best_only' | 'stackable';
        maximum_redemptions: number | null; maximum_redemptions_per_account: number;
        starts_at: string; ends_at: string; created_at: string; updated_at: string;
      }>;
      monetization_promotion_products: GeneratedTable<{
        promotion_id: string; product_id: string;
      }>;
      monetization_quotes: GeneratedTable<{
        id: string; account_id: string; configuration_version_id: string; market_code: string; currency: string;
        subtotal_minor: number; discount_minor: number; tax_minor: number; total_minor: number;
        promotion_code: string | null; snapshot_hash: string; quote_snapshot: Json; reason_code: string;
        status: 'active' | 'consumed' | 'expired' | 'cancelled'; idempotency_key: string;
        expires_at: string; created_at: string;
      }>;
      monetization_quote_items: GeneratedTable<{
        quote_id: string; line_number: number; product_id: string; product_version_id: string; price_id: string;
        billing_period: 'once' | 'month' | 'year'; label: string;
        quantity: number; unit_amount_minor: number; subtotal_minor: number; discount_minor: number;
        tax_minor: number; total_minor: number; tax_rate_bps: number; entitlement_snapshot: Json;
      }>;
      monetization_orders: GeneratedTable<{
        id: string; quote_id: string; account_id: string; snapshot_hash: string; currency: string; total_minor: number;
        status: 'created' | 'pending' | 'requires_action' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';
        provider: 'demo' | 'stripe'; provider_checkout_id: string | null; provider_payment_id: string | null;
        invoice_id: string | null; idempotency_key: string; order_snapshot: Json; paid_at: string | null;
        created_at: string; updated_at: string;
      }>;
      monetization_payment_events: GeneratedTable<{
        provider: string; provider_event_id: string; event_type: string; payload_hash: string;
        order_id: string | null; status: 'received' | 'processing' | 'processed' | 'ignored' | 'failed';
        failure_reason: string | null; attempt_count: number; processed_at: string | null;
        created_at: string; updated_at: string;
      }>;
      monetization_entitlements: GeneratedTable<{
        id: string; account_id: string; product_id: string; entitlement_key: string; entitlement_value: Json;
        source_order_id: string | null; starts_at: string; ends_at: string | null;
        status: 'scheduled' | 'active' | 'consumed' | 'expired' | 'revoked'; consumed_at: string | null;
        created_at: string; updated_at: string;
      }>;
      monetization_usage_counters: GeneratedTable<{
        account_id: string; rule_key: string; market_code: string; period_start: string; period_end: string;
        used_count: number; updated_at: string;
      }>;
      monetization_subscriptions: GeneratedTable<{
        id: string; account_id: string; product_id: string; source_order_id: string;
        status: 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
        provider_subscription_id: string | null; current_period_start: string; current_period_end: string;
        cancel_at_period_end: boolean; created_at: string; updated_at: string;
      }>;
      monetization_promotion_redemptions: GeneratedTable<{
        promotion_id: string; account_id: string; order_id: string; redeemed_at: string;
      }>;
      commercial_configuration_approvals: GeneratedTable<{
        id: string; configuration_version_id: string; actor_id: string; decision: 'approved' | 'rejected';
        reason: string; created_at: string;
      }>;
      commercial_configuration_audit: GeneratedTable<{
        id: string; actor_id: string | null; actor_name: string; action: string; entity_type: string;
        entity_id: string; reason: string; before_snapshot: Json | null; after_snapshot: Json | null;
        approval_actor_id: string | null; request_id: string; ip_prefix: string | null; created_at: string;
      }>;
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
      consume_oauth_authorization_flow: { Args: { p_state_hash: string }; Returns: Database['public']['Tables']['oauth_authorization_flows']['Row'][] };
      consume_oauth_native_exchange: { Args: { p_code_hash: string }; Returns: Database['public']['Tables']['oauth_native_exchanges']['Row'][] };
      consume_oauth_pending_registration: { Args: { p_handle_hash: string }; Returns: Database['public']['Tables']['oauth_pending_registrations']['Row'][] };
      consume_auth_action_token: { Args: { p_token_hash: string; p_purpose: string }; Returns: Database['public']['Tables']['auth_action_tokens']['Row'][] };
      consume_auth_rate_limit: { Args: { p_key_hash: string; p_action: string; p_limit: number; p_window_seconds: number; p_lock_seconds: number }; Returns: { allowed: boolean; retry_after_seconds: number }[] };
      provision_oauth_profile: { Args: { p_user_id: string; p_slug: string; p_email: string; p_name: string; p_status: Database['public']['Enums']['account_status']; p_avatar_url: string | null; p_email_verified: boolean; p_provider: Exclude<Database['public']['Enums']['auth_provider'], 'password'>; p_provider_subject: string; p_provider_email: string | null; p_provider_email_verified: boolean; p_provider_display_name: string | null; p_is_private_relay: boolean }; Returns: string };
      consume_monetization_quota: { Args: { p_account_id: string; p_rule_key: string; p_market_code: string; p_period_start: string; p_period_end: string; p_limit: number; p_observed_min?: number; p_amount?: number }; Returns: number };
      claim_monetization_payment_event: { Args: { p_provider: string; p_provider_event_id: string; p_event_type: string; p_payload_hash: string; p_order_id?: string | null }; Returns: boolean };
      process_monetization_stripe_event: { Args: { p_provider_event_id: string; p_event_type: string; p_payload_hash: string; p_checkout_id: string; p_payment_id?: string | null; p_invoice_id?: string | null; p_snapshot_hash?: string | null; p_subscription_id?: string | null }; Returns: boolean };
      process_monetization_stripe_subscription_event: { Args: { p_provider_event_id: string; p_event_type: string; p_payload_hash: string; p_subscription_id: string; p_provider_status?: string | null; p_period_start?: string | null; p_period_end?: string | null; p_cancel_at_period_end?: boolean | null }; Returns: boolean };
      publish_commercial_configuration: { Args: { p_version_id: string; p_actor_id: string; p_reason: string }; Returns: undefined };
      activate_due_commercial_configurations: { Args: Record<string, never>; Returns: number };
      import_commercial_catalog: { Args: { p_catalog: Json; p_snapshot_hash: string; p_reason?: string }; Returns: undefined };
      save_commercial_configuration_version: { Args: { p_version: Json; p_catalog: Json; p_snapshot_hash: string }; Returns: undefined };
      save_monetization_quote: { Args: { p_quote: Json; p_idempotency_key: string }; Returns: Json };
    };
    Enums: {
      platform_role: string;
      account_status: 'active' | 'suspended' | 'pending_verification' | 'banned' | 'archived' | 'deleted';
      listing_status: string;
      transaction_status: string;
      boost_type: string;
      auth_provider: 'password' | 'google' | 'apple' | 'facebook';
    };
  };
}
