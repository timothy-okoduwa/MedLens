// app/intro.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import ic from "../components/icon-trans.png";
import { Colors } from "../constants/theme";

const { width, height } = Dimensions.get("window");

const WORDS = ["Understand.", "Track.", "Thrive."];
const ICONS = ["🫀", "🩺", "💊", "🧬", "🩻", "📊"];

function FloatingIcon({
  icon,
  x,
  y,
  delay,
  size,
}: {
  icon: string;
  x: number;
  y: number;
  delay: number;
  size: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const floatY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.18, { duration: 600 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 10, stiffness: 80 }),
    );
    floatY.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(-12, {
            duration: 2600 + Math.random() * 800,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: 2600 + Math.random() * 800,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[{ position: "absolute", left: x, top: y, fontSize: size }, style]}
    >
      {icon}
    </Animated.Text>
  );
}

export default function IntroScreen() {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  const pulse1 = useSharedValue(1);
  const pulse1Opacity = useSharedValue(0.5);
  const pulse2 = useSharedValue(1);
  const pulse2Opacity = useSharedValue(0.35);

  const word0Opacity = useSharedValue(0);
  const word0Y = useSharedValue(16);
  const word1Opacity = useSharedValue(0);
  const word1Y = useSharedValue(16);
  const word2Opacity = useSharedValue(0);
  const word2Y = useSharedValue(16);

  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(10);
  const containerOpacity = useSharedValue(1);

  const navigate = () => router.replace("/(auth)/welcome" as any);

  useEffect(() => {
    logoScale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 90 }),
    );
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

    ringScale.value = withDelay(
      400,
      withSpring(1, { damping: 14, stiffness: 70 }),
    );
    ringOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    pulse1.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      ),
    );
    pulse1Opacity.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          withTiming(0.4, { duration: 0 }),
        ),
        -1,
      ),
    );
    pulse2.value = withDelay(
      1050,
      withRepeat(
        withSequence(
          withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      ),
    );
    pulse2Opacity.value = withDelay(
      1050,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1600, easing: Easing.out(Easing.cubic) }),
          withTiming(0.25, { duration: 0 }),
        ),
        -1,
      ),
    );

    word0Opacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    word0Y.value = withDelay(900, withSpring(0, { damping: 16 }));
    word1Opacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    word1Y.value = withDelay(1200, withSpring(0, { damping: 16 }));
    word2Opacity.value = withDelay(1500, withTiming(1, { duration: 500 }));
    word2Y.value = withDelay(1500, withSpring(0, { damping: 16 }));

    taglineOpacity.value = withDelay(2000, withTiming(1, { duration: 600 }));
    taglineY.value = withDelay(2000, withSpring(0, { damping: 16 }));

    containerOpacity.value = withDelay(
      3400,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(navigate)();
      }),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const pulse1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: pulse1Opacity.value,
  }));
  const pulse2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: pulse2Opacity.value,
  }));
  const word0Style = useAnimatedStyle(() => ({
    opacity: word0Opacity.value,
    transform: [{ translateY: word0Y.value }],
  }));
  const word1Style = useAnimatedStyle(() => ({
    opacity: word1Opacity.value,
    transform: [{ translateY: word1Y.value }],
  }));
  const word2Style = useAnimatedStyle(() => ({
    opacity: word2Opacity.value,
    transform: [{ translateY: word2Y.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const wordStyles = [word0Style, word1Style, word2Style];
  const wordColors = [Colors.accent, Colors.text, Colors.healthy];

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {ICONS.map((ic, i) => (
        <FloatingIcon
          key={i}
          icon={ic}
          x={
            [
              width * 0.05,
              width * 0.75,
              width * 0.1,
              width * 0.68,
              width * 0.2,
              width * 0.78,
            ][i]
          }
          y={
            [
              height * 0.08,
              height * 0.12,
              height * 0.72,
              height * 0.7,
              height * 0.4,
              height * 0.45,
            ][i]
          }
          delay={300 + i * 120}
          size={[44, 38, 40, 42, 36, 40][i]}
        />
      ))}

      <View style={styles.logoCluster}>
        <Animated.View style={[styles.pulseRing, pulse2Style]} />
        <Animated.View
          style={[styles.pulseRing, styles.pulseRing2, pulse1Style]}
        />

        <Animated.View style={[styles.outerRing, ringStyle]}>
          {/* ── Icon image replaces the "M" letter ── */}
          <Animated.View style={[styles.logoMark, logoStyle]}>
            <Image source={ic} style={styles.logoImage} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.wordsRow}>
        {WORDS.map((word, i) => (
          <Animated.Text
            key={word}
            style={[styles.word, { color: wordColors[i] }, wordStyles[i]]}
          >
            {word}
          </Animated.Text>
        ))}
      </View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Your health, in plain English.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoCluster: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  pulseRing2: {
    borderColor: Colors.accentLight,
    borderWidth: 3,
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    // ── Dark background so the white icon strokes are always visible ──
    backgroundColor: Colors.accent,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 180,
    height: 180,
    // tintColor keeps the icon white/monochrome against the accent bg
    tintColor: "#ffffff",
  },
  wordsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  word: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
});
