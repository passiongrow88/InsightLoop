import type { MascotPreference, MascotType, User } from "../types";

const VERSION = 1;

const keyFor = (user?: User | null) =>
  `insightLoop_mascot_preferences_v${VERSION}_${user?.email || "guest"}`;

export const getMascotPreferences = (user?: User | null): MascotPreference | null => {
  try {
    const raw = localStorage.getItem(keyFor(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MascotPreference;
    if (!parsed.mascotType || !parsed.mascotName || !parsed.userDisplayName) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveMascotPreferences = (
  preference: MascotPreference,
  user?: User | null
) => {
  localStorage.setItem(keyFor(user), JSON.stringify(preference));
};

export const createDefaultMascotPreference = (
  mascotType: MascotType,
  mascotName: string,
  userDisplayName: string
): MascotPreference => ({
  mascotType,
  mascotName: mascotName.trim(),
  userDisplayName: userDisplayName.trim(),
  onboardingCompletedAt: Date.now(),
});
