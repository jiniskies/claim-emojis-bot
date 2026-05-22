import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "../data/entries.json");

function load() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function save(entries) {
  writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export function getAll() {
  return load().sort((a, b) => a.username.localeCompare(b.username));
}

export function add(username, emoji) {
  const entries = load();

  const existingUser = entries.find(
    (e) => e.username.toLowerCase() === username.toLowerCase()
  );

  const emojiTaken = entries.find(
    (e) => e.emoji === emoji && e.username.toLowerCase() !== username.toLowerCase()
  );

  if (emojiTaken) {
    return false;
  }

  if (existingUser) {
    existingUser.emoji = emoji;
  } else {
    entries.push({ username, emoji });
  }

  save(entries);
  return true;
}

export function clear() {
  save([]);
}

export function remove(username) {
  const entries = load();
  const idx = entries.findIndex(
    (e) => e.username.toLowerCase() === username.toLowerCase()
  );
  if (idx === -1) return false;
  entries.splice(idx, 1);
  save(entries);
  return true;
}
