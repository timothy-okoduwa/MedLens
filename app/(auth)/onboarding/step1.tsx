// app/(auth)/onboarding/step1.tsx
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
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
import { Colors, Radius, Spacing } from "../../../constants/theme";
import { useAuthStore } from "../../../store/authStore";

const { width } = Dimensions.get("window");
const ITEM_H = 52;
const VISIBLE = 5; // odd number — center item is selected
const PICKER_H = ITEM_H * VISIBLE;

// ── Height data: 4'0" → 7'0" in inches, displayed as ft'in" ─────────────────
function buildHeightOptions() {
  const opts: { label: string; inches: number }[] = [];
  for (let total = 48; total <= 84; total++) {
    const ft = Math.floor(total / 12);
    const ins = total % 12;
    opts.push({ label: `${ft}'${ins}"`, inches: total });
  }
  return opts;
}
const HEIGHT_OPTIONS = buildHeightOptions();
const DEFAULT_HEIGHT_IDX = HEIGHT_OPTIONS.findIndex((h) => h.inches === 67); // 5'7"

// ── Age: 5 → 110 ─────────────────────────────────────────────────────────────
const AGE_OPTIONS = Array.from({ length: 106 }, (_, i) => i + 5);
const DEFAULT_AGE_IDX = AGE_OPTIONS.indexOf(28);

// ── Weight in lbs: 66 → 440 ──────────────────────────────────────────────────
const WEIGHT_OPTIONS = Array.from({ length: 375 }, (_, i) => i + 66);
const DEFAULT_WEIGHT_LBS = 154;
const DEFAULT_WEIGHT_IDX = WEIGHT_OPTIONS.indexOf(DEFAULT_WEIGHT_LBS);

// BMI-based color for weight (uses selected height in inches)
function weightColor(lbs: number, heightInches: number): string {
  if (heightInches <= 0) return Colors.accent;
  const bmi = (lbs / (heightInches * heightInches)) * 703;
  if (bmi < 18.5) return "#64B5F6"; // underweight — cool blue
  if (bmi < 25) return "#4CAF50"; // healthy — green
  if (bmi < 30) return "#FFA726"; // overweight — amber
  if (bmi < 35) return "#EF5350"; // obese — red
  return "#B71C1C"; // severely obese — dark red
}

function weightEmoji(lbs: number, heightInches: number): string {
  if (heightInches <= 0) return "⚖️";
  const bmi = (lbs / (heightInches * heightInches)) * 703;
  if (bmi < 18.5) return "🧊";
  if (bmi < 25) return "✨";
  if (bmi < 30) return "🔶";
  if (bmi < 35) return "🔴";
  return "⚠️";
}

function weightLabel(lbs: number, heightInches: number): string {
  if (heightInches <= 0) return "";
  const bmi = (lbs / (heightInches * heightInches)) * 703;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight 🎉";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese";
  return "Severely obese";
}

