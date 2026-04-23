// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BiometricPrompt } from "../../components/BiometricPrompt";
import CustomTabBar from "../../components/CustomTabBar";
import { useAuthStore } from "../../store/authStore";
import { useBiometricStore } from "../../store/biometricStore";

export default function TabsLayout() {
  const { user, initialized } = useAuthStore();
  const {
    isAvailable,
    isEnabled,
    initialize: initBiometric,
  } = useBiometricStore();

  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const checked = useRef(false);

  // ✅ ALL hooks must come before any early return
  useEffect(() => {
    if (checked.current || !user) return;
    checked.current = true;

    initBiometric().then(() => {
      const state = useBiometricStore.getState();
      if (
        state.isAvailable &&
        !state.isEnabled &&
        state.__pendingEmail &&
        state.__pendingPassword
      ) {
        setPendingEmail(state.__pendingEmail);
        setPendingPassword(state.__pendingPassword);
        setShowBiometricPrompt(true);
      }
    });
  }, [user]);

  const handleBiometricPromptDone = () => {
    setShowBiometricPrompt(false);
    setPendingEmail("");
    setPendingPassword("");
    useBiometricStore.setState({
      __pendingEmail: undefined,
      __pendingPassword: undefined,
    } as any);
  };

  // ✅ Early return AFTER all hooks
  if (initialized && !user) {
    return <Redirect href={"/(auth)/welcome" as any} />;
  }

  return (
    <SafeAreaProvider>
      <BiometricPrompt
        visible={showBiometricPrompt}
        email={pendingEmail}
        password={pendingPassword}
        onDone={handleBiometricPromptDone}
      />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="medications" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="change-password" options={{ href: null }} />
        <Tabs.Screen name="privacy-policy" options={{ href: null }} />
        <Tabs.Screen name="report/[id]" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </SafeAreaProvider>
  );
}
