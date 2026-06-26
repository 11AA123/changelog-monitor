import axios from "axios";
import * as cheerio from "cheerio";
import type { ChangelogEntry } from "../types.js";

const ATOM_URL = "https://github.com/firebase/firebase-js-sdk/releases.atom";
const CHANGELOG_URL = "https://firebase.google.com/support/release-notes/js";

export async function fetchFirebase(): Promise<ChangelogEntry> {
  const res = await axios.get<string>(ATOM_URL, {
    headers: { "User-Agent": "Mozilla/5.0 changelog-monitor/1.0" },
    timeout: 15_000,
  });

  const $ = cheerio.load(res.data, { xmlMode: true });

  // Prefer "firebase@X.Y.Z" (main package); fall back to first entry
  let entryEl: cheerio.Cheerio<cheerio.Element> | null = null;
  $("entry").each((_, el) => {
    if (entryEl) return false;
    if (/^firebase@\d+\.\d+\.\d+$/.test($(el).find("title").first().text().trim())) {
      entryEl = $(el);
    }
  });
  if (!entryEl) entryEl = $("entry").first();
  if (!entryEl.length) throw new Error(`Firebase: no entries in ${ATOM_URL}`);

  const tagName = entryEl.find("title").first().text().trim();
  const updatedRaw = entryEl.find("updated").first().text().trim();
  const bodyHtml = entryEl.find("content").first().text().trim();

  const date = updatedRaw.slice(0, 10);

  // Strip HTML, split into change lines
  const $body = cheerio.load(bodyHtml);
  const bodyText = $body.text().trim();
  const changes = bodyText
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 10 && l.length < 300);

  if (changes.length === 0) changes.push(tagName);

  return {
    id: tagName,
    date,
    title: tagName,
    changes,
    hasBreaking: /breaking/i.test(bodyText),
    url: CHANGELOG_URL,
  };
}
