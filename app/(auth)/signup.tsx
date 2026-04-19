// app/(auth)/signup.tsx
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

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signUp, signInWithGoogle, loading } = useAuthStore();

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
          .then(() => router.replace("/(auth)/onboarding/step1"))
          .catch((e: any) => Alert.alert("Google Sign-In failed", e.message));
      }
    }
  }, [response]);

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

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(auth)/onboarding/step1");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message ?? "Something went wrong.");
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
          <Text style={styles.title}>Create{"\n"}account</Text>
          <Text style={styles.subtitle}>Join MedLens — it's free</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).springify().damping(16)}
          style={styles.form}
        >
          {[
            {
              key: "name",
              label: "FULL NAME",
              value: name,
              setter: setName,
              placeholder: "Jane Doe",
              keyboard: "default" as const,
              cap: "words" as const,
              secure: false,
            },
            {
              key: "email",
              label: "EMAIL",
              value: email,
              setter: setEmail,
              placeholder: "you@example.com",
              keyboard: "email-address" as const,
              cap: "none" as const,
              secure: false,
            },
            {
              key: "password",
              label: "PASSWORD",
              value: password,
              setter: setPassword,
              placeholder: "Min. 6 characters",
              keyboard: "default" as const,
              cap: "none" as const,
              secure: true,
            },
          ].map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === field.key && styles.inputFocused,
                ]}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType={field.keyboard}
                autoCapitalize={field.cap}
                secureTextEntry={field.secure}
                autoCorrect={false}
                onFocus={() => setFocusedField(field.key)}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Creating account…" : "Create Account"}
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

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin")}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            By continuing, you agree that this app does not provide medical
            advice.
          </Text>
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
  form: { gap: 20, marginBottom: Spacing.xl },
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
  switchBtn: { alignItems: "center", marginBottom: Spacing.md },
  switchText: { fontSize: 14, color: Colors.textSecondary },
  switchLink: { color: Colors.accent, fontWeight: "600" },
  disclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 16,
  },
});
