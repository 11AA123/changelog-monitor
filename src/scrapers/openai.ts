import axios from "axios";
import * as cheerio from "cheerio";
import type { ChangelogEntry } from "../types.js";

const URL = "https://platform.openai.com/docs/changelog";

const DATE_BADGE_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i;
const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function toISO(badge: string, year: string): string {
  const [mon, day] = badge.split(/\s+/);
  return `${year}-${MONTHS[mon.toLowerCase()] ?? "01"}-${day.padStart(2, "0")}`;
}

export async function fetchOpenAI(): Promise<ChangelogEntry> {
  const res = await axios.get<string>(URL, {
    headers: { "User-Agent": "Mozilla/5.0 changelog-monitor/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(res.data);

  let targetDate = "";
  const changes: string[] = [];
  let hasBreaking = false;
  let done = false;

  $("h3").each((_, h3) => {
    if (done) return false;
    const yearMatch = $(h3).text().match(/\d{4}/);
    if (!yearMatch) return;
    const year = yearMatch[0];

    $(h3).nextAll().each((__, sib) => {
      if (done) return false;
      if ((sib as cheerio.Element).tagName === "h3") return false;

      const badges = $(sib).find("[class*='Badge']");
      const dateBadge = badges.filter((_, el) => DATE_BADGE_RE.test($(el).text().trim())).first();
      if (!dateBadge.length) return;

      const isoDate = toISO(dateBadge.text().trim(), year);

      if (!targetDate) targetDate = isoDate;
      if (isoDate !== targetDate) { done = true; return false; }

      // Check type badges for breaking/deprecation signals
      badges.not(dateBadge).each((_, el) => {
        const t = $(el).text().trim();
        if (/deprecat|breaking/i.test(t)) hasBreaking = true;
      });

      const body = $(sib).find("[class*='Markdown'], [class*='markdown']").first().text().trim();
      if (body) changes.push(body.slice(0, 300));
    });
  });

  if (!targetDate || changes.length === 0) {
    throw new Error(`OpenAI: parse failed. Check ${URL}`);
  }

  return {
    id: targetDate,
    date: targetDate,
    title: `OpenAI API changelog (${targetDate}) - ${changes.length}件`,
    changes,
    hasBreaking,
    url: URL,
  };
}
