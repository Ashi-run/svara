import { triggerDownload, writeFileInDir, toCSV } from "./files";
import { mockRecognize } from "./speechMock";
import { queueForSync, getPendingSync, clearSyncItem } from "./db";

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

export const api = {
  /* --------------------------- data collection --------------------------- */
  // Real version (later): multipart/form-data POST to /api/recordings
  async saveRecording({ dirHandle, filename, blob }) {
    if (dirHandle) {
      await writeFileInDir(dirHandle, filename, blob);
    } else {
      triggerDownload(blob, filename);
    }
    return { ok: true, filename };
  },

  // Real version (later): POST rows to the backend, or drop entirely if the
  // backend derives the log from saved recordings server-side.
  async writeLog({ dirHandle, rows }) {
    const csvText = toCSV(rows);
    if (dirHandle) {
      await writeFileInDir(dirHandle, "recordings_log.csv", csvText);
    } else {
      triggerDownload(new Blob([csvText], { type: "text/csv;charset=utf-8;" }), "recordings_log.csv");
    }
  },

  /* ------------------------------ patient app ------------------------------ */
  // Real version (later): POST audio to /api/transcribe, which runs ASR +
  // the correction model server-side and returns { recognizedText, chars,
  // accuracyPct, ... }. If the network is down, this is queued and the UI
  // shows a locally-generated placeholder so practice isn't blocked.
  async analyzeRecording({ patientId, promptText, blob }) {
    if (!isOnline()) {
      await queueForSync({ type: "analyze", patientId, promptText, blob });
    }
    // Simulate network latency for a real ASR call.
    await new Promise((r) => setTimeout(r, 900));
    return mockRecognize(promptText, Date.now());
  },

  // Real version (later): GET /api/tts?voice=<patientId> returning cloned
  // audio of the corrected text. For now, the original recording is reused
  // as a stand-in so the Playback screen has real audio to A/B against.
  async synthesizeCorrectedAudio({ originalBlob }) {
    await new Promise((r) => setTimeout(r, 700));
    return originalBlob;
  },

  /* ------------------------------ offline sync ------------------------------ */
  async getPendingCount() {
    const items = await getPendingSync();
    return items.length;
  },

  // Flushes anything queued while offline. Real version: actually POST each
  // item, then clear it on success.
  async syncPending(onProgress) {
    const items = await getPendingSync();
    for (let i = 0; i < items.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      await clearSyncItem(items[i].id);
      onProgress?.(i + 1, items.length);
    }
    return items.length;
  },
};
