import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class Song {
  final int? id;
  final String name;
  final int createdAt;
  final List<String> pageFiles;

  const Song({
    this.id,
    required this.name,
    required this.createdAt,
    required this.pageFiles,
  });

  int get pageCount => pageFiles.length;

  String? get firstPageFile => pageFiles.isEmpty ? null : pageFiles.first;

  Song copyWith({
    int? id,
    String? name,
    int? createdAt,
    List<String>? pageFiles,
  }) {
    return Song(
      id: id ?? this.id,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      pageFiles: pageFiles ?? this.pageFiles,
    );
  }
}

class ChordDb {
  ChordDb._();

  static final ChordDb instance = ChordDb._();

  Database? _db;
  Directory? _imagesDir;

  Database get _database {
    final db = _db;
    if (db == null) {
      throw StateError('ChordDb.init() must be called before accessing database');
    }
    return db;
  }

  Directory get _chordImagesDir {
    final dir = _imagesDir;
    if (dir == null) {
      throw StateError('ChordDb.init() must be called before accessing images directory');
    }
    return dir;
  }

  Future<void> init() async {
    if (_db != null && _imagesDir != null) {
      return;
    }

    final docsDir = await getApplicationDocumentsDirectory();
    final imagesDir = Directory(p.join(docsDir.path, 'chord_images'));
    if (!await imagesDir.exists()) {
      await imagesDir.create(recursive: true);
    }
    _imagesDir = imagesDir;

    final dbFolder = await getDatabasesPath();
    final dbPath = p.join(dbFolder, 'chord_book.db');

    _db = await openDatabase(
      dbPath,
      version: 1,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id INTEGER NOT NULL,
            file TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
          )
        ''');

        await db.execute(
          'CREATE INDEX idx_pages_song_pos ON pages (song_id, position)',
        );
      },
    );
  }

  String getImagePath(String fileName) {
    return p.join(_chordImagesDir.path, fileName);
  }

  File getImageFile(String fileName) {
    return File(getImagePath(fileName));
  }

  bool isManagedImagePath(String filePath) {
    return p.equals(p.dirname(filePath), _chordImagesDir.path);
  }

  Future<List<Song>> getSongs({String query = ''}) async {
    final db = _database;

    final songRows = await db.query(
      'songs',
      orderBy: 'name COLLATE NOCASE ASC, id ASC',
    );

    final pageRows = await db.query(
      'pages',
      orderBy: 'song_id ASC, position ASC',
    );

    final pagesBySongId = <int, List<String>>{};
    for (final row in pageRows) {
      final songId = row['song_id'] as int;
      final fileName = row['file'] as String;
      pagesBySongId.putIfAbsent(songId, () => []).add(fileName);
    }

    final songs = songRows.map((row) {
      final id = row['id'] as int;
      return Song(
        id: id,
        name: row['name'] as String,
        createdAt: row['created_at'] as int,
        pageFiles: pagesBySongId[id] ?? const [],
      );
    }).toList();

    final trimmed = query.trim().toLowerCase();
    final filtered = trimmed.isEmpty
        ? songs
        : songs
            .where((song) => song.name.toLowerCase().contains(trimmed))
            .toList();

    filtered.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );

    return filtered;
  }

  Future<Song?> getSongById(int id) async {
    final db = _database;
    final songRows = await db.query(
      'songs',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (songRows.isEmpty) {
      return null;
    }

    final pageRows = await db.query(
      'pages',
      where: 'song_id = ?',
      whereArgs: [id],
      orderBy: 'position ASC',
    );

    final row = songRows.first;
    return Song(
      id: row['id'] as int,
      name: row['name'] as String,
      createdAt: row['created_at'] as int,
      pageFiles: pageRows.map((pRow) => pRow['file'] as String).toList(),
    );
  }

  Future<int> saveSong({
    int? id,
    required String name,
    required List<String> imagePaths,
  }) async {
    final db = _database;
    final cleanName = name.trim();
    if (cleanName.isEmpty) {
      throw ArgumentError('Song name cannot be empty');
    }
    if (imagePaths.isEmpty) {
      throw ArgumentError('At least one page image is required');
    }

    final targetFileNames = <String>[];
    final newlyCopiedFiles = <File>[];

    try {
      final timestamp = DateTime.now().microsecondsSinceEpoch;
      for (var i = 0; i < imagePaths.length; i++) {
        final sourcePath = imagePaths[i];
        final sourceFile = File(sourcePath);

        if (isManagedImagePath(sourcePath) && await sourceFile.exists()) {
          targetFileNames.add(p.basename(sourcePath));
          continue;
        }

        if (!await sourceFile.exists()) {
          throw FileSystemException('Image file not found', sourcePath);
        }

        final rawExt = p.extension(sourcePath).toLowerCase();
        final ext = rawExt.isEmpty ? '.jpg' : rawExt;
        final newFileName = '${timestamp}_$i$ext';
        final destFile = getImageFile(newFileName);

        await sourceFile.copy(destFile.path);
        newlyCopiedFiles.add(destFile);
        targetFileNames.add(newFileName);
      }

      var oldFiles = <String>[];
      final savedSongId = await db.transaction<int>((txn) async {
        late final int songId;

        if (id == null) {
          songId = await txn.insert('songs', {
            'name': cleanName,
            'created_at': DateTime.now().millisecondsSinceEpoch,
          });
        } else {
          songId = id;
          final existingPages = await txn.query(
            'pages',
            columns: ['file'],
            where: 'song_id = ?',
            whereArgs: [songId],
          );
          oldFiles = existingPages.map((r) => r['file'] as String).toList();

          await txn.update(
            'songs',
            {'name': cleanName},
            where: 'id = ?',
            whereArgs: [songId],
          );
          await txn.delete(
            'pages',
            where: 'song_id = ?',
            whereArgs: [songId],
          );
        }

        for (var i = 0; i < targetFileNames.length; i++) {
          await txn.insert('pages', {
            'song_id': songId,
            'file': targetFileNames[i],
            'position': i,
          });
        }

        return songId;
      });

      final targetSet = targetFileNames.toSet();
      for (final oldFile in oldFiles) {
        if (!targetSet.contains(oldFile)) {
          await _deleteFileIfUnused(oldFile);
        }
      }

      return savedSongId;
    } catch (_) {
      for (final copied in newlyCopiedFiles) {
        if (await copied.exists()) {
          await copied.delete();
        }
      }
      rethrow;
    }
  }

  Future<void> deleteSong(int id) async {
    final db = _database;

    final existingPages = await db.query(
      'pages',
      columns: ['file'],
      where: 'song_id = ?',
      whereArgs: [id],
    );
    final filesToCheck = existingPages.map((r) => r['file'] as String).toList();

    await db.delete(
      'songs',
      where: 'id = ?',
      whereArgs: [id],
    );

    for (final fileName in filesToCheck) {
      await _deleteFileIfUnused(fileName);
    }
  }

  Future<void> _deleteFileIfUnused(String fileName) async {
    final result = await _database.rawQuery(
      'SELECT COUNT(*) FROM pages WHERE file = ?',
      [fileName],
    );
    final count = Sqflite.firstIntValue(result) ?? 0;
    if (count == 0) {
      final file = getImageFile(fileName);
      if (await file.exists()) {
        await file.delete();
      }
    }
  }
}
