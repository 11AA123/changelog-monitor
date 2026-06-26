import { GoogleGenAI } from "@google/genai";
import type { ChangelogEntry } from "./types.js";

export async function summarize(
  sourceName: string,
  entry: ChangelogEntry
): Promise<[string, string, string]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey: key });
  const changeList = entry.changes.length > 0
    ? entry.changes.slice(0, 20).map((c, i) => `${i + 1}. ${c}`).join("\n")
    : entry.title;

  const prompt =
    `${sourceName} の最新 Changelog (${entry.id}) です:\n${changeList}\n\n` +
    `日本のバックエンドエンジニア向けに、重要度の高い変更を中心に3行で要約してください。` +
    `JSONのみ返してください（他のテキスト不要）:\n{"summary":["1行目","2行目","3行目"]}`;

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const raw = (res.text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const parsed = JSON.parse(raw) as { summary: string[] };
  const s = parsed.summary;
  return [s[0] ?? "", s[1] ?? "", s[2] ?? ""];
}
