// app/(tabs)/analytics.tsx  — Health Trends + Report History
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import {
  Dimensions,
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
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useReportStore } from "../../store/reportStore";
import { Report } from "../../types";

const { width } = Dimensions.get("window");
const CHART_W = width - Spacing.xl * 2 - 32;

// ─── Single animated bar (hooks at top level) ─────────────────────────────────
function BarItem({
  v,
  max,
  color,
  label,
  index,
}: {
  v: number;
  max: number;
  color: string;
  label: string;
  index: number;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(
      index * 60,
      withTiming((v / max) * 80, { duration: 500 }),
    );
  }, []);
  const barStyle = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={chart.col}>
      <Animated.View
        style={[chart.bar, { backgroundColor: color }, barStyle]}
      />
      <Text style={chart.label}>{label}</Text>
    </View>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({
  data,
  labels,
  color,
}: {
  data: number[];
  labels: string[];
  color: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <View style={chart.wrap}>
      {data.map((v, i) => (
        <BarItem
          key={i}
          index={i}
          v={v}
          max={max}
          color={color}
          label={labels[i]}
        />
      ))}
    </View>
  );
}

const chart = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 90,
    paddingTop: 10,
  },
  col: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "100%", borderRadius: 4, minHeight: 4 },
  label: { fontSize: 9, color: Colors.textTertiary, textAlign: "center" },
});

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(14)}
      style={{ flex: 1 }}
    >
      <View style={styles.statTile}>
        <Text style={[styles.statTileValue, color ? { color } : {}]}>
          {value}
        </Text>
        <Text style={styles.statTileLabel}>{label}</Text>
        {sub && <Text style={styles.statTileSub}>{sub}</Text>}
      </View>
    </Animated.View>
  );
}

