import type { Session, DailySummary } from '../types';

const DB_NAME = 'nemuke_buster_db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const DAILY_STORE = 'daily_summaries';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        store.createIndex('startedAt', 'startedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(DAILY_STORE)) {
        db.createObjectStore(DAILY_STORE, { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Sessions ---

export function saveSession(session: Session): Promise<void> {
  return withStore(SESSIONS_STORE, 'readwrite', (store) =>
    store.put(session),
  ).then(() => undefined);
}

export function getSession(id: string): Promise<Session | undefined> {
  return withStore(SESSIONS_STORE, 'readonly', (store) => store.get(id));
}

export function getActiveSession(): Promise<Session | null> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.openCursor();
        const results: Session[] = [];

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const session = cursor.value as Session;
            if (session.endedAt === null) {
              results.push(session);
            }
            cursor.continue();
          } else {
            resolve(results.length > 0 ? results[0] : null);
          }
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

export function getSessionsByDateRange(
  startMs: number,
  endMs: number,
): Promise<Session[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const index = store.index('startedAt');
        const range = IDBKeyRange.bound(startMs, endMs);
        const req = index.openCursor(range);
        const results: Session[] = [];

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            results.push(cursor.value as Session);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Daily Summaries ---

export function saveDailySummary(summary: DailySummary): Promise<void> {
  return withStore(DAILY_STORE, 'readwrite', (store) =>
    store.put(summary),
  ).then(() => undefined);
}

export function getDailySummary(
  date: string,
): Promise<DailySummary | undefined> {
  return withStore(DAILY_STORE, 'readonly', (store) => store.get(date));
}

export function getDailySummaries(
  dates: string[],
): Promise<DailySummary[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DAILY_STORE, 'readonly');
        const store = tx.objectStore(DAILY_STORE);
        const results: DailySummary[] = [];
        let pending = dates.length;

        if (pending === 0) {
          resolve([]);
          return;
        }

        for (const date of dates) {
          const req = store.get(date);
          req.onsuccess = () => {
            if (req.result) results.push(req.result as DailySummary);
            if (--pending === 0) resolve(results);
          };
          req.onerror = () => reject(req.error);
        }
      }),
  );
}
