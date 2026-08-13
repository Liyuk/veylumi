/** Generated from packages/recommendation-contract/rules.json. */
export const recommendationRules = {
  "version": 1,
  "eligibility": [
    "catalog product must be active",
    "product region must match requested region unless region is all",
    "product category must match when requested"
  ],
  "weights": {
    "base": 48,
    "undertone": 20,
    "skin": 15,
    "region": 10,
    "category": 7,
    "max": 99
  },
  "invariants": [
    "A matching reason must accompany every score",
    "Clients may only refine order among equal scores",
    "Clients must not add an ineligible product"
  ],
  "platformPreferences": {
    "web": [
      "score",
      "latest"
    ],
    "android": [
      "score",
      "saved"
    ],
    "ios": [
      "score",
      "finish"
    ]
  }
} as const;