// ── Scroll Picker ─────────────────────────────────────────────────────────────
function ScrollPicker<T>({
  options,
  defaultIndex,
  renderLabel,
  onSelect,
  itemColor,
  selectedColor,
}: {
  options: T[];
  defaultIndex: number;
  renderLabel: (item: T) => string;
  onSelect: (item: T, index: number) => void;
  itemColor?: string;
  selectedColor?: string;
}) {
  const ref = useRef<ScrollView>(null);
  const [selectedIdx, setSelectedIdx] = useState(defaultIndex);
  const resolvedColor = selectedColor ?? Colors.accent;

  useEffect(() => {
    // Scroll to default after mount
    setTimeout(() => {
      ref.current?.scrollTo({
        y: defaultIndex * ITEM_H,
        animated: false,
      });
    }, 50);
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    setSelectedIdx(clamped);
    onSelect(options[clamped], clamped);
  };

  return (
    <View style={styles.pickerContainer}>
      {/* Selection highlight */}
      <View
        style={[
          styles.pickerHighlight,
          { borderColor: resolvedColor, backgroundColor: resolvedColor + "18" },
        ]}
      />
      <ScrollView
        ref={ref}
        style={{ height: PICKER_H }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_H * Math.floor(VISIBLE / 2),
        }}
      >
        {options.map((item, i) => {
          const isSelected = i === selectedIdx;
          return (
            <View key={i} style={styles.pickerItem}>
              <Text
                style={[
                  styles.pickerItemText,
                  {
                    color: isSelected
                      ? resolvedColor
                      : (itemColor ?? Colors.textTertiary),
                    fontSize: isSelected ? 22 : 17,
                    fontWeight: isSelected ? "700" : "400",
                    opacity: isSelected
                      ? 1
                      : Math.abs(i - selectedIdx) === 1
                        ? 0.55
                        : 0.25,
                  },
                ]}
              >
                {renderLabel(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Fade top */}
      <View style={styles.pickerFadeTop} pointerEvents="none" />
      {/* Fade bottom */}
      <View style={styles.pickerFadeBottom} pointerEvents="none" />
    </View>
  );
}

// ── Gender chips ──────────────────────────────────────────────────────────────
const GENDERS = [
  { label: "Male", emoji: "👨" },
  { label: "Female", emoji: "👩" },
  { label: "Other", emoji: "🧑" },
  { label: "Prefer not to say", emoji: "🤐" },
];

const STEP_COUNT = 3;

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            { backgroundColor: i < step ? Colors.accent : Colors.border },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingStep1() {
  const { user, updateUser } = useAuthStore();

  const [ageIdx, setAgeIdx] = useState(DEFAULT_AGE_IDX);
  const [heightIdx, setHeightIdx] = useState(DEFAULT_HEIGHT_IDX);
  const [weightIdx, setWeightIdx] = useState(DEFAULT_WEIGHT_IDX);
  const [gender, setGender] = useState(user?.gender ?? "");

  const selectedAge = AGE_OPTIONS[ageIdx];
  const selectedHeight = HEIGHT_OPTIONS[heightIdx];
  const selectedWeight = WEIGHT_OPTIONS[weightIdx];
  const wColor = weightColor(selectedWeight, selectedHeight.inches);
  const wEmoji = weightEmoji(selectedWeight, selectedHeight.inches);
  const wLabel = weightLabel(selectedWeight, selectedHeight.inches);

  // Convert lbs → kg for storage, height inches → cm
  const heightCm = Math.round(selectedHeight.inches * 2.54);
  const weightKg = Math.round(selectedWeight * 0.453592);

  const contentY = useSharedValue(30);
  const contentOpacity = useSharedValue(0);
  useEffect(() => {
    contentY.value = withDelay(100, withSpring(0, { damping: 16 }));
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
  }, []);
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOpacity.value,
  }));

  const handleNext = async () => {
    await updateUser({
      age: selectedAge,
      gender: gender || undefined,
      height: heightCm,
      weight: weightKg,
    }).catch(() => {});
    router.push("/(auth)/onboarding/step2");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressBar step={1} />

        <Animated.View style={contentStyle}>
          <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
          <Text style={styles.title}>Tell us{"\n"}about you</Text>
          <Text style={styles.subtitle}>
            Scroll to set your stats — we use this to personalise your
            experience
          </Text>

          {/* ── Age ── */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🎂</Text>
              <Text style={styles.sectionTitle}>Age</Text>
              <Text style={[styles.sectionValue, { color: Colors.accent }]}>
                {selectedAge} yrs
              </Text>
            </View>
            <ScrollPicker
              options={AGE_OPTIONS}
              defaultIndex={DEFAULT_AGE_IDX}
              renderLabel={(item) => `${item}`}
              onSelect={(_, idx) => setAgeIdx(idx)}
            />
          </Animated.View>

          {/* ── Height ── */}
          <Animated.View
            entering={FadeInDown.delay(280).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>📏</Text>
              <Text style={styles.sectionTitle}>Height</Text>
              <Text style={[styles.sectionValue, { color: Colors.accent }]}>
                {selectedHeight.label}
              </Text>
            </View>
            <ScrollPicker
              options={HEIGHT_OPTIONS}
              defaultIndex={DEFAULT_HEIGHT_IDX}
              renderLabel={(item) => item.label}
              onSelect={(_, idx) => setHeightIdx(idx)}
            />
          </Animated.View>

          {/* ── Weight ── */}
          <Animated.View
            entering={FadeInDown.delay(360).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{wEmoji}</Text>
              <Text style={styles.sectionTitle}>Weight</Text>
              <Text style={[styles.sectionValue, { color: wColor }]}>
                {selectedWeight} lbs
              </Text>
            </View>
            <ScrollPicker
              options={WEIGHT_OPTIONS}
              defaultIndex={DEFAULT_WEIGHT_IDX}
              renderLabel={(item) => `${item} lbs`}
              onSelect={(_, idx) => setWeightIdx(idx)}
              selectedColor={wColor}
            />
            {/* BMI feedback badge */}
            <View
              style={[
                styles.bmiBadge,
                { backgroundColor: wColor + "22", borderColor: wColor + "55" },
              ]}
            >
              <Text style={[styles.bmiBadgeText, { color: wColor }]}>
                {wEmoji} {wLabel}
              </Text>
            </View>
          </Animated.View>

          {/* ── Gender ── */}
          <Animated.View
            entering={FadeInDown.delay(440).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🧬</Text>
              <Text style={styles.sectionTitle}>Gender</Text>
              <Text
                style={[styles.sectionValue, { color: Colors.textTertiary }]}
              >
                optional
              </Text>
            </View>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.label}
                  style={[
                    styles.genderChip,
                    gender === g.label && styles.genderChipActive,
                  ]}
                  onPress={() => setGender(gender === g.label ? "" : g.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genderEmoji}>{g.emoji}</Text>
                  <Text
                    style={[
                      styles.genderLabel,
                      gender === g.label && styles.genderLabelActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
  progressRow: { flexDirection: "row", gap: 6, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: Colors.accent,
    marginBottom: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -1.8,
    lineHeight: 46,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 36,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  // Picker
  pickerContainer: {
    height: PICKER_H,
    overflow: "hidden",
    position: "relative",
  },
  pickerHighlight: {
    position: "absolute",
    top: ITEM_H * Math.floor(VISIBLE / 2),
    left: 0,
    right: 0,
    height: ITEM_H,
    borderRadius: 12,
    borderWidth: 1.5,
    zIndex: 1,
    pointerEvents: "none",
  },
  pickerItem: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    letterSpacing: -0.3,
  },
  pickerFadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 1.5,
    // Gradient-like fade using nested views isn't natively possible,
    // but we overlay a semi-transparent view to soften top/bottom
    backgroundColor: Colors.surface,
    opacity: 0.55,
    zIndex: 2,
    pointerEvents: "none",
  },
  pickerFadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 1.5,
    backgroundColor: Colors.surface,
    opacity: 0.55,
    zIndex: 2,
    pointerEvents: "none",
  },
  // BMI badge
  bmiBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  bmiBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  // Gender
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderChipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  genderEmoji: { fontSize: 16 },
  genderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  genderLabelActive: { color: Colors.accent, fontWeight: "600" },
  // Footer
  footer: { marginTop: 8, gap: 12 },
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
  },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textTertiary },
});
