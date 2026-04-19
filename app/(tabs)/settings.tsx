// app/(tabs)/settings.tsx  — Profile + Settings
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useThemeStore } from "../../store/themeStore";

function SettingsRow({
  icon,
  label,
  onPress,
  destructive,
  value,
  toggle,
  onToggle,
  delay,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  value?: string;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
  delay: number;
}) {
  const [sw, setSw] = useState(false);

  const handleToggle = (value: boolean) => {
    setSw(value);
    onToggle?.(value);
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <TouchableOpacity
        style={styles.settingsRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={toggle}
      >
        <View
          style={[
            styles.settingsRowIcon,
            destructive && styles.settingsRowIconDestructive,
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={destructive ? Colors.danger : Colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.settingsRowLabel,
            destructive && styles.destructiveText,
          ]}
        >
          {label}
        </Text>
        {value ? (
          <Text style={styles.settingsRowValue}>{value}</Text>
        ) : toggle ? (
          <Switch
            value={sw}
            onValueChange={handleToggle}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor="#fff"
          />
        ) : onPress ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors.textTertiary}
          />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionLabel({ label, delay }: { label: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Text style={styles.sectionLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser, signOut } = useAuthStore();
  const { mode, setThemeMode } = useThemeStore();
  const { enabled: notificationsEnabled, setEnabled: setNotificationsEnabled } =
    useNotificationStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name ?? "");

  useEffect(() => {
    // Initialize notification store
    useNotificationStore.getState().initialize();
  }, []);

  const saveName = async () => {
    if (!nameVal.trim()) return;
    await updateUser({ name: nameVal.trim() }).catch(() => {});
    setEditingName(false);
  };

  const handleSignOut = () =>
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);

  const handleDeleteAccount = () =>
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => Alert.alert("Feature coming soon"),
        },
      ],
    );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.screenTitle}>Settings</Text>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarLetter}>
                {(user?.name ?? "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameVal}
                    onChangeText={setNameVal}
                    autoFocus
                    onBlur={saveName}
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setNameVal(user?.name ?? "");
                    setEditingName(true);
                  }}
                  style={styles.nameRow}
                >
                  <Text style={styles.profileName}>{user?.name ?? "User"}</Text>
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={Colors.textTertiary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Profile info */}
        <SectionLabel label="HEALTH PROFILE" delay={140} />
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          {[
            {
              label: "Age",
              value: user?.age ? `${user.age} years` : "Not set",
            },
            {
              label: "Height",
              value: user?.height ? `${user.height} cm` : "Not set",
            },
            {
              label: "Weight",
              value: user?.weight ? `${user.weight} kg` : "Not set",
            },
            { label: "Gender", value: user?.gender ?? "Not set" },
          ].map((item, i) => (
            <View
              key={item.label}
              style={[styles.infoRow, i < 3 && styles.infoDivider]}
            >
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </Animated.View>

        {user?.conditions && user.conditions.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.card}
          >
            <Text style={styles.cardMiniLabel}>CONDITIONS</Text>
            <View style={styles.chipRow}>
              {user.conditions.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Notifications */}
        <SectionLabel label="PREFERENCES" delay={240} />
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          <SettingsRow
            icon="bell-outline"
            label="Notifications"
            toggle
            onToggle={setNotificationsEnabled}
            delay={0}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="moon-outline"
            label="Dark mode"
            toggle
            onToggle={(val) => setThemeMode(val ? "dark" : "light")}
            delay={0}
          />
        </Animated.View>

        {/* Account */}
        <SectionLabel label="ACCOUNT" delay={320} />
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          <SettingsRow
            icon="pills-outline"
            label="Medications"
            onPress={() => router.push("/(tabs)/medications")}
            delay={0}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change password"
            onPress={() => router.push("/(tabs)/change-password")}
            delay={0}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => router.push("/(tabs)/privacy-policy")}
            delay={0}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="information-circle-outline"
            label="About MedLens"
            value="v1.0.0"
            delay={0}
          />
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.disclaimerBox}
        >
          <Text style={styles.disclaimerText}>
            ⚠️ MedLens does not provide medical advice. Always consult a
            qualified healthcare professional before making any health
            decisions.
          </Text>
        </Animated.View>

        {/* Danger zone */}
        <SectionLabel label="DANGER ZONE" delay={420} />
        <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
          <SettingsRow
            icon="log-out-outline"
            label="Sign out"
            onPress={handleSignOut}
            delay={0}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="trash-outline"
            label="Delete account"
            onPress={handleDeleteAccount}
            destructive
            delay={0}
          />
        </Animated.View>

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
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarLetter: { fontSize: 24, fontWeight: "700", color: "#fff" },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  profileName: { fontSize: 20, fontWeight: "600", color: Colors.text },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  nameEditRow: {},
  nameInput: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  infoDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: 15, color: Colors.textSecondary },
  infoValue: { fontSize: 15, fontWeight: "500", color: Colors.text },
  cardMiniLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accentLight,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.accent },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  settingsRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsRowIconDestructive: { backgroundColor: Colors.dangerBg },
  settingsRowLabel: { flex: 1, fontSize: 15, color: Colors.text },
  settingsRowValue: { fontSize: 14, color: Colors.textTertiary },
  destructiveText: { color: Colors.danger },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.md + 34 + 14,
  },
  disclaimerBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: { fontSize: 12, color: Colors.warning, lineHeight: 18 },
});
