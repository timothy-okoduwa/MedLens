// app/(auth)/onboarding/step1.tsx  — Personal Info
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, FadeInDown,
} from 'react-native-reanimated';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius } from '../../../constants/theme';

const STEP_COUNT = 3;

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => {
        const active = i < step;
        const w = useSharedValue(active ? 1 : 0);
        useEffect(() => {
          w.value = withTiming(active ? 1 : 0.3, { duration: 400 });
        }, [active]);
        const barStyle = useAnimatedStyle(() => ({ opacity: w.value }));
        return (
          <Animated.View
            key={i}
            style={[styles.progressSegment, { backgroundColor: active ? Colors.accent : Colors.border }, barStyle]}
          />
        );
      })}
    </View>
  );
}

export default function OnboardingStep1() {
  const { user, updateUser } = useAuthStore();
  const [age, setAge] = useState(user?.age?.toString() ?? '');
  const [gender, setGender] = useState(user?.gender ?? '');
  const [height, setHeight] = useState(user?.height?.toString() ?? '');
  const [weight, setWeight] = useState(user?.weight?.toString() ?? '');
  const [focused, setFocused] = useState<string | null>(null);

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
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
    }).catch(() => {});
    router.push('/(auth)/onboarding/step2');
  };

  const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ProgressBar step={1} />

        <Animated.View style={contentStyle}>
          <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
          <Text style={styles.title}>Tell us{'\n'}about you</Text>
          <Text style={styles.subtitle}>This helps us personalise your experience</Text>

          <View style={styles.form}>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <View style={styles.row2}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>AGE</Text>
                  <TextInput
                    style={[styles.input, focused === 'age' && styles.inputFocused]}
                    value={age} onChangeText={setAge}
                    placeholder="e.g. 28" placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    onFocus={() => setFocused('age')} onBlur={() => setFocused(null)}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>HEIGHT (cm)</Text>
                  <TextInput
                    style={[styles.input, focused === 'height' && styles.inputFocused]}
                    value={height} onChangeText={setHeight}
                    placeholder="e.g. 170" placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    onFocus={() => setFocused('height')} onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>WEIGHT (kg)</Text>
                <TextInput
                  style={[styles.input, focused === 'weight' && styles.inputFocused]}
                  value={weight} onChangeText={setWeight}
                  placeholder="e.g. 70" placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  onFocus={() => setFocused('weight')} onBlur={() => setFocused(null)}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>GENDER (optional)</Text>
                <View style={styles.chipRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, gender === g && styles.chipActive]}
                      onPress={() => setGender(gender === g ? '' : g)}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.accent, marginBottom: 12 },
  title: { fontSize: 40, fontWeight: '300', color: Colors.text, letterSpacing: -1.8, lineHeight: 46, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 36 },
  form: { gap: 24 },
  row2: { flexDirection: 'row', gap: Spacing.md },
  inputGroup: { gap: Spacing.sm },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.accent, backgroundColor: '#FFFAF8' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  footer: { marginTop: 40, gap: 12 },
  primaryBtn: { backgroundColor: Colors.text, paddingVertical: 15, borderRadius: Radius.full, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textInverse },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textTertiary },
});
