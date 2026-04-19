import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../../constants/theme";
import { useReportStore } from "../../store/reportStore";
import { useThemeStore } from "../../store/themeStore";
import { Report } from "../../types";

function StatusBadge({ status }: { status: string }) {
  const { colors } = useThemeStore();
  const map: Record<string, { bg: string; text: string }> = {
    Normal: { bg: colors.healthyBg, text: colors.healthy },
    High: { bg: colors.dangerBg, text: colors.danger },
    Low: { bg: colors.warningBg, text: colors.warning },
    Unknown: { bg: colors.surfaceAlt, text: colors.textSecondary },
    Stable: { bg: colors.healthyBg, text: colors.healthy },
    "Needs Attention": { bg: colors.warningBg, text: colors.warning },
    Critical: { bg: colors.dangerBg, text: colors.danger },
  };
  const c = map[status] ?? map.Unknown;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const { colors } = useThemeStore();

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionCardHeader}
          onPress={() => setOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.sectionCardIcon,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Text style={styles.sectionCardIconText}>{icon}</Text>
          </View>
          <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
        {open && <View style={styles.sectionCardBody}>{children}</View>}
      </View>
    </Animated.View>
  );
}

export default function ReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { reports } = useReportStore();
  const { colors } = useThemeStore();
  const [report, setReport] = useState<Report | null>(null);
  const [screen, setScreen] = useState<"result" | "chat">("result");
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (reportId && reports.length > 0) {
      const found = reports.find((r) => r.reportId === reportId);
      if (found) {
        setReport(found);
      }
    }
  }, [reportId, reports]);

  if (!report) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Report not found
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: Spacing.xl,
    },
    backBtn: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
    },
    backText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    header: {
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: "300",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 999,
      padding: 4,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 999,
    },
    tabActive: {
      backgroundColor: colors.surface,
    },
    tabText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.text,
      fontWeight: "700",
    },
    reportThumb: {
      width: "100%",
      height: 160,
      borderRadius: 16,
      marginBottom: Spacing.md,
    },
    overallCard: {
      backgroundColor: colors.dark,
      borderRadius: 20,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      gap: 10,
    },
    overallLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: "rgba(255,255,255,0.4)",
    },
    overallRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    overallTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: "#fff",
      flex: 1,
      marginRight: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      marginBottom: 12,
      overflow: "hidden",
    },
    sectionCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: Spacing.md,
      gap: 12,
    },
    sectionCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    sectionCardIconText: {
      fontSize: 18,
    },
    sectionCardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    sectionCardBody: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: 8,
    },
    bodyText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 24,
    },
    findingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    findingLeft: {
      flex: 1,
    },
    findingMarker: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    findingValue: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 4,
    },
    stepDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginTop: 7,
    },
    stepText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      lineHeight: 22,
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Report Details</Text>
        <Text style={styles.subtitle}>
          {new Date(report.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.tabRow}>
        {(["result", "chat"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, screen === s && styles.tabActive]}
            onPress={() => setScreen(s)}
          >
            <Text
              style={[styles.tabText, screen === s && styles.tabTextActive]}
            >
              {s === "result" ? "Analysis" : "Ask AI"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {screen === "result" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {report.fileUrl && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Image
                source={{ uri: report.fileUrl }}
                style={styles.reportThumb}
                resizeMode="cover"
              />
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.overallCard}
          >
            <Text style={styles.overallLabel}>OVERALL STATUS</Text>
            <View style={styles.overallRow}>
              <Text style={styles.overallTitle} numberOfLines={2}>
                {report.fileName}
              </Text>
              <StatusBadge status={report.aiSummary.overallStatus} />
            </View>
          </Animated.View>

          <SectionCard icon="🧾" title="Summary">
            <Text style={styles.bodyText}>{report.aiSummary.summary}</Text>
          </SectionCard>

          <SectionCard icon="📊" title="Key Findings">
            {report.aiSummary.keyFindings.length === 0 ? (
              <Text style={styles.bodyText}>No specific markers found.</Text>
            ) : (
              report.aiSummary.keyFindings.map((f, i) => (
                <View key={i} style={styles.findingRow}>
                  <View style={styles.findingLeft}>
                    <Text style={styles.findingMarker}>{f.marker}</Text>
                    <Text style={styles.findingValue}>{f.value}</Text>
                  </View>
                  <StatusBadge status={f.status} />
                </View>
              ))
            )}
          </SectionCard>

          <SectionCard icon="⚠️" title="What It Could Mean">
            <Text style={styles.bodyText}>
              {report.aiSummary.whatItCouldMean}
            </Text>
          </SectionCard>

          <SectionCard icon="💡" title="Suggested Next Steps">
            {report.aiSummary.suggestedNextSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepDot} />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </SectionCard>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {screen === "chat" && (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            Chat feature coming soon
          </Text>
        </View>
      )}
    </View>
  );
}
