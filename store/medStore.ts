import { create } from 'zustand';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Medication } from '../types';

interface MedState {
  medications: Medication[];
  loading: boolean;
  fetchMedications: (userId: string) => Promise<void>;
  addMedication: (userId: string, med: Omit<Medication, 'id'>) => Promise<void>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  markTaken: (id: string) => Promise<void>;
}

export const useMedStore = create<MedState>((set, get) => ({
  medications: [],
  loading: false,

  fetchMedications: async (userId) => {
    set({ loading: true });
    try {
      const q = query(collection(db, 'medications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const medications: Medication[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          startDate: data.startDate?.toDate?.() ?? new Date(),
          endDate: data.endDate?.toDate?.(),
          refillDate: data.refillDate?.toDate?.(),
        } as Medication;
      });
      set({ medications });
    } finally {
      set({ loading: false });
    }
  },

  addMedication: async (userId, med) => {
    const docRef = await addDoc(collection(db, 'medications'), {
      ...med,
      userId,
      startDate: Timestamp.fromDate(med.startDate),
      endDate: med.endDate ? Timestamp.fromDate(med.endDate) : null,
      refillDate: med.refillDate ? Timestamp.fromDate(med.refillDate) : null,
    });
    set((s) => ({ medications: [...s.medications, { ...med, id: docRef.id }] }));
  },

  updateMedication: async (id, data) => {
    await updateDoc(doc(db, 'medications', id), data);
    set((s) => ({
      medications: s.medications.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }));
  },

  deleteMedication: async (id) => {
    await deleteDoc(doc(db, 'medications', id));
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }));
  },

  markTaken: async (id) => {
    await updateDoc(doc(db, 'medications', id), { takenToday: true });
    set((s) => ({
      medications: s.medications.map((m) => (m.id === id ? { ...m, takenToday: true } : m)),
    }));
  },
}));
