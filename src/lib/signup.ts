export function isSignupEnabled() {
  const value = process.env.APP_SIGNUP?.trim().toLowerCase();
  return value !== "disable" && value !== "disabled";
}
