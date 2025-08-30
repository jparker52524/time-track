// offlineQueue.js
import { openDB } from "idb";

const DB_NAME = "timeTracker";
const STORE_NAME = "pendingLogs";

// Init IndexedDB
async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    },
  });
}

// Save a log to queue
export async function queueLog(time) {
  const db = await getDB();
  await db.add(STORE_NAME, { time });
}

// Get all queued logs
export async function getQueuedLogs() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

// Clear queued logs
export async function clearLogs() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}