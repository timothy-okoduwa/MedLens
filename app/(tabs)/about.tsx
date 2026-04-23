import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../../constants/theme";
import { useThemeStore } from "../../store/themeStore";

const SOCIALS = [
  {
    icon: "logo-twitter" as const,
    label: "Twitter / X",
    handle: "@medlensapp",
    url: "https://twitter.com/medlensapp",
    color: "#1DA1F2",
  },
  {
    icon: "logo-instagram" as const,
    label: "Instagram",
    handle: "@medlens.app",
    url: "https://instagram.com/medlens.app",
    color: "#E1306C",
  },
  {
    icon: "mail-outline" as const,
    label: "Email",
    handle: "hello@medlens.health",
    url: "mailto:hello@medlens.health",
    color: "#FF6B35",
  },
  //   {
  //     icon: "logo-github" as const,
  //     label: "GitHub",
  //     handle: "medlens-app",
  //     url: "https://github.com/medlens-app",
  //     color: "#333",
  //   },
];

const FEATURES = [
  {
    icon: "scan-outline" as const,
    title: "Report Analysis",
    body: "Upload a lab result, blood work, or scan and our AI breaks it down in plain English — no medical degree required.",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    title: "Ask AI",
    body: "Have questions about your results? Chat directly with the AI that read your report. It remembers everything.",
  },
  {
    icon: "alarm-outline" as const,
    title: "Medication Reminders",
    body: "Prescribed medications are automatically extracted from your reports and scheduled as daily reminders. Never miss a dose.",
  },
  {
    icon: "calendar-outline" as const,
    title: "Calendar Sync",
    body: "Medication schedules land straight into your phone's calendar — exactly as long as the doctor prescribed.",
  },
  {
    icon: "bar-chart-outline" as const,
    title: "Health Metrics",
    body: "Track blood pressure, heart rate, glucose, and more. See trends over time, not just snapshots.",
  },
  {
    icon: "notifications-outline" as const,
    title: "Smart Notifications",
    body: "Get reminded about medications, flag important findings, and stay on top of your health without opening the app.",
  },
];

export default function AboutScreen() {
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View
            style={[styles.heroIcon, { backgroundColor: colors.accentLight }]}
          >
            <Text style={styles.heroEmoji}>🩺</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            MedLens
          </Text>
          <Text style={[styles.heroVersion, { color: colors.textTertiary }]}>
            Version 1.0.0
          </Text>
          <Text style={[styles.heroTagline, { color: colors.textSecondary }]}>
            Your medical reports, finally in plain English.
          </Text>
        </View>

        {/* ── Mission ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Why MedLens Exists
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Picture this: you just got your lab results back. The paper is
            covered in acronyms, numbers, and reference ranges that mean
            absolutely nothing to you. You Google one value and somehow end up
            convinced you have three rare diseases.{"\n\n"}
            We've all been there.{"\n\n"}
            MedLens was built to fix that.{" "}
            <Text style={{ color: colors.danger, fontWeight: "700" }}>
              Not to replace your doctor — never that —
            </Text>{" "}
            but to make sure you walk into every appointment actually
            understanding what your body is doing. Informed patients ask better
            questions. Better questions lead to better care.{"\n\n"}
            That's the whole mission. Simple.
          </Text>
        </View>

        {/* ── Features ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          WHAT IT DOES
        </Text>
        {FEATURES.map((f, i) => (
          <View
            key={i}
            style={[styles.featureRow, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Ionicons name={f.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                {f.title}
              </Text>
              <Text
                style={[styles.featureBody, { color: colors.textSecondary }]}
              >
                {f.body}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Philosophy ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            The Fine Print (That Matters)
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.danger, fontWeight: "700" }}>
              MedLens is a tool, not a doctor.
            </Text>{" "}
            Our AI is genuinely good at explaining medical reports — but it
            doesn't know your full history, it can't examine you, and it{" "}
            <Text style={{ color: colors.danger, fontWeight: "700" }}>
              absolutely cannot replace a qualified healthcare professional.
            </Text>
            {"\n\n"}
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Use MedLens to understand. Use your doctor to decide.
            </Text>
            {"\n\n"}
            We take your health data seriously. Everything is encrypted, nothing
            is sold, and you can delete your entire account and all associated
            data at any time from Settings. No questions {"\n\n"} asked.
          </Text>
        </View>

        {/* ── Built with ── */}
        <View style={[styles.card, { backgroundColor: colors.accentLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Built with 🧡
          </Text>
          <Text style={[styles.body, { color: colors.accent, opacity: 0.85 }]}>
            With cutting edge technologies and smart LLM that can understand
            your medical reports {"\n\n"}
            Designed and developed by a team that got tired of not understanding
            their own lab results. If that resonates — welcome home.
          </Text>
        </View>

        {/* ── Socials ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          FIND US
        </Text>
        <View style={[styles.socialsCard, { backgroundColor: colors.surface }]}>
          {SOCIALS.map((s, i) => (
            <View key={s.label}>
              <TouchableOpacity
                style={styles.socialRow}
                onPress={() => Linking.openURL(s.url)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.socialIcon,
                    { backgroundColor: s.color + "18" },
                  ]}
                >
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <View style={styles.socialText}>
                  <Text style={[styles.socialLabel, { color: colors.text }]}>
                    {s.label}
                  </Text>
                  <Text
                    style={[
                      styles.socialHandle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {s.handle}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={14}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
              {i < SOCIALS.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.borderLight },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          © {new Date().getFullYear()} MedLens. Made with care and a healthy
          dose of caffeine.{"\n"}
          <Text style={{ color: colors.danger, fontWeight: "600" }}>
            Not a substitute for professional medical advice.
          </Text>
        </Text>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 40 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: { fontSize: 15 },

  hero: { alignItems: "center", marginBottom: Spacing.xl, gap: 8 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 34, fontWeight: "700", letterSpacing: -1 },
  heroVersion: { fontSize: 13 },
  heroTagline: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 18,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 26 },

  featureRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: 10,
    gap: 14,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 15, fontWeight: "600" },
  featureBody: { fontSize: 13, lineHeight: 20 },

  socialsCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 14,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  socialText: { flex: 1 },
  socialLabel: { fontSize: 14, fontWeight: "600" },
  socialHandle: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginLeft: Spacing.md + 36 + 14 },

  footer: { fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
});
