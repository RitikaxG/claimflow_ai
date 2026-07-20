export const AUTH_COOKIE_NAME = "claimflow_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;
export const REMEMBERED_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export function getAuthSecret() {
  const configuredSecret = process.env.AUTH_SECRET?.trim();

  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }

  return "claimflow-local-development-secret-change-before-production";
}
