/***
 * IndexedDB Offline Vault for Field Reporters (Corresponsal Movil)
 * Almacena reportes en la memoria flash del telefono cuando no hay senal 4G.
 */

export interface OfflineReport {
  id: string;
  timestamp: string;
  text: string;
  corresponsalName: string;
  isAnonymous: boolean;
  coords: string;
  audioBlob?: Blob;
  imageBlob?: Blob;
  videoBlob?: Blob;
  status: "pending" | "syncing" | "failed";
}

const DB_NAME = "prensa_nexora_offline_db";
const STORE_NAME = "offline_reports";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no soportado en este entorno"));
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineReport(report: OfflineReport): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(report);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Offline Vault] Error guardando reporte local:", err);
    return false;
  }
}

export async function getOfflineReports(): Promise<OfflineReport[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Offline Vault] Error leyendo reportes locales:", err);
    return [];
  }
}

export async function deleteOfflineReport(id: string): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Offline Vault] Error eliminando reporte sincronizado:", err);
    return false;
  }
}
