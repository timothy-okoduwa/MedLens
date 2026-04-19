import { create } from 'zustand';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { HealthMetric, BloodPressureReading } from '../types';

interface HealthState {
  metrics: HealthMetric[];
  bpReadings: BloodPressureReading[];
  loading: boolean;
  addMetric: (userId: string, metric: Omit<HealthMetric, 'id'>) => Promise<void>;
  fetchMetrics: (userId: string) => Promise<void>;
  addBPReading: (userId: string, reading: Omit<BloodPressureReading, 'timestamp'>) => Promise<void>;
  fetchBPReadings: (userId: string) => Promise<void>;
  getLatestMetric: (type: HealthMetric['type']) => HealthMetric | undefined;
}

function getHealthStatus(type: HealthMetric['type'], value: number | string): HealthMetric['status'] {
  if (typeof value === 'string') return 'normal';
  switch (type) {
    case 'heart_rate':
      if (value < 50 || value > 120) return 'critical';
      if (value < 60 || value > 100) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    case 'temperature':
      if (value > 39.5 || value < 35) return 'critical';
      if (value > 38 || value < 36) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

export const useHealthStore = create<HealthState>((set, get) => ({
  metrics: [],
  bpReadings: [],
  loading: false,

  addMetric: async (userId, metric) => {
    const docRef = await addDoc(collection(db, 'metrics'), {
      ...metric,
      userId,
      timestamp: Timestamp.fromDate(metric.timestamp),
    });
    const newMetric: HealthMetric = { ...metric, id: docRef.id };
    set((s) => ({ metrics: [newMetric, ...s.metrics] }));
  },

  fetchMetrics: async (userId) => {
    set({ loading: true });
    try {
      const q = query(
        collection(db, 'metrics'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100),
      );
      const snap = await getDocs(q);
      const metrics: HealthMetric[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          timestamp: data.timestamp.toDate(),
        } as HealthMetric;
      });
      set({ metrics });
    } finally {
      set({ loading: false });
    }
  },

  addBPReading: async (userId, reading) => {
    const timestamp = new Date();
    const fullReading: BloodPressureReading = { ...reading, timestamp };
    await addDoc(collection(db, 'bp_readings'), {
      ...fullReading,
      userId,
      timestamp: Timestamp.fromDate(timestamp),
    });
    set((s) => ({ bpReadings: [fullReading, ...s.bpReadings] }));
  },

  fetchBPReadings: async (userId) => {
    const q = query(
      collection(db, 'bp_readings'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(30),
    );
    const snap = await getDocs(q);
    const bpReadings: BloodPressureReading[] = snap.docs.map((d) => {
      const data = d.data();
      return { ...data, timestamp: data.timestamp.toDate() } as BloodPressureReading;
    });
    set({ bpReadings });
  },

  getLatestMetric: (type) => {
    return get().metrics.find((m) => m.type === type);
  },
}));
