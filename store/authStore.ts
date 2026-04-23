// store/authStore.ts
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { create } from "zustand";
import { auth, db } from "../config/firebase";
import { User } from "../types";
import { useNotificationStore } from "./notificationStore";

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  completeOnboarding: () => void;
  waitForUser: () => Promise<User | null>;
  deleteAccount: (password: string) => Promise<void>;
}

async function upsertUser(
  firebaseUser: FirebaseUser,
  extraData?: Partial<User>,
): Promise<User> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as User;
  }
  const newUser: User = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? extraData?.name ?? "User",
    email: firebaseUser.email ?? "",
    ...extraData,
  };
  await setDoc(ref, {
    ...newUser,
    userId: firebaseUser.uid,
    onboardingComplete: false,
  });
  return newUser;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: false,
  initialized: false,
  needsOnboarding: false,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          const userData = userDoc.exists()
            ? ({
                ...userDoc.data(),
                id: userDoc.data().userId ?? firebaseUser.uid,
              } as User)
            : {
                id: firebaseUser.uid,
                name: firebaseUser.displayName ?? "User",
                email: firebaseUser.email ?? "",
              };

          // ✅ Key fix: read onboardingComplete from Firestore as source of truth.
          // For brand-new users the doc won't exist yet (signUp hasn't written it),
          // so fall back to whatever needsOnboarding is already in the store —
          // signUp sets it to true before onAuthStateChanged fires in most cases,
          // but if the listener wins the race we leave needsOnboarding untouched.
          const onboardingComplete = userDoc.exists()
            ? userDoc.data().onboardingComplete === true
            : null; // null = "doc not written yet, don't touch the flag"

          const currentNeedsOnboarding = get().needsOnboarding;

          set({
            firebaseUser,
            user: userData,
            initialized: true,
            needsOnboarding:
              onboardingComplete === null
                ? currentNeedsOnboarding // doc not ready yet — preserve in-flight flag
                : !onboardingComplete, // doc exists — use Firestore as truth
          });

          const { fetchMedicationsForUser, loadNotifications } =
            useNotificationStore.getState();
          await Promise.all([
            fetchMedicationsForUser(firebaseUser.uid),
            loadNotifications(firebaseUser.uid),
          ]);
        } catch {
          set({ firebaseUser, initialized: true });
        }
      } else {
        const { clearMedications, clearNotifications } =
          useNotificationStore.getState();
        clearMedications();
        clearNotifications();
        set({
          firebaseUser: null,
          user: null,
          initialized: true,
          needsOnboarding: false,
        });
      }
    });
    return unsubscribe;
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          const { user } = get();
          if (user) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
          resolve(null);
        }, 5000);
      });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true });
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(fbUser, { displayName: name });
      const userData: User = { id: fbUser.uid, name, email };

      // ✅ Write onboardingComplete: false explicitly so initialize()
      // can distinguish "new user" from "user whose doc doesn't exist yet"
      await setDoc(doc(db, "users", fbUser.uid), {
        ...userData,
        userId: fbUser.uid,
        onboardingComplete: false,
      });

      set({ user: userData, needsOnboarding: true });
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async (idToken: string) => {
    set({ loading: true });
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const { user: fbUser } = await signInWithCredential(auth, credential);
      const isNew =
        !fbUser.metadata.creationTime ||
        fbUser.metadata.creationTime === fbUser.metadata.lastSignInTime;
      const userData = await upsertUser(fbUser);
      set({ user: userData, needsOnboarding: isNew });
    } finally {
      set({ loading: false });
    }
  },

  signInWithApple: async () => {
    const AppleAuthentication = await import("expo-apple-authentication");

    set({ loading: true });
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = appleCredential;
      if (!identityToken)
        throw new Error("No identity token returned from Apple.");

      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
      });

      const { user: fbUser } = await signInWithCredential(
        auth,
        firebaseCredential,
      );

      const displayName =
        fullName?.givenName && fullName?.familyName
          ? `${fullName.givenName} ${fullName.familyName}`
          : (fullName?.givenName ?? fbUser.displayName ?? "User");

      if (displayName && !fbUser.displayName) {
        await updateProfile(fbUser, { displayName });
      }

      const isNew =
        !fbUser.metadata.creationTime ||
        fbUser.metadata.creationTime === fbUser.metadata.lastSignInTime;

      const userData = await upsertUser(fbUser, { name: displayName });
      set({ user: userData, needsOnboarding: isNew });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    const { clearMedications, clearNotifications } =
      useNotificationStore.getState();
    clearMedications();
    clearNotifications();
    await firebaseSignOut(auth);
    set({ user: null, firebaseUser: null, needsOnboarding: false });
  },

  updateUser: async (data) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...data };
    await setDoc(doc(db, "users", user.id), updated, { merge: true });
    set({ user: updated });
  },

  // ✅ This is called at the end of step 3 — writes onboardingComplete: true
  // to Firestore so returning users are never shown onboarding again
  completeOnboarding: () => {
    const { user } = get();
    if (user) {
      setDoc(
        doc(db, "users", user.id),
        { onboardingComplete: true },
        { merge: true },
      ).catch((e) => console.error("Failed to mark onboarding complete:", e));
    }
    set({ needsOnboarding: false });
  },

  waitForUser: async () => {
    return new Promise((resolve) => {
      const checkUser = setInterval(() => {
        const { user, initialized } = get();
        if (initialized && user) {
          clearInterval(checkUser);
          resolve(user);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkUser);
        resolve(null);
      }, 5000);
    });
  },

  deleteAccount: async (password: string) => {
    const { firebaseUser, user } = get();
    if (!firebaseUser || !user) throw new Error("No user signed in");

    set({ loading: true });
    try {
      if (firebaseUser.email) {
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          password,
        );
        await reauthenticateWithCredential(firebaseUser, credential);
      }

      const userCollections = [
        "reports",
        "scheduled_medications",
        "in_app_notifications",
        "metrics",
        "bp_readings",
        "medications",
      ];

      for (const col of userCollections) {
        try {
          const q = query(collection(db, col), where("userId", "==", user.id));
          const snap = await getDocs(q);
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch (e) {
          console.error(`Failed to delete ${col}:`, e);
        }
      }

      try {
        await deleteDoc(doc(db, "users", user.id));
      } catch (e) {
        console.error("Failed to delete user doc:", e);
      }

      const { clearMedications, clearNotifications } =
        useNotificationStore.getState();
      clearMedications();
      clearNotifications();

      await deleteUser(firebaseUser);
      set({ user: null, firebaseUser: null, needsOnboarding: false });
    } finally {
      set({ loading: false });
    }
  },
}));
