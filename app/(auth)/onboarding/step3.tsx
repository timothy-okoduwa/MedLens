// app/(auth)/onboarding/step3.tsx  — Current Medications + Completion
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, withSequence, FadeInDown, ZoomIn,
} from 'react-native-reanimated';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, Shadow } from '../../../constants/theme';

const STEP_COUNT = 3;

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, { backgroundColor: i < step ? Colors.accent : Colors.border }]}
        />
      ))}
    </View>
  );
}

// Animated completion screen
function CompletionView({ name }: { name: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const textY = useSharedValue(20);

  useEffect(() => {
    scale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 100 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    textY.value = withDelay(400, withSpring(0, { damping: 16 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const textStyle = useAnimatedStyle(() => ({ transform: [{ translateY: textY.value }], opacity: opacity.value }));

  return (
    <View style={styles.completionWrap}>
      <Animated.View style={[styles.completionIcon, iconStyle]}>
        <Text style={styles.completionEmoji}>✓</Text>
      </Animated.View>
      <Animated.View style={textStyle}>
        <Text style={styles.completionTitle}>You're all set,{'\n'}{name?.split(' ')[0] ?? 'there'}!</Text>
        <Text style={styles.completionSub}>
          MedLens is ready to help you understand your health clearly.
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.completionFeatures}>
        {[
          { icon: '📄', text: 'Upload medical reports' },
          { icon: '🧠', text: 'AI explanations in plain English' },
          { icon: '💬', text: 'Chat about your results' },
          { icon: '📊', text: 'Track your health over time' },
        ].map((f, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(700 + i * 80).springify()} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

export default function OnboardingStep3() {
  const { user, updateUser, completeOnboarding } = useAuthStore();
  const [medInput, setMedInput] = useState('');
  const [medications, setMedications] = useState<string[]>(user?.currentMedications ?? []);
  const [done, setDone] = useState(false);

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

  const addMed = () => {
    const trimmed = medInput.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications((prev) => [...prev, trimmed]);
      setMedInput('');
    }
  };

  const removeMed = (m: string) => setMedications((prev) => prev.filter((x) => x !== m));

  const handleFinish = async () => {
    await updateUser({ currentMedications: medications, onboardingComplete: true }).catch(() => {});
    completeOnboarding();
    setDone(true);
  };

  const handleGoToDashboard = () => {
    router.replace('/(tabs)');
  };

  if (done) {
    return (
      <View style={[styles.container, styles.completionContainer]}>
        <CompletionView name={user?.name ?? ''} />
        <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.goBtn}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToDashboard} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ProgressBar step={3} />

        <Animated.View style={contentStyle}>
          <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
          <Text style={styles.title}>Current{'\n'}medications</Text>
          <Text style={styles.subtitle}>Optional — helps AI give safer, more relevant advice</Text>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={medInput}
              onChangeText={setMedInput}
              placeholder="e.g. Metformin 500mg"
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={addMed}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMed} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </Animated.View>

          {medications.length > 0 && (
            <Animated.View entering={FadeInDown.springify()} style={styles.medList}>
              {medications.map((m, i) => (
                <Animated.View key={m} entering={FadeInDown.delay(i * 50).springify()} style={styles.medTag}>
                  <Text style={styles.medTagText}>{m}</Text>
                  <TouchableOpacity onPress={() => removeMed(m)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️  This app does not provide medical advice. Always consult a qualified healthcare professional.
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Complete Setup →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  completionContainer: { paddingHorizontal: Spacing.xl, paddingTop: 80, paddingBottom: 48 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, color: Colors.accent, marginBottom: 12 },
  title: { fontSize: 40, fontWeight: '300', color: Colors.text, letterSpacing: -1.8, lineHeight: 46, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.text, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md, justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textInverse },
  medList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  medTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentLight, borderRadius: Radius.full,
    paddingLeft: 14, paddingRight: 10, paddingVertical: 8,
  },
  medTagText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  removeBtn: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { fontSize: 14, color: '#fff', lineHeight: 16 },
  disclaimer: {
    backgroundColor: Colors.warningBg, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 32,
  },
  disclaimerText: { fontSize: 13, color: Colors.warning, lineHeight: 20 },
  footer: { gap: 12 },
  primaryBtn: { backgroundColor: Colors.text, paddingVertical: 15, borderRadius: Radius.full, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textInverse },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textTertiary },
  // Completion
  completionWrap: { flex: 1, justifyContent: 'center', gap: 24 },
  completionIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.healthy, justifyContent: 'center', alignItems: 'center',
  },
  completionEmoji: { fontSize: 36, color: '#fff', fontWeight: '700' },
  completionTitle: { fontSize: 38, fontWeight: '300', color: Colors.text, letterSpacing: -1.5, lineHeight: 44 },
  completionSub: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24, marginTop: 8 },
  completionFeatures: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  goBtn: { paddingBottom: 8 },
});
