import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

export interface Song {
  id: number;
  name: string;
  createdAt: number;
  pageFiles: string[];
}

interface SongRow {
  id: number;
  name: string;
  created_at: number;
}

interface PageRow {
  id: number;
  song_id: number;
  file: string;
  position: number;
}

const IMAGES_DIR = `${FileSystem.documentDirectory}chord_images/`;

class ChordDb {
  private static _instance: ChordDb | null = null;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static get instance(): ChordDb {
    if (!ChordDb._instance) {
      ChordDb._instance = new ChordDb();
    }
    return ChordDb._instance;
  }

  private get database(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('ChordDb.init() must be called before using the database');
    }
    return this.db;
  }

  async init(): Promise<void> {
    if (this.db) return;

    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }

    const db = await SQLite.openDatabaseAsync('chord_book.db');
    await db.execAsync(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL,
        file TEXT NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_pages_song_pos ON pages (song_id, position);
    `);

    this.db = db;
  }

  getImageUri(fileName: string): string {
    return `${IMAGES_DIR}${fileName}`;
  }

  isManagedImageUri(uri: string): boolean {
    return uri.startsWith(IMAGES_DIR);
  }

  async getSongs(query = ''): Promise<Song[]> {
    const db = this.database;
    const songRows = await db.getAllAsync<SongRow>(
      'SELECT id, name, created_at FROM songs ORDER BY name COLLATE NOCASE ASC, id ASC'
    );
    const pageRows = await db.getAllAsync<PageRow>(
      'SELECT id, song_id, file, position FROM pages ORDER BY song_id ASC, position ASC'
    );

    const pagesBySongId = new Map<number, string[]>();
    for (const row of pageRows) {
      const list = pagesBySongId.get(row.song_id) ?? [];
      list.push(row.file);
      pagesBySongId.set(row.song_id, list);
    }

    const songs: Song[] = songRows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      pageFiles: pagesBySongId.get(row.id) ?? [],
    }));

    const trimmed = query.trim().toLowerCase();
    const filtered = trimmed
      ? songs.filter((s) => s.name.toLowerCase().includes(trimmed))
      : songs;

    filtered.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'th')
    );

    return filtered;
  }

  async getSongById(id: number): Promise<Song | null> {
    const db = this.database;
    const row = await db.getFirstAsync<SongRow>(
      'SELECT id, name, created_at FROM songs WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) return null;

    const pageRows = await db.getAllAsync<PageRow>(
      'SELECT id, song_id, file, position FROM pages WHERE song_id = ? ORDER BY position ASC',
      [id]
    );

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      pageFiles: pageRows.map((p) => p.file),
    };
  }

  async saveSong(params: {
    id?: number;
    name: string;
    imageUris: string[];
  }): Promise<number> {
    const db = this.database;
    const cleanName = params.name.trim();
    if (!cleanName) {
      throw new Error('กรุณากรอกชื่อเพลง');
    }
    if (params.imageUris.length === 0) {
      throw new Error('กรุณาเลือกรูปคอร์ดอย่างน้อย 1 รูป');
    }

    const targetFileNames: string[] = [];
    const newlyCopiedUris: string[] = [];

    try {
      const stamp = Date.now();
      for (let i = 0; i < params.imageUris.length; i++) {
        const uri = params.imageUris[i];
        if (this.isManagedImageUri(uri)) {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) {
            targetFileNames.push(uri.slice(IMAGES_DIR.length));
            continue;
          }
        }

        const extMatch = uri.split('?')[0].match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
        const fileName = `${stamp}_${i}_${Math.random().toString(36).slice(2, 7)}${ext}`;
        const destUri = this.getImageUri(fileName);

        await FileSystem.copyAsync({ from: uri, to: destUri });
        newlyCopiedUris.push(destUri);
        targetFileNames.push(fileName);
      }

      let oldFiles: string[] = [];
      let savedSongId = params.id ?? 0;

      await db.withTransactionAsync(async () => {
        if (params.id === undefined) {
          const res = await db.runAsync(
            'INSERT INTO songs (name, created_at) VALUES (?, ?)',
            [cleanName, Date.now()]
          );
          savedSongId = res.lastInsertRowId;
        } else {
          savedSongId = params.id;
          const prevPages = await db.getAllAsync<{ file: string }>(
            'SELECT file FROM pages WHERE song_id = ?',
            [savedSongId]
          );
          oldFiles = prevPages.map((p) => p.file);

          await db.runAsync('UPDATE songs SET name = ? WHERE id = ?', [
            cleanName,
            savedSongId,
          ]);
          await db.runAsync('DELETE FROM pages WHERE song_id = ?', [
            savedSongId,
          ]);
        }

        for (let i = 0; i < targetFileNames.length; i++) {
          await db.runAsync(
            'INSERT INTO pages (song_id, file, position) VALUES (?, ?, ?)',
            [savedSongId, targetFileNames[i], i]
          );
        }
      });

      const targetSet = new Set(targetFileNames);
      for (const oldFile of oldFiles) {
        if (!targetSet.has(oldFile)) {
          await this.deleteFileIfUnused(oldFile);
        }
      }

      return savedSongId;
    } catch (err) {
      for (const uri of newlyCopiedUris) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      throw err;
    }
  }

  async deleteSong(id: number): Promise<void> {
    const db = this.database;
    const prevPages = await db.getAllAsync<{ file: string }>(
      'SELECT file FROM pages WHERE song_id = ?',
      [id]
    );

    await db.runAsync('DELETE FROM songs WHERE id = ?', [id]);

    for (const row of prevPages) {
      await this.deleteFileIfUnused(row.file);
    }
  }

  private async deleteFileIfUnused(fileName: string): Promise<void> {
    const row = await this.database.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM pages WHERE file = ?',
      [fileName]
    );
    if ((row?.cnt ?? 0) === 0) {
      await FileSystem.deleteAsync(this.getImageUri(fileName), {
        idempotent: true,
      });
    }
  }
}

export default ChordDb;
