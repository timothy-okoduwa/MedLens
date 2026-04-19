// services/ai.ts
import { AISummary } from "../types";

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY!;
const CLOUDINARY_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_NAME!;
const CLOUDINARY_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET!;
const OCR_API_KEY = "K84558312188957";
const DEEPSEEK_MODEL = "deepseek/deepseek-v3.2";

// ─── Cloudinary upload ────────────────────────────────────────────────────────
export async function uploadToCloudinary(
  fileUri: string,
  resourceType: "image" | "raw" = "image",
): Promise<string> {
  const filename = fileUri.split("/").pop() ?? "file";
  const ext = (/\.(\w+)$/.exec(filename) ?? [])[1] ?? "jpg";
  const type = resourceType === "raw" ? "application/pdf" : `image/${ext}`;

  const formData = new FormData();
  formData.append("file", { uri: fileUri, name: filename, type } as any);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData },
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Cloudinary upload failed");
  return data.secure_url;
}

// ─── OCR.space — extract text from image or PDF ───────────────────────────────
export async function extractTextWithOCR(
  fileUri: string,
  isImage: boolean,
): Promise<string> {
  const filename = fileUri.split("/").pop() ?? "file";
  const ext = (/\.(\w+)$/.exec(filename) ?? [])[1]?.toLowerCase() ?? "jpg";
  const mimeType = isImage
    ? ext === "png"
      ? "image/png"
      : "image/jpeg"
    : "application/pdf";

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as any);
  formData.append("apikey", OCR_API_KEY);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); // Engine 2 is more accurate for complex documents

  if (!isImage) {
    formData.append("isTable", "true"); // Better for PDF lab reports with tables
  }

  console.log("Starting OCR extraction...");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  console.log("OCR response:", JSON.stringify(data));

  if (data.IsErroredOnProcessing) {
    throw new Error(
      `OCR failed: ${data.ErrorMessage?.[0] ?? "Unknown OCR error"}`,
    );
  }

  const parsedResults = data.ParsedResults;
  if (!parsedResults || parsedResults.length === 0) {
    throw new Error("OCR returned no results. Please try a clearer image.");
  }

  const extractedText = parsedResults
    .map((r: any) => r.ParsedText ?? "")
    .join("\n")
    .trim();

  if (!extractedText) {
    throw new Error(
      "Could not extract any text from the document. Please try a clearer image.",
    );
  }

  console.log("OCR extracted text length:", extractedText.length);
  return extractedText;
}

// ─── Report interpretation prompt ────────────────────────────────────────────
const REPORT_SYSTEM_PROMPT = `You are a medical report interpreter for MedLens.

Your job is to explain medical lab results and reports in simple, plain language.

STRICT RULES:
- Do NOT diagnose any condition
- Do NOT prescribe or recommend medication
- Do NOT act as a doctor
- Use simple, empathetic language a non-medical person can understand
- Always include a reminder to consult a healthcare professional

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation, just raw JSON:
{
  "summary": "2-3 sentence plain-English overview of the report",
  "overallStatus": "Stable",
  "keyFindings": [
    { "marker": "marker name", "value": "result value with units", "status": "Normal" }
  ],
  "whatItCouldMean": "Plain English explanation of what the findings might indicate. No diagnosis.",
  "suggestedNextSteps": [
    "Actionable, safe, non-medical suggestion 1",
    "Actionable, safe, non-medical suggestion 2"
  ]
}

Rules for field values:
- overallStatus must be exactly one of: "Stable", "Needs Attention", or "Critical"
- keyFindings[].status must be exactly one of: "Normal", "High", "Low", or "Unknown"
- keyFindings must always be an array (use [] if no specific lab markers found)
- suggestedNextSteps must always be an array with at least one item`;

