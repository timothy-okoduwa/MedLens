import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useThemeStore } from "../../store/themeStore";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  taken: boolean;
  nextDue: string;
  fromReport?: string;
}

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const { enabled: notificationsEnabled } = useNotificationStore();
  const { user } = useAuthStore();
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "1",
      name: "Aspirin",
      dosage: "500mg",
      frequency: "2x daily",
      times: ["08:00", "20:00"],
      taken: false,
      nextDue: "08:00 AM",
    },
  ]);
  const [showTakenOnly, setShowTakenOnly] = useState(false);

  const handleMarkTaken = (id: string) => {
    setMedications((meds) =>
      meds.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
    );
  };

  const filteredMeds = showTakenOnly
    ? medications.filter((m) => m.taken)
    : medications;
  const todaysDue = medications.filter((m) => !m.taken);

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

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Medications</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track your daily medications and reminders
        </Text>
      </View>

      {/* Quick Stats */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.statsRow]}
      >
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {todaysDue.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Today&apos;s Due
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {medications.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total Meds
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={styles.notificationIndicator}>
            <Ionicons
              name={
                notificationsEnabled ? "notifications" : "notifications-off"
              }
              size={20}
              color={
                notificationsEnabled ? colors.healthy : colors.textTertiary
              }
            />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {notificationsEnabled ? "On" : "Off"}
          </Text>
        </View>
      </Animated.View>

      {/* Filter Toggle */}
      <View
        style={[styles.filterRow, { borderBottomColor: colors.borderLight }]}
      >
        <Text style={[styles.filterLabel, { color: colors.text }]}>
          Show taken medications
        </Text>
        <Switch
          value={showTakenOnly}
          onValueChange={setShowTakenOnly}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {/* Medications List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {filteredMeds.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.emptyState}
          >
            <Ionicons
              name="pill-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No medications
            </Text>
            <Text
              style={[styles.emptyDescription, { color: colors.textSecondary }]}
            >
              Medications from your medical reports will appear here
            </Text>
          </Animated.View>
        ) : (
          filteredMeds.map((med, idx) => (
            <Animated.View
              key={med.id}
              entering={FadeInDown.duration(300)}
              style={[
                styles.medCard,
                {
                  backgroundColor: med.taken
                    ? colors.surfaceAlt
                    : colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.medContent}
                onPress={() => handleMarkTaken(med.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkBox,
                    {
                      borderColor: med.taken ? colors.healthy : colors.border,
                      backgroundColor: med.taken
                        ? colors.healthy
                        : "transparent",
                    },
                  ]}
                >
                  {med.taken && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>

                <View style={styles.medInfo}>
                  <Text
                    style={[
                      styles.medName,
                      {
                        color: colors.text,
                        textDecorationLine: med.taken ? "line-through" : "none",
                      },
                    ]}
                  >
                    {med.name}
                  </Text>
                  <Text
                    style={[styles.medDosage, { color: colors.textSecondary }]}
                  >
                    {med.dosage} • {med.frequency}
                  </Text>
                  <Text
                    style={[styles.medTimes, { color: colors.textTertiary }]}
                  >
                    Times: {med.times.join(", ")}
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.nextDueBadge,
                  {
                    backgroundColor: med.taken
                      ? colors.healthyBg
                      : colors.accentLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nextDueText,
                    {
                      color: med.taken ? colors.healthy : colors.accent,
                    },
                  ]}
                >
                  {med.taken ? "✓ Done" : `${med.nextDue}`}
                </Text>
              </View>
            </Animated.View>
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: 15,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  notificationIndicator: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  medCard: {
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  medContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: "600",
  },
  medDosage: {
    fontSize: 13,
    marginTop: 2,
  },
  medTimes: {
    fontSize: 12,
    marginTop: 4,
  },
  nextDueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextDueText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
