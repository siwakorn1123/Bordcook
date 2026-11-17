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

export interface SetlistRecord {
  id: number;
  name: string;
  createdAt: number;
  songIds: number[];
}

const DB_NAME = 'chord_book_preview';
const DB_VERSION = 2;
const STORE_SONGS = 'songs';
const STORE_SETLISTS = 'setlists';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SETLISTS)) {
        db.createObjectStore(STORE_SETLISTS, {
          keyPath: 'id',
          autoIncrement: true,
        });
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
      list.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'th')
      );
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
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Also clean deleted songId out of all setlists
  const setlists = await getAllSetlists();
  for (const sl of setlists) {
    if (sl.songIds.includes(id)) {
      await saveSetlistRecord({
        ...sl,
        songIds: sl.songIds.filter((sid) => sid !== id),
      });
    }
  }
}

export async function getAllSetlists(): Promise<SetlistRecord[]> {
  const db = await openDatabase();
  const list = await new Promise<SetlistRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_SETLISTS, 'readonly');
    const store = tx.objectStore(STORE_SETLISTS);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as SetlistRecord[]) || []);
    req.onerror = () => reject(req.error);
  });

  if (list.length === 0) {
    const defaultId = await saveSetlistRecord({
      name: 'ลิสเพลงของฉัน',
      songIds: [],
    });
    return [
      {
        id: defaultId,
        name: 'ลิสเพลงของฉัน',
        createdAt: Date.now(),
        songIds: [],
      },
    ];
  }

  list.sort((a, b) => a.id - b.id);
  return list;
}

export async function saveSetlistRecord(params: {
  id?: number;
  name: string;
  songIds: number[];
}): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETLISTS, 'readwrite');
    const store = tx.objectStore(STORE_SETLISTS);
    const record: Omit<SetlistRecord, 'id'> & { id?: number } = {
      name: params.name.trim(),
      createdAt: Date.now(),
      songIds: params.songIds,
    };
    if (params.id !== undefined) {
      record.id = params.id;
    }
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSetlistRecord(id: number): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SETLISTS, 'readwrite');
    const store = tx.objectStore(STORE_SETLISTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await getAllSetlists();
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