// ─── Analyze report via OCR + DeepSeek ───────────────────────────────────────
export async function analyzeReport(
  fileUrl: string,
  rawText: string,
  userContext?: string,
  localUri?: string,
  isImage?: boolean,
): Promise<AISummary> {
  let textToAnalyze = rawText;

  // If no raw text provided, use OCR to extract it from the local file
  if (!textToAnalyze && localUri) {
    try {
      textToAnalyze = await extractTextWithOCR(localUri, isImage ?? true);
    } catch (ocrError: any) {
      console.error("OCR error:", ocrError);
      // Fall back to sending file URL as context
      textToAnalyze = `[OCR failed: ${ocrError.message}]\nFile URL: ${fileUrl}`;
    }
  }

  const userMessage = textToAnalyze
    ? `Here is the extracted text from the medical report:\n\n${textToAnalyze}\n\n${
        userContext ? `Patient context: ${userContext}` : ""
      }\n\nPlease analyze this report and respond with only the JSON format specified.`
    : `Please analyze the medical report at this URL: ${fileUrl}\n\n${
        userContext ? `Patient context: ${userContext}` : ""
      }\n\nRespond with only the JSON format specified.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://medlens.app",
      "X-Title": "MedLens",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const data = await res.json();
  console.log("DeepSeek analyze response:", JSON.stringify(data));

  if (data.error) {
    throw new Error(data.error.message ?? "OpenRouter API error");
  }

  const raw = data.choices?.[0]?.message?.content ?? "";

  if (!raw) {
    return {
      summary:
        "Could not read the report. Please try again with a clearer image.",
      overallStatus: "Needs Attention",
      keyFindings: [],
      whatItCouldMean: "The AI was unable to process this report.",
      suggestedNextSteps: [
        "Try uploading a clearer image of the report.",
        "Consult your healthcare provider for a full explanation.",
      ],
    };
  }

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as AISummary;

    return {
      ...parsed,
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      suggestedNextSteps: Array.isArray(parsed.suggestedNextSteps)
        ? parsed.suggestedNextSteps
        : ["Consult your healthcare provider."],
      summary: parsed.summary ?? "",
      overallStatus: parsed.overallStatus ?? "Needs Attention",
      whatItCouldMean: parsed.whatItCouldMean ?? "",
    };
  } catch {
    return {
      summary: raw.slice(0, 300),
      overallStatus: "Needs Attention",
      keyFindings: [],
      whatItCouldMean: "Could not parse structured results. Please try again.",
      suggestedNextSteps: [
        "Consult your healthcare provider for a full explanation.",
      ],
    };
  }
}

// ─── Report-scoped chat ───────────────────────────────────────────────────────
export async function chatAboutReport(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  reportSummary: AISummary,
  userProfile?: string,
): Promise<string> {
  const systemPrompt = `You are MedLens AI, a helpful assistant for a user asking about their medical report.

Report Summary: ${reportSummary.summary}
Overall Status: ${reportSummary.overallStatus}
Key Findings: ${JSON.stringify(reportSummary.keyFindings)}
What It Could Mean: ${reportSummary.whatItCouldMean}
${userProfile ? `Patient context: ${userProfile}` : ""}

STRICT RULES:
- ONLY answer questions related to this specific report and its findings
- Do NOT diagnose or prescribe
- If asked an unrelated question, respond: "I can only help with questions related to your uploaded medical report."
- Be empathetic, clear, and use simple language
- Always remind the user to consult a healthcare professional for medical decisions
- Keep responses concise and easy to understand`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://medlens.app",
      "X-Title": "MedLens",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    }),
  });

  const data = await res.json();
  console.log("DeepSeek chat response:", JSON.stringify(data));

  if (data.error) {
    console.error("DeepSeek chat error:", data.error);
    throw new Error(data.error.message ?? "Chat API error");
  }

  return (
    data.choices?.[0]?.message?.content ??
    "I couldn't process your request. Please try again."
  );
}

// ─── General health chat (no report context) ─────────────────────────────────
export async function chatGeneral(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://medlens.app",
      "X-Title": "MedLens",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: `You are MedLens AI. You help users understand health topics in plain language.
RULES: Never diagnose. Never prescribe. Always recommend consulting a doctor.
If asked to interpret a specific report, ask the user to upload it first.`,
        },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    }),
  });

  const data = await res.json();

  if (data.error) {
    console.error("DeepSeek general chat error:", data.error);
    throw new Error(data.error.message ?? "Chat API error");
  }

  return (
    data.choices?.[0]?.message?.content ?? "I couldn't process your request."
  );
}
