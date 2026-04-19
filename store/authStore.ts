// store/authStore.ts
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { create } from "zustand";
import { auth, db } from "../config/firebase";
import { User } from "../types";

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
  signOut: () => Promise<void>;
  initialize: () => () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  completeOnboarding: () => void;
  waitForUser: () => Promise<User | null>;
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
  await setDoc(ref, { ...newUser, userId: firebaseUser.uid }); // save both
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
          set({ firebaseUser, user: userData, initialized: true });
        } catch {
          set({ firebaseUser, initialized: true });
        }
      } else {
        set({ firebaseUser: null, user: null, initialized: true });
      }
    });
    return unsubscribe;
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Wait for auth state listener to update user data
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          const { user } = get();
          if (user) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
        // Timeout after 5 seconds
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
      await setDoc(doc(db, "users", fbUser.uid), userData);
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

  signOut: async () => {
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

  completeOnboarding: () => set({ needsOnboarding: false }),

  waitForUser: async () => {
    return new Promise((resolve) => {
      const checkUser = setInterval(() => {
        const { user, initialized } = get();
        if (initialized && user) {
          clearInterval(checkUser);
          resolve(user);
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkUser);
        resolve(null);
      }, 5000);
    });
  },
}));
