import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { create } from "zustand";

interface NotificationState {
  enabled: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  sendNotification: (title: string, body: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  enabled: true,
  loading: false,

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem("notifications_enabled");
      const enabled = saved === null ? true : saved === "true";
      set({ enabled });

      if (enabled) {
        await requestNotificationPermissions();
      }
    } catch (e) {
      console.error("Failed to initialize notifications:", e);
    }
  },

  setEnabled: async (enabled) => {
    try {
      await AsyncStorage.setItem("notifications_enabled", String(enabled));
      set({ enabled });

      if (enabled) {
        await requestNotificationPermissions();
      }
    } catch (e) {
      console.error("Failed to set notification state:", e);
    }
  },

  sendNotification: async (title, body) => {
    if (!get().enabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          badge: 1,
        },
        trigger: { seconds: 1 },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  },
}));

async function requestNotificationPermissions() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Notification permissions not granted");
    }
  } catch (e) {
    console.error("Failed to request notification permissions:", e);
  }
}
