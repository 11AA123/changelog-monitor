import "dotenv/config";
import type { Source, LastSeenMap } from "./types.js";
import { load, save } from "./state.js";
import { summarize } from "./ai.js";
import { notify } from "./slack.js";
import { fetchStripe }   from "./scrapers/stripe.js";
import { fetchFirebase } from "./scrapers/firebase.js";
import { fetchOpenAI }   from "./scrapers/openai.js";
import { fetchVercel }   from "./scrapers/vercel.js";
import { fetchSupabase } from "./scrapers/supabase.js";

const SOURCES: Source[] = [
  { id: "stripe",   name: "Stripe",   emoji: "🔵", fetch: fetchStripe   },
  { id: "firebase", name: "Firebase", emoji: "🔶", fetch: fetchFirebase },
  { id: "openai",   name: "OpenAI",   emoji: "⚫", fetch: fetchOpenAI   },
  { id: "vercel",   name: "Vercel",   emoji: "◼️", fetch: fetchVercel   },
  { id: "supabase", name: "Supabase", emoji: "🟢", fetch: fetchSupabase },
];

async function runSource(
  source: Source,
  state: LastSeenMap
): Promise<{ sourceId: string; newId?: string; newDate?: string }> {
  console.log(`[${source.name}] Fetching...`);
  const entry = await source.fetch();
  console.log(`[${source.name}] Latest: ${entry.id}`);

  if (state[source.id]?.id === entry.id) {
    console.log(`[${source.name}] No new update.`);
    return { sourceId: source.id };
  }

  console.log(`[${source.name}] New update detected. Summarizing...`);
  const summary = await summarize(source.name, entry);

  console.log(`[${source.name}] Sending Slack notification...`);
  await notify(source, entry, summary);

  console.log(`[${source.name}] Done.`);
  return { sourceId: source.id, newId: entry.id, newDate: entry.date };
}

async function main(): Promise<void> {
  const state = load();

  const results = await Promise.allSettled(
    SOURCES.map((s) => runSource(s, state))
  );

  let updated = false;
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("Error:", (r.reason as Error).message);
    } else if (r.value.newId) {
      state[r.value.sourceId] = { id: r.value.newId, date: r.value.newDate! };
      updated = true;
    }
  }

  if (updated) save(state);
}

main().catch((err: Error) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
