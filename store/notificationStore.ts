// store/notificationStore.ts
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Platform } from "react-native";
import { create } from "zustand";
import { db } from "../config/firebase";
import { appStorage } from "../config/storage";

// ─── Notification handler ─────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android channels ─────────────────────────────────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("medication-reminders", {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#FF6B35",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync("general", {
    name: "General Notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ScheduledMedication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  timesPerDay: number;
  times: string[];
  durationDays: number; // ← NEW: stored so the UI can show it
  notificationIds: string[];
  calendarEventIds: string[];
  startDate?: string;
  reportId?: string;
  createdAt: string;
  takenDoses: Record<string, string[]>;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: "medication" | "report" | "reminder" | "info";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

interface NotificationState {
  enabled: boolean;
  loading: boolean;
  scheduledMedications: ScheduledMedication[];
  inAppNotifications: InAppNotification[];
  unreadCount: number;

  initialize: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  sendNotification: (
    title: string,
    body: string,
    type?: InAppNotification["type"],
    userId?: string,
  ) => Promise<void>;

  fetchMedicationsForUser: (userId: string) => Promise<void>;
  clearMedications: () => void;

  scheduleMedicationFromReport: (
    reportId: string,
    userId: string,
    medications: Array<{
      name: string;
      dosage: string;
      timesPerDay: number;
      times?: string[];
      durationDays?: number; // ← NEW
    }>,
  ) => Promise<void>;
  unscheduleMedication: (medId: string) => Promise<void>;

  markDoseTaken: (medId: string, time: string, taken: boolean) => Promise<void>;

  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  addInAppNotification: (
    notification: Omit<InAppNotification, "id" | "createdAt" | "read">,
  ) => Promise<void>;
  loadNotifications: (userId: string) => Promise<void>;
  clearNotifications: () => void;
}

const MEDLENS_CALENDAR_NAME = "MedLens Medications";
const FIRESTORE_MEDS_COLLECTION = "scheduled_medications";
const FIRESTORE_NOTIFS_COLLECTION = "in_app_notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function generateTimes(timesPerDay: number): string[] {
  const defaults: Record<number, string[]> = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
    4: ["08:00", "12:00", "16:00", "21:00"],
  };
  return defaults[timesPerDay] ?? defaults[1];
}

async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: false,
      },
    });
    return status === "granted";
  } catch (e) {
    console.error("Failed to request notification permissions:", e);
    return false;
  }
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.error("Failed to request calendar permissions:", e);
    return false;
  }
}

async function getOrCreateMedLensCalendar(): Promise<string | null> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) return null;

    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const existing = calendars.find((c) => c.title === MEDLENS_CALENDAR_NAME);
    if (existing) return existing.id;

    let sourceId: string | undefined;
    let source: Calendar.Source | undefined;

    if (Platform.OS === "ios") {
      const localSource = calendars.find(
        (c) => c.source?.type === Calendar.SourceType.LOCAL,
      )?.source;
      const iCloudSource = calendars.find(
        (c) => c.source?.name === "iCloud",
      )?.source;
      const chosenSource = iCloudSource ?? localSource ?? calendars[0]?.source;
      sourceId = chosenSource?.id;
      source = chosenSource ?? {
        isLocalAccount: true,
        name: "MedLens",
        type: Calendar.SourceType.LOCAL,
      };
    }

    const calId = await Calendar.createCalendarAsync({
      title: MEDLENS_CALENDAR_NAME,
      color: "#FF6B35",
      entityType: Calendar.EntityTypes.EVENT,
      ...(Platform.OS === "ios" && {
        sourceId,
        source,
        name: "medlens",
        ownerAccount: "personal",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      }),
      ...(Platform.OS === "android" && {
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
        ownerAccount: "local",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    return calId;
  } catch (e) {
    console.error("Failed to get/create MedLens calendar:", e);
    return null;
  }
}

// ─── Create calendar events — one non-recurring event per dose per day ────────
// Instead of a single recurring event (which runs forever until recurrenceEndDate
// and can create many instances), we create individual events for each day × time.
// This is more explicit and matches exactly the prescribed duration.
async function createCalendarEventsForMed(
  calendarId: string,
  medName: string,
  dosage: string,
  times: string[],
  durationDays: number, // ← now required, no default
): Promise<string[]> {
  const eventIds: string[] = [];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 0; day < durationDays; day++) {
    for (const time of times) {
      const [hourStr, minuteStr] = time.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr ?? "0", 10);

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + day);
      startDate.setHours(hour, minute, 0, 0);

      // Skip times in the past on day 0
      if (startDate <= new Date()) continue;

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 15);

      try {
        const eventId = await Calendar.createEventAsync(calendarId, {
          title: `💊 Take ${medName}`,
          notes: `Dosage: ${dosage}\n\nDay ${day + 1} of ${durationDays}.\nScheduled automatically by MedLens.\nDo not skip doses — complete the full course.`,
          startDate,
          endDate,
          timeZone,
          alarms: [{ relativeOffset: 0 }, { relativeOffset: -5 }],
        });
        eventIds.push(eventId);
      } catch (e) {
        console.error(
          `Failed to create calendar event for ${medName} on day ${day + 1} at ${time}:`,
          e,
        );
      }
    }
  }

  return eventIds;
}