// ─── Report history row ───────────────────────────────────────────────────────
function ReportRow({ report, delay }: { report: Report; delay: number }) {
  const statusColor: Record<string, string> = {
    Stable: Colors.healthy,
    "Needs Attention": Colors.warning,
    Critical: Colors.danger,
  };
  const color =
    statusColor[report.aiSummary?.overallStatus ?? ""] ?? Colors.textTertiary;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)}>
      <TouchableOpacity
        style={styles.reportRow}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/insights",
            params: { reportId: report.reportId },
          })
        }
        activeOpacity={0.85}
      >
        <View style={[styles.reportRowDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reportRowName} numberOfLines={1}>
            {report.fileName}
          </Text>
          <Text style={styles.reportRowDate}>
            {new Date(report.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <Text style={[styles.reportRowStatus, { color }]}>
          {report.aiSummary?.overallStatus ?? "Pending"}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={Colors.textTertiary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { reports, fetchReports } = useReportStore();

  useEffect(() => {
    if (user) fetchReports(user.id).catch(() => {});
  }, [user]);

  // Compute stats
  const totalReports = reports.length;
  const stableCount = reports.filter(
    (r) => r.aiSummary?.overallStatus === "Stable",
  ).length;
  const attentionCount = reports.filter(
    (r) => r.aiSummary?.overallStatus === "Needs Attention",
  ).length;

  // Marker frequency — find the most common abnormal markers
  const markerCounts: Record<string, number> = {};
  reports.forEach((r) => {
    r.aiSummary?.keyFindings?.forEach((f) => {
      if (f.status !== "Normal" && f.status !== "Unknown") {
        markerCounts[f.marker] = (markerCounts[f.marker] ?? 0) + 1;
      }
    });
  });
  const topMarkers = Object.entries(markerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Last 7 reports trend data
  const last7 = reports.slice(0, 7).reverse();
  const trendData = last7.map((r) => {
    if (r.aiSummary?.overallStatus === "Stable") return 1;
    if (r.aiSummary?.overallStatus === "Needs Attention") return 2;
    if (r.aiSummary?.overallStatus === "Critical") return 3;
    return 0;
  });
  const trendLabels = last7.map((r) =>
    new Date(r.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
  );

  // AI insight summary
  const aiInsight =
    totalReports === 0
      ? "Upload your first report to start seeing health trends."
      : attentionCount > 0
        ? `You've had ${attentionCount} report${attentionCount > 1 ? "s" : ""} needing attention. Consider discussing with your doctor.`
        : `All ${stableCount} report${stableCount > 1 ? "s" : ""} show stable results. Keep it up!`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.screenTitle}>Analytics</Text>
          <Text style={styles.screenSub}>Your health trends over time</Text>
        </Animated.View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatTile
            label="Total Reports"
            value={String(totalReports)}
            delay={80}
          />
          <StatTile
            label="Stable"
            value={String(stableCount)}
            color={Colors.healthy}
            delay={130}
          />
          <StatTile
            label="Attention"
            value={String(attentionCount)}
            color={Colors.warning}
            delay={180}
          />
        </View>

        {/* Trend chart */}
        {trendData.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(14)}
          >
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Report Status Trend</Text>
              <Text style={styles.cardSub}>
                1 = Stable · 2 = Needs Attention · 3 = Critical
              </Text>
              <BarChart
                data={trendData.length > 0 ? trendData : [0]}
                labels={trendLabels.length > 0 ? trendLabels : ["-"]}
                color={Colors.accent}
              />
            </View>
          </Animated.View>
        )}

        {/* AI insight */}
        <Animated.View entering={FadeInDown.delay(280).springify().damping(14)}>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="bulb-outline" size={18} color={Colors.accent} />
              </View>
              <Text style={styles.insightTitle}>AI SUMMARY</Text>
            </View>
            <Text style={styles.insightText}>{aiInsight}</Text>
          </View>
        </Animated.View>

        {/* Common abnormal markers */}
        {topMarkers.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.delay(350).springify()}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>
                MOST COMMON ABNORMAL MARKERS
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(380).springify().damping(14)}
            >
              <View style={styles.card}>
                {topMarkers.map(([marker, count], i) => (
                  <View
                    key={marker}
                    style={[
                      styles.markerRow,
                      i < topMarkers.length - 1 && styles.markerDivider,
                    ]}
                  >
                    <Text style={styles.markerName}>{marker}</Text>
                    <View style={styles.markerCountWrap}>
                      <Text style={styles.markerCount}>{count}×</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          </>
        )}

        {/* Report history */}
        {reports.length > 0 && (
          <>
            <Animated.View
              entering={FadeInDown.delay(440).springify()}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>REPORT HISTORY</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInDown.delay(460).springify().damping(14)}
            >
              <View style={styles.card}>
                {reports.map((r, i) => (
                  <View key={r.reportId}>
                    <ReportRow report={r} delay={480 + i * 40} />
                    {i < reports.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>
          </>
        )}

        {totalReports === 0 && (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.emptyState}
          >
            <Ionicons
              name="bar-chart-outline"
              size={52}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>
              Upload your first report to start seeing analytics
            </Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => router.push("/(tabs)/insights")}
              activeOpacity={0.85}
            >
              <Text style={styles.uploadBtnText}>Upload a report</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl },
  header: { paddingTop: Spacing.lg, marginBottom: Spacing.xl },
  screenTitle: {
    fontSize: 34,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -1.5,
  },
  screenSub: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: Spacing.xl },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 4,
    ...Shadow.sm,
  },
  statTileValue: {
    fontSize: 32,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -1.5,
  },
  statTileLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: Colors.textSecondary,
  },
  statTileSub: { fontSize: 11, color: Colors.textTertiary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  cardSub: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  insightCard: {
    backgroundColor: Colors.dark,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: 12,
  },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.4)",
  },
  insightText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 24,
  },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.textSecondary,
  },
  markerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  markerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  markerName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  markerCountWrap: {
    backgroundColor: Colors.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  markerCount: { fontSize: 12, fontWeight: "700", color: Colors.danger },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  reportRowDot: { width: 8, height: 8, borderRadius: 4 },
  reportRowName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  reportRowDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reportRowStatus: { fontSize: 12, fontWeight: "600" },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 14,
  },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: Colors.text },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  uploadBtn: {
    backgroundColor: Colors.text,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 8,
  },
  uploadBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
