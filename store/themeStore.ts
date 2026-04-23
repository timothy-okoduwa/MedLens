import { create } from "zustand";
import { appStorage } from "../config/storage";
import { DarkColors, LightColors } from "../constants/theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof LightColors;
  setThemeMode: (
    mode: ThemeMode,
    systemScheme?: "light" | "dark" | null,
  ) => Promise<void>;
  initialize: (systemScheme: "light" | "dark" | null) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "system",
  isDark: false,
  colors: LightColors,

  setThemeMode: async (mode, systemScheme) => {
    try {
      await appStorage.setItem("theme_mode", mode);
      const currentSystemScheme = systemScheme ?? null;
      const isDarkMode =
        mode === "dark" ||
        (mode === "system" && currentSystemScheme === "dark");
      set({
        mode,
        isDark: isDarkMode,
        colors: isDarkMode ? DarkColors : LightColors,
      });
    } catch (e) {
      console.error("Failed to save theme mode:", e);
    }
  },

  initialize: async (systemScheme) => {
    try {
      const savedMode = await appStorage.getItem("theme_mode");
      const mode = (savedMode as ThemeMode) || "system";

      const isDarkMode =
        mode === "dark" || (mode === "system" && systemScheme === "dark");

      set({
        mode,
        isDark: isDarkMode,
        colors: isDarkMode ? DarkColors : LightColors,
      });
    } catch (e) {
      console.error("Failed to initialize theme:", e);
    }
  },
}));

export function useTheme() {
  return useThemeStore();
}
