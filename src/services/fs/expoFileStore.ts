import { Directory, File } from 'expo-file-system';

import type { FileStore } from './FileStore';

/** File/Directory constructors may throw when the path exists with the other type; treat that as "not this type". */
function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
function dirExists(uri: string): boolean {
  try {
    return new Directory(uri).exists;
  } catch {
    return false;
  }
}

export const expoFileStore: FileStore = {
  async readText(uri) {
    return new File(uri).text();
  },
  async writeText(uri, content) {
    await new File(uri).write(content);
  },
  async exists(uri) {
    return fileExists(uri) || dirExists(uri);
  },
  async listDirs(uri) {
    const dir = new Directory(uri);
    if (!dir.exists) return [];
    return dir.list().filter((e): e is Directory => e instanceof Directory).map((d) => d.name);
  },
  async listFiles(uri) {
    const dir = new Directory(uri);
    if (!dir.exists) return [];
    return dir.list().filter((e): e is File => e instanceof File).map((f) => f.name);
  },
  async ensureDir(uri) {
    new Directory(uri).create({ intermediates: true, idempotent: true });
  },
  async move(fromUri, toUri) {
    const target = new File(toUri);
    if (target.exists) target.delete();
    new File(fromUri).move(target);
  },
  async moveDir(fromUri, toUri) {
    new Directory(fromUri).move(new Directory(toUri));
  },
  async copy(fromUri, toUri) {
    const target = new File(toUri);
    if (target.exists) target.delete();
    new File(fromUri).copy(target);
  },
  async remove(uri) {
    if (fileExists(uri)) {
      new File(uri).delete();
      return;
    }
    if (dirExists(uri)) new Directory(uri).delete();
  },
  async size(uri) {
    if (!fileExists(uri)) return null;
    return new File(uri).size ?? 0;
  },
};
