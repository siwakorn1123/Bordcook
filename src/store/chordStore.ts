export interface SongRecord {
  id: number;
  name: string;
  createdAt: number;
  pages: PageImage[];
}

export interface PageImage {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

const DB_NAME = 'chord_book_preview';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSongs(): Promise<SongRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readonly');
    const store = tx.objectStore(STORE_SONGS);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as SongRecord[]) || [];
      list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'th'));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSongRecord(params: {
  id?: number;
  name: string;
  pages: PageImage[];
}): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    const record: Omit<SongRecord, 'id'> & { id?: number } = {
      name: params.name.trim(),
      createdAt: Date.now(),
      pages: params.pages,
    };
    if (params.id !== undefined) {
      record.id = params.id;
    }
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSongRecord(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
