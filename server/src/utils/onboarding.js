// Feature flag: set FEATURE_ONBOARDING=true to turn on the onboarding
// preferences step. Off by default because it is unfinished: preferences
// are validated but not saved yet, and there is no onboarding UI.
export function isOnboardingEnabled() {
  return process.env.FEATURE_ONBOARDING === 'true';
}
