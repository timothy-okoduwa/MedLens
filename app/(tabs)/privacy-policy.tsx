import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Spacing } from "../../constants/theme";
import { useThemeStore } from "../../store/themeStore";

export default function PrivacyPolicyScreen() {
  const { colors } = useThemeStore();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: 48,
    },
    header: {
      marginBottom: Spacing.xl,
    },
    backBtn: {
      marginBottom: Spacing.lg,
    },
    backText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    title: {
      fontSize: 28,
      fontWeight: "300",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: Spacing.md,
    },
    section: {
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    body: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.body}>
            We collect medical reports, health metrics, and user account
            information that you voluntarily provide.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
          <Text style={styles.body}>
            Your data is used to provide AI-powered medical report analysis and
            personalized health insights. We do not share your medical data with
            third parties without your explicit consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Security</Text>
          <Text style={styles.body}>
            We use industry-standard encryption and Firebase security to protect
            your sensitive health information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Rights</Text>
          <Text style={styles.body}>
            You have the right to access, modify, or delete your personal data
            at any time through your account settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Contact Us</Text>
          <Text style={styles.body}>
            If you have privacy concerns, please contact us at:
            support@medlens.health
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
