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
import { Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useReportStore } from "../../store/reportStore";
import { useThemeStore } from "../../store/themeStore";
import { Report } from "../../types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatusTag({ status, colors }: { status: string; colors: any }) {
  const map: Record<string, { bg: string; text: string }> = {
    Stable: { bg: colors.healthyBg, text: colors.healthy },
    "Needs Attention": { bg: colors.warningBg, text: colors.warning },
    Critical: { bg: colors.dangerBg, text: colors.danger },
  };
  const c = map[status] ?? {
    bg: colors.surfaceAlt,
    text: colors.textSecondary,
  };
  return (
    <View style={[styles.statusTag, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusTagText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function ReportCard({
  report,
  delay,
  colors,
}: {
  report: Report;
  delay: number;
  colors: any;
}) {
  const date = new Date(report.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)}>
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.surface }]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/report/[id]",
            params: { reportId: report.reportId } as any,
          })
        }
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.reportCardIcon,
            { backgroundColor: colors.accentLight },
          ]}
        >
          <Ionicons name="document-text" size={20} color={colors.accent} />
        </View>
        <View style={styles.reportCardBody}>
          <Text
            style={[styles.reportCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {report.fileName}
          </Text>
          <Text
            style={[styles.reportCardDate, { color: colors.textSecondary }]}
          >
            {dateStr}
          </Text>
        </View>
        {report.aiSummary?.overallStatus && (
          <StatusTag status={report.aiSummary.overallStatus} colors={colors} />
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { reports, fetchReports } = useReportStore();
  const { unreadCount, initialize: initNotifications } = useNotificationStore();
  const { colors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchReports(user.id).catch(() => {});
    initNotifications();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchReports(user.id).catch(() => {});
    setRefreshing(false);
  }, [user]);

  const lastReport = reports[0];
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const attentionCount = reports.filter(
    (r) =>
      r.aiSummary?.overallStatus === "Needs Attention" ||
      r.aiSummary?.overallStatus === "Critical",
  ).length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.header}
        >
          <View>
            <Text
              style={[styles.greetingText, { color: colors.textSecondary }]}
            >
              {greeting()},
            </Text>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {firstName} 👋
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/notifications" as any)}
              style={[styles.bellBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.text}
              />
              {unreadCount > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: colors.danger }]}
                >
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={styles.avatarLetter}>
                  {(user?.name ?? "U")[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Health summary strip */}
        {reports.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(60).springify().damping(14)}
            style={styles.statsRow}
          >
            <View
              style={[styles.statChip, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statNum, { color: colors.text }]}>
                {reports.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Reports
              </Text>
            </View>
            <View
              style={[styles.statChip, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[
                  styles.statNum,
                  {
                    color: attentionCount > 0 ? colors.warning : colors.healthy,
                  },
                ]}
              >
                {attentionCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Need Review
              </Text>
            </View>
            <View
              style={[styles.statChip, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={colors.healthy}
              />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Tracked
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Last report summary card */}
        {lastReport ? (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(14)}
          >
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.dark }]}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/report/[id]",
                  params: { reportId: lastReport.reportId } as any,
                })
              }
              activeOpacity={0.88}
            >
              <View style={styles.summaryCardTop}>
                <Text style={styles.summaryCardLabel}>LAST REPORT STATUS</Text>
                {lastReport.aiSummary?.overallStatus && (
                  <StatusTag
                    status={lastReport.aiSummary.overallStatus}
                    colors={colors}
                  />
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
                <Text
                  style={[styles.summaryCardCtaText, { color: colors.accent }]}
                >
                  View full analysis →
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(14)}
          >
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
                No reports yet
              </Text>
              <Text
                style={[styles.emptyCardSub, { color: colors.textSecondary }]}
              >
                Upload your first medical report to get AI-powered insights
              </Text>
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push("/(tabs)/insights")}
                activeOpacity={0.87}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload Report</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(160).springify()}
          style={styles.sectionHeader}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            QUICK ACTIONS
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(14)}
          style={styles.actionsRow}
        >
          <TouchableOpacity
            style={[styles.actionCardPrimary, { backgroundColor: colors.text }]}
            onPress={() => router.push("/(tabs)/insights")}
            activeOpacity={0.87}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionCardPrimaryText}>Upload Report</Text>
            <Text style={styles.actionCardPrimarySub}>PDF or image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCardSecondary,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => router.push("/(tabs)/medications" as any)}
            activeOpacity={0.87}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Ionicons
                name="medical-outline"
                size={22}
                color={colors.accent}
              />
            </View>
            <Text
              style={[styles.actionCardSecondaryText, { color: colors.text }]}
            >
              My Meds
            </Text>
            <Text
              style={[
                styles.actionCardSecondarySub,
                { color: colors.textTertiary },
              ]}
            >
              Track medications
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.delay(280).springify()}
              style={styles.sectionHeader}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                RECENT REPORTS
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/analytics")}
              >
                <Text style={[styles.sectionLink, { color: colors.accent }]}>
                  See all →
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {reports.slice(0, 3).map((r, i) => (
              <ReportCard
                key={r.reportId}
                report={r}
                delay={320 + i * 60}
                colors={colors}
              />
            ))}
          </>
        )}

        {/* Disclaimer */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={[styles.disclaimerBox, { backgroundColor: colors.warningBg }]}
        >
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            ⚠️ MedLens provides AI analysis for informational purposes only.
            Always consult a qualified healthcare professional.
          </Text>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  greetingText: { fontSize: 14, fontWeight: "400" },
  nameText: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -1,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.sm,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: "#fff" },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    ...Shadow.sm,
  },
  statNum: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },

  summaryCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
  },
  summaryCardDate: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  summaryCardText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginTop: 2,
  },
  summaryCardCta: { marginTop: 4 },
  summaryCardCtaText: { fontSize: 13, fontWeight: "600" },

  emptyCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyCardTitle: { fontSize: 17, fontWeight: "600" },
  emptyCardSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  uploadBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

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
  },
  sectionLink: { fontSize: 13, fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: Spacing.lg },
  actionCardPrimary: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.md,
    gap: 8,
    ...Shadow.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#575757",
    marginTop: 4,
  },
  actionCardPrimarySub: { fontSize: 12, color: "rgba(55, 55, 55, 0.5)" },
  actionCardSecondary: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.md,
    gap: 8,
    ...Shadow.sm,
    borderWidth: 1,
  },
  actionCardSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  actionCardSecondarySub: { fontSize: 12 },

  reportCard: {
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
    justifyContent: "center",
    alignItems: "center",
  },
  reportCardBody: { flex: 1 },
  reportCardName: { fontSize: 14, fontWeight: "600" },
  reportCardDate: { fontSize: 12, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTagText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  disclaimerBox: {
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  disclaimerText: { fontSize: 12, lineHeight: 18 },
});
