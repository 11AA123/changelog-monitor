import axios from "axios";
import * as cheerio from "cheerio";
import type { ChangelogEntry } from "../types.js";

const BASE = "https://vercel.com";
const URL  = `${BASE}/changelog`;

export async function fetchVercel(): Promise<ChangelogEntry> {
  const res = await axios.get<string>(URL, {
    headers: { "User-Agent": "Mozilla/5.0 changelog-monitor/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(res.data);

  // Walk up from the first <time> until we find a container that holds articles
  let group = $("time").first();
  for (let i = 0; i < 6; i++) {
    group = group.parent() as ReturnType<typeof group.parent>;
    if (group.find("article").length > 0) break;
  }

  const date = $("time").first().attr("datetime")?.slice(0, 10) ?? "";
  if (!date) throw new Error(`Vercel: could not find date. Check ${URL}`);

  // Collect every article title in this date group
  const changes: string[] = [];
  group.find("article").each((_, el) => {
    const title = $(el).find("h2").first().text().trim();
    if (title) changes.push(title);
  });

  if (changes.length === 0) throw new Error(`Vercel: no articles found. Check ${URL}`);

  // ID = date + slug of first article
  const firstSlug = group.find("article a[href^='/changelog/']").first().attr("href")?.split("/").pop() ?? date;
  const hasBreaking = changes.some((t) => /deprecat|breaking|remov|sunset/i.test(t));

  return {
    id: `${date}:${firstSlug}`,
    date,
    title: `Vercel changelog (${date}) - ${changes.length}件`,
    changes,
    hasBreaking,
    url: URL,
  };
}
