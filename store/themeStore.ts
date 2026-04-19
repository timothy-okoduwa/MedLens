import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useNativeColorScheme } from "react-native";
import { create } from "zustand";
import { DarkColors, LightColors } from "../constants/theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof LightColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "system",
  isDark: false,
  colors: LightColors,

  setThemeMode: async (mode) => {
    try {
      await AsyncStorage.setItem("theme_mode", mode);
      set({ mode });
      get().initialize();
    } catch (e) {
      console.error("Failed to save theme mode:", e);
    }
  },

  initialize: async () => {
    try {
      const savedMode = await AsyncStorage.getItem("theme_mode");
      const mode = (savedMode as ThemeMode) || "system";
      const nativeScheme = useNativeColorScheme();

      const isDarkMode =
        mode === "dark" || (mode === "system" && nativeScheme === "dark");

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
