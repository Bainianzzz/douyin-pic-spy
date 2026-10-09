/** Minimal File System Access types (avoids depending on lib.dom's coverage). */

export interface WritableLike {
  write(data: unknown): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike {
  createWritable(): Promise<WritableLike>;
}

export interface DirEntryLike {
  kind: string;
  name: string;
}

export interface DirHandle {
  readonly name: string;
  queryPermission(desc: { mode: string }): Promise<PermissionState>;
  requestPermission(desc: { mode: string }): Promise<PermissionState>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterableIterator<DirEntryLike>;
}
