import type { AuthConfig } from "convex/server";

const projectId = "gen-lang-client-0422761172";

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${projectId}`,
      applicationID: projectId,
    },
  ],
} satisfies AuthConfig;
