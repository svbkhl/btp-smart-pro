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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_quotes: {
        Row: {
          client_name: string | null
          created_at: string
          details: Json | null
          estimated_cost: number | null
          id: string
          image_urls: string[] | null
          materials: string[] | null
          signature_data: string | null
          signed_at: string | null
          signed_by: string | null
          status: string | null
          surface: number | null
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          details?: Json | null
          estimated_cost?: number | null
          id?: string
          image_urls?: string[] | null
          materials?: string[] | null
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          surface?: number | null
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          details?: Json | null
          estimated_cost?: number | null
          id?: string
          image_urls?: string[] | null
          materials?: string[] | null
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          surface?: number | null
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      image_analysis: {
        Row: {
          analysis_result: Json | null
          created_at: string
          defects_detected: string[] | null
          estimated_repair_cost: number | null
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          defects_detected?: string[] | null
          estimated_repair_cost?: number | null
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          defects_detected?: string[] | null
          estimated_repair_cost?: number | null
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_notifications: {
        Row: {
          created_at: string | null
          id: string
          notification_type: string
          reminder_id: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_type: string
          reminder_id: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_type?: string
          reminder_id?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "maintenance_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reminders: {
        Row: {
          client_name: string
          created_at: string
          equipment_type: string
          id: string
          installation_date: string | null
          last_maintenance: string | null
          next_maintenance: string
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          equipment_type: string
          id?: string
          installation_date?: string | null
          last_maintenance?: string | null
          next_maintenance: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          equipment_type?: string
          id?: string
          installation_date?: string | null
          last_maintenance?: string | null
          next_maintenance?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_id: string | null
          related_table: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          active_projects: number | null
          created_at: string | null
          id: string
          total_analyses: number | null
          total_maintenance_reminders: number | null
          total_quotes: number | null
          total_quotes_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_projects?: number | null
          created_at?: string | null
          id?: string
          total_analyses?: number | null
          total_maintenance_reminders?: number | null
          total_quotes?: number | null
          total_quotes_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_projects?: number | null
          created_at?: string | null
          id?: string
          total_analyses?: number | null
          total_maintenance_reminders?: number | null
          total_quotes?: number | null
          total_quotes_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "dirigeant" | "salarie" | "client"
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
      app_role: ["dirigeant", "salarie", "client"],
    },
  },
} as const
