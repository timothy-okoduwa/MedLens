// app/(tabs)/index.tsx  — Home Dashboard
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useReportStore } from "../../store/reportStore";
import { Report } from "../../types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    Stable: { bg: Colors.healthyBg, text: Colors.healthy },
    "Needs Attention": { bg: Colors.warningBg, text: Colors.warning },
    Critical: { bg: Colors.dangerBg, text: Colors.danger },
  };
  const c = map[status] ?? {
    bg: Colors.surfaceAlt,
    text: Colors.textSecondary,
  };
  return (
    <View style={[styles.statusTag, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusTagText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function ReportCard({ report, delay }: { report: Report; delay: number }) {
  const date = new Date(report.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)}>
      <TouchableOpacity
        style={styles.reportCard}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/report/[id]",
            params: { id: report.reportId },
          })
        }
        activeOpacity={0.85}
      >
        <View style={styles.reportCardIcon}>
          <Ionicons name="document-text" size={22} color={Colors.accent} />
        </View>
        <View style={styles.reportCardBody}>
          <Text style={styles.reportCardName} numberOfLines={1}>
            {report.fileName}
          </Text>
          <Text style={styles.reportCardDate}>{dateStr}</Text>
        </View>
        {report.aiSummary?.overallStatus && (
          <StatusTag status={report.aiSummary.overallStatus} />
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors.textTertiary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { reports, fetchReports, loading } = useReportStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchReports(user.id).catch(() => {});
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchReports(user.id).catch(() => {});
    setRefreshing(false);
  }, [user]);

  const lastReport = reports[0];
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.header}
        >
          <View>
            <Text style={styles.greetingText}>{greeting()},</Text>
            <Text style={styles.nameText}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(user?.name ?? "U")[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Last report summary card */}
        {lastReport ? (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(14)}
          >
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/insights",
                  params: { reportId: lastReport.reportId },
                })
              }
              activeOpacity={0.88}
            >
              <View style={styles.summaryCardTop}>
                <Text style={styles.summaryCardLabel}>LAST REPORT STATUS</Text>
                {lastReport.aiSummary?.overallStatus && (
                  <StatusTag status={lastReport.aiSummary.overallStatus} />
                )}
              </View>
              <Text style={styles.summaryCardTitle} numberOfLines={1}>
                {lastReport.fileName}
              </Text>
              <Text style={styles.summaryCardDate}>
                {new Date(lastReport.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}
              </Text>
              {lastReport.aiSummary?.summary ? (
                <Text style={styles.summaryCardText} numberOfLines={2}>
                  {lastReport.aiSummary.summary}
                </Text>
              ) : null}
              <View style={styles.summaryCardCta}>
                <Text style={styles.summaryCardCtaText}>
                  View full analysis →
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(14)}
          >
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyCardTitle}>No reports yet</Text>
              <Text style={styles.emptyCardSub}>
                Upload your first medical report to get started
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(160).springify()}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(14)}
          style={styles.actionsRow}
        >
          <TouchableOpacity
            style={styles.actionCardPrimary}
            onPress={() => router.push("/(tabs)/insights")}
            activeOpacity={0.87}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="cloud-upload-outline" size={26} color="#fff" />
            </View>
            <Text style={styles.actionCardPrimaryText}>Upload New Report</Text>
            <Text style={styles.actionCardPrimarySub}>PDF or image</Text>
          </TouchableOpacity>

          {lastReport && (
            <TouchableOpacity
              style={styles.actionCardSecondary}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/insights",
                  params: { reportId: lastReport.reportId, chat: "1" },
                })
              }
              activeOpacity={0.87}
            >
              <View style={[styles.actionIconWrap, styles.actionIconSecondary]}>
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={Colors.accent}
                />
              </View>
              <Text style={styles.actionCardSecondaryText}>Continue Chat</Text>
              <Text style={styles.actionCardSecondarySub}>Last report</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.delay(280).springify()}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>RECENT REPORTS</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/analytics")}
              >
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </Animated.View>

            {reports.slice(0, 4).map((r, i) => (
              <ReportCard key={r.reportId} report={r} delay={320 + i * 60} />
            ))}
          </>
        )}

        {/* Disclaimer */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.disclaimerBox}
        >
          <Text style={styles.disclaimerText}>
            ⚠️ MedLens does not provide medical advice. Always consult a
            qualified healthcare professional.
          </Text>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  greetingText: { fontSize: 15, color: Colors.textSecondary },
  nameText: {
    fontSize: 30,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -1,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: "#fff" },
  summaryCard: {
    backgroundColor: Colors.dark,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: 8,
    ...Shadow.md,
  },
  summaryCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.4)",
  },
  summaryCardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
  },
  summaryCardDate: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  summaryCardText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginTop: 4,
  },
  summaryCardCta: { marginTop: 8 },
  summaryCardCtaText: { fontSize: 13, color: Colors.accent, fontWeight: "600" },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyCardTitle: { fontSize: 17, fontWeight: "600", color: Colors.text },
  emptyCardSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.textSecondary,
  },
  sectionLink: { fontSize: 13, color: Colors.accent, fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: Spacing.xl },
  actionCardPrimary: {
    flex: 1,
    backgroundColor: Colors.text,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: 8,
    ...Shadow.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIconSecondary: { backgroundColor: Colors.accentLight },
  actionCardPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginTop: 4,
  },
  actionCardPrimarySub: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  actionCardSecondary: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: 8,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionCardSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 4,
  },
  actionCardSecondarySub: { fontSize: 12, color: Colors.textTertiary },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    ...Shadow.sm,
  },
  reportCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  reportCardBody: { flex: 1 },
  reportCardName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  reportCardDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTagText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  disclaimerBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  disclaimerText: { fontSize: 12, color: Colors.warning, lineHeight: 18 },
});
