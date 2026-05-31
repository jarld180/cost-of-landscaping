export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_profiles: {
        Row: {
          account_type: string
          created_at: string | null
          id: string
          is_admin: boolean | null
          metadata: Json
          onboarding_completed_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_type?: string
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          metadata?: Json
          onboarding_completed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          metadata?: Json
          onboarding_completed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_article_evals: {
        Row: {
          accuracy_score: number | null
          brand_voice_score: number | null
          created_at: string | null
          engagement_score: number | null
          eval_type: string
          feedback: string | null
          id: string
          issues: Json | null
          iteration: number | null
          job_id: string
          metadata: Json | null
          overall_score: number | null
          passed: boolean | null
          rated_at: string | null
          rated_by: string | null
          readability_score: number | null
          seo_score: number | null
          step_id: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          brand_voice_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          eval_type?: string
          feedback?: string | null
          id?: string
          issues?: Json | null
          iteration?: number | null
          job_id: string
          metadata?: Json | null
          overall_score?: number | null
          passed?: boolean | null
          rated_at?: string | null
          rated_by?: string | null
          readability_score?: number | null
          seo_score?: number | null
          step_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          brand_voice_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          eval_type?: string
          feedback?: string | null
          id?: string
          issues?: Json | null
          iteration?: number | null
          job_id?: string
          metadata?: Json | null
          overall_score?: number | null
          passed?: boolean | null
          rated_at?: string | null
          rated_by?: string | null
          readability_score?: number | null
          seo_score?: number | null
          step_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_evals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_article_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_evals_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ai_article_job_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_job_steps: {
        Row: {
          agent_type: string
          completed_at: string | null
          completion_tokens: number | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          input: Json | null
          iteration: number | null
          job_id: string
          logs: Json | null
          output: Json | null
          persona_id: string | null
          persona_snapshot: Json | null
          prompt_tokens: number | null
          started_at: string | null
          status: string
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input?: Json | null
          iteration?: number | null
          job_id: string
          logs?: Json | null
          output?: Json | null
          persona_id?: string | null
          persona_snapshot?: Json | null
          prompt_tokens?: number | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          input?: Json | null
          iteration?: number | null
          job_id?: string
          logs?: Json | null
          output?: Json | null
          persona_id?: string | null
          persona_snapshot?: Json | null
          prompt_tokens?: number | null
          started_at?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_article_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_article_job_steps_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_article_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_agent: string | null
          current_iteration: number | null
          estimated_cost_usd: number | null
          final_output: Json | null
          id: string
          keyword: string
          last_error: string | null
          max_iterations: number | null
          metadata: Json | null
          page_id: string | null
          priority: number | null
          progress_percent: number | null
          retry_count: number
          settings: Json | null
          started_at: string | null
          status: string
          total_tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_agent?: string | null
          current_iteration?: number | null
          estimated_cost_usd?: number | null
          final_output?: Json | null
          id?: string
          keyword: string
          last_error?: string | null
          max_iterations?: number | null
          metadata?: Json | null
          page_id?: string | null
          priority?: number | null
          progress_percent?: number | null
          retry_count?: number
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_agent?: string | null
          current_iteration?: number | null
          estimated_cost_usd?: number | null
          final_output?: Json | null
          id?: string
          keyword?: string
          last_error?: string | null
          max_iterations?: number | null
          metadata?: Json | null
          page_id?: string | null
          priority?: number | null
          progress_percent?: number | null
          retry_count?: number
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_article_jobs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_golden_examples: {
        Row: {
          agent_type: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          input_example: Json
          is_active: boolean | null
          last_used_at: string | null
          metadata: Json | null
          output_example: Json
          quality_score: number | null
          source_job_id: string | null
          source_step_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          input_example: Json
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          output_example: Json
          quality_score?: number | null
          source_job_id?: string | null
          source_step_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          input_example?: Json
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          output_example?: Json
          quality_score?: number | null
          source_job_id?: string | null
          source_step_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_golden_examples_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "ai_article_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_golden_examples_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "ai_article_job_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personas: {
        Row: {
          agent_type: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_enabled: boolean | null
          max_tokens: number | null
          metadata: Json | null
          model: string
          name: string
          provider: string
          system_prompt: string
          temperature: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string
          name: string
          provider?: string
          system_prompt: string
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string
          name?: string
          provider?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_prompt_versions: {
        Row: {
          archived_at: string | null
          avg_eval_score: number | null
          change_notes: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_challenger: boolean | null
          is_primary: boolean | null
          metadata: Json | null
          pass_rate: number | null
          persona_id: string
          promoted_at: string | null
          status: string
          system_prompt: string
          total_uses: number | null
          traffic_split: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          avg_eval_score?: number | null
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_challenger?: boolean | null
          is_primary?: boolean | null
          metadata?: Json | null
          pass_rate?: number | null
          persona_id: string
          promoted_at?: string | null
          status?: string
          system_prompt: string
          total_uses?: number | null
          traffic_split?: number | null
          updated_at?: string | null
          version: number
        }
        Update: {
          archived_at?: string | null
          avg_eval_score?: number | null
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_challenger?: boolean | null
          is_primary?: boolean | null
          metadata?: Json | null
          pass_rate?: number | null
          persona_id?: string
          promoted_at?: string | null
          status?: string
          system_prompt?: string
          total_uses?: number | null
          traffic_split?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_versions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_items: number
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          processed_items: number
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          total_items: number | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_items?: number
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          processed_items?: number
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_items?: number
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          processed_items?: number
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      badge_embed_logs: {
        Row: {
          contractor_id: string
          created_at: string | null
          hour_bucket: string | null
          id: string
          referrer_origin: string | null
          referrer_url: string | null
          request_ip: string
          user_agent: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          hour_bucket?: string | null
          id?: string
          referrer_origin?: string | null
          referrer_url?: string | null
          request_ip: string
          user_agent?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          hour_bucket?: string | null
          id?: string
          referrer_origin?: string | null
          referrer_url?: string | null
          request_ip?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_embed_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claims: {
        Row: {
          account_activated_at: string | null
          account_activation_expires_at: string | null
          account_activation_token: string | null
          admin_notes: string | null
          claimant_email: string
          claimant_name: string | null
          claimant_phone: string | null
          claimant_user_id: string | null
          contractor_id: string
          created_at: string | null
          email_verification_expires_at: string | null
          email_verification_token: string | null
          email_verified_at: string | null
          id: string
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          verification_method: string | null
        }
        Insert: {
          account_activated_at?: string | null
          account_activation_expires_at?: string | null
          account_activation_token?: string | null
          admin_notes?: string | null
          claimant_email: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_user_id?: string | null
          contractor_id: string
          created_at?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          verification_method?: string | null
        }
        Update: {
          account_activated_at?: string | null
          account_activation_expires_at?: string | null
          account_activation_token?: string | null
          admin_notes?: string | null
          claimant_email?: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_user_id?: string | null
          contractor_id?: string
          created_at?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claims_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          coordinates: unknown
          created_at: string | null
          deleted_at: string | null
          id: string
          lat: number | null
          lng: number | null
          metadata: Json | null
          name: string
          slug: string
          state_code: string
          updated_at: string | null
        }
        Insert: {
          coordinates?: unknown
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name: string
          slug: string
          state_code: string
          updated_at?: string | null
        }
        Update: {
          coordinates?: unknown
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name?: string
          slug?: string
          state_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contractor_service_types: {
        Row: {
          confidence_score: number | null
          contractor_id: string
          created_at: string
          id: string
          service_type_id: string
          source: string
        }
        Insert: {
          confidence_score?: number | null
          contractor_id: string
          created_at?: string
          id?: string
          service_type_id: string
          source?: string
        }
        Update: {
          confidence_score?: number | null
          contractor_id?: string
          created_at?: string
          id?: string
          service_type_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_service_types_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          city_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          company_name: string
          coordinates: unknown
          created_at: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          embed_token: string | null
          embed_verified: boolean | null
          embed_verified_at: string | null
          embed_verified_domain: string | null
          google_cid: string | null
          google_place_id: string | null
          id: string
          images_processed: boolean
          is_claimed: boolean
          lat: number | null
          lng: number | null
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          review_count: number | null
          slug: string
          status: string
          street_address: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          city_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          company_name: string
          coordinates?: unknown
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          embed_token?: string | null
          embed_verified?: boolean | null
          embed_verified_at?: string | null
          embed_verified_domain?: string | null
          google_cid?: string | null
          google_place_id?: string | null
          id?: string
          images_processed?: boolean
          is_claimed?: boolean
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          review_count?: number | null
          slug: string
          status?: string
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          city_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          company_name?: string
          coordinates?: unknown
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          embed_token?: string | null
          embed_verified?: boolean | null
          embed_verified_at?: string | null
          embed_verified_domain?: string | null
          google_cid?: string | null
          google_place_id?: string | null
          id?: string
          images_processed?: boolean
          is_claimed?: boolean
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string
          status?: string
          street_address?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          errors: Json
          filename: string | null
          id: string
          imported_count: number
          pending_image_count: number
          processed_rows: number
          raw_data: Json
          reviews_imported_count: number
          skipped_claimed_count: number
          skipped_count: number
          started_at: string | null
          status: string
          total_rows: number
          updated_at: string
          updated_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json
          filename?: string | null
          id?: string
          imported_count?: number
          pending_image_count?: number
          processed_rows?: number
          raw_data?: Json
          reviews_imported_count?: number
          skipped_claimed_count?: number
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          updated_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json
          filename?: string | null
          id?: string
          imported_count?: number
          pending_image_count?: number
          processed_rows?: number
          raw_data?: Json
          reviews_imported_count?: number
          skipped_claimed_count?: number
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          updated_count?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_url: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          internal_path: string | null
          is_enabled: boolean
          label: string
          link_type: string
          menu_id: string
          metadata: Json | null
          open_in_new_tab: boolean
          page_id: string | null
          parent_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_url?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          internal_path?: string | null
          is_enabled?: boolean
          label: string
          link_type?: string
          menu_id: string
          metadata?: Json | null
          open_in_new_tab?: boolean
          page_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_url?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          internal_path?: string | null
          is_enabled?: boolean
          label?: string
          link_type?: string
          menu_id?: string
          metadata?: Json | null
          open_in_new_tab?: boolean
          page_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_enabled: boolean
          metadata: Json | null
          name: string
          show_in_footer: boolean
          show_in_header: boolean
          slug: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name: string
          show_in_footer?: boolean
          show_in_header?: boolean
          slug: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name?: string
          show_in_footer?: boolean
          show_in_header?: boolean
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      page_templates: {
        Row: {
          color: string
          component_name: string
          created_at: string | null
          created_by: string | null
          default_metadata: Json
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_enabled: boolean
          is_system: boolean
          metadata_schema: Json
          name: string
          slug: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          color: string
          component_name: string
          created_at?: string | null
          created_by?: string | null
          default_metadata?: Json
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          metadata_schema?: Json
          name: string
          slug: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          color?: string
          component_name?: string
          created_at?: string | null
          created_by?: string | null
          default_metadata?: Json
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          metadata_schema?: Json
          name?: string
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          canonical_url: string | null
          content: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          depth: number
          description: string | null
          focus_keyword: string | null
          full_path: string
          id: string
          meta_keywords: string[] | null
          meta_robots: string[] | null
          meta_title: string | null
          metadata: Json | null
          og_image: string | null
          parent_id: string | null
          published_at: string | null
          redirect_type: number | null
          redirect_url: string | null
          sitemap_changefreq: string | null
          sitemap_priority: number | null
          slug: string
          status: string
          template: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          depth?: number
          description?: string | null
          focus_keyword?: string | null
          full_path: string
          id?: string
          meta_keywords?: string[] | null
          meta_robots?: string[] | null
          meta_title?: string | null
          metadata?: Json | null
          og_image?: string | null
          parent_id?: string | null
          published_at?: string | null
          redirect_type?: number | null
          redirect_url?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug: string
          status?: string
          template?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          depth?: number
          description?: string | null
          focus_keyword?: string | null
          full_path?: string
          id?: string
          meta_keywords?: string[] | null
          meta_robots?: string[] | null
          meta_title?: string | null
          metadata?: Json | null
          og_image?: string | null
          parent_id?: string | null
          published_at?: string | null
          redirect_type?: number | null
          redirect_url?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug?: string
          status?: string
          template?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          contractor_id: string
          created_at: string | null
          detailed_rating: Json | null
          downloaded_reviewer_photo_url: string | null
          google_review_id: string
          id: string
          is_local_guide: boolean | null
          likes_count: number | null
          original_language: string | null
          owner_response_date: string | null
          owner_response_text: string | null
          published_at: string | null
          published_at_relative: string | null
          review_context: Json | null
          review_image_urls: string[] | null
          review_origin: string | null
          review_text: string | null
          review_text_translated: string | null
          review_url: string | null
          reviewer_id: string | null
          reviewer_name: string
          reviewer_photo_url: string | null
          reviewer_review_count: number | null
          reviewer_url: string | null
          stars: number
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          detailed_rating?: Json | null
          downloaded_reviewer_photo_url?: string | null
          google_review_id: string
          id?: string
          is_local_guide?: boolean | null
          likes_count?: number | null
          original_language?: string | null
          owner_response_date?: string | null
          owner_response_text?: string | null
          published_at?: string | null
          published_at_relative?: string | null
          review_context?: Json | null
          review_image_urls?: string[] | null
          review_origin?: string | null
          review_text?: string | null
          review_text_translated?: string | null
          review_url?: string | null
          reviewer_id?: string | null
          reviewer_name: string
          reviewer_photo_url?: string | null
          reviewer_review_count?: number | null
          reviewer_url?: string | null
          stars: number
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          detailed_rating?: Json | null
          downloaded_reviewer_photo_url?: string | null
          google_review_id?: string
          id?: string
          is_local_guide?: boolean | null
          likes_count?: number | null
          original_language?: string | null
          owner_response_date?: string | null
          owner_response_text?: string | null
          published_at?: string | null
          published_at_relative?: string | null
          review_context?: Json | null
          review_image_urls?: string[] | null
          review_origin?: string | null
          review_text?: string | null
          review_text_translated?: string | null
          review_url?: string | null
          reviewer_id?: string | null
          reviewer_name?: string
          reviewer_photo_url?: string | null
          reviewer_review_count?: number | null
          reviewer_url?: string | null
          stars?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          display_order: number
          icon: string | null
          id: string
          is_enabled: boolean
          metadata: Json | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          archived_at: string | null
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          level: string
          log_type: string
          message: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          archived_at?: string | null
          category: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          log_type: string
          message?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          archived_at?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          log_type?: string
          message?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      zip_codes: {
        Row: {
          city_id: string | null
          city_name: string
          coordinates: unknown
          created_at: string | null
          id: string
          lat: number
          lng: number
          population: number | null
          state_code: string
          state_name: string
          zip: string
        }
        Insert: {
          city_id?: string | null
          city_name: string
          coordinates?: unknown
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          population?: number | null
          state_code: string
          state_name: string
          zip: string
        }
        Update: {
          city_id?: string | null
          city_name?: string
          coordinates?: unknown
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          population?: number | null
          state_code?: string
          state_name?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "zip_codes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      claim_stealthy_crawl_job: {
        Args: never
        Returns: {
          attempts: number
          id: string
          max_attempts: number
          payload: Json
        }[]
      }
      count_contractors_by_radius: {
        Args: {
          p_category?: string
          p_city_slug: string
          p_radius_meters?: number
          p_state_code?: string
        }
        Returns: number
      }
      count_distinct_contractor_cities: { Args: never; Returns: number }
      create_background_job_with_log: {
        Args: {
          p_created_by?: string
          p_job_type: string
          p_payload?: Json
          p_scheduled_for?: string
        }
        Returns: {
          created_at: string
          job_id: string
          job_type: string
          status: string
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dispatch_stealthy_crawl_processor: { Args: never; Returns: undefined }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_unprocessed_stealthy_crawls: {
        Args: { limit_count?: number }
        Returns: {
          id: string
          payload: Json
          result: Json
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_next_background_job: { Args: never; Returns: undefined }
      prune_badge_embed_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      search_contractors_by_radius: {
        Args: {
          p_category?: string
          p_city_slug: string
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_order_direction?: string
          p_radius_meters?: number
          p_state_code?: string
        }
        Returns: {
          city_id: string
          city_name: string
          city_slug: string
          company_name: string
          created_at: string
          description: string
          distance_miles: number
          email: string
          id: string
          images_processed: boolean
          lat: number
          lng: number
          metadata: Json
          phone: string
          postal_code: string
          rating: number
          review_count: number
          slug: string
          state_code: string
          status: string
          street_address: string
          updated_at: string
          website: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
