/** Generated from packages/client-contract/contracts.json. */
export const platformContract = {
  "api": {
    "defaultWebUrl": "http://127.0.0.1:8787",
    "defaultAndroidEmulatorUrl": "http://10.0.2.2:8787",
    "defaultIosSimulatorUrl": "http://127.0.0.1:8787",
    "pollIntervalMs": 900,
    "pollDeadlineMs": 180000
  },
  "upload": {
    "maxBytes": 10485760,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/webp"
    ]
  },
  "recommendation": {
    "baseScore": 48,
    "undertoneWeight": 20,
    "skinWeight": 15,
    "regionWeight": 10,
    "categoryWeight": 7,
    "maxScore": 99,
    "platformSortMayRefineTies": true
  }
} as const;
