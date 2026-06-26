import axios from "axios";
import type { ChangelogEntry } from "../types.js";

const URL = "https://docs.stripe.com/changelog";

export async function fetchStripe(): Promise<ChangelogEntry> {
  const res = await axios.get<string>(URL, {
    headers: { "User-Agent": "Mozilla/5.0 changelog-monitor/1.0" },
    timeout: 15_000,
  });

  const lines = res.data.split("\n");
  const dateVersionRe = /^## (\d{4}-\d{2}-\d{2})\.(\S+)/;

  let date = "", version = "";
  let changes: string[] = [];
  let hasBreaking = false;
  let inSection = false;

  for (const line of lines) {
    if (!inSection) {
      const m = line.match(dateVersionRe);
      if (m) { date = m[1]; version = m[2]; inSection = true; }
      continue;
    }
    if (line.match(/^## \d{4}-\d{2}-\d{2}/)) break;
    if (!line.startsWith("|") || line.includes("---")) continue;

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3 || cells[0].toLowerCase() === "title") continue;

    const m = cells[0].match(/\[([^\]]+)\]/);
    const title = m ? m[1] : cells[0];
    if (!title) continue;

    changes.push(title);
    if (/breaking/i.test(cells[2]) && !/non-breaking/i.test(cells[2])) hasBreaking = true;
  }

  if (!date || changes.length === 0) throw new Error(`Stripe: parse failed. Check ${URL}`);

  return {
    id: `${date}.${version}`,
    date,
    title: `${date} (${version}) - ${changes.length}件の変更`,
    changes,
    hasBreaking,
    url: URL,
  };
}
