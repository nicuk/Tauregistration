export type Database = {
  public: {
    Tables: {
      page_views: {
        Row: {
          created_at: string
          id: string
          page: string
          user_id: string
          viewed_at: string
        }
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          user_metadata: {
            country?: string
            first_referral?: boolean
            is_pi_user?: boolean
            referral_code?: string
            referral_source?: string
            telegram_handle?: string
            telegram_verified?: boolean
            twitter_handle?: string
            twitter_shared?: boolean
            twitter_verified?: boolean
            username: string
          }
        }
      }
      referral_stats: {
        Row: {
          claimed_rewards: number
          completed_verifications: number
          created_at: string
          id: string
          next_tier_reward: number
          pending_rewards: number
          progress_to_next_tier: number
          rank: number
          referrals_needed: number
          total_referrals: number
          total_users: number
          user_id: string
          verification_progress: number
          top_referrers: {
            badge?: string
            earnings: number
            id: string
            username: string
          }[]
        }
      }
      user_ips: {
        Row: {
          created_at: string
          id: string
          ip: string
          last_seen: string
          user_id: string
        }
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          user_id: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

