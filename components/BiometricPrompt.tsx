// components/BiometricPrompt.tsx
import * as LocalAuthentication from "expo-local-authentication";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Shadow } from "../constants/theme";
import { useBiometricStore } from "../store/biometricStore";

interface Props {
  visible: boolean;
  email: string;
  password: string;
  onDone: () => void;
}

function getBiometricLabel(
  types: LocalAuthentication.AuthenticationType[] | null,
): string {
  if (!types || types.length === 0) return "Biometrics";
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
    return "Face ID";
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    return "Fingerprint";
  return "Biometrics";
}

export function BiometricPrompt({ visible, email, password, onDone }: Props) {
  const { enableBiometric, biometricType } = useBiometricStore();
  const label = getBiometricLabel(biometricType);
  const icon = label === "Face ID" ? "🔒" : "👆";

  const handleEnable = async () => {
    await enableBiometric(email, password);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDone}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>Enable {label}?</Text>
          <Text style={styles.body}>
            Sign in faster next time using {label} instead of your password.
            Your credentials are stored securely on this device.
          </Text>

          <TouchableOpacity
            style={styles.enableBtn}
            onPress={handleEnable}
            activeOpacity={0.85}
          >
            <Text style={styles.enableBtnText}>Enable {label}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onDone}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: "center",
    gap: 12,
    ...Shadow.md,
  },
  icon: { fontSize: 48, marginBottom: 4 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  enableBtn: {
    width: "100%",
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  enableBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  skipBtn: { paddingVertical: 10 },
  skipBtnText: { fontSize: 14, color: Colors.textTertiary },
});
