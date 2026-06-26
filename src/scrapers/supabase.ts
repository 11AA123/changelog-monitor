import axios from "axios";
import * as cheerio from "cheerio";
import type { ChangelogEntry } from "../types.js";

const BASE = "https://supabase.com";
const URL  = `${BASE}/changelog`;

const MONTH: Record<string, string> = {
  jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
  jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12",
};

function parseDate(raw: string): string {
  // "Jun 22, 2026" → "2026-06-22"
  const m = raw.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${MONTH[m[1].toLowerCase()] ?? "01"}-${m[2].padStart(2, "0")}`;
}

export async function fetchSupabase(): Promise<ChangelogEntry> {
  const res = await axios.get<string>(URL, {
    headers: { "User-Agent": "Mozilla/5.0 changelog-monitor/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(res.data);

  // Entry links follow /changelog/NNNNN-slug pattern
  const entryLink = $("a[href]")
    .filter((_, el) => /\/changelog\/\d+-/.test($(el).attr("href") ?? ""))
    .first();

  if (!entryLink.length) throw new Error(`Supabase: no entries found. Check ${URL}`);

  const href    = entryLink.attr("href") ?? "";
  const numId   = href.match(/\/changelog\/(\d+)/)?.[1] ?? href;
  const title   = entryLink.find("h3").text().trim();
  const dateRaw = entryLink.parent().find("p").first().text().trim();
  const date    = parseDate(dateRaw);

  if (!date) throw new Error(`Supabase: could not parse date "${dateRaw}". Check ${URL}`);

  // First article.prose = body of the most recent entry
  const articleEl = $("article").first();
  const bodyText  = articleEl.text().trim();

  const changes = bodyText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 15 && l.length < 250)
    .slice(0, 12);

  if (changes.length === 0) changes.push(title);

  const hasBreaking = /breaking|deprecat|sunset|remov/i.test(title + " " + bodyText);

  return {
    id: numId,
    date,
    title,
    changes,
    hasBreaking,
    url: `${BASE}${href}`,
  };
}
