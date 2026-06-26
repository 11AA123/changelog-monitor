import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { LastSeenMap } from "./types.js";

const DATA_DIR = process.env.DATA_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(DATA_DIR, "last_seen.json");

export function load(): LastSeenMap {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as LastSeenMap;
  } catch {
    return {};
  }
}

export function save(map: LastSeenMap): void {
  fs.writeFileSync(FILE, JSON.stringify(map, null, 2));
}
