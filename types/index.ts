// types/index.ts

export type HealthStatus = "normal" | "warning" | "critical" | "unknown";

export interface HealthMetric {
  id: string;
  type:
    | "blood_pressure"
    | "heart_rate"
    | "spo2"
    | "hrv"
    | "temperature"
    | "weight"
    | "glucose";
  value: number | string;
  unit: string;
  status: HealthStatus;
  timestamp: Date;
  note?: string;
}

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  pulse: number;
  status: HealthStatus;
  timestamp: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  startDate: Date;
  endDate?: Date;
  refillDate?: Date;
  pillsRemaining?: number;
  color?: string;
  notes?: string;
  takenToday?: boolean;
}

export interface MedScanResult {
  id: string;
  imageUri: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions: string;
    warnings?: string[];
  }>;
  rawText: string;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  weight?: number;
  height?: number;
  conditions?: string[];
  currentMedications?: string[];
  onboardingComplete?: boolean;
}

export interface Report {
  reportId: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  rawText: string;
  aiSummary: AISummary | null;
  createdAt: string;
}

export interface ChatMessageDoc {
  chatId: string;
  reportId: string;
  messages: Array<{ role: "user" | "ai"; text: string; timestamp: string }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUri?: string;
}

export interface AISummary {
  summary: string;
  keyFindings: Array<{
    marker: string;
    value: string;
    status: "Normal" | "High" | "Low" | "Unknown";
  }>;
  whatItCouldMean: string;
  suggestedNextSteps: string[];
  overallStatus: "Stable" | "Needs Attention" | "Critical";
  medications?: Array<{
    name: string;
    dosage: string;
    timesPerDay: number;
    notes?: string;
    durationDays?: number; // ← NEW: how many days the course lasts
  }>;
}
