// app/(auth)/signin.tsx
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
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
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GoogleIcon } from "../../components/GoogleIcon";
import { Colors, Radius, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useBiometricStore } from "../../store/biometricStore";

WebBrowser.maybeCompleteAuthSession();

function getBiometricLabel(
  types: LocalAuthentication.AuthenticationType[] | null,
): string {
  if (!types || types.length === 0) return "Biometrics";
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
    return "Face ID";
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    return "Fingerprint";
  return "Biometrics";
}

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signInWithGoogle, signInWithApple, loading } = useAuthStore();
  const {
    isAvailable,
    isEnabled,
    biometricType,
    initialize: initBiometric,
    authenticate,
    setPendingCredentials,
  } = useBiometricStore();

  const hasTriedBiometric = useRef(false);

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

  useEffect(() => {
    initBiometric().then(() => {
      const { isAvailable, isEnabled } = useBiometricStore.getState();
      if (isAvailable && isEnabled && !hasTriedBiometric.current) {
        hasTriedBiometric.current = true;
        triggerBiometric();
      }
    });
  }, []);

  const triggerBiometric = async () => {
    const credentials = await authenticate();
    if (!credentials) return;
    try {
      await signIn(credentials.email, credentials.password);
      router.replace("/(tabs)");
    } catch {
      Alert.alert(
        "Biometric sign-in failed",
        "Your saved credentials may have changed. Please sign in with your password.",
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(
          "Apple Sign-In failed",
          e.message ?? "Something went wrong.",
        );
      }
    }
  };

  const headerY = useSharedValue(-20);
  const headerOpacity = useSharedValue(0);
  useEffect(() => {
    headerY.value = withDelay(50, withSpring(0, { damping: 16 }));
    headerOpacity.value = withDelay(50, withTiming(1, { duration: 400 }));
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
      setPendingCredentials(email.trim(), password);

      // ✅ Route to onboarding if not completed, otherwise go to tabs
      const { user } = useAuthStore.getState();
      if ((user as any)?.onboardingComplete === false) {
        useAuthStore.setState({ needsOnboarding: true });
        router.replace("/(auth)/onboarding/step1" as any);
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert(
        "Sign in failed",
        e.message ?? "Please check your credentials.",
      );
    }
  };

  const biometricLabel = getBiometricLabel(biometricType);

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

        {isAvailable && isEnabled && (
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={triggerBiometric}
              activeOpacity={0.8}
            >
              <Text style={styles.biometricIcon}>
                {biometricLabel === "Face ID" ? "🔒" : "👆"}
              </Text>
              <Text style={styles.biometricBtnText}>
                Sign in with {biometricLabel}
              </Text>
            </TouchableOpacity>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or use password</Text>
              <View style={styles.dividerLine} />
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(150).springify().damping(16)}
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

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => promptAsync()}
            disabled={!request || loading}
            activeOpacity={0.85}
          >
            <GoogleIcon size={20} />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={999}
              style={styles.appleBtn}
              onPress={handleAppleSignIn}
            />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup" as any)}
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
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 28 },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 15,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  biometricIcon: { fontSize: 20 },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.accent,
    letterSpacing: -0.2,
  },
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
  socialBtn: {
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
    marginBottom: 12,
  },
  socialBtnText: { fontSize: 15, fontWeight: "600", color: Colors.text },
  appleBtn: { width: "100%", height: 50, marginBottom: 12 },
  switchBtn: { alignItems: "center", marginTop: Spacing.md },
  switchText: { fontSize: 14, color: Colors.textSecondary },
  switchLink: { color: Colors.accent, fontWeight: "600" },
});
