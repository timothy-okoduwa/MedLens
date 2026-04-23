// app/_layout.tsx
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Alert, Platform, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useThemeStore } from "../store/themeStore";

async function bootstrapPermissions() {
  const { status: notifStatus } = await Notifications.getPermissionsAsync();
  if (notifStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (status !== "granted") {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in Settings to receive medication reminders.",
        [{ text: "OK" }],
      );
    }
  }

  const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
  if (calStatus !== "granted") {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      console.log(
        "Calendar permission denied — calendar events will be skipped.",
      );
    }
  }

  if (Platform.OS === "ios") {
    const { status: remStatus } = await Calendar.getRemindersPermissionsAsync();
    if (remStatus !== "granted") {
      await Calendar.requestRemindersPermissionsAsync();
    }
  }
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initializeTheme = useThemeStore((s) => s.initialize);
  const initializeNotifications = useNotificationStore((s) => s.initialize);
  const { isDark, colors } = useThemeStore();
  const systemScheme = useColorScheme();
  const notificationResponseListener =
    useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    initializeTheme(systemScheme ?? null);
  }, []);

  useEffect(() => {
    const { mode } = useThemeStore.getState();
    if (mode === "system") {
      initializeTheme(systemScheme ?? null);
    }
  }, [systemScheme]);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  useEffect(() => {
    bootstrapPermissions();
    initializeNotifications();
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        console.log("Notification tapped:", data);
      });
    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}
        >
          <Stack.Screen name="index" />
          {/* Intro animation screen — shown once before auth */}
          <Stack.Screen name="intro" options={{ animation: "fade" }} />
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
