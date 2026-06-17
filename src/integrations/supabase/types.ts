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
      advisor_clients: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      advisor_invitations: {
        Row: {
          advisor_id: string
          client_email: string
          client_id: string | null
          created_at: string
          id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          advisor_id: string
          client_email: string
          client_id?: string | null
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          advisor_id?: string
          client_email?: string
          client_id?: string | null
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      advisor_setup_tokens: {
        Row: {
          advisor_email: string
          company_id: string
          consumed_at: string | null
          consumed_ip: string | null
          consumed_user_agent: string | null
          created_at: string
          expires_at: string
          id: string
          invitation_note: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          advisor_email: string
          company_id: string
          consumed_at?: string | null
          consumed_ip?: string | null
          consumed_user_agent?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_note?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          advisor_email?: string
          company_id?: string
          consumed_at?: string | null
          consumed_ip?: string | null
          consumed_user_agent?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_note?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_setup_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_seats: {
        Row: {
          granted_at: string
          id: string
          note: string | null
          owner_id: string
          revoked_at: string | null
          seat_user_id: string
          source: string
        }
        Insert: {
          granted_at?: string
          id?: string
          note?: string | null
          owner_id: string
          revoked_at?: string | null
          seat_user_id: string
          source?: string
        }
        Update: {
          granted_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          revoked_at?: string | null
          seat_user_id?: string
          source?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          datev_berater_nr: string | null
          datev_bezeichnung: string | null
          datev_diktatkuerzel: string | null
          datev_kontenrahmen: string | null
          datev_konto_gegenkonto: string | null
          datev_mandanten_nr: string | null
          datev_sachkontenlaenge: number | null
          datev_wj_beginn: string | null
          festschreibung_default: number
          id: string
          name: string
          org_type: string
          tax_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          datev_berater_nr?: string | null
          datev_bezeichnung?: string | null
          datev_diktatkuerzel?: string | null
          datev_kontenrahmen?: string | null
          datev_konto_gegenkonto?: string | null
          datev_mandanten_nr?: string | null
          datev_sachkontenlaenge?: number | null
          datev_wj_beginn?: string | null
          festschreibung_default?: number
          id?: string
          name: string
          org_type?: string
          tax_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          datev_berater_nr?: string | null
          datev_bezeichnung?: string | null
          datev_diktatkuerzel?: string | null
          datev_kontenrahmen?: string | null
          datev_konto_gegenkonto?: string | null
          datev_mandanten_nr?: string | null
          datev_sachkontenlaenge?: number | null
          datev_wj_beginn?: string | null
          festschreibung_default?: number
          id?: string
          name?: string
          org_type?: string
          tax_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          org_type: string
          organization: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          org_type?: string
          organization: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          org_type?: string
          organization?: string
          phone?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          expires_at: string
          id: string
          redeemed_at: string
          tier: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          expires_at: string
          id?: string
          redeemed_at?: string
          tier: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          expires_at?: string
          id?: string
          redeemed_at?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          max_uses: number | null
          tier: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tier?: string
          used_count?: number
        }
        Relationships: []
      }
      custom_purposes: {
        Row: {
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      datev_export_batches: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          file_name: string | null
          id: string
          notes: string | null
          receipt_count: number
          total_amount_eur: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          receipt_count?: number
          total_amount_eur?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          receipt_count?: number
          total_amount_eur?: number | null
          user_id?: string
        }
        Relationships: []
      }
      founder_overrides: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          reason: string | null
          tier: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          tier: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_company_id: string | null
          display_name: string | null
          email: string
          first_name: string | null
          id: string
          is_blocked: boolean
          is_tax_advisor: boolean
          kanzlei: string | null
          last_name: string | null
          onboarding_seen: boolean
          scan_quota_topup: number
          tax_advisor_email: string | null
          tax_advisor_name: string | null
        }
        Insert: {
          created_at?: string
          default_company_id?: string | null
          display_name?: string | null
          email: string
          first_name?: string | null
          id: string
          is_blocked?: boolean
          is_tax_advisor?: boolean
          kanzlei?: string | null
          last_name?: string | null
          onboarding_seen?: boolean
          scan_quota_topup?: number
          tax_advisor_email?: string | null
          tax_advisor_name?: string | null
        }
        Update: {
          created_at?: string
          default_company_id?: string | null
          display_name?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          is_tax_advisor?: boolean
          kanzlei?: string | null
          last_name?: string | null
          onboarding_seen?: boolean
          scan_quota_topup?: number
          tax_advisor_email?: string | null
          tax_advisor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_changes: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_by: string | null
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          new_values: Json | null
          old_value: string | null
          old_values: Json | null
          reason: string | null
          receipt_id: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          new_values?: Json | null
          old_value?: string | null
          old_values?: Json | null
          reason?: string | null
          receipt_id: string
          user_id: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          new_values?: Json | null
          old_value?: string | null
          old_values?: Json | null
          reason?: string | null
          receipt_id?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_vat_items: {
        Row: {
          created_at: string
          id: string
          label: string | null
          net_amount: number | null
          receipt_id: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          net_amount?: number | null
          receipt_id: string
          vat_amount: number
          vat_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          net_amount?: number | null
          receipt_id?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_vat_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          accounting_status: string
          amount: number | null
          amount_eur: number | null
          company_id: string | null
          created_at: string
          currency: string
          date: string
          datev_exported_at: string | null
          description: string | null
          export_batch_id: string | null
          exported_at: string | null
          file_path: string | null
          id: string
          license_plate: string | null
          meeting_purpose: string | null
          mileage: number | null
          organization: string | null
          person_met: string | null
          receipt_type: string
          status: string
          tax_category: string | null
          updated_at: string
          user_id: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          accounting_status?: string
          amount?: number | null
          amount_eur?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          datev_exported_at?: string | null
          description?: string | null
          export_batch_id?: string | null
          exported_at?: string | null
          file_path?: string | null
          id?: string
          license_plate?: string | null
          meeting_purpose?: string | null
          mileage?: number | null
          organization?: string | null
          person_met?: string | null
          receipt_type?: string
          status?: string
          tax_category?: string | null
          updated_at?: string
          user_id: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          accounting_status?: string
          amount?: number | null
          amount_eur?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          datev_exported_at?: string | null
          description?: string | null
          export_batch_id?: string | null
          exported_at?: string | null
          file_path?: string | null
          id?: string
          license_plate?: string | null
          meeting_purpose?: string | null
          mileage?: number | null
          organization?: string | null
          person_met?: string | null
          receipt_type?: string
          status?: string
          tax_category?: string | null
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_rate_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      tax_advisor_registrations: {
        Row: {
          id: string
          kanzlei: string
          notes: string | null
          registered_at: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          kanzlei: string
          notes?: string | null
          registered_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          kanzlei?: string
          notes?: string | null
          registered_at?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          license_plate: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          license_plate: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          license_plate?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_advisor_link: { Args: { _client_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tax_advisor: { Args: { _user_id: string }; Returns: boolean }
      redeem_coupon_atomic: {
        Args: { _code: string; _user_id: string }
        Returns: {
          error: string
          expires_at: string
          tier: string
        }[]
      }
      register_as_tax_advisor: { Args: { _kanzlei: string }; Returns: string }
      update_receipt_accounting_status: {
        Args: { _receipt_id: string; _status: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { _code: string }
        Returns: {
          duration_days: number
          tier: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
