/** Minimal file-system port. All paths are absolute URIs (e.g. `file:///data/.../files/packs`). */
export interface FileStore {
  readText(uri: string): Promise<string>;
  writeText(uri: string, content: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
  /** Names (not URIs) of direct child directories; [] if the directory is missing. */
  listDirs(uri: string): Promise<string[]>;
  /** Names (not URIs) of direct child files; [] if the directory is missing. */
  listFiles(uri: string): Promise<string[]>;
  /** Creates the directory and any parents; no-op if it exists. */
  ensureDir(uri: string): Promise<void>;
  /** Moves a file, replacing the destination if it exists. */
  move(fromUri: string, toUri: string): Promise<void>;
  /** Moves a directory to a destination that must not exist yet. */
  moveDir(fromUri: string, toUri: string): Promise<void>;
  /** Copies a file, replacing the destination if it exists. */
  copy(fromUri: string, toUri: string): Promise<void>;
  /** Removes a file or directory recursively; no-op if missing. */
  remove(uri: string): Promise<void>;
  /** File size in bytes, or null if the file does not exist. */
  size(uri: string): Promise<number | null>;
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => (index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .filter((part, index) => index === 0 || part.length > 0)
    .join('/');
}
