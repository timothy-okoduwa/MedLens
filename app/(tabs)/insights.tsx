// app/(tabs)/insights.tsx  — Upload + AI Breakdown + Chat + Recent Reports
import { db } from "@/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shadow, Spacing } from "../../constants/theme";
import {
  analyzeReport,
  chatAboutReport,
  uploadToCloudinary,
} from "../../services/ai";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { useReportStore } from "../../store/reportStore";
import { useThemeStore } from "../../store/themeStore";
import { AISummary, Report } from "../../types";

type Screen = "list" | "loading" | "result" | "chat";

// ─── Markdown helpers ─────────────────────────────────────────────────────────
function parseInlineMarkdown(
  text: string,
  color: string,
  fontSize: number,
  lineHeight: number,
): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text
          key={i}
          style={{ color, fontSize, lineHeight, fontWeight: "700" }}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <Text
          key={i}
          style={{ color, fontSize, lineHeight, fontStyle: "italic" }}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color, fontSize, lineHeight }}>
        {part}
      </Text>
    );
  });
}

function MarkdownText({
  content,
  color,
  fontSize = 15,
  lineHeight = 22,
}: {
  content: string;
  color: string;
  fontSize?: number;
  lineHeight?: number;
}) {
  const lines = content.split("\n");
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={lineIdx} style={{ height: 4 }} />;

        const isBullet = /^(\*|-|•)\s+/.test(trimmed);
        const isNumbered = /^\d+\.\s+/.test(trimmed);

        const textContent = isBullet
          ? trimmed.replace(/^(\*|-|•)\s+/, "")
          : isNumbered
            ? trimmed.replace(/^\d+\.\s+/, "")
            : trimmed;

        const prefix = isBullet
          ? "• "
          : isNumbered
            ? trimmed.match(/^(\d+\.)/)?.[1] + " "
            : "";

        return (
          <View
            key={lineIdx}
            style={
              isBullet || isNumbered
                ? { flexDirection: "row", paddingLeft: 8 }
                : {}
            }
          >
            {(isBullet || isNumbered) && (
              <Text style={{ color, fontSize, lineHeight, marginRight: 4 }}>
                {prefix}
              </Text>
            )}
            <Text
              style={{
                flex: isBullet || isNumbered ? 1 : undefined,
                color,
                fontSize,
                lineHeight,
              }}
            >
              {parseInlineMarkdown(textContent, color, fontSize, lineHeight)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colors }: { status: string; colors: any }) {
  const map: Record<string, { bg: string; text: string }> = {
    Normal: { bg: colors.healthyBg, text: colors.healthy },
    High: { bg: colors.dangerBg, text: colors.danger },
    Low: { bg: colors.warningBg, text: colors.warning },
    Unknown: { bg: colors.surfaceAlt, text: colors.textSecondary },
    Stable: { bg: colors.healthyBg, text: colors.healthy },
    "Needs Attention": { bg: colors.warningBg, text: colors.warning },
    Critical: { bg: colors.dangerBg, text: colors.danger },
  };
  const c = map[status] ?? map.Unknown;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Expandable section card ──────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  children,
  colors,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionCardHeader}
          onPress={() => setOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.sectionCardIcon,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Text style={styles.sectionCardIconText}>{icon}</Text>
          </View>
          <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
        {open && <View style={styles.sectionCardBody}>{children}</View>}
      </View>
    </Animated.View>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ step, colors }: { step: string; colors: any }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingTitle, { color: colors.text }]}>{step}</Text>
      <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
        This usually takes 10–20 seconds
      </Text>
    </Animated.View>
  );
}

