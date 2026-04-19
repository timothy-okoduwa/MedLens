// app/(auth)/signin.tsx
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Colors, Radius, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signInWithGoogle, loading } = useAuthStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "402430163576-bekanssocsol7bfcae6ai8g5nmnumepp.apps.googleusercontent.com",
    iosClientId:
      "402430163576-1uuife4hod1lc4c2tfkrbfo0ofa9s0o5.apps.googleusercontent.com",
    webClientId:
      "402430163576-s5otbq6jq6bkmgh4cvrlgkrf1mq144iv.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        signInWithGoogle(id_token)
          .then(() => router.replace("/(tabs)"))
          .catch((e: any) => Alert.alert("Google Sign-In failed", e.message));
      }
    }
  }, [response]);

  const headerY = useSharedValue(-20);
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerY.value = withTiming(0, { duration: 300 });
    headerOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOpacity.value,
  }));

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      await signIn(email.trim(), password);
      // Verify authentication before routing
      const { user, firebaseUser } = useAuthStore.getState();
      if (firebaseUser && user) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "Sign in failed",
          "Authentication successful but user data not loaded. Please try again.",
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Sign in failed",
        e.message ?? "Please check your credentials.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Animated.View style={headerStyle}>
          <Text style={styles.title}>Welcome{"\n"}back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.form}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "email" && styles.inputFocused,
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "password" && styles.inputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => promptAsync()}
            disabled={!request || loading}
            activeOpacity={0.85}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconLetter}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300)}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              Don't have an account?{" "}
              <Text style={styles.switchLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 48,
  },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: 15, color: Colors.textSecondary },
  title: {
    fontSize: 44,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -2,
    marginBottom: Spacing.sm,
    lineHeight: 50,
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 36 },
  form: { gap: Spacing.xl, marginBottom: Spacing.xl },
  inputGroup: { gap: Spacing.sm },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.accent, backgroundColor: "#FFFAF8" },
  primaryBtn: {
    backgroundColor: Colors.text,
    paddingVertical: 15,
    borderRadius: Radius.full,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: Spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textTertiary },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.xl,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleIconLetter: { fontSize: 13, fontWeight: "900", color: "#fff" },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: Colors.text },
  switchBtn: { alignItems: "center" },
  switchText: { fontSize: 14, color: Colors.textSecondary },
  switchLink: { color: Colors.accent, fontWeight: "600" },
});
