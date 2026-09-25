import type { FileStore } from '@/services/fs/FileStore';

const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));
const childName = (parent: string, uri: string) => {
  if (!uri.startsWith(`${parent}/`)) return null;
  const rest = uri.slice(parent.length + 1);
  return rest.includes('/') ? null : rest;
};

/** In-memory FileStore for tests. File contents are strings; size = string length. */
export function createMemoryFileStore(): FileStore & { files: Map<string, string>; dirs: Set<string> } {
  const files = new Map<string, string>();
  const dirs = new Set<string>();

  const ensureParents = (uri: string) => {
    let dir = parentOf(uri);
    while (dir.includes('/') && !dirs.has(dir)) {
      dirs.add(dir);
      dir = parentOf(dir);
    }
  };

  return {
    files,
    dirs,
    async readText(uri) {
      const content = files.get(uri);
      if (content === undefined) throw new Error(`ENOENT: ${uri}`);
      return content;
    },
    async writeText(uri, content) {
      ensureParents(uri);
      files.set(uri, content);
    },
    async exists(uri) {
      return files.has(uri) || dirs.has(uri);
    },
    async listDirs(uri) {
      return [...dirs].map((d) => childName(uri, d)).filter((n): n is string => n !== null);
    },
    async listFiles(uri) {
      return [...files.keys()].map((f) => childName(uri, f)).filter((n): n is string => n !== null);
    },
    async ensureDir(uri) {
      ensureParents(`${uri}/x`);
    },
    async move(from, to) {
      const content = files.get(from);
      if (content === undefined) throw new Error(`ENOENT: ${from}`);
      ensureParents(to);
      files.set(to, content);
      files.delete(from);
    },
    async moveDir(from, to) {
      if (dirs.has(to)) throw new Error(`EEXIST: ${to}`);
      for (const f of [...files.keys()]) {
        if (f.startsWith(`${from}/`)) {
          const target = to + f.slice(from.length);
          ensureParents(target);
          files.set(target, files.get(f)!);
          files.delete(f);
        }
      }
      for (const d of [...dirs]) {
        if (d === from || d.startsWith(`${from}/`)) {
          dirs.delete(d);
          dirs.add(to + d.slice(from.length));
        }
      }
      ensureParents(`${to}/x`);
    },
    async copy(from, to) {
      const content = files.get(from);
      if (content === undefined) throw new Error(`ENOENT: ${from}`);
      ensureParents(to);
      files.set(to, content);
    },
    async remove(uri) {
      files.delete(uri);
      for (const f of [...files.keys()]) if (f.startsWith(`${uri}/`)) files.delete(f);
      for (const d of [...dirs]) if (d === uri || d.startsWith(`${uri}/`)) dirs.delete(d);
    },
    async size(uri) {
      const content = files.get(uri);
      return content === undefined ? null : content.length;
    },
  };
}
