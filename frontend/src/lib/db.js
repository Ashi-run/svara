import { openDB } from "idb";

const DB_NAME = "cleft-speech-db";
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings"); // key -> value
        }
        if (!db.objectStoreNames.contains("dataCollectionSession")) {
          db.createObjectStore("dataCollectionSession"); // key 'current' -> session snapshot
        }
        if (!db.objectStoreNames.contains("sessionHistory")) {
          const store = db.createObjectStore("sessionHistory", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("patientId", "patientId");
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

/* ---------------------------- settings ---------------------------- */
export async function getSetting(key, fallback = null) {
  const db = await getDB();
  const val = await db.get("settings", key);
  return val === undefined ? fallback : val;
}
export async function setSetting(key, value) {
  const db = await getDB();
  return db.put("settings", value, key);
}

/* ------------------------- data collection ------------------------- */
// Note: modern Chromium browsers can structured-clone a FileSystemDirectoryHandle,
// so the picked folder itself can be persisted here and reused after a reload —
// the user just has to re-grant permission with one click (browser requirement).
export async function saveDataCollectionSession(snapshot) {
  const db = await getDB();
  return db.put("dataCollectionSession", snapshot, "current");
}
export async function loadDataCollectionSession() {
  const db = await getDB();
  return db.get("dataCollectionSession", "current");
}
export async function clearDataCollectionSession() {
  const db = await getDB();
  return db.delete("dataCollectionSession", "current");
}

/* --------------------------- session history --------------------------- */
// One row per completed Patient App review (Record -> Review -> Playback flow).
export async function addSessionResult(entry) {
  const db = await getDB();
  return db.add("sessionHistory", { ...entry, date: new Date().toISOString() });
}
export async function getSessionHistory(patientId) {
  const db = await getDB();
  if (!patientId) return db.getAll("sessionHistory");
  return db.getAllFromIndex("sessionHistory", "patientId", patientId);
}
export async function getAllSessionHistory() {
  const db = await getDB();
  return db.getAll("sessionHistory");
}

/* ----------------------------- sync queue ----------------------------- */
// Used to simulate an offline-first flow: items land here when the network
// (or backend) is unavailable, and get flushed via api.syncPending() later.
export async function queueForSync(item) {
  const db = await getDB();
  return db.add("syncQueue", { ...item, queuedAt: new Date().toISOString() });
}
export async function getPendingSync() {
  const db = await getDB();
  return db.getAll("syncQueue");
}
export async function clearSyncItem(id) {
  const db = await getDB();
  return db.delete("syncQueue", id);
}
