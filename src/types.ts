export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  changes: string[];
  hasBreaking: boolean;
  url: string;
}

export interface Source {
  id: string;
  name: string;
  emoji: string;
  fetch(): Promise<ChangelogEntry>;
}

export type LastSeenMap = Record<string, { id: string; date: string }>;