// ─── Schedule push notifications — only for durationDays, not forever ─────────
// expo-notifications DAILY trigger repeats indefinitely, so instead we schedule
// one TIME_INTERVAL-based notification per dose per day using a calculated offset.
async function scheduleNotificationsForMed(
  medName: string,
  dosage: string,
  timesPerDay: number,
  times: string[],
  durationDays: number,
  reportId: string,
): Promise<string[]> {
  const notificationIds: string[] = [];
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (let day = 0; day < durationDays; day++) {
    for (const time of times) {
      const [hourStr, minuteStr] = time.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr ?? "0", 10);

      const fireAt = new Date(todayStart);
      fireAt.setDate(todayStart.getDate() + day);
      fireAt.setHours(hour, minute, 0, 0);

      // Skip times already in the past
      if (fireAt <= now) continue;

      const secondsUntilFire = Math.round(
        (fireAt.getTime() - now.getTime()) / 1000,
      );

      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time to take ${medName}`,
            body: `${dosage} — ${timesPerDay}x daily`,
            badge: 1,
            sound: "default",
            data: { type: "medication", reportId, medName },
            ...(Platform.OS === "android" && {
              channelId: "medication-reminders",
              priority: "max",
              sticky: false,
              vibrate: [0, 400, 200, 400],
              color: "#FF6B35",
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilFire,
            repeats: false,
          } as any,
        });
        notificationIds.push(notifId);
      } catch (e) {
        console.error(
          `Failed to schedule notification for ${medName} on day ${day + 1} at ${time}:`,
          e,
        );
      }
    }
  }

  return notificationIds;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>((set, get) => ({
  enabled: true,
  loading: false,
  scheduledMedications: [],
  inAppNotifications: [],
  unreadCount: 0,

  initialize: async () => {
    try {
      await ensureAndroidChannel();
      const saved = await appStorage.getItem("notifications_enabled");
      const enabled = saved === null ? true : saved === "true";
      set({ enabled });
      if (enabled) await requestNotificationPermissions();
    } catch (e) {
      console.error("Failed to initialize notifications:", e);
    }
  },

  fetchMedicationsForUser: async (userId: string) => {
    try {
      set({ loading: true });
      const q = query(
        collection(db, FIRESTORE_MEDS_COLLECTION),
        where("userId", "==", userId),
      );
      const snap = await getDocs(q);
      const meds: ScheduledMedication[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<ScheduledMedication, "id">),
        id: d.id,
        takenDoses: d.data().takenDoses ?? {},
        durationDays: d.data().durationDays ?? 7,
      }));
      set({ scheduledMedications: meds });
    } catch (e) {
      console.error("Failed to fetch medications for user:", e);
    } finally {
      set({ loading: false });
    }
  },

  loadNotifications: async (userId: string) => {
    try {
      const q = query(
        collection(db, FIRESTORE_NOTIFS_COLLECTION),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const inAppNotifications: InAppNotification[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<InAppNotification, "id">),
        id: d.id,
      }));
      const unreadCount = inAppNotifications.filter((n) => !n.read).length;
      set({ inAppNotifications, unreadCount });
    } catch (e) {
      console.error("Failed to load notifications from Firestore:", e);
    }
  },

  clearNotifications: () => {
    set({ inAppNotifications: [], unreadCount: 0 });
  },

  clearMedications: () => {
    set({ scheduledMedications: [] });
  },

  markDoseTaken: async (medId: string, time: string, taken: boolean) => {
    const today = todayKey();
    const med = get().scheduledMedications.find((m) => m.id === medId);
    if (!med) return;

    const currentTaken = med.takenDoses?.[today] ?? [];
    const updatedTimes = taken
      ? Array.from(new Set([...currentTaken, time]))
      : currentTaken.filter((t) => t !== time);

    const updatedTakenDoses = { ...med.takenDoses, [today]: updatedTimes };

    set((s) => ({
      scheduledMedications: s.scheduledMedications.map((m) =>
        m.id === medId ? { ...m, takenDoses: updatedTakenDoses } : m,
      ),
    }));

    try {
      await updateDoc(doc(db, FIRESTORE_MEDS_COLLECTION, medId), {
        takenDoses: updatedTakenDoses,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to sync taken state to Firestore:", e);
      set((s) => ({
        scheduledMedications: s.scheduledMedications.map((m) =>
          m.id === medId ? { ...m, takenDoses: med.takenDoses } : m,
        ),
      }));
    }
  },

  setEnabled: async (enabled) => {
    try {
      await appStorage.setItem("notifications_enabled", String(enabled));
      set({ enabled });
      if (enabled) {
        await ensureAndroidChannel();
        await requestNotificationPermissions();
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (e) {
      console.error("Failed to set notification state:", e);
    }
  },

  sendNotification: async (title, body, type = "info", userId) => {
    if (userId) {
      await get().addInAppNotification({ type, title, body, userId });
    }
    if (!get().enabled) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          badge: 1,
          sound: "default",
          ...(Platform.OS === "android" && { channelId: "general" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        } as any,
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  },

  scheduleMedicationFromReport: async (reportId, userId, medications) => {
    if (!get().enabled) return;
    await ensureAndroidChannel();
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const calendarId = await getOrCreateMedLensCalendar();
    const newScheduled: ScheduledMedication[] = [];

    for (const med of medications) {
      const times = med.times ?? generateTimes(med.timesPerDay);
      // Use AI-extracted duration, fall back to 7 days if missing
      const durationDays =
        typeof med.durationDays === "number" && med.durationDays > 0
          ? med.durationDays
          : 7;

      // Schedule one push notification per dose per day (not a repeating daily trigger)
      const notificationIds = await scheduleNotificationsForMed(
        med.name,
        med.dosage,
        med.timesPerDay,
        times,
        durationDays,
        reportId,
      );

      // Create one calendar event per dose per day (no recurrence rule)
      const calendarEventIds = calendarId
        ? await createCalendarEventsForMed(
            calendarId,
            med.name,
            med.dosage,
            times,
            durationDays,
          )
        : [];

      const medData: Omit<ScheduledMedication, "id"> = {
        userId,
        name: med.name,
        dosage: med.dosage,
        timesPerDay: med.timesPerDay,
        times,
        durationDays, // ← persisted to Firestore
        notificationIds,
        calendarEventIds,
        reportId,
        createdAt: new Date().toISOString(),
        takenDoses: {},
      };

      let firestoreId: string;
      try {
        const docRef = await addDoc(collection(db, FIRESTORE_MEDS_COLLECTION), {
          ...medData,
          createdAtTs: serverTimestamp(),
        });
        firestoreId = docRef.id;
      } catch (e) {
        console.error("Failed to save medication to Firestore:", e);
        firestoreId = `${reportId}_${med.name}_${Date.now()}`;
      }

      const scheduled: ScheduledMedication = { ...medData, id: firestoreId };
      newScheduled.push(scheduled);

      await get().addInAppNotification({
        userId,
        type: "medication",
        title: `Medication scheduled: ${med.name}`,
        body: `${med.dosage} — ${med.timesPerDay}x daily for ${durationDays} days at ${times.join(", ")}${calendarEventIds.length > 0 ? " · Added to calendar 📅" : ""}`,
        data: { reportId },
      });
    }

    set((s) => ({
      scheduledMedications: [...s.scheduledMedications, ...newScheduled],
    }));
  },

  unscheduleMedication: async (medId) => {
    const med = get().scheduledMedications.find((m) => m.id === medId);
    if (!med) return;

    for (const notifId of med.notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch (e) {
        console.error("Failed to cancel notification:", e);
      }
    }

    for (const eventId of med.calendarEventIds ?? []) {
      try {
        await Calendar.deleteEventAsync(eventId, { futureEvents: true });
      } catch (e) {
        console.error("Failed to delete calendar event:", e);
      }
    }

    try {
      await deleteDoc(doc(db, FIRESTORE_MEDS_COLLECTION, medId));
    } catch (e) {
      console.error("Failed to delete medication from Firestore:", e);
    }

    set((s) => ({
      scheduledMedications: s.scheduledMedications.filter(
        (m) => m.id !== medId,
      ),
    }));
  },

  addInAppNotification: async (notification) => {
    const newNotif: Omit<InAppNotification, "id"> = {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false,
    };

    try {
      const docRef = await addDoc(collection(db, FIRESTORE_NOTIFS_COLLECTION), {
        ...newNotif,
        createdAtTs: serverTimestamp(),
      });

      const withId: InAppNotification = { ...newNotif, id: docRef.id };

      set((s) => {
        const inAppNotifications = [withId, ...s.inAppNotifications].slice(
          0,
          100,
        );
        return {
          inAppNotifications,
          unreadCount: inAppNotifications.filter((n) => !n.read).length,
        };
      });
    } catch (e) {
      console.error("Failed to save notification to Firestore:", e);
      const fallback: InAppNotification = {
        ...newNotif,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
      set((s) => {
        const inAppNotifications = [fallback, ...s.inAppNotifications].slice(
          0,
          100,
        );
        return {
          inAppNotifications,
          unreadCount: inAppNotifications.filter((n) => !n.read).length,
        };
      });
    }
  },

  markRead: async (id: string) => {
    set((s) => {
      const inAppNotifications = s.inAppNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        inAppNotifications,
        unreadCount: inAppNotifications.filter((n) => !n.read).length,
      };
    });

    try {
      await updateDoc(doc(db, FIRESTORE_NOTIFS_COLLECTION, id), {
        read: true,
      });
    } catch (e) {
      console.error("Failed to mark notification read in Firestore:", e);
    }
  },

  markAllRead: async (userId: string) => {
    set((s) => ({
      inAppNotifications: s.inAppNotifications.map((n) => ({
        ...n,
        read: true,
      })),
      unreadCount: 0,
    }));

    try {
      const q = query(
        collection(db, FIRESTORE_NOTIFS_COLLECTION),
        where("userId", "==", userId),
        where("read", "==", false),
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const BATCH_SIZE = 500;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        snap.docs
          .slice(i, i + BATCH_SIZE)
          .forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to mark all notifications read in Firestore:", e);
    }
  },
}));
