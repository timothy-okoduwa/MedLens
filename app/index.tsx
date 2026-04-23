// app/index.tsx
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../constants/theme";
import { useAuthStore } from "../store/authStore";

export default function Index() {
  const { initialized, user, needsOnboarding } = useAuthStore();

  if (!initialized) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  // Show the animated intro before the welcome screen.
  // The intro screen itself navigates to /(auth)/welcome when done.
  if (!user) return <Redirect href="/intro" />;
  if (needsOnboarding) return <Redirect href="/(auth)/onboarding/step1" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
