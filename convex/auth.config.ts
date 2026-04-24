import type { AuthConfig } from "convex/server";

const projectId = "gen-lang-client-0422761172";
const issuer = `https://securetoken.google.com/${projectId}`;

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: projectId,
      issuer,
      jwks: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
