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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          edit_target: number
          id: string
          key: string
          label: string
          revenue: number
          script_target: number
          sort_order: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          edit_target?: number
          id?: string
          key: string
          label: string
          revenue?: number
          script_target?: number
          sort_order?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          edit_target?: number
          id?: string
          key?: string
          label?: string
          revenue?: number
          script_target?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          client_id: string | null
          created_at: string
          due_date: string
          id: string
          shared_project_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          shared_project_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          shared_project_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_shared_project_id_fkey"
            columns: ["shared_project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_trips: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          shared_project_id: string | null
          trip_date: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          shared_project_id?: string | null
          trip_date: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          shared_project_id?: string | null
          trip_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_trips_shared_project_id_fkey"
            columns: ["shared_project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspirations: {
        Row: {
          content: string
          created_at: string
          id: string
          tags: string[]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspirations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_entries: {
        Row: {
          checked: boolean
          created_at: string
          date: string
          id: string
          notes: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          date: string
          id?: string
          notes?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          date?: string
          id?: string
          notes?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_entries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "learning_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_topics: {
        Row: {
          archived: boolean
          created_at: string
          emoji: string
          id: string
          label: string
          sort_order: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          emoji?: string
          id?: string
          label: string
          sort_order?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          emoji?: string
          id?: string
          label?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modes: {
        Row: {
          color: string
          created_at: string
          description: string | null
          hide_categories: string[]
          icon: string
          id: string
          is_default: boolean
          key: string
          label: string
          sort_order: number
          subtitle: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          hide_categories?: string[]
          icon?: string
          id?: string
          is_default?: boolean
          key: string
          label: string
          sort_order?: number
          subtitle: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          hide_categories?: string[]
          icon?: string
          id?: string
          is_default?: boolean
          key?: string
          label?: string
          sort_order?: number
          subtitle?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_outputs: {
        Row: {
          client_id: string | null
          edit_done: number
          edit_target: number
          id: string
          revenue_status: string
          script_done: number
          script_target: number
          threads_done: number
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          client_id?: string | null
          edit_done?: number
          edit_target?: number
          id?: string
          revenue_status?: string
          script_done?: number
          script_target?: number
          threads_done?: number
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          client_id?: string | null
          edit_done?: number
          edit_target?: number
          id?: string
          revenue_status?: string
          script_done?: number
          script_target?: number
          threads_done?: number
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_outputs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          onboarded: boolean
          revenue_goal: number
          role: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          onboarded?: boolean
          revenue_goal?: number
          role?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          onboarded?: boolean
          revenue_goal?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          kind: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shared_project_members: {
        Row: {
          added_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_projects: {
        Row: {
          color: string
          created_at: string
          edit_target: number
          id: string
          label: string
          owner_id: string
          revenue: number
          script_target: number
        }
        Insert: {
          color?: string
          created_at?: string
          edit_target?: number
          id?: string
          label: string
          owner_id: string
          revenue?: number
          script_target?: number
        }
        Update: {
          color?: string
          created_at?: string
          edit_target?: number
          id?: string
          label?: string
          owner_id?: string
          revenue?: number
          script_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          carried: boolean
          category: string
          client_id: string | null
          completed: boolean
          content: string
          created_at: string
          date: string
          id: string
          is_shared: boolean
          shared_project_id: string | null
          sort_order: number
          target_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          carried?: boolean
          category: string
          client_id?: string | null
          completed?: boolean
          content?: string
          created_at?: string
          date: string
          id?: string
          is_shared?: boolean
          shared_project_id?: string | null
          sort_order?: number
          target_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          carried?: boolean
          category?: string
          client_id?: string | null
          completed?: boolean
          content?: string
          created_at?: string
          date?: string
          id?: string
          is_shared?: boolean
          shared_project_id?: string | null
          sort_order?: number
          target_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shared_project_id_fkey"
            columns: ["shared_project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          id: string
          improve: string
          next_week_focus: string
          updated_at: string
          user_id: string
          week_start: string
          went_well: string
        }
        Insert: {
          id?: string
          improve?: string
          next_week_focus?: string
          updated_at?: string
          user_id: string
          week_start: string
          went_well?: string
        }
        Update: {
          id?: string
          improve?: string
          next_week_focus?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          went_well?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      win_condition_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "win_condition_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_owner: { Args: never; Returns: boolean }
      is_shared_project_member: { Args: { pid: string }; Returns: boolean }
      rollover_tasks: {
        Args: { p_today: string; p_user_id: string }
        Returns: number
      }
      team_stats_weekly: {
        Args: { days_back?: number }
        Returns: {
          completed_tasks: number
          member_count: number
          members: Json
          project_color: string
          project_id: string
          project_label: string
          total_tasks: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
