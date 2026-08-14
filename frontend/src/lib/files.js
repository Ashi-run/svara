export const supportsFileSystemAccess =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function writeFileInDir(dirHandle, filename, content) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Re-requests permission on a directory handle restored from IndexedDB —
// browsers require this to happen in response to a real user gesture
// (e.g. a "Resume session" button click), which is why this is exposed
// separately rather than called automatically on load.
export async function ensureDirPermission(dirHandle) {
  if (!dirHandle) return false;
  const opts = { mode: "readwrite" };
  if ((await dirHandle.queryPermission(opts)) === "granted") return true;
  const result = await dirHandle.requestPermission(opts);
  return result === "granted";
}

export function toCSV(rows) {
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
  const header = "filename,intended_text,status";
  const body = rows
    .map((r) => `${escape(r.filename)},${escape(r.promptText)},${escape(r.status || "recorded")}`)
    .join("\n");
  return [header, body].filter(Boolean).join("\n") + "\n";
}
