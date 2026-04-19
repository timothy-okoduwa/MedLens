// store/reportStore.ts
import { create } from 'zustand';
import {
  collection, addDoc, query, where, orderBy, getDocs, Timestamp, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report, AISummary } from '../types';

interface ReportState {
  reports: Report[];
  loading: boolean;
  fetchReports: (userId: string) => Promise<void>;
  addReport: (userId: string, report: Omit<Report, 'reportId' | 'createdAt'>) => Promise<string>;
  updateReportSummary: (reportId: string, summary: AISummary) => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  loading: false,

  fetchReports: async (userId) => {
    set({ loading: true });
    try {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const reports: Report[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Report, 'reportId'>),
        reportId: d.id,
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      }));
      set({ reports });
    } finally {
      set({ loading: false });
    }
  },

  addReport: async (userId, report) => {
    const docRef = await addDoc(collection(db, 'reports'), {
      ...report,
      userId,
      createdAt: Timestamp.now(),
    });
    const newReport: Report = {
      ...report,
      reportId: docRef.id,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ reports: [newReport, ...s.reports] }));
    return docRef.id;
  },

  updateReportSummary: async (reportId, summary) => {
    await updateDoc(doc(db, 'reports', reportId), { aiSummary: summary });
    set((s) => ({
      reports: s.reports.map((r) =>
        r.reportId === reportId ? { ...r, aiSummary: summary } : r,
      ),
    }));
  },
}));
