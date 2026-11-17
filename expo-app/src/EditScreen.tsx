import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import ChordDb, { Song } from './db';
import { useAppTheme } from './theme';

interface PageDraft {
  id: string;
  uri: string;
  size: number;
}

interface EditScreenProps {
  song?: Song;
  onCancel: () => void;
  onSaved: (songId: number) => Promise<void>;
  onDeleted: () => Promise<void>;
}

export default function EditScreen({
  song,
  onCancel,
  onSaved,
  onDeleted,
}: EditScreenProps) {
  const theme = useAppTheme();
  const isEditMode = Boolean(song);

  const [name, setName] = useState(song?.name ?? '');
  const [items, setItems] = useState<PageDraft[]>(() =>
    (song?.pageFiles ?? []).map((fileName, index) => ({
      id: `existing_${index}_${fileName}`,
      uri: ChordDb.instance.getImageUri(fileName),
      size: -1,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const getFileSize = async (uri: string): Promise<number> => {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && typeof info.size === 'number' ? info.size : -1;
  };

  const isDuplicateImage = async (
    candidateUri: string,
    candidateSize: number,
    currentItems: PageDraft[]
  ): Promise<boolean> => {
    let candidateBase64: string | null = null;

    for (const existing of currentItems) {
      if (existing.uri === candidateUri) return true;

      const existingSize =
        existing.size >= 0 ? existing.size : await getFileSize(existing.uri);

      if (candidateSize >= 0 && existingSize === candidateSize) {
        if (candidateBase64 === null) {
          candidateBase64 = await FileSystem.readAsStringAsync(candidateUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        const existingBase64 = await FileSystem.readAsStringAsync(
          existing.uri,
          { encoding: FileSystem.EncodingType.Base64 }
        );
        if (candidateBase64 === existingBase64) {
          return true;
        }
      }
    }
    return false;
  };

  const handlePickImages = async () => {
    if (isPicking || isSaving) return;
    setIsPicking(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'ต้องการสิทธิ์เข้าถึงรูปภาพ',
          'กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพเพื่อเลือกรูปคอร์ดเพลง'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) return;

      const updated = [...items];
      let added = 0;
      let duplicates = 0;

      for (const asset of result.assets) {
        const size = asset.fileSize ?? (await getFileSize(asset.uri));
        const dup = await isDuplicateImage(asset.uri, size, updated);
        if (dup) {
          duplicates++;
          continue;
        }
        updated.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          uri: asset.uri,
          size,
        });
        added++;
      }

      setItems(updated);

      if (duplicates > 0 && added === 0) {
        Alert.alert('รูปซ้ำ', 'รูปที่เลือกซ้ำกับรูปที่มีอยู่แล้ว');
      } else if (duplicates > 0) {
        Alert.alert(
          'เพิ่มรูปแล้ว',
          `เพิ่มแล้ว ${added} รูป (ข้ามรูปที่ซ้ำกัน ${duplicates} รูป)`
        );
      }
    } catch (e) {
      Alert.alert('เลือกรูปไม่สำเร็จ', String(e));
    } finally {
      setIsPicking(false);
    }
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อเพลง');
      return;
    }
    if (items.length === 0) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเลือกรูปคอร์ดอย่างน้อย 1 รูป');
      return;
    }

    setIsSaving(true);
    try {
      const savedId = await ChordDb.instance.saveSong({
        id: song?.id,
        name: cleanName,
        imageUris: items.map((i) => i.uri),
      });
      await onSaved(savedId);
    } catch (e) {
      setIsSaving(false);
      Alert.alert('บันทึกไม่สำเร็จ', String(e));
    }
  };

  const handleDelete = () => {
    if (!song || isSaving) return;
    Alert.alert(
      'ยืนยันการลบเพลง',
      `คุณต้องการลบเพลง "${song.name}" และรูปคอร์ดทั้งหมดของเพลงนี้หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบเพลง',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await ChordDb.instance.deleteSong(song.id);
              await onDeleted();
            } catch (e) {
              setIsSaving(false);
              Alert.alert('ลบเพลงไม่สำเร็จ', String(e));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Pressable onPress={onCancel} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isEditMode ? 'แก้ไขเพลง' : 'เพิ่มเพลง'}
        </Text>
        <View style={styles.headerActions}>
          {isEditMode && (
            <Pressable
              onPress={handleDelete}
              disabled={isSaving}
              style={styles.deleteIconBtn}
            >
              <Ionicons name="trash-outline" size={22} color={theme.danger} />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
                  บันทึก
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.formSection}>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!isSaving}
            placeholder="ชื่อเพลง (เช่น คิดถึง, รักแรกพบ)"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />

          <Pressable
            onPress={handlePickImages}
            disabled={isSaving || isPicking}
            style={[
              styles.pickBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {isPicking ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name="images-outline"
                size={20}
                color={theme.primary}
              />
            )}
            <Text style={[styles.pickBtnText, { color: theme.primary }]}>
              เลือกรูปคอร์ด (เลือกได้หลายรูป)
            </Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="images-outline"
              size={52}
              color={theme.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              ยังไม่ได้เลือกรูปคอร์ด
            </Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
              กดปุ่มด้านบนเพื่อเลือกรูปคอร์ดอย่างน้อย 1 รูป
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.pageRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={[
                    styles.rowThumb,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                  resizeMode="cover"
                />
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  หน้า {index + 1}
                </Text>

                <View style={styles.rowActions}>
                  <Pressable
                    disabled={index === 0 || isSaving}
                    onPress={() => moveItem(index, index - 1)}
                    style={[
                      styles.rowIconBtn,
                      index === 0 && styles.disabledBtn,
                    ]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    disabled={index === items.length - 1 || isSaving}
                    onPress={() => moveItem(index, index + 1)}
                    style={[
                      styles.rowIconBtn,
                      index === items.length - 1 && styles.disabledBtn,
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    disabled={isSaving}
                    onPress={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                    style={styles.rowIconBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.danger} />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 840,
  },
  formSection: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  pickBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 14,
  },
  rowThumb: {
    width: 64,
    height: 82,
    borderRadius: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  disabledBtn: {
    opacity: 0.3,
  },
});
