// app/(tabs)/insights.tsx  — Upload + AI Breakdown + Chat
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
import { Colors, Shadow, Spacing } from "../../constants/theme";
import {
  analyzeReport,
  chatAboutReport,
  uploadToCloudinary,
} from "../../services/ai";
import { useAuthStore } from "../../store/authStore";
import { useReportStore } from "../../store/reportStore";
import { AISummary, Report } from "../../types";

type Screen = "empty" | "loading" | "result" | "chat";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    Normal: { bg: Colors.healthyBg, text: Colors.healthy },
    High: { bg: Colors.dangerBg, text: Colors.danger },
    Low: { bg: Colors.warningBg, text: Colors.warning },
    Unknown: { bg: Colors.surfaceAlt, text: Colors.textSecondary },
    Stable: { bg: Colors.healthyBg, text: Colors.healthy },
    "Needs Attention": { bg: Colors.warningBg, text: Colors.warning },
    Critical: { bg: Colors.dangerBg, text: Colors.danger },
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
  accent,
  delay,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  accent?: string;
  delay?: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionCardHeader}
          onPress={() => setOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.sectionCardIcon,
              accent ? { backgroundColor: accent + "22" } : {},
            ]}
          >
            <Text style={styles.sectionCardIconText}>{icon}</Text>
          </View>
          <Text style={styles.sectionCardTitle}>{title}</Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>
        {open && <View style={styles.sectionCardBody}>{children}</View>}
      </View>
    </Animated.View>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ step }: { step: string }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.loadingTitle}>{step}</Text>
      <Text style={styles.loadingSub}>This usually takes 10–20 seconds</Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addReport, updateReportSummary, reports, fetchReports } = useReportStore();
  const { reportId: paramReportId } = useLocalSearchParams<{ reportId: string }>();

  const [screen, setScreen] = useState<Screen>("empty");
  const [loadingStep, setLoadingStep] = useState("Uploading file…");
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; id: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  // Load report from route params on mount
  useEffect(() => {
    if (paramReportId && user) {
      loadReportFromId(paramReportId);
    } else if (user && !screen && reports.length > 0) {
      // Auto-load latest report if no screen state set
      loadReportFromId(reports[0].reportId);
    }
  }, [paramReportId, user]);

  const loadReportFromId = async (id: string) => {
    const report = reports.find(r => r.reportId === id);
    if (report && report.aiSummary) {
      setCurrentReport(report);
      setSummary(report.aiSummary);
      setScreen("result");
      setMessages([
        {
          id: "init",
          role: "assistant",
          content: `I've analyzed your report. Overall status: ${report.aiSummary.overallStatus}.\n\n${report.aiSummary.summary}\n\nFeel free to ask me anything about your results.`,
        },
      ]);
    }
  };

  const processFile = async (
    uri: string,
    fileName: string,
    isImage: boolean,
  ) => {
    if (!user) return;
    setScreen("loading");

    try {
      // Step 1: Upload to Cloudinary
      setLoadingStep("Uploading file…");
      const fileUrl = await uploadToCloudinary(uri, isImage ? "image" : "raw");
      if (isImage) setImageUri(uri);

      // Step 2: OCR + DeepSeek analysis
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
        uri, // localUri for OCR
        isImage, // isImage flag for OCR mime type
      );

      // Step 3: Normalize response
      const safeSummary: AISummary = {
        ...aiResult,
        keyFindings: Array.isArray(aiResult.keyFindings)
          ? aiResult.keyFindings
          : [],
        suggestedNextSteps: Array.isArray(aiResult.suggestedNextSteps)
          ? aiResult.suggestedNextSteps
          : ["Consult your healthcare provider."],
        summary: aiResult.summary ?? "",
        overallStatus: aiResult.overallStatus ?? "Needs Attention",
        whatItCouldMean: aiResult.whatItCouldMean ?? "",
      };

      // Step 4: Save to Firestore
      setLoadingStep("Saving results…");
      const reportId = await addReport(user.id, {
        userId: user.id,
        fileUrl,
        fileName,
        rawText: "",
        aiSummary: safeSummary,
      });
      await updateReportSummary(reportId, safeSummary);

      const report: Report = {
        reportId,
        userId: user.id,
        fileUrl,
        fileName,
        rawText: "",
        aiSummary: safeSummary,
        createdAt: new Date().toISOString(),
      };
      setCurrentReport(report);
      setSummary(safeSummary);

      // Seed chat
      setMessages([
        {
          id: "init",
          role: "assistant",
          content: `I've analyzed your report. Overall status: ${safeSummary.overallStatus}.\n\n${safeSummary.summary}\n\nFeel free to ask me anything about your results.`,
        },
      ]);
      setScreen("result");
    } catch (e: any) {
      console.error("processFile error:", e);
      Alert.alert("Analysis failed", e.message ?? "Please try again.");
      setScreen("empty");
    }
  };

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

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !summary) return;
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

    try {
      const reply = await chatAboutReport(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        summary,
      );
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply },
      ]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      console.error("sendMessage error:", e);
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

  // ─── Render: Empty ──────────────────────────────────────────────────────────
  if (screen === "empty") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.header}
          >
            <Text style={styles.screenTitle}>Insights</Text>
            <Text style={styles.screenSub}>
              Upload a report to get AI analysis
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.emptyIllustration}
          >
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="document-text-outline"
                size={56}
                color={Colors.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>No report yet</Text>
            <Text style={styles.emptyBody}>
              Upload a medical report — lab results, blood work, scan reports —
              and our AI will break it down in plain English.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.uploadOptions}
          >
            {[
              {
                icon: "camera-outline" as const,
                label: "Take a photo",
                sub: "Capture with camera",
                onPress: pickFromCamera,
              },
              {
                icon: "images-outline" as const,
                label: "Choose from gallery",
                sub: "Select an image",
                onPress: pickFromGallery,
              },
              {
                icon: "document-outline" as const,
                label: "Upload PDF",
                sub: "From your files",
                onPress: pickPDF,
              },
            ].map((opt, i) => (
              <Animated.View
                key={opt.label}
                entering={FadeInDown.duration(300)}
              >
                <TouchableOpacity
                  style={styles.uploadOption}
                  onPress={opt.onPress}
                  activeOpacity={0.85}
                >
                  <View style={styles.uploadOptionIcon}>
                    <Ionicons name={opt.icon} size={24} color={Colors.accent} />
                  </View>
                  <View style={styles.uploadOptionText}>
                    <Text style={styles.uploadOptionLabel}>{opt.label}</Text>
                    <Text style={styles.uploadOptionSub}>{opt.sub}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textTertiary}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.disclaimerBox}
          >
            <Text style={styles.disclaimerText}>
              ⚠️ AI analysis is for informational purposes only. Not a
              substitute for professional medical advice.
            </Text>
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Render: Loading ────────────────────────────────────────────────────────
  if (screen === "loading") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LoadingScreen step={loadingStep} />
      </View>
    );
  }

  // ─── Render: Result + Chat ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.bottom + 90}
    >
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.resultHeader}
      >
        <TouchableOpacity
          onPress={() => {
            setScreen("empty");
            setSummary(null);
            setCurrentReport(null);
            setImageUri(null);
            setMessages([]);
          }}
        >
          <Text style={styles.newReportBtn}>← New report</Text>
        </TouchableOpacity>
        <View style={styles.resultTabRow}>
          {(["result", "chat"] as Screen[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.resultTab, screen === s && styles.resultTabActive]}
              onPress={() => setScreen(s)}
            >
              <Text
                style={[
                  styles.resultTabText,
                  screen === s && styles.resultTabTextActive,
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
            style={styles.overallCard}
          >
            <Text style={styles.overallLabel}>OVERALL STATUS</Text>
            <View style={styles.overallRow}>
              <Text style={styles.overallTitle} numberOfLines={2}>
                {currentReport?.fileName ?? "Report"}
              </Text>
              <StatusBadge status={summary.overallStatus} />
            </View>
          </Animated.View>

          <SectionCard icon="🧾" title="Summary" delay={120}>
            <Text style={styles.bodyText}>{summary.summary}</Text>
          </SectionCard>

          <SectionCard icon="📊" title="Key Findings" delay={200}>
            {summary.keyFindings.length === 0 ? (
              <Text style={styles.bodyTextMuted}>
                No specific markers found.
              </Text>
            ) : (
              summary.keyFindings.map((f, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.duration(300)}
                  style={styles.findingRow}
                >
                  <View style={styles.findingLeft}>
                    <Text style={styles.findingMarker}>{f.marker}</Text>
                    <Text style={styles.findingValue}>{f.value}</Text>
                  </View>
                  <StatusBadge status={f.status} />
                </Animated.View>
              ))
            )}
          </SectionCard>

          <SectionCard icon="⚠️" title="What It Could Mean" delay={360}>
            <Text style={styles.bodyText}>{summary.whatItCouldMean}</Text>
          </SectionCard>

          <SectionCard icon="💡" title="Suggested Next Steps" delay={440}>
            {summary.suggestedNextSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepDot} />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </SectionCard>

          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
              style={styles.askAiBtn}
              onPress={() => setScreen("chat")}
              activeOpacity={0.87}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.askAiBtnText}>Ask AI about this report</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.disclaimerBox}
          >
            <Text style={styles.disclaimerText}>
              ⚠️ This is not medical advice. Consult a qualified healthcare
              professional.
            </Text>
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {screen === "chat" && summary && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
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
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>M</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubbleText,
                      isUser ? styles.bubbleTextUser : styles.bubbleTextAI,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleBody,
                        isUser && styles.bubbleBodyUser,
                      ]}
                    >
                      {item.content}
                    </Text>
                  </View>
                </Animated.View>
              );
            }}
          />

          {chatLoading && (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>MedLens AI is thinking…</Text>
            </View>
          )}

          <View
            style={[
              styles.chatInputRow,
              { paddingBottom: Math.max(insets.bottom, 100) },
            ]}
          >
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask about your report…"
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
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
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl },
  header: { paddingTop: Spacing.lg, marginBottom: Spacing.xl },
  screenTitle: {
    fontSize: 34,
    fontWeight: "300",
    color: Colors.text,
    letterSpacing: -1.5,
  },
  screenSub: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  emptyIllustration: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    gap: 14,
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    ...Shadow.sm,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: Colors.text },
  emptyBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  uploadOptions: { gap: 10, marginBottom: Spacing.xl },
  uploadOption: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Shadow.sm,
  },
  uploadOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadOptionText: { flex: 1 },
  uploadOptionLabel: { fontSize: 15, fontWeight: "600", color: Colors.text },
  uploadOptionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  disclaimerBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 14,
    padding: Spacing.md,
  },
  disclaimerText: { fontSize: 12, color: Colors.warning, lineHeight: 18 },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 48,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  loadingSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  resultHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  newReportBtn: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  resultTabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
  },
  resultTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  resultTabActive: { backgroundColor: Colors.surface, ...Shadow.sm },
  resultTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  resultTabTextActive: { color: Colors.text, fontWeight: "700" },
  reportThumb: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  overallCard: {
    backgroundColor: Colors.dark,
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCardIconText: { fontSize: 18 },
  sectionCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionCardBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 8,
  },
  bodyText: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  bodyTextMuted: { fontSize: 14, color: Colors.textSecondary },
  findingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  findingLeft: { flex: 1 },
  findingMarker: { fontSize: 14, fontWeight: "600", color: Colors.text },
  findingValue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 7,
  },
  stepText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 22 },
  askAiBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginVertical: 16,
  },
  askAiBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  chatList: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 20,
    gap: 12,
  },
  bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleUser: { flexDirection: "row-reverse" },
  bubbleAI: {},
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  aiAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  bubbleText: { maxWidth: "80%", borderRadius: 18, padding: 12 },
  bubbleTextUser: { backgroundColor: Colors.text, borderBottomRightRadius: 4 },
  bubbleTextAI: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    ...Shadow.sm,
  },
  bubbleBody: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  bubbleBodyUser: { color: "#fff" },
  typingRow: { paddingHorizontal: Spacing.xl, paddingBottom: 4 },
  typingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
