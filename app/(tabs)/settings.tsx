// app/(tabs)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shadow, Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useBiometricStore } from "../../store/biometricStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useThemeStore } from "../../store/themeStore";

// ─── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  loading,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  loading: boolean;
  colors: any;
}) {
  const [password, setPassword] = useState("");

  const handleConfirm = () => {
    if (!password.trim()) {
      Alert.alert(
        "Password required",
        "Please enter your password to confirm.",
      );
      return;
    }
    onConfirm(password);
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={deleteModalStyles.overlay}>
        <View
          style={[
            deleteModalStyles.container,
            { backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[
              deleteModalStyles.iconWrap,
              { backgroundColor: colors.dangerBg },
            ]}
          >
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>
          <Text style={[deleteModalStyles.title, { color: colors.text }]}>
            Delete Account
          </Text>
          <Text
            style={[
              deleteModalStyles.description,
              { color: colors.textSecondary },
            ]}
          >
            This will permanently delete your account and all your data
            including reports, medications, and health records. This cannot be
            undone.
          </Text>
          <Text
            style={[deleteModalStyles.label, { color: colors.textSecondary }]}
          >
            Enter your password to confirm
          </Text>
          <TextInput
            style={[
              deleteModalStyles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoFocus
            editable={!loading}
          />
          <View style={deleteModalStyles.btnRow}>
            <TouchableOpacity
              style={[
                deleteModalStyles.btn,
                { backgroundColor: colors.surfaceAlt },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[deleteModalStyles.btnText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                deleteModalStyles.btn,
                { backgroundColor: colors.danger, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[deleteModalStyles.btnText, { color: "#fff" }]}>
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const deleteModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "600" },
});

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  onPress,
  destructive,
  value,
  toggle,
  toggleValue,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}) {
  const { colors } = useThemeStore();

  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={toggle}
    >
      <View
        style={[
          styles.settingsRowIcon,
          {
            backgroundColor: destructive ? colors.dangerBg : colors.surfaceAlt,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.danger : colors.textSecondary}
        />
      </View>

      <Text
        style={[
          styles.settingsRowLabel,
          { color: destructive ? colors.danger : colors.text },
        ]}
      >
        {label}
      </Text>

      {value ? (
        <Text style={[styles.settingsRowValue, { color: colors.textTertiary }]}>
          {value}
        </Text>
      ) : toggle ? (
        <Switch
          value={toggleValue ?? false}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      ) : onPress ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
        />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  const { colors } = useThemeStore();
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser, signOut, deleteAccount, loading } = useAuthStore();
  const systemScheme = useColorScheme();
  const { isDark, setThemeMode, colors } = useThemeStore();
  const { enabled: notificationsEnabled, setEnabled: setNotificationsEnabled } =
    useNotificationStore();

  // ─── Biometric store ───────────────────────────────────────────────────────
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    initialize: initBiometric,
    disableBiometric,
    biometricType,
  } = useBiometricStore();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name ?? "");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    useNotificationStore.getState().initialize();
  }, []);

  useEffect(() => {
    initBiometric();
  }, []);

  // ─── Biometric label ───────────────────────────────────────────────────────
  const biometricLabel = biometricType?.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  )
    ? "Face ID"
    : biometricType?.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT,
        )
      ? "Fingerprint"
      : "Biometrics";

  // ─── Biometric toggle — OFF is immediate; ON requires sign-in flow ─────────
  const handleBiometricToggle = async (val: boolean) => {
    if (!val) {
      await disableBiometric();
    }
  };

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

  const handleDeleteConfirm = async (password: string) => {
    try {
      await deleteAccount(password);
      setShowDeleteModal(false);
    } catch (e: any) {
      setShowDeleteModal(false);
      if (
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        Alert.alert(
          "Wrong password",
          "The password you entered is incorrect. Please try again.",
        );
      } else if (e.code === "auth/requires-recent-login") {
        Alert.alert(
          "Session expired",
          "Please sign out and sign back in before deleting your account.",
        );
      } else {
        Alert.alert(
          "Error",
          e.message ?? "Failed to delete account. Please try again.",
        );
      }
    }
  };

  const handleDarkModeToggle = (val: boolean) => {
    setThemeMode(val ? "dark" : "light", systemScheme ?? null);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={loading}
        colors={colors}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Settings
          </Text>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View
            style={[styles.profileCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.profileAvatar, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.profileAvatarLetter}>
                {(user?.name ?? "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <TextInput
                  style={[
                    styles.nameInput,
                    { color: colors.text, borderBottomColor: colors.accent },
                  ]}
                  value={nameVal}
                  onChangeText={setNameVal}
                  autoFocus
                  onBlur={saveName}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setNameVal(user?.name ?? "");
                    setEditingName(true);
                  }}
                  style={styles.nameRow}
                >
                  <Text style={[styles.profileName, { color: colors.text }]}>
                    {user?.name ?? "User"}
                  </Text>
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={colors.textTertiary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}
              <Text
                style={[styles.profileEmail, { color: colors.textSecondary }]}
              >
                {user?.email}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Health Profile */}
        <SectionLabel label="HEALTH PROFILE" />
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
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
              style={[
                styles.infoRow,
                i < 3 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        {user?.conditions && user.conditions.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.cardMiniLabel, { color: colors.textSecondary }]}
            >
              CONDITIONS
            </Text>
            <View style={styles.chipRow}>
              {user.conditions.map((c) => (
                <View
                  key={c}
                  style={[styles.chip, { backgroundColor: colors.accentLight }]}
                >
                  <Text style={[styles.chipText, { color: colors.accent }]}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Preferences */}
        <SectionLabel label="PREFERENCES" />
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            toggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.borderLight }]}
          />
          <SettingsRow
            icon="moon-outline"
            label="Dark mode"
            toggle
            toggleValue={isDark}
            onToggle={handleDarkModeToggle}
          />
          {biometricAvailable && (
            <>
              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <SettingsRow
                icon="finger-print-outline"
                label={
                  biometricEnabled
                    ? `${biometricLabel} enabled`
                    : `Enable ${biometricLabel}`
                }
                toggle
                toggleValue={biometricEnabled}
                onToggle={handleBiometricToggle}
              />
            </>
          )}
        </Animated.View>

        {/* Account */}
        <SectionLabel label="ACCOUNT" />
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <SettingsRow
            icon="medical-outline"
            label="Medications"
            onPress={() => router.push("/(tabs)/medications" as any)}
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.borderLight }]}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change password"
            onPress={() => router.push("/(tabs)/change-password" as any)}
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.borderLight }]}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => router.push("/(tabs)/privacy-policy" as any)}
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.borderLight }]}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="About MedLens"
            onPress={() => router.push("/(tabs)/about" as any)}
          />
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.disclaimerBox, { backgroundColor: colors.warningBg }]}
        >
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            ⚠️ MedLens does not provide medical advice. Always consult a
            qualified healthcare professional before making any health
            decisions.
          </Text>
        </Animated.View>

        {/* Danger zone */}
        <SectionLabel label="DANGER ZONE" />
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <SettingsRow
            icon="log-out-outline"
            label="Sign out"
            onPress={handleSignOut}
          />
          <View
            style={[styles.rowDivider, { backgroundColor: colors.borderLight }]}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete account"
            onPress={() => setShowDeleteModal(true)}
            destructive
          />
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ── Only layout/structural styles live here — NO color values ─────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl },
  header: { paddingTop: Spacing.lg, marginBottom: Spacing.xl },
  screenTitle: { fontSize: 34, fontWeight: "300", letterSpacing: -1.5 },
  profileCard: {
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
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarLetter: { fontSize: 24, fontWeight: "700", color: "#fff" },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  profileName: { fontSize: 20, fontWeight: "600" },
  profileEmail: { fontSize: 13, marginTop: 4 },
  nameInput: {
    fontSize: 20,
    fontWeight: "600",
    borderBottomWidth: 2,
    paddingVertical: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: {
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
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15, fontWeight: "500" },
  cardMiniLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
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
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "600" },
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
    justifyContent: "center",
    alignItems: "center",
  },
  settingsRowLabel: { flex: 1, fontSize: 15 },
  settingsRowValue: { fontSize: 14 },
  rowDivider: {
    height: 1,
    marginLeft: Spacing.md + 34 + 14,
  },
  disclaimerBox: {
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: { fontSize: 12, lineHeight: 18 },
});
