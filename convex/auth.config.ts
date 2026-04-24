import type { AuthConfig } from "convex/server";

// Use the Firebase project ID from environment variable if available, fallback to hardcoded value
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0422761172";

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${projectId}`,
      applicationID: projectId,
    },
  ],
} satisfies AuthConfig;
