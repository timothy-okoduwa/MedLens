import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { Spacing } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

const EMPTY_INPUT = "";

export default function ChangePasswordScreen() {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();

  const [currentPassword, setCurrentPassword] = useState(EMPTY_INPUT);
  const [newPassword, setNewPassword] = useState(EMPTY_INPUT);
  const [confirmPassword, setConfirmPassword] = useState(EMPTY_INPUT);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Mismatch",
        "New password and confirm password do not match.",
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Weak password",
        "New password must be at least 6 characters.",
      );
      return;
    }

    setLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !user?.email) {
        Alert.alert("Error", "User not found.");
        return;
      }

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(firebaseUser, credential);

      // Update password
      await updatePassword(firebaseUser, newPassword);

      Alert.alert("Success", "Your password has been changed.");
      setCurrentPassword(EMPTY_INPUT);
      setNewPassword(EMPTY_INPUT);
      setConfirmPassword(EMPTY_INPUT);
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Failed",
        e.message || "Could not update password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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
    form: {
      gap: Spacing.lg,
    },
    inputGroup: {
      gap: Spacing.sm,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    inputWrapper: {
      position: "relative",
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingRight: 48,
    },
    toggleBtn: {
      position: "absolute",
      right: 14,
      top: "50%",
      marginTop: -12,
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: "center",
      marginTop: Spacing.lg,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textInverse,
    },
    backBtn: {
      marginBottom: Spacing.lg,
    },
    backText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Update your account security</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CURRENT PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPasswords.current}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() =>
                  setShowPasswords((p) => ({ ...p, current: !p.current }))
                }
              >
                <Ionicons
                  name={showPasswords.current ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPasswords.new}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
              >
                <Ionicons
                  name={showPasswords.new ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPasswords.confirm}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() =>
                  setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                }
              >
                <Ionicons
                  name={showPasswords.confirm ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? "Updating…" : "Update Password"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
