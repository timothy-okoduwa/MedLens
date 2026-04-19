// app/(auth)/onboarding/step2.tsx  — Existing Conditions
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, FadeInDown,
} from 'react-native-reanimated';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius } from '../../../constants/theme';

const STEP_COUNT = 3;

const CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma',
  'Arthritis', 'Thyroid Disorder', 'Kidney Disease', 'Liver Disease',
  'High Cholesterol', 'Obesity', 'Depression/Anxiety', 'Cancer',
  'HIV/AIDS', 'Epilepsy', 'Stroke', 'COPD',
];

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

export default function OnboardingStep2() {
  const { user, updateUser } = useAuthStore();
  const [selected, setSelected] = useState<string[]>(user?.conditions ?? []);

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

  const toggle = (c: string) => {
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleNext = async () => {
    await updateUser({ conditions: selected }).catch(() => {});
    router.push('/(auth)/onboarding/step3');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProgressBar step={2} />

        <Animated.View style={contentStyle}>
          <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
          <Text style={styles.title}>Any existing{'\n'}conditions?</Text>
          <Text style={styles.subtitle}>Select all that apply — helps AI give better context</Text>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.grid}>
            {CONDITIONS.map((c, i) => {
              const isActive = selected.includes(c);
              return (
                <Animated.View
                  key={c}
                  entering={FadeInDown.delay(150 + i * 30).springify().damping(14)}
                >
                  <TouchableOpacity
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => toggle(c)}
                    activeOpacity={0.8}
                  >
                    {isActive && <Text style={styles.checkmark}>✓ </Text>}
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>

          {selected.length > 0 && (
            <Animated.View entering={FadeInDown.springify()} style={styles.selectedNote}>
              <Text style={styles.selectedNoteText}>
                {selected.length} condition{selected.length !== 1 ? 's' : ''} selected
              </Text>
            </Animated.View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip — I have none</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.accent, marginBottom: 12 },
  title: { fontSize: 40, fontWeight: '300', color: Colors.text, letterSpacing: -1.8, lineHeight: 46, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.xl },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  checkmark: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  chipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.accent, fontWeight: '600' },
  selectedNote: {
    backgroundColor: Colors.healthyBg, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start', marginBottom: 24,
  },
  selectedNoteText: { fontSize: 13, color: Colors.healthy, fontWeight: '600' },
  footer: { gap: 12 },
  primaryBtn: { backgroundColor: Colors.text, paddingVertical: 15, borderRadius: Radius.full, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textInverse },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textTertiary },
});