// ─── Helper: patch potentially incomplete stored summaries ────────────────────
function patchSummary(raw: AISummary): AISummary {
  return {
    ...raw,
    keyFindings: Array.isArray(raw.keyFindings) ? raw.keyFindings : [],
    suggestedNextSteps: Array.isArray(raw.suggestedNextSteps)
      ? raw.suggestedNextSteps
      : [],
    summary: raw.summary ?? "",
    overallStatus: raw.overallStatus ?? "Needs Attention",
    whatItCouldMean: raw.whatItCouldMean ?? "",
    medications: Array.isArray(raw.medications) ? raw.medications : [],
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addReport, updateReportSummary, reports, fetchReports } =
    useReportStore();
  const { colors } = useThemeStore();
  const { scheduleMedicationFromReport } = useNotificationStore();
  const { reportId: paramReportId } = useLocalSearchParams<{
    reportId: string;
  }>();

  const [screen, setScreen] = useState<Screen>("list");
  const [loadingStep, setLoadingStep] = useState("Uploading file…");
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false); // 👈 add this
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // Text paste modal
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // Chat
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; id: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (paramReportId && user) {
      loadReportFromId(paramReportId);
    }
  }, [paramReportId, user]);

  useEffect(() => {
    if (user) fetchReports(user.id).catch(() => {});
  }, [user]);

  // Load chat history whenever currentReport changes
  useEffect(() => {
    if (!currentReport) return;
    const loadChatHistory = async () => {
      try {
        const col = collection(
          db,
          "reports",
          currentReport.reportId,
          "chatMessages",
        );
        const q = query(col, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => ({
            id: d.id,
            role: d.data().role as "user" | "assistant",
            content: d.data().content as string,
          }));
          setMessages(loaded);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    };
    loadChatHistory();
  }, [currentReport?.reportId]);

  // ─── Load existing report ─────────────────────────────────────────────────
  const loadReportFromId = async (id: string) => {
    const report = reports.find((r) => r.reportId === id);
    if (report && report.aiSummary) {
      const patched = patchSummary(report.aiSummary);
      setCurrentReport(report);
      setSummary(patched);
      setScreen("result");

      try {
        const col = collection(db, "reports", report.reportId, "chatMessages");
        const q = query(col, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        if (snap.empty) {
          const welcome = {
            id: "init",
            role: "assistant" as const,
            content: `Hi! I've reviewed your report "${report.fileName}". Ask me anything about the findings, what they mean, or what to expect next. 💬`,
          };
          setMessages([welcome]);
          await addDoc(col, {
            role: welcome.role,
            content: welcome.content,
            createdAt: serverTimestamp(),
          });
        } else {
          const loaded = snap.docs.map((d) => ({
            id: d.id,
            role: d.data().role as "user" | "assistant",
            content: d.data().content as string,
          }));
          setMessages(loaded);
        }
      } catch {
        setMessages([
          {
            id: "init",
            role: "assistant",
            content: `Hi! I've reviewed your report "${report.fileName}". Ask me anything. 💬`,
          },
        ]);
      }
    }
  };

  // ─── Shared: finalise after AI analysis ───────────────────────────────────
  const finaliseReport = async (
    safeSummary: AISummary,
    fileUrl: string,
    fileName: string,
    rawText: string,
  ) => {
    setLoadingStep("Saving results…");
    const reportId = await addReport(user!.id, {
      userId: user!.id,
      fileUrl,
      fileName,
      rawText,
      aiSummary: safeSummary,
    });
    await updateReportSummary(reportId, safeSummary);

    // ✅ Schedule medication notifications if prescribed
    if (safeSummary.medications && safeSummary.medications.length > 0) {
      try {
        await scheduleMedicationFromReport(
          reportId,
          user!.id,
          safeSummary.medications,
        );
      } catch (e) {
        console.error("Failed to schedule medications:", e);
      }
    }

    const report: Report = {
      reportId,
      userId: user!.id,
      fileUrl,
      fileName,
      rawText,
      aiSummary: safeSummary,
      createdAt: new Date().toISOString(),
    };
    setCurrentReport(report);
    setSummary(safeSummary);

    // Save welcome chat message
    try {
      const col = collection(db, "reports", reportId, "chatMessages");
      const welcome = {
        role: "assistant" as const,
        content: `Hi! I've reviewed your report "${fileName}". Ask me anything about the findings, what they mean, or what to expect next. 💬`,
      };
      await addDoc(col, { ...welcome, createdAt: serverTimestamp() });
      setMessages([{ id: "init", ...welcome }]);
    } catch {
      setMessages([
        {
          id: "init",
          role: "assistant",
          content: `Hi! I've reviewed your report "${fileName}". Ask me anything. 💬`,
        },
      ]);
    }

    setScreen("result");
  };

  // ─── Process file (camera / gallery / PDF) ────────────────────────────────
  const processFile = async (
    uri: string,
    fileName: string,
    isImage: boolean,
  ) => {
    if (!user) return;
    setScreen("loading");

    try {
      setLoadingStep("Uploading file…");
      const fileUrl = await uploadToCloudinary(uri, isImage ? "image" : "raw");
      if (isImage) setImageUri(uri);

      setLoadingStep("Reading your report…");
      const userProfile = [
        user.age && `Age: ${user.age}`,
        user.conditions?.length && `Conditions: ${user.conditions.join(", ")}`,
        user.currentMedications?.length &&
          `Medications: ${user.currentMedications.join(", ")}`,
      ]
        .filter(Boolean)
        .join(". ");

      const aiResult = await analyzeReport(
        fileUrl,
        "",
        userProfile || undefined,
        uri,
        isImage,
      );

      const safeSummary: AISummary = patchSummary(aiResult);
      await finaliseReport(safeSummary, fileUrl, fileName, "");
    } catch (e: any) {
      console.error("processFile error:", e);
      Alert.alert("Analysis failed", e.message ?? "Please try again.");
      setScreen("list");
    }
  };

  // ─── Process pasted text ──────────────────────────────────────────────────
  const processText = async () => {
    const text = pastedText.trim();
    if (!text || !user) return;
    setShowTextInput(false);
    setPastedText("");
    setScreen("loading");

    try {
      setLoadingStep("Reading your report…");
      const userProfile = [
        user.age && `Age: ${user.age}`,
        user.conditions?.length && `Conditions: ${user.conditions.join(", ")}`,
        user.currentMedications?.length &&
          `Medications: ${user.currentMedications.join(", ")}`,
      ]
        .filter(Boolean)
        .join(". ");

      const aiResult = await analyzeReport(
        "",
        text,
        userProfile || undefined,
        undefined,
        false,
      );

      const safeSummary: AISummary = patchSummary(aiResult);
      const fileName = `Pasted Report — ${new Date().toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      )}`;
      await finaliseReport(safeSummary, "", fileName, text);
    } catch (e: any) {
      console.error("processText error:", e);
      Alert.alert("Analysis failed", e.message ?? "Please try again.");
      setScreen("list");
    }
  };

  // ─── Pickers ──────────────────────────────────────────────────────────────
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]) {
      await processFile(res.assets[0].uri, `Report_${Date.now()}.jpg`, true);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]) {
      const name = res.assets[0].uri.split("/").pop() ?? "report.jpg";
      await processFile(res.assets[0].uri, name, true);
    }
  };

  const pickPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (!res.canceled && res.assets[0]) {
      await processFile(res.assets[0].uri, res.assets[0].name, false);
    }
  };

  // ─── Chat send ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !summary || !currentReport) return;
    setChatInput("");

    const userMsg = {
      id: Date.now().toString(),
      role: "user" as const,
      content: text,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatLoading(true);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    const col = collection(
      db,
      "reports",
      currentReport.reportId,
      "chatMessages",
    );
    try {
      await addDoc(col, {
        role: userMsg.role,
        content: userMsg.content,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to save user message:", e);
    }

    try {
      const reply = await chatAboutReport(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        summary,
      );
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      try {
        await addDoc(col, {
          role: assistantMsg.role,
          content: assistantMsg.content,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Failed to save assistant message:", e);
      }
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't respond. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const displayedReports = showAllReports ? reports : reports.slice(0, 3);

  // ─── Render: List / Upload ────────────────────────────────────────────────
  if (screen === "list") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        {/* ── Paste text modal ── */}
        <Modal
          visible={showTextInput}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowTextInput(false);
            setPastedText("");
          }}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowTextInput(false);
                  setPastedText("");
                }}
              >
                <Text
                  style={[styles.modalCancel, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Paste Report Text
              </Text>
              <TouchableOpacity
                onPress={processText}
                disabled={!pastedText.trim()}
              >
                <Text
                  style={[
                    styles.modalAnalyze,
                    {
                      color: pastedText.trim()
                        ? colors.accent
                        : colors.textTertiary,
                    },
                  ]}
                >
                  Analyze
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.pasteInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.borderLight,
                },
              ]}
              value={pastedText}
              onChangeText={setPastedText}
              placeholder="Paste your lab results, doctor's notes, or any medical report text here…"
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
              textAlignVertical="top"
            />

            <View
              style={[styles.modalHint, { backgroundColor: colors.warningBg }]}
            >
              <Text style={[styles.modalHintText, { color: colors.warning }]}>
                💡 Copy and paste any text from your medical report — lab
                values, prescriptions, doctor notes, etc.
              </Text>
            </View>
          </View>
        </Modal>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.header}
          >
            <Text style={[styles.screenTitle, { color: colors.text }]}>
              Insights
            </Text>
            <Text style={[styles.screenSub, { color: colors.textSecondary }]}>
              Upload a report to get AI analysis
            </Text>
          </Animated.View>

          {/* Upload card */}
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.uploadCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.uploadIconWrap,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={32}
                color={colors.accent}
              />
            </View>
            <Text style={[styles.uploadCardTitle, { color: colors.text }]}>
              Add New Report
            </Text>
            <Text
              style={[styles.uploadCardSub, { color: colors.textSecondary }]}
            >
              Lab results, blood work, scan reports — our AI will explain it in
              plain English
            </Text>

            <View style={styles.uploadOptionsRow}>
              {[
                {
                  icon: "camera-outline" as const,
                  label: "Camera",
                  onPress: pickFromCamera,
                },
                {
                  icon: "images-outline" as const,
                  label: "Gallery",
                  onPress: pickFromGallery,
                },
                {
                  icon: "document-outline" as const,
                  label: "PDF",
                  onPress: pickPDF,
                },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.uploadOptionBtn,
                    { backgroundColor: colors.accentLight },
                  ]}
                  onPress={opt.onPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name={opt.icon} size={20} color={colors.accent} />
                  <Text
                    style={[
                      styles.uploadOptionBtnLabel,
                      { color: colors.accent },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ✅ Paste text option */}
            <TouchableOpacity
              style={[
                styles.pasteTextBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowTextInput(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="clipboard-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.pasteTextBtnLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Paste report text
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Recent Reports */}
          {reports.length > 0 && (
            <>
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={styles.sectionHeader}
              >
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  COMPLETED REPORTS
                </Text>
                <TouchableOpacity onPress={() => setShowAllReports((v) => !v)}>
                  <Text style={[styles.sectionLink, { color: colors.accent }]}>
                    {showAllReports ? "Show less" : "See all →"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {displayedReports.map((r, i) => {
                const date = new Date(r.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const statusMap: Record<string, { bg: string; text: string }> =
                  {
                    Stable: { bg: colors.healthyBg, text: colors.healthy },
                    "Needs Attention": {
                      bg: colors.warningBg,
                      text: colors.warning,
                    },
                    Critical: { bg: colors.dangerBg, text: colors.danger },
                  };
                const statusStyle = r.aiSummary?.overallStatus
                  ? (statusMap[r.aiSummary.overallStatus] ?? {
                      bg: colors.surfaceAlt,
                      text: colors.textSecondary,
                    })
                  : { bg: colors.surfaceAlt, text: colors.textSecondary };

                return (
                  <Animated.View
                    key={r.reportId}
                    entering={FadeInDown.delay(i * 60).duration(300)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.reportListItem,
                        { backgroundColor: colors.surface },
                      ]}
                      onPress={() => loadReportFromId(r.reportId)}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.reportListIcon,
                          { backgroundColor: colors.accentLight },
                        ]}
                      >
                        <Ionicons
                          name="document-text"
                          size={20}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.reportListBody}>
                        <Text
                          style={[
                            styles.reportListName,
                            { color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {r.fileName}
                        </Text>
                        <Text
                          style={[
                            styles.reportListDate,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {date}
                        </Text>
                      </View>
                      {r.aiSummary?.overallStatus && (
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: statusStyle.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              { color: statusStyle.text },
                            ]}
                          >
                            {r.aiSummary.overallStatus}
                          </Text>
                        </View>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </>
          )}

          {reports.length === 0 && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                style={[
                  styles.noReportsBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={36}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.noReportsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No completed reports yet. Upload your first one above!
                </Text>
              </View>
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.disclaimerBox,
              { backgroundColor: colors.warningBg },
            ]}
          >
            <Text style={[styles.disclaimerText, { color: colors.warning }]}>
              ⚠️ AI analysis is for informational purposes only. Not a
              substitute for professional medical advice.
            </Text>
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Render: Loading ──────────────────────────────────────────────────────
  if (screen === "loading") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <LoadingScreen step={loadingStep} colors={colors} />
      </View>
    );
  }

  // ─── Render: Result + Chat ────────────────────────────────────────────────
  const TAB_BAR_HEIGHT = 50 + 8 + Math.max(insets.bottom, 8);

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: TAB_BAR_HEIGHT,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.resultHeader, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity
          onPress={() => {
            setScreen("list");
            setSummary(null);
            setCurrentReport(null);
            setImageUri(null);
            setMessages([]);
          }}
        >
          <Text style={[styles.newReportBtn, { color: colors.textSecondary }]}>
            ← Back to reports
          </Text>
        </TouchableOpacity>
        <View
          style={[styles.resultTabRow, { backgroundColor: colors.surfaceAlt }]}
        >
          {(["result", "chat"] as Screen[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.resultTab,
                screen === s && [
                  styles.resultTabActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => setScreen(s)}
            >
              <Text
                style={[
                  styles.resultTabText,
                  { color: colors.textSecondary },
                  screen === s && { color: colors.text, fontWeight: "700" },
                ]}
              >
                {s === "result" ? "Analysis" : "Ask AI"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {screen === "result" && summary && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {imageUri && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Image
                source={{ uri: imageUri }}
                style={styles.reportThumb}
                resizeMode="cover"
              />
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.overallCard, { backgroundColor: colors.dark }]}
          >
            <Text style={styles.overallLabel}>OVERALL STATUS</Text>
            <View style={styles.overallRow}>
              <Text style={styles.overallTitle} numberOfLines={2}>
                {currentReport?.fileName ?? "Report"}
              </Text>
              <StatusBadge status={summary.overallStatus} colors={colors} />
            </View>
          </Animated.View>

          <SectionCard icon="🧾" title="Summary" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {summary.summary}
            </Text>
          </SectionCard>

          <SectionCard icon="📊" title="Key Findings" colors={colors}>
            {(summary.keyFindings ?? []).length === 0 ? (
              <Text
                style={[styles.bodyTextMuted, { color: colors.textSecondary }]}
              >
                No specific markers found.
              </Text>
            ) : (
              (summary.keyFindings ?? []).map((f, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.duration(300)}
                  style={[
                    styles.findingRow,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <View style={styles.findingLeft}>
                    <Text
                      style={[styles.findingMarker, { color: colors.text }]}
                    >
                      {f.marker}
                    </Text>
                    <Text
                      style={[
                        styles.findingValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {f.value}
                    </Text>
                  </View>
                  <StatusBadge status={f.status} colors={colors} />
                </Animated.View>
              ))
            )}
          </SectionCard>

          <SectionCard icon="⚠️" title="What It Could Mean" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {summary.whatItCouldMean}
            </Text>
          </SectionCard>

          <SectionCard icon="💡" title="Suggested Next Steps" colors={colors}>
            {(summary.suggestedNextSteps ?? []).map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View
                  style={[styles.stepDot, { backgroundColor: colors.accent }]}
                />
                <Text style={[styles.stepText, { color: colors.text }]}>
                  {step}
                </Text>
              </View>
            ))}
          </SectionCard>

          {/* ✅ Medications section */}
          {summary.medications && summary.medications.length > 0 && (
            <SectionCard
              icon="💊"
              title="Prescribed Medications"
              colors={colors}
            >
              {summary.medications.map((med: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.medCard,
                    { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Text style={[styles.medName, { color: colors.accent }]}>
                    {med.name}
                  </Text>
                  <Text style={[styles.medDose, { color: colors.text }]}>
                    {med.dosage} · {med.timesPerDay}× daily
                  </Text>
                  {med.notes ? (
                    <Text
                      style={[styles.medNotes, { color: colors.textSecondary }]}
                    >
                      {med.notes}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.medScheduledBadge,
                      { backgroundColor: colors.healthyBg },
                    ]}
                  >
                    <Ionicons
                      name="notifications"
                      size={11}
                      color={colors.healthy}
                    />
                    <Text
                      style={[
                        styles.medScheduledText,
                        { color: colors.healthy },
                      ]}
                    >
                      Reminders scheduled
                    </Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
              style={[styles.askAiBtn, { backgroundColor: colors.accent }]}
              onPress={() => setScreen("chat")}
              activeOpacity={0.87}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.askAiBtnText}>Ask AI about this report</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.disclaimerBox,
              { backgroundColor: colors.warningBg },
            ]}
          >
            <Text style={[styles.disclaimerText, { color: colors.warning }]}>
              ⚠️ This is not medical advice. Consult a qualified healthcare
              professional.
            </Text>
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {screen === "chat" && summary && (
        <View style={{ flex: 1 }}>
          {/* 👈 add marginBottom */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.chatList, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            // keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <Animated.View
                  entering={FadeInDown.duration(200)}
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAI,
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.aiAvatar,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <Text style={styles.aiAvatarText}>M</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubbleText,
                      isUser
                        ? [
                            styles.bubbleTextUser,
                            { backgroundColor: colors.accent },
                          ]
                        : [
                            styles.bubbleTextAI,
                            { backgroundColor: colors.surface },
                          ],
                    ]}
                  >
                    {isUser ? (
                      <Text style={[styles.bubbleBody, { color: "#fff" }]}>
                        {item.content}
                      </Text>
                    ) : (
                      <MarkdownText
                        content={item.content}
                        color={colors.text}
                        fontSize={15}
                        lineHeight={22}
                      />
                    )}
                  </View>
                </Animated.View>
              );
            }}
          />
          {chatLoading && (
            <View
              style={[styles.typingRow, { backgroundColor: colors.background }]}
            >
              <Text
                style={[styles.typingText, { color: colors.textSecondary }]}
              >
                MedLens AI is thinking…
              </Text>
            </View>
          )}
          <View
            style={[
              styles.chatInputRow,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.borderLight,
                paddingBottom: insets.bottom || 16, // 👈 just safe area, no +80
              },
            ]}
          >
            <TextInput
              style={[
                styles.chatInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask about your report…"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: colors.accent },
                (!chatInput.trim() || chatLoading) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!chatInput.trim() || chatLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },
  header: { paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  screenTitle: { fontSize: 34, fontWeight: "300", letterSpacing: -1.5 },
  screenSub: { fontSize: 15, marginTop: 4 },

  uploadCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    ...Shadow.sm,
  },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  uploadCardTitle: { fontSize: 18, fontWeight: "600" },
  uploadCardSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  uploadOptionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
    justifyContent: "center",
  },
  uploadOptionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  uploadOptionBtnLabel: { fontSize: 12, fontWeight: "600" },

  // ✅ Paste text button
  pasteTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  pasteTextBtnLabel: { fontSize: 13, fontWeight: "500" },

  // ✅ Modal styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: "600" },
  modalAnalyze: { fontSize: 15, fontWeight: "700" },
  pasteInput: {
    flex: 1,
    margin: Spacing.lg,
    borderRadius: 16,
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
  },
  modalHint: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.md,
  },
  modalHintText: { fontSize: 12, lineHeight: 18 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  reportListItem: {
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    ...Shadow.sm,
  },
  reportListIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reportListBody: { flex: 1 },
  reportListName: { fontSize: 14, fontWeight: "600" },
  reportListDate: { fontSize: 12, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },

  noReportsBox: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  noReportsText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  disclaimerBox: {
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  disclaimerText: { fontSize: 12, lineHeight: 18 },

  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 48,
  },
  loadingTitle: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  loadingSub: { fontSize: 14, textAlign: "center" },

  resultHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  newReportBtn: { fontSize: 14, marginBottom: 8 },
  resultTabRow: { flexDirection: "row", borderRadius: 999, padding: 4 },
  resultTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  resultTabActive: { ...Shadow.sm },
  resultTabText: { fontSize: 13, fontWeight: "500" },
  reportThumb: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },

  overallCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 10,
  },
  overallLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.4)",
  },
  overallRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  sectionCard: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    ...Shadow.sm,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: 12,
  },
  sectionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCardIconText: { fontSize: 18 },
  sectionCardTitle: { flex: 1, fontSize: 16, fontWeight: "600" },
  sectionCardBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 8,
  },

  bodyText: { fontSize: 15, lineHeight: 24 },
  bodyTextMuted: { fontSize: 14 },
  findingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  findingLeft: { flex: 1 },
  findingMarker: { fontSize: 14, fontWeight: "600" },
  findingValue: { fontSize: 13, marginTop: 2 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  stepDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  stepText: { fontSize: 14, flex: 1, lineHeight: 22 },

  // ✅ Medication card in result
  medCard: { borderRadius: 12, padding: 12, marginBottom: 8, gap: 4 },
  medName: { fontSize: 15, fontWeight: "700" },
  medDose: { fontSize: 13 },
  medNotes: { fontSize: 12 },
  medScheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  medScheduledText: { fontSize: 11, fontWeight: "600" },

  askAiBtn: {
    borderRadius: 999,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginVertical: 16,
  },
  askAiBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  chatList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: 12 },
  bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleUser: { flexDirection: "row-reverse" },
  bubbleAI: {},
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  aiAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  bubbleText: { maxWidth: "80%", borderRadius: 18, padding: 12 },
  bubbleTextUser: { borderBottomRightRadius: 4 },
  bubbleTextAI: { borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleBody: { fontSize: 15, lineHeight: 22 },
  typingRow: { paddingHorizontal: Spacing.lg, paddingVertical: 4 },
  typingText: { fontSize: 13, fontStyle: "italic" },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
