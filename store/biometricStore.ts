// store/biometricStore.ts
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_EMAIL_KEY = "biometric_email";
const BIOMETRIC_PASSWORD_KEY = "biometric_password";

interface BiometricState {
  __pendingEmail?: string;
  __pendingPassword?: string;
  setPendingCredentials: (email: string, password: string) => void;
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: LocalAuthentication.AuthenticationType[] | null;
  // Check device capability and user preference
  initialize: () => Promise<void>;
  // Save credentials and enable biometric login
  enableBiometric: (email: string, password: string) => Promise<void>;
  // Disable and wipe stored credentials
  disableBiometric: () => Promise<void>;
  // Prompt Face ID / fingerprint and return stored credentials on success
  authenticate: () => Promise<{ email: string; password: string } | null>;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  __pendingEmail: undefined,
  __pendingPassword: undefined,
  isAvailable: false,
  isEnabled: false,
  biometricType: null,

  setPendingCredentials: (email: string, password: string) =>
    set({ __pendingEmail: email, __pendingPassword: password }),

  initialize: async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

    set({
      isAvailable: compatible && enrolled,
      biometricType: types,
      isEnabled: enabled === "true",
    });
  },

  enableBiometric: async (email: string, password: string) => {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    set({ isEnabled: true });
  },

  disableBiometric: async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "false");
    set({ isEnabled: false });
  },

  authenticate: async () => {
    const { isAvailable, isEnabled } = get();
    if (!isAvailable || !isEnabled) return null;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Sign in to MedLens",
      fallbackLabel: "Use password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (!result.success) return null;

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

    if (!email || !password) return null;
    return { email, password };
  },
}));
