import { v4 as uuidv4 } from "uuid"

// Generate consistent UUIDs for test data
const TEST_USERS = {
  USER_1: uuidv4(),
  USER_2: uuidv4(),
  USER_3: uuidv4(),
}

export const MOCK_REFERRAL_DATA = {
  stats: {
    totalReferrals: 3,
    completedVerifications: 2,
    rank: 42,
    totalUsers: 156,
    verificationProgress: 40,
  },
  topReferrers: [
    { id: TEST_USERS.USER_1, username: "cryptoking", referrals: 95 },
    { id: TEST_USERS.USER_2, username: "blockchain_queen", referrals: 82 },
    { id: TEST_USERS.USER_3, username: "tau_master", referrals: 76 },
  ],
  tiers: [
    {
      tier: 1,
      reward: 10000,
      required: 1,
      referrals: [
        {
          id: uuidv4(),
          username: "crypto_fan",
          email: "cr***@example.com",
          dateReferred: "2024-01-15",
          status: "completed",
        },
      ],
    },
    // ... other tiers
  ],
}

