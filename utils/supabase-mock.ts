import { MOCK_REFERRAL_DATA } from "./mock-data"

export const createMockSupabaseClient = () => ({
  from: (table: string) => ({
    select: () => ({
      eq: async () => ({ data: MOCK_REFERRAL_DATA, error: null }),
      single: async () => ({ data: MOCK_REFERRAL_DATA, error: null }),
    }),
    update: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  }),
})

