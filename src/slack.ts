import axios from "axios";
import type { ChangelogEntry, Source } from "./types.js";

export async function notify(
  source: Source,
  entry: ChangelogEntry,
  summary: [string, string, string]
): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new Error("SLACK_WEBHOOK_URL is not set");

  const danger = entry.hasBreaking ? "🚨 破壊的変更あり" : "ℹ️ 通常のアップデート";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${source.emoji} SaaS変更検知 — ${source.name}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*バージョン / ID*\n\`${entry.id}\`` },
        { type: "mrkdwn", text: `*日付*\n${entry.date}` },
        { type: "mrkdwn", text: `*変更件数*\n${entry.changes.length}件` },
        { type: "mrkdwn", text: `*危険度*\n${danger}` },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 3行要約*\n1. ${summary[0]}\n2. ${summary[1]}\n3. ${summary[2]}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Changelog を開く", emoji: true },
          url: entry.url,
          action_id: `open_${source.id}`,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🤖 Powered by Gemini 2.5 Flash  |  changelog-monitor  |  ${new Date().toISOString().slice(0, 10)}`,
        },
      ],
    },
  ];

  await axios.post(url, { blocks }, { timeout: 10_000 });
}
