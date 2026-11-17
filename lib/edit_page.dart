import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'db.dart';

class EditPage extends StatefulWidget {
  final Song? song;

  const EditPage({
    super.key,
    this.song,
  });

  @override
  State<EditPage> createState() => _EditPageState();
}

class _EditablePageItem {
  final String id;
  final String path;
  final int fileSize;

  const _EditablePageItem({
    required this.id,
    required this.path,
    required this.fileSize,
  });
}

class _EditPageState extends State<EditPage> {
  late final TextEditingController _nameController;
  final ImagePicker _picker = ImagePicker();
  final List<_EditablePageItem> _items = [];

  int _nextItemId = 0;
  bool _isSaving = false;
  bool _isPicking = false;

  bool get _isEditMode => widget.song != null;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.song?.name ?? '');
    final existing = widget.song;
    if (existing != null) {
      for (final fileName in existing.pageFiles) {
        final fullPath = ChordDb.instance.getImagePath(fileName);
        final file = File(fullPath);
        final size = file.existsSync() ? file.lengthSync() : -1;
        _items.add(
          _EditablePageItem(
            id: 'page_${_nextItemId++}',
            path: fullPath,
            fileSize: size,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<bool> _isDuplicate(String candidatePath, int candidateSize) async {
    final candidateFile = File(candidatePath);
    Uint8List? candidateBytes;

    for (final existing in _items) {
      if (existing.path == candidatePath) {
        return true;
      }
      if (candidateSize >= 0 && existing.fileSize == candidateSize) {
        final existingFile = File(existing.path);
        if (!await existingFile.exists()) continue;

        candidateBytes ??= await candidateFile.readAsBytes();
        final existingBytes = await existingFile.readAsBytes();
        if (_bytesEqual(candidateBytes, existingBytes)) {
          return true;
        }
      }
    }
    return false;
  }

  bool _bytesEqual(Uint8List a, Uint8List b) {
    if (a.lengthInBytes != b.lengthInBytes) return false;
    for (var i = 0; i < a.lengthInBytes; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  Future<void> _pickImages() async {
    if (_isPicking || _isSaving) return;
    setState(() {
      _isPicking = true;
    });

    try {
      final pickedFiles = await _picker.pickMultiImage();
      if (!mounted || pickedFiles.isEmpty) return;

      var addedCount = 0;
      var duplicateCount = 0;

      for (final xFile in pickedFiles) {
        final file = File(xFile.path);
        if (!await file.exists()) continue;

        final fileSize = await file.length();
        final duplicated = await _isDuplicate(xFile.path, fileSize);
        if (duplicated) {
          duplicateCount++;
          continue;
        }

        if (!mounted) return;
        setState(() {
          _items.add(
            _EditablePageItem(
              id: 'page_${_nextItemId++}',
              path: xFile.path,
              fileSize: fileSize,
            ),
          );
        });
        addedCount++;
      }

      if (!mounted) return;
      if (duplicateCount > 0 && addedCount == 0) {
        _showSnackBar('รูปที่เลือกซ้ำกับที่มีอยู่แล้ว');
      } else if (duplicateCount > 0) {
        _showSnackBar('เพิ่มแล้ว $addedCount รูป (ข้ามรูปซ้ำ $duplicateCount รูป)');
      }
    } catch (e) {
      _showSnackBar('ไม่สามารถเลือกรูปภาพได้: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isPicking = false;
        });
      }
    }
  }

  Future<void> _save() async {
    if (_isSaving) return;

    final songName = _nameController.text.trim();
    if (songName.isEmpty) {
      _showSnackBar('กรุณากรอกชื่อเพลง');
      return;
    }

    if (_items.isEmpty) {
      _showSnackBar('กรุณาเลือกรูปคอร์ดอย่างน้อย 1 รูป');
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      await ChordDb.instance.saveSong(
        id: widget.song?.id,
        name: songName,
        imagePaths: _items.map((item) => item.path).toList(),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
      });
      _showSnackBar('บันทึกไม่สำเร็จ: $e');
    }
  }

  Future<void> _confirmDelete() async {
    final songId = widget.song?.id;
    if (songId == null || _isSaving) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('ยืนยันการลบเพลง'),
          content: Text(
            'คุณต้องการลบเพลง "${widget.song!.name}" และรูปคอร์ดทั้งหมดของเพลงนี้หรือไม่?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('ยกเลิก'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(dialogContext).colorScheme.error,
                foregroundColor: Theme.of(dialogContext).colorScheme.onError,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('ลบเพลง'),
            ),
          ],
        );
      },
    );

    if (!mounted || confirmed != true) return;

    setState(() {
      _isSaving = true;
    });

    try {
      await ChordDb.instance.deleteSong(songId);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
      });
      _showSnackBar('ลบเพลงไม่สำเร็จ: $e');
    }
  }

  void _onReorder(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) {
        newIndex -= 1;
      }
      final moved = _items.removeAt(oldIndex);
      _items.insert(newIndex, moved);
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? 'แก้ไขเพลง' : 'เพิ่มเพลง'),
        actions: [
          if (_isEditMode)
            IconButton(
              tooltip: 'ลบเพลง',
              onPressed: _isSaving ? null : _confirmDelete,
              icon: const Icon(Icons.delete_outline),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.check),
              label: const Text('บันทึก'),
            ),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 840),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _nameController,
                      autofocus: !_isEditMode,
                      enabled: !_isSaving,
                      textInputAction: TextInputAction.done,
                      decoration: const InputDecoration(
                        labelText: 'ชื่อเพลง',
                        hintText: 'เช่น คิดถึง, รักแรกพบ',
                        prefixIcon: Icon(Icons.music_note_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: (_isSaving || _isPicking) ? null : _pickImages,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: _isPicking
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.add_photo_alternate_outlined),
                      label: const Text('เลือกรูปคอร์ด (เลือกได้หลายรูป)'),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _items.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.photo_library_outlined,
                                size: 56,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'ยังไม่ได้เลือกรูปคอร์ด',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'กดปุ่มด้านบนเพื่อเลือกรูปคอร์ดอย่างน้อย 1 รูป',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ReorderableListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        buildDefaultDragHandles: false,
                        itemCount: _items.length,
                        onReorder: _onReorder,
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          return Card(
                            key: ValueKey(item.id),
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(
                                color: colorScheme.outlineVariant
                                    .withValues(alpha: 0.6),
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Container(
                                      width: 64,
                                      height: 82,
                                      color:
                                          colorScheme.surfaceContainerHighest,
                                      child: Image.file(
                                        File(item.path),
                                        fit: BoxFit.cover,
                                        cacheWidth: 200,
                                        errorBuilder: (_, __, ___) => Center(
                                          child: Icon(
                                            Icons.broken_image_outlined,
                                            color:
                                                colorScheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      'หน้า ${index + 1}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: 'ลบรูปออก',
                                    onPressed: _isSaving
                                        ? null
                                        : () {
                                            setState(() {
                                              _items.removeAt(index);
                                            });
                                          },
                                    icon: Icon(
                                      Icons.close,
                                      color: colorScheme.error,
                                    ),
                                  ),
                                  ReorderableDragStartListener(
                                    index: index,
                                    child: Padding(
                                      padding: const EdgeInsets.all(8),
                                      child: Icon(
                                        Icons.drag_handle,
                                        color: colorScheme.onSurfaceVariant,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
