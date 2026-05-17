export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          metadata: Json;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          metadata?: Json;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: number;
          metadata?: Json;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          author_id: string;
          author_identifier: string;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          status: Database['public']['Enums']['content_status'];
        };
        Insert: {
          author_id: string;
          author_identifier: string;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          status?: Database['public']['Enums']['content_status'];
        };
        Update: {
          author_id?: string;
          author_identifier?: string;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          status?: Database['public']['Enums']['content_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string;
          key: string;
          updated_at: string;
          value: boolean;
        };
        Insert: {
          description?: string;
          key: string;
          updated_at?: string;
          value?: boolean;
        };
        Update: {
          description?: string;
          key?: string;
          updated_at?: string;
          value?: boolean;
        };
        Relationships: [];
      };
      filter_words: {
        Row: {
          active: boolean;
          id: number;
          kind: Database['public']['Enums']['filter_word_kind'];
          language: string;
          word: string;
        };
        Insert: {
          active?: boolean;
          id?: number;
          kind: Database['public']['Enums']['filter_word_kind'];
          language: string;
          word: string;
        };
        Update: {
          active?: boolean;
          id?: number;
          kind?: Database['public']['Enums']['filter_word_kind'];
          language?: string;
          word?: string;
        };
        Relationships: [];
      };
      identifier_words: {
        Row: {
          approved: boolean;
          id: number;
          kind: Database['public']['Enums']['word_kind'];
          language: string;
          word: string;
        };
        Insert: {
          approved?: boolean;
          id?: number;
          kind: Database['public']['Enums']['word_kind'];
          language: string;
          word: string;
        };
        Update: {
          approved?: boolean;
          id?: number;
          kind?: Database['public']['Enums']['word_kind'];
          language?: string;
          word?: string;
        };
        Relationships: [];
      };
      post_participants: {
        Row: {
          joined_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_participants_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          author_identifier: string;
          average_spice_level: number | null;
          body: string;
          category: Database['public']['Enums']['post_category'];
          comment_count: number;
          created_at: string;
          id: string;
          is_full: boolean;
          language: Database['public']['Enums']['content_language'];
          participant_count: number;
          spice_vote_count: number;
          status: Database['public']['Enums']['content_status'];
          title: string;
          total_spice_score: number;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          author_id: string;
          author_identifier: string;
          average_spice_level?: number | null;
          body: string;
          category: Database['public']['Enums']['post_category'];
          comment_count?: number;
          created_at?: string;
          id?: string;
          is_full?: boolean;
          language?: Database['public']['Enums']['content_language'];
          participant_count?: number;
          spice_vote_count?: number;
          status?: Database['public']['Enums']['content_status'];
          title: string;
          total_spice_score?: number;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          author_id?: string;
          author_identifier?: string;
          average_spice_level?: number | null;
          body?: string;
          category?: Database['public']['Enums']['post_category'];
          comment_count?: number;
          created_at?: string;
          id?: string;
          is_full?: boolean;
          language?: Database['public']['Enums']['content_language'];
          participant_count?: number;
          spice_vote_count?: number;
          status?: Database['public']['Enums']['content_status'];
          title?: string;
          total_spice_score?: number;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active_post_count: number;
          age_verified_at: string | null;
          anonymous_identifier: string;
          created_at: string;
          language: string;
          status: Database['public']['Enums']['profile_status'];
          strike_count: number;
          suspended_until: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_post_count?: number;
          age_verified_at?: string | null;
          anonymous_identifier: string;
          created_at?: string;
          language?: string;
          status?: Database['public']['Enums']['profile_status'];
          strike_count?: number;
          suspended_until?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_post_count?: number;
          age_verified_at?: string | null;
          anonymous_identifier?: string;
          created_at?: string;
          language?: string;
          status?: Database['public']['Enums']['profile_status'];
          strike_count?: number;
          suspended_until?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reason?: Database['public']['Enums']['report_reason'];
          reporter_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id?: string;
          target_type?: Database['public']['Enums']['report_target'];
        };
        Relationships: [];
      };
      spice_votes: {
        Row: {
          created_at: string;
          post_id: string;
          score: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          score: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spice_votes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_content_filter: { Args: { p_content: string }; Returns: undefined };
      is_moderator: { Args: never; Returns: boolean };
      log_audit: {
        Args: {
          p_action: string;
          p_actor_id: string;
          p_metadata?: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      content_language: 'sv' | 'en';
      content_status: 'active' | 'hidden' | 'deleted';
      filter_word_kind: 'slur' | 'spam_pattern';
      post_category:
        | 'vent_space'
        | 'all_the_feels'
        | 'advice_needed'
        | 'just_wondering'
        | 'story_time'
        | 'decode_this'
        | 'aitoo'
        | 'hypothetically'
        | 'good_vibes';
      profile_status: 'active' | 'suspended' | 'banned';
      report_reason: 'harassment' | 'hate' | 'spam' | 'sexual' | 'threat' | 'off_topic' | 'other';
      report_status: 'open' | 'reviewed' | 'actioned' | 'dismissed';
      report_target: 'post' | 'comment' | 'user';
      word_kind: 'adjective' | 'noun';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      content_language: ['sv', 'en'],
      content_status: ['active', 'hidden', 'deleted'],
      filter_word_kind: ['slur', 'spam_pattern'],
      post_category: [
        'vent_space',
        'all_the_feels',
        'advice_needed',
        'just_wondering',
        'story_time',
        'decode_this',
        'aitoo',
        'hypothetically',
        'good_vibes',
      ],
      profile_status: ['active', 'suspended', 'banned'],
      report_reason: ['harassment', 'hate', 'spam', 'sexual', 'threat', 'off_topic', 'other'],
      report_status: ['open', 'reviewed', 'actioned', 'dismissed'],
      report_target: ['post', 'comment', 'user'],
      word_kind: ['adjective', 'noun'],
    },
  },
} as const;
