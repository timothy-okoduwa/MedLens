// app/(auth)/welcome.tsx
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GoogleIcon } from "../../components/GoogleIcon";
import { Colors, Radius, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

function FloatingCard({
  label,
  value,
  color,
  delay,
  x,
  y,
  rotate,
}: {
  label: string;
  value: string;
  color: string;
  delay: number;
  x: number;
  y: number;
  rotate: string;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const float = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 14 }));
    float.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value + float.value }, { rotate }],
  }));

  return (
    <Animated.View style={[styles.floatCard, { left: x, top: y }, cardStyle]}>
      <View style={[styles.floatDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.floatValue}>{value}</Text>
        <Text style={styles.floatLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { signInWithGoogle, loading } = useAuthStore();

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
          .then(() => router.replace("/(auth)/onboarding/step1" as any))
          .catch((e: any) => Alert.alert("Google Sign-In failed", e.message));
      }
    }
  }, [response]);

  const bgScale = useSharedValue(0.85);
  const bgOpacity = useSharedValue(0);
  const logoY = useSharedValue(30);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const titleY = useSharedValue(40);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const btnsY = useSharedValue(50);
  const btnsOpacity = useSharedValue(0);

  useEffect(() => {
    bgScale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    bgOpacity.value = withTiming(1, { duration: 800 });
    logoY.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 80 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    logoScale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 100 }),
    );
    titleY.value = withDelay(
      450,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    titleOpacity.value = withDelay(450, withTiming(1, { duration: 600 }));
    subOpacity.value = withDelay(650, withTiming(1, { duration: 600 }));
    btnsY.value = withDelay(
      750,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    btnsOpacity.value = withDelay(750, withTiming(1, { duration: 700 }));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: bgOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));
  const btnsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnsY.value }],
    opacity: btnsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.blob1, bgStyle]} />
      <Animated.View style={[styles.blob2, bgStyle]} />
      <Animated.View style={[styles.blob3, bgStyle]} />

      <FloatingCard
        label="Heart Rate"
        value="72 BPM"
        color={Colors.accent}
        delay={1000}
        x={-10}
        y={height * 0.1}
        rotate="-6deg"
      />
      <FloatingCard
        label="Blood Pressure"
        value="120/80"
        color={Colors.healthy}
        delay={1200}
        x={width * 0.52}
        y={height * 0.17}
        rotate="4deg"
      />
      <FloatingCard
        label="SpO₂"
        value="98%"
        color="#6C63FF"
        delay={1400}
        x={width * 0.58}
        y={height * 0.44}
        rotate="-3deg"
      />

      <View style={styles.content}>
        <Animated.View style={[styles.logoArea, logoStyle]}>
          <View style={styles.logoRing}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>M</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text style={styles.tagline}>See your health</Text>
          <Text style={styles.taglineAccent}>clearly.</Text>
        </Animated.View>

        <Animated.View style={[styles.subtitleWrap, subStyle]}>
          <Text style={styles.subtitle}>
            Upload reports. Get plain-English explanations.{"\n"}Chat with AI.
            Track your health over time.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.buttons, btnsStyle]}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => promptAsync()}
            disabled={!request || loading}
            activeOpacity={0.85}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/(auth)/signup" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Create an account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.push("/(auth)/signin" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>
              Already have an account?{" "}
              <Text style={styles.ghostBtnLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={subStyle}>
          <Text style={styles.disclaimer}>
            Not medical advice. Always consult a qualified healthcare
            professional.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: Colors.accentLight,
    top: -width * 0.35,
    right: -width * 0.25,
    opacity: 0.55,
  },
  blob2: {
    position: "absolute",
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: "#DFF0FF",
    bottom: height * 0.1,
    left: -width * 0.2,
    opacity: 0.5,
  },
  blob3: {
    position: "absolute",
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: "#E8F5E9",
    top: height * 0.35,
    right: -width * 0.1,
    opacity: 0.45,
  },
  floatCard: {
    position: "absolute",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...Shadow.md,
  },
  floatDot: { width: 8, height: 8, borderRadius: 4 },
  floatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  floatLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.42,
    paddingBottom: 32,
    justifyContent: "flex-end",
  },
  logoArea: { position: "absolute", top: -height * 0.3, left: Spacing.xl },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    fontSize: 38,
    fontWeight: "800",
    color: Colors.textInverse,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 46,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 50,
  },
  taglineAccent: {
    fontSize: 46,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: -2,
    lineHeight: 52,
    marginBottom: Spacing.md,
  },
  subtitleWrap: { marginBottom: Spacing.xl },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  buttons: { gap: 12, marginBottom: Spacing.lg },
  googleBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textTertiary },
  primaryBtn: {
    backgroundColor: Colors.text,
    paddingVertical: 15,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textInverse,
    letterSpacing: -0.2,
  },
  ghostBtn: { alignItems: "center", paddingVertical: 8 },
  ghostBtnText: { fontSize: 14, color: Colors.textSecondary },
  ghostBtnLink: { color: Colors.accent, fontWeight: "600" },
  disclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 16,
  },
});
