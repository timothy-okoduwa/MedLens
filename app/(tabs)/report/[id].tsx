// app/(tabs)/report/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "../../../constants/theme";
import { chatAboutReport } from "../../../services/ai";
import { useReportStore } from "../../../store/reportStore";
import { useThemeStore } from "../../../store/themeStore";
import { Report } from "../../../types";

import { db } from "@/config/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

// ─── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownText({
  content,
  color,
  fontSize = 14,
  lineHeight = 21,
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

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const { colors } = useThemeStore();
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
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: c.bg,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          color: c.text,
        }}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Collapsible section card ──────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const { colors } = useThemeStore();

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: Spacing.md,
            gap: 12,
          }}
          onPress={() => setOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.surfaceAlt,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {title}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
        {open && (
          <View
            style={{
              paddingHorizontal: Spacing.md,
              paddingBottom: Spacing.md,
              gap: 8,
            }}
          >
            {children}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Chat message bubble ───────────────────────────────────────────────────────
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function ChatBubble({ msg, colors }: { msg: ChatMsg; colors: any }) {
  const isUser = msg.role === "user";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      {!isUser && (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.accentLight,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 8,
            marginTop: 2,
          }}
        >
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      <View
        style={{
          maxWidth: "78%",
          backgroundColor: isUser ? colors.accent : colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          padding: 12,
          paddingHorizontal: 14,
        }}
      >
        {isUser ? (
          // User bubble: always white text since background is the accent color
          <Text style={{ fontSize: 14, color: "#FFFFFF", lineHeight: 21 }}>
            {msg.content}
          </Text>
        ) : (
          // AI bubble: uses theme text color so it works in both light and dark
          <MarkdownText
            content={msg.content}
            color={colors.text}
            fontSize={14}
            lineHeight={21}
          />
        )}
      </View>
    </View>
  );
}

// ─── Result tab ───────────────────────────────────────────────────────────────
function ResultTab({ report, colors }: { report: Report; colors: any }) {
  const summary = report.aiSummary!;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl,
        paddingBottom: 80,
      }}
    >
      {/* {report.fileUrl && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Image
            source={{ uri: report.fileUrl }}
            style={{
              width: "100%",
              height: 160,
              borderRadius: 16,
              marginBottom: Spacing.md,
            }}
            resizeMode="cover"
          />
        </Animated.View>
      )} */}

      <Animated.View
        entering={FadeInDown.duration(300)}
        style={{
          backgroundColor: colors.dark,
          borderRadius: 20,
          padding: Spacing.lg,
          marginBottom: Spacing.md,
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.2,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          OVERALL STATUS
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: "#fff",
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={2}
          >
            {report.fileName}
          </Text>
          <StatusBadge status={summary.overallStatus} />
        </View>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
          {new Date(report.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      </Animated.View>

      <SectionCard icon="🧾" title="Summary">
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
          {summary.summary}
        </Text>
      </SectionCard>

      <SectionCard icon="📊" title="Key Findings">
        {(summary.keyFindings ?? []).length === 0 ? (
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
            No specific markers found.
          </Text>
        ) : (
          (summary.keyFindings ?? []).map((f, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth:
                  i < (summary.keyFindings ?? []).length - 1 ? 1 : 0,
                borderBottomColor: colors.borderLight,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {f.marker}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {f.value}
                </Text>
              </View>
              <StatusBadge status={f.status} />
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard icon="⚠️" title="What It Could Mean">
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
          {summary.whatItCouldMean}
        </Text>
      </SectionCard>

      <SectionCard icon="💡" title="Suggested Next Steps">
        {(summary.suggestedNextSteps ?? []).map((step, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
                marginTop: 7,
              }}
            />
            <Text
              style={{
                fontSize: 14,
                color: colors.text,
                flex: 1,
                lineHeight: 22,
              }}
            >
              {step}
            </Text>
          </View>
        ))}
      </SectionCard>

      {summary.medications && summary.medications.length > 0 && (
        <SectionCard icon="💊" title="Prescribed Medications">
          {summary.medications.map((med: any, i: number) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.accentLight,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.accent,
                }}
              >
                {med.name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                {med.dosage} · {med.timesPerDay}× daily
              </Text>
              {med.notes && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {med.notes}
                </Text>
              )}
            </View>
          ))}
        </SectionCard>
      )}
    </ScrollView>
  );
}

// ─── Chat tab ─────────────────────────────────────────────────────────────────
function ChatTab({
  report,
  colors,
  insets,
}: {
  report: Report;
  colors: any;
  insets: { bottom: number; top: number };
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false); // 👈 add this

  const scrollRef = useRef<ScrollView>(null);
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
  // Stable collection path — derived once from report.reportId
  const reportId = report.reportId;

  // ── Load existing chat history from Firestore ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const col = collection(db, "reports", reportId, "chatMessages");
        const q = query(col, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);

        if (cancelled) return;

        if (snap.empty) {
          const welcome: ChatMsg = {
            role: "assistant",
            content: `Hi! I've reviewed your report "${report.fileName}". Ask me anything about the findings, what they mean, or what to expect next. 💬`,
          };
          setMessages([welcome]);
          // Save the welcome message
          await addDoc(col, { ...welcome, createdAt: serverTimestamp() });
        } else {
          const loaded: ChatMsg[] = snap.docs.map((d) => ({
            role: d.data().role as "user" | "assistant",
            content: d.data().content as string,
          }));
          if (!cancelled) setMessages(loaded);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
        if (!cancelled) {
          setMessages([
            {
              role: "assistant",
              content: `Hi! I've reviewed your report "${report.fileName}". Ask me anything. 💬`,
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
          setTimeout(
            () => scrollRef.current?.scrollToEnd({ animated: false }),
            100,
          );
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    // Save user message immediately
    const col = collection(db, "reports", reportId, "chatMessages");
    try {
      await addDoc(col, { ...userMsg, createdAt: serverTimestamp() });
    } catch (e) {
      console.error("Failed to save user message:", e);
    }

    setLoading(true);
    try {
      const reply = await chatAboutReport(
        newMsgs.map((m) => ({ role: m.role, content: m.content })),
        report.aiSummary!,
      );
      const assistantMsg: ChatMsg = { role: "assistant", content: reply };
      setMessages([...newMsgs, assistantMsg]);

      // Save assistant reply
      try {
        await addDoc(col, { ...assistantMsg, createdAt: serverTimestamp() });
      } catch (e) {
        console.error("Failed to save assistant message:", e);
      }
    } catch (e) {
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (loadingHistory) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }
  // console.log(insets.bottom);
  const TAB_BAR_HEIGHT = 50 + 8 + Math.max(insets.bottom, 8); // bar + paddingTop + paddingBottom

  return (
    <View style={{ flex: 1, marginBottom: TAB_BAR_HEIGHT }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 44 + TAB_BAR_HEIGHT} // 👈 add TAB_BAR_HEIGHT here
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Spacing.xl,
            paddingVertical: 16,
            paddingBottom: 20,
          }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} colors={colors} />
          ))}
          {loading && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.accentLight,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar — no dynamic padding, no marginBottom */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: Spacing.xl,
            paddingTop: 12,
            paddingBottom: insets.bottom || 16,
            gap: 10,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.text,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
            placeholder="Ask about this report…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={send}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                input.trim() && !loading ? colors.accent : colors.surfaceAlt,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={input.trim() && !loading ? "#fff" : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reportId: string; tab?: string }>();
  const { reports } = useReportStore();
  const { colors } = useThemeStore();
  const [report, setReport] = useState<Report | null>(null);
  const [screen, setScreen] = useState<"result" | "chat">(
    params.tab === "chat" ? "chat" : "result",
  );

  useEffect(() => {
    const id = params.reportId ?? (params as any).id;
    if (id && reports.length > 0) {
      const found = reports.find((r) => r.reportId === id);
      if (found) setReport(found);
    }
  }, [params.reportId, (params as any).id, reports]);

  if (!report) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }}
          onPress={() => router.back()}
        >
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons
            name="document-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "600",
              marginTop: 16,
            }}
          >
            Report not found
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6 }}
          >
            This report may have been removed.
          </Text>
        </View>
      </View>
    );
  }

  const hasSummary = !!report.aiSummary;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <TouchableOpacity
        style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }}
        onPress={() => router.back()}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          ← Back
        </Text>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.md }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "300",
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          Report Details
        </Text>
        <Text
          style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}
        >
          {new Date(report.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>

      {hasSummary && (
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.surfaceAlt,
            borderRadius: 999,
            padding: 4,
            marginHorizontal: Spacing.xl,
            marginBottom: Spacing.md,
          }}
        >
          {(["result", "chat"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                {
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: 999,
                },
                screen === s && { backgroundColor: colors.surface },
              ]}
              onPress={() => setScreen(s)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: screen === s ? "700" : "500",
                  color: screen === s ? colors.text : colors.textSecondary,
                }}
              >
                {s === "result" ? "📋  Analysis" : "💬  Ask AI"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!hasSummary ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            // padding: 40,
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              marginTop: 16,
              fontWeight: "500",
            }}
          >
            Analysis in progress…
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Your report is being processed by AI. Check back shortly.
          </Text>
        </View>
      ) : screen === "result" ? (
        <ResultTab report={report} colors={colors} />
      ) : (
        <ChatTab report={report} colors={colors} insets={insets} />
      )}
    </View>
  );
}
