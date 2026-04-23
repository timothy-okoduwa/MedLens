// app/(tabs)/notifications.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import {
  InAppNotification,
  useNotificationStore,
} from "../../store/notificationStore";
import { useThemeStore } from "../../store/themeStore";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function notifIcon(
  type: InAppNotification["type"],
): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "medication":
      return "medkit";
    case "report":
      return "document-text";
    case "reminder":
      return "alarm";
    default:
      return "information-circle";
  }
}

function notifColor(type: InAppNotification["type"], colors: any): string {
  switch (type) {
    case "medication":
      return colors.accent;
    case "report":
      return colors.healthy;
    case "reminder":
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

function notifBg(type: InAppNotification["type"], colors: any): string {
  switch (type) {
    case "medication":
      return colors.accentLight;
    case "report":
      return colors.healthyBg;
    case "reminder":
      return colors.warningBg;
    default:
      return colors.surfaceAlt;
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const {
    inAppNotifications,
    scheduledMedications,
    markRead,
    markAllRead,
    unreadCount,
    initialize,
  } = useNotificationStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      <View
        style={[styles.headerRow, { borderBottomColor: colors.borderLight }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Notifications
        </Text>
        {unreadCount > 0 && user && (
          <TouchableOpacity
            onPress={() => markAllRead(user.id)}
            style={styles.markAllBtn}
          >
            <Text style={[styles.markAllText, { color: colors.accent }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Scheduled medications section */}
        {scheduledMedications.length > 0 && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              SCHEDULED MEDICATIONS
            </Text>
            {scheduledMedications.map((med, i) => (
              <Animated.View
                key={med.id}
                entering={FadeInDown.delay(i * 50).duration(300)}
              >
                <View
                  style={[
                    styles.medCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.medIconWrap,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons name="medkit" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={[styles.medName, { color: colors.text }]}>
                      {med.name}
                    </Text>
                    <Text
                      style={[styles.medDose, { color: colors.textSecondary }]}
                    >
                      {med.dosage} · {med.timesPerDay}x daily
                    </Text>
                    <Text style={[styles.medTimes, { color: colors.accent }]}>
                      🕐 {med.times.join("  ·  ")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      useNotificationStore
                        .getState()
                        .unscheduleMedication(med.id)
                    }
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: colors.dangerBg },
                    ]}
                  >
                    <Ionicons name="close" size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </>
        )}

        {/* In-app notification feed */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          ACTIVITY
        </Text>

        {inAppNotifications.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.emptyWrap}
          >
            <Ionicons
              name="notifications-off-outline"
              size={44}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              When your doctor specifies medications in a report, reminders will
              appear here automatically.
            </Text>
          </Animated.View>
        ) : (
          inAppNotifications.map((notif, i) => (
            <Animated.View
              key={notif.id}
              entering={FadeInDown.delay(i * 40).duration(280)}
            >
              <TouchableOpacity
                style={[
                  styles.notifRow,
                  {
                    backgroundColor: notif.read
                      ? colors.surface
                      : colors.surfaceAlt,
                    borderColor: colors.borderLight,
                  },
                ]}
                onPress={() => markRead(notif.id)}
                activeOpacity={0.75}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.notifIconWrap,
                    { backgroundColor: notifBg(notif.type, colors) },
                  ]}
                >
                  <Ionicons
                    name={notifIcon(notif.type)}
                    size={18}
                    color={notifColor(notif.type, colors)}
                  />
                </View>
                <View style={styles.notifContent}>
                  <Text
                    style={[
                      styles.notifTitle,
                      {
                        color: colors.text,
                        fontWeight: notif.read ? "500" : "700",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {notif.title}
                  </Text>
                  <Text
                    style={[styles.notifBody, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {notif.body}
                  </Text>
                  <Text
                    style={[styles.notifTime, { color: colors.textTertiary }]}
                  >
                    {timeAgo(notif.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  markAllBtn: { paddingHorizontal: 8 },
  markAllText: { fontSize: 13, fontWeight: "600" },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  // Medication cards
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  medIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "600" },
  medDose: { fontSize: 13, marginTop: 2 },
  medTimes: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  cancelBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  // In-app notification rows
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  notifContent: { flex: 1, paddingRight: 16 },
  notifTitle: { fontSize: 14, marginBottom: 3 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 5 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
