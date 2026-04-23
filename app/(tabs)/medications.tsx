// app/(tabs)/medications.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import {
  ScheduledMedication,
  todayKey,
  useNotificationStore,
} from "../../store/notificationStore";
import { useThemeStore } from "../../store/themeStore";

// ─── Returns true if today is within the medication's active course ───────────
function isMedActive(med: ScheduledMedication): boolean {
  const start = new Date(med.startDate ?? med.createdAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + (med.durationDays ?? 7));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now >= start && now < end;
}

// ─── Dose row ─────────────────────────────────────────────────────────────────
function DoseRow({
  time,
  taken,
  onToggle,
  colors,
}: {
  time: string;
  taken: boolean;
  onToggle: () => void;
  colors: any;
}) {
  const label = (() => {
    const [h, m] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  })();

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[
        styles.doseRow,
        {
          backgroundColor: taken ? colors.healthyBg : colors.surfaceAlt,
          borderColor: taken ? colors.healthy : colors.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.doseCheck,
          {
            borderColor: taken ? colors.healthy : colors.border,
            backgroundColor: taken ? colors.healthy : "transparent",
          },
        ]}
      >
        {taken && <Ionicons name="checkmark" size={11} color="#fff" />}
      </View>
      <Text
        style={[
          styles.doseTime,
          {
            color: taken ? colors.healthy : colors.textSecondary,
            textDecorationLine: taken ? "line-through" : "none",
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.doseStatus,
          { color: taken ? colors.healthy : colors.textTertiary },
        ]}
      >
        {taken ? "Taken" : "Due"}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Medication card ──────────────────────────────────────────────────────────
function MedCard({
  med,
  colors,
  onToggleDose,
  onDelete,
}: {
  med: ScheduledMedication;
  colors: any;
  onToggleDose: (time: string, currentlyTaken: boolean) => void;
  onDelete: () => void;
}) {
  const today = todayKey();
  const takenToday = med.takenDoses?.[today] ?? [];
  const allTaken = takenToday.length >= med.timesPerDay;
  const someToday = takenToday.length > 0;

  // Work out which day of the course today is
  const start = new Date(med.startDate ?? med.createdAt);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dayOfCourse =
    Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        style={[
          styles.medCard,
          {
            backgroundColor: colors.surface,
            borderColor: allTaken ? colors.healthy : colors.border,
            borderWidth: allTaken ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.medCardHeader}>
          <View
            style={[
              styles.medIconWrap,
              {
                backgroundColor: allTaken
                  ? colors.healthyBg
                  : colors.accentLight,
              },
            ]}
          >
            <Text style={styles.medIcon}>💊</Text>
          </View>
          <View style={styles.medHeaderText}>
            <Text
              style={[
                styles.medName,
                {
                  color: colors.text,
                  textDecorationLine: allTaken ? "line-through" : "none",
                  opacity: allTaken ? 0.6 : 1,
                },
              ]}
              numberOfLines={1}
            >
              {med.name}
            </Text>
            <Text style={[styles.medDosage, { color: colors.textSecondary }]}>
              {med.dosage} · {med.timesPerDay}× daily
            </Text>
            {/* ── Day X of Y badge ── */}
            <Text style={[styles.medDay, { color: colors.textTertiary }]}>
              Day {dayOfCourse} of {med.durationDays ?? 7}
            </Text>
          </View>
          <View style={styles.medHeaderRight}>
            <View
              style={[
                styles.progressPill,
                {
                  backgroundColor: allTaken
                    ? colors.healthyBg
                    : someToday
                      ? colors.warningBg
                      : colors.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.progressText,
                  {
                    color: allTaken
                      ? colors.healthy
                      : someToday
                        ? colors.warning
                        : colors.textTertiary,
                  },
                ]}
              >
                {takenToday.length}/{med.timesPerDay}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onDelete}
              style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={12} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.doseList}>
          {med.times.map((time) => (
            <DoseRow
              key={time}
              time={time}
              taken={takenToday.includes(time)}
              onToggle={() => onToggleDose(time, takenToday.includes(time))}
              colors={colors}
            />
          ))}
        </View>

        {(med.calendarEventIds?.length ?? 0) > 0 && (
          <View
            style={[
              styles.calendarBadge,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={10}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.calendarBadgeText, { color: colors.textTertiary }]}
            >
              Added to calendar
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const {
    enabled: notificationsEnabled,
    scheduledMedications,
    loading,
    unscheduleMedication,
    markDoseTaken,
    initialize,
    fetchMedicationsForUser,
  } = useNotificationStore();

  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (user?.id) fetchMedicationsForUser(user.id);
  }, [user?.id]);

  const today = todayKey();

  // Only this user's meds that are still within their course dates
  const userMeds = scheduledMedications.filter(
    (m) => m.userId === user?.id && isMedActive(m),
  );

  const completedMeds = userMeds.filter(
    (m) => (m.takenDoses?.[today]?.length ?? 0) >= m.timesPerDay,
  );
  const pendingMeds = userMeds.filter(
    (m) => (m.takenDoses?.[today]?.length ?? 0) < m.timesPerDay,
  );
  const displayedMeds = showCompleted ? completedMeds : pendingMeds;

  const totalDosesToday = userMeds.reduce((acc, m) => acc + m.timesPerDay, 0);
  const takenDosesToday = userMeds.reduce(
    (acc, m) => acc + (m.takenDoses?.[today]?.length ?? 0),
    0,
  );
  const dueCount = totalDosesToday - takenDosesToday;

  const handleToggleDose = async (
    med: ScheduledMedication,
    time: string,
    currentlyTaken: boolean,
  ) => {
    await markDoseTaken(med.id, time, !currentlyTaken);
  };

  const handleDelete = (med: ScheduledMedication) => {
    Alert.alert(
      "Remove Medication",
      `Stop tracking ${med.name} and cancel all reminders?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => unscheduleMedication(med.id),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={styles.header}
      >
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Medications
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
        <View
          style={[
            styles.notifBadge,
            {
              backgroundColor: notificationsEnabled
                ? colors.healthyBg
                : colors.surfaceAlt,
            },
          ]}
        >
          <Ionicons
            name={notificationsEnabled ? "notifications" : "notifications-off"}
            size={18}
            color={notificationsEnabled ? colors.healthy : colors.textTertiary}
          />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(60).springify().damping(14)}
        style={styles.statsRow}
      >
        {[
          {
            label: "Doses Due",
            value: dueCount,
            color: dueCount > 0 ? colors.accent : colors.textTertiary,
          },
          { label: "Total Meds", value: userMeds.length, color: colors.text },
          {
            label: "Taken Today",
            value: takenDosesToday,
            color: takenDosesToday > 0 ? colors.healthy : colors.textTertiary,
          },
        ].map((s) => (
          <View
            key={s.label}
            style={[styles.statCard, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.statValue, { color: s.color }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </Animated.View>

      {totalDosesToday > 0 && (
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[styles.progressBar, { backgroundColor: colors.surface }]}
        >
          <View style={styles.progressBarLabels}>
            <Text
              style={[styles.progressBarLabel, { color: colors.textSecondary }]}
            >
              Daily progress
            </Text>
            <Text
              style={[styles.progressBarLabel, { color: colors.textSecondary }]}
            >
              {takenDosesToday}/{totalDosesToday} doses
            </Text>
          </View>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor:
                    takenDosesToday === totalDosesToday
                      ? colors.healthy
                      : colors.accent,
                  width: `${Math.round((takenDosesToday / totalDosesToday) * 100)}%`,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInDown.delay(120).springify()}
        style={[
          styles.filterRow,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.filterLeft}>
          <Ionicons
            name="checkmark-done-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.filterLabel, { color: colors.text }]}>
            Show completed ({completedMeds.length})
          </Text>
        </View>
        <Switch
          value={showCompleted}
          onValueChange={setShowCompleted}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </Animated.View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading medications…
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 100, 120) },
        ]}
      >
        {!loading && userMeds.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Ionicons
                name="medical-outline"
                size={36}
                color={colors.accent}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No active medications
            </Text>
            <Text
              style={[styles.emptyDescription, { color: colors.textSecondary }]}
            >
              Completed courses won't appear here. Upload a new report to
              schedule medications automatically.
            </Text>
          </Animated.View>
        ) : !loading && displayedMeds.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.emptyState}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {showCompleted
                ? "No completed medications yet"
                : "All doses taken! 🎉"}
            </Text>
            <Text
              style={[styles.emptyDescription, { color: colors.textSecondary }]}
            >
              {showCompleted
                ? "Mark doses as taken to see them here."
                : "You've taken all your medications for today."}
            </Text>
          </Animated.View>
        ) : (
          displayedMeds.map((med) => (
            <MedCard
              key={med.id}
              med={med}
              colors={colors}
              onToggleDose={(time, currentlyTaken) =>
                handleToggleDose(med, time, currentlyTaken)
              }
              onDelete={() => handleDelete(med)}
            />
          ))
        )}

        {!loading && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[styles.hintBox, { backgroundColor: colors.warningBg }]}
          >
            <Text style={[styles.hintText, { color: colors.warning }]}>
              💊 Tap a dose time to mark it as taken. Progress is saved and
              synced to your account.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: { fontSize: 30, fontWeight: "300", letterSpacing: -1 },
  subtitle: { fontSize: 13, marginTop: 4 },
  notifBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    ...Shadow.sm,
  },
  statValue: { fontSize: 26, fontWeight: "600", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  progressBar: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 14,
    padding: Spacing.md,
    gap: 8,
    ...Shadow.sm,
  },
  progressBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressBarLabel: { fontSize: 12, fontWeight: "500" },
  progressBarTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterLabel: { fontSize: 14, fontWeight: "500" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingText: { fontSize: 13 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  medCard: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    ...Shadow.sm,
  },
  medCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: 12,
  },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  medIcon: { fontSize: 20 },
  medHeaderText: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700" },
  medDosage: { fontSize: 12, marginTop: 2 },
  medDay: { fontSize: 11, marginTop: 2 },
  medHeaderRight: { alignItems: "flex-end", gap: 6 },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  progressText: { fontSize: 12, fontWeight: "700" },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  doseList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  doseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  doseCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  doseTime: { flex: 1, fontSize: 13, fontWeight: "600" },
  doseStatus: { fontSize: 11, fontWeight: "500" },
  calendarBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
  },
  calendarBadgeText: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 14 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  hintBox: { borderRadius: 14, padding: Spacing.md, marginTop: Spacing.sm },
  hintText: { fontSize: 12, lineHeight: 18 },
});
