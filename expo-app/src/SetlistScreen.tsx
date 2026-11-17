import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChordDb, { Setlist, SetlistItem, Song } from './db';
import { useAppTheme } from './theme';

const ROW_HEIGHT = 82;
const ROW_GAP = 10;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;

interface SetlistScreenProps {
  allSongs: Song[];
  setlists: Setlist[];
  activeSetlistId: number;
  items: SetlistItem[];
  onSelectSetlist: (setlistId: number) => void;
  onCreateSetlist: (name: string) => Promise<void>;
  onRenameSetlist: (id: number, name: string) => Promise<void>;
  onDeleteSetlist: (id: number) => Promise<void>;
  onAddSongs: (songIds: number[]) => Promise<void>;
  onReorderItems: (orderedItems: SetlistItem[]) => Promise<void>;
  onRemoveItem: (itemId: number) => Promise<void>;
  onPressSong: (index: number) => void;
}

export default function SetlistScreen({
  allSongs,
  setlists,
  activeSetlistId,
  items,
  onSelectSetlist,
  onCreateSetlist,
  onRenameSetlist,
  onDeleteSetlist,
  onAddSongs,
  onReorderItems,
  onRemoveItem,
  onPressSong,
}: SetlistScreenProps) {
  const theme = useAppTheme();

  const [localItems, setLocalItems] = useState<SetlistItem[]>(items);
  const localItemsRef = useRef<SetlistItem[]>(items);
  useEffect(() => {
    setLocalItems(items);
    localItemsRef.current = items;
  }, [items]);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const swappedStepsRef = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);

  const [nameModalMode, setNameModalMode] = useState<'create' | 'rename' | null>(
    null
  );
  const [setlistNameInput, setSetlistNameInput] = useState('');

  const activeSetlist =
    setlists.find((s) => s.id === activeSetlistId) ?? setlists[0];
  const existingSongIdSet = new Set(localItems.map((i) => i.song.id));

  const moveItemInList = (
    list: SetlistItem[],
    from: number,
    to: number
  ): SetlistItem[] => {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const handleStepMove = async (from: number, to: number) => {
    const next = moveItemInList(localItems, from, to);
    if (next === localItems) return;
    setLocalItems(next);
    localItemsRef.current = next;
    await onReorderItems(next);
  };

  const createRowPanResponder = (initialIndex: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        draggingIndexRef.current = initialIndex;
        swappedStepsRef.current = 0;
        dragY.setValue(0);
        setDraggingIndex(initialIndex);
      },
      onPanResponderMove: (_, gestureState) => {
        const curIdx = draggingIndexRef.current;
        if (curIdx === null) return;

        let dyOffset = gestureState.dy - swappedStepsRef.current * ROW_STRIDE;

        if (
          dyOffset > ROW_STRIDE * 0.55 &&
          curIdx < localItemsRef.current.length - 1
        ) {
          const next = moveItemInList(localItemsRef.current, curIdx, curIdx + 1);
          localItemsRef.current = next;
          setLocalItems(next);
          draggingIndexRef.current = curIdx + 1;
          setDraggingIndex(curIdx + 1);
          swappedStepsRef.current += 1;
          dyOffset = gestureState.dy - swappedStepsRef.current * ROW_STRIDE;
        } else if (dyOffset < -ROW_STRIDE * 0.55 && curIdx > 0) {
          const next = moveItemInList(localItemsRef.current, curIdx, curIdx - 1);
          localItemsRef.current = next;
          setLocalItems(next);
          draggingIndexRef.current = curIdx - 1;
          setDraggingIndex(curIdx - 1);
          swappedStepsRef.current -= 1;
          dyOffset = gestureState.dy - swappedStepsRef.current * ROW_STRIDE;
        }

        dragY.setValue(dyOffset);
      },
      onPanResponderRelease: async () => {
        const finalOrder = localItemsRef.current;
        draggingIndexRef.current = null;
        swappedStepsRef.current = 0;
        dragY.setValue(0);
        setDraggingIndex(null);
        await onReorderItems(finalOrder);
      },
      onPanResponderTerminate: async () => {
        const finalOrder = localItemsRef.current;
        draggingIndexRef.current = null;
        swappedStepsRef.current = 0;
        dragY.setValue(0);
        setDraggingIndex(null);
        await onReorderItems(finalOrder);
      },
    });

  const openPicker = () => {
    setPickerSearch('');
    setSelectedSongIds([]);
    setPickerOpen(true);
  };

  const toggleSelectSong = (songId: number) => {
    if (existingSongIdSet.has(songId)) return;
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
  };

  const confirmAddSelected = async () => {
    if (selectedSongIds.length === 0) return;
    await onAddSongs(selectedSongIds);
    setPickerOpen(false);
  };

  const handleSubmitNameModal = async () => {
    const clean = setlistNameInput.trim();
    if (!clean) {
      Alert.alert('กรุณากรอกชื่อลิสเพลง');
      return;
    }
    if (nameModalMode === 'create') {
      await onCreateSetlist(clean);
    } else if (nameModalMode === 'rename' && activeSetlist) {
      await onRenameSetlist(activeSetlist.id, clean);
    }
    setNameModalMode(null);
  };

  const confirmDeleteSetlist = () => {
    if (!activeSetlist || setlists.length <= 1) return;
    Alert.alert(
      'ลบลิสเพลง',
      `ต้องการลบลิส "${activeSetlist.name}" หรือไม่? (เพลงในคลังเพลงจะไม่ถูกลบ)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบลิส',
          style: 'destructive',
          onPress: () => onDeleteSetlist(activeSetlist.id),
        },
      ]
    );
  };

  const pickerFilteredSongs = allSongs.filter((s) =>
    s.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          ลิสเพลง
        </Text>
        <View style={styles.headerRight}>
          {activeSetlist && (
            <Pressable
              onPress={() => {
                setSetlistNameInput(activeSetlist.name);
                setNameModalMode('rename');
              }}
              style={[
                styles.headerIconBtn,
                { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.text} />
            </Pressable>
          )}
          {setlists.length > 1 && activeSetlist && (
            <Pressable
              onPress={confirmDeleteSetlist}
              style={[
                styles.headerIconBtn,
                { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              setSetlistNameInput('');
              setNameModalMode('create');
            }}
            style={[styles.newSetlistBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={18} color={theme.onPrimary} />
            <Text style={[styles.newSetlistText, { color: theme.onPrimary }]}>
              ลิสใหม่
            </Text>
          </Pressable>
        </View>
      </View>

      {/* แถบเลือกลิสเพลง */}
      <View
        style={[
          styles.setlistTabsBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.setlistTabsScroll}
        >
          {setlists.map((sl) => {
            const active = sl.id === activeSetlistId;
            return (
              <Pressable
                key={sl.id}
                onPress={() => onSelectSetlist(sl.id)}
                style={[
                  styles.setlistTab,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceAlt,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.setlistTabText,
                    { color: active ? theme.onPrimary : theme.text },
                  ]}
                >
                  {sl.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ปุ่มเพิ่มเพลงเข้าลิส */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={openPicker}
          style={[
            styles.addSongsBtn,
            { backgroundColor: theme.surface, borderColor: theme.primary },
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
          <Text style={[styles.addSongsText, { color: theme.primary }]}>
            เพิ่มเพลงที่อัพคอร์ดแล้วเข้าลิส
          </Text>
        </Pressable>
        <Text style={[styles.countText, { color: theme.textMuted }]}>
          {localItems.length} เพลง
        </Text>
      </View>

      {localItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="list-outline" size={62} color={theme.primary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            ยังไม่มีเพลงในลิสนี้
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            กดปุ่ม &quot;เพิ่มเพลงที่อัพคอร์ดแล้วเข้าลิส&quot; ด้านบน
            เพื่อเลือกเพลงและลากจัดลำดับก่อนหลังสำหรับเล่นสดได้เลย
          </Text>
        </View>
      ) : (
        <ScrollView
          scrollEnabled={draggingIndex === null}
          contentContainerStyle={styles.listScroll}
        >
          {localItems.map((item, index) => {
            const isDragging = draggingIndex === index;
            const firstFile = item.song.pageFiles[0];
            const panResponder = createRowPanResponder(index);

            return (
              <Animated.View
                key={item.itemId}
                style={[
                  styles.rowCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isDragging ? theme.primary : theme.border,
                    zIndex: isDragging ? 50 : 1,
                    elevation: isDragging ? 8 : 0,
                    transform: isDragging ? [{ translateY: dragY }] : [],
                  },
                ]}
              >
                <Pressable
                  onPress={() => onPressSong(index)}
                  style={styles.rowTapArea}
                >
                  <Text style={[styles.orderNum, { color: theme.primary }]}>
                    {index + 1}
                  </Text>
                  <View
                    style={[
                      styles.thumbWrap,
                      { backgroundColor: theme.surfaceAlt },
                    ]}
                  >
                    {firstFile ? (
                      <Image
                        source={{ uri: ChordDb.instance.getImageUri(firstFile) }}
                        style={styles.thumbImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons
                        name="musical-note"
                        size={20}
                        color={theme.textMuted}
                      />
                    )}
                  </View>
                  <View style={styles.rowInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.rowSongName, { color: theme.text }]}
                    >
                      {item.song.name}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                      {item.song.pageFiles.length} หน้า
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.rowControls}>
                  <Pressable
                    disabled={index === 0}
                    onPress={() => handleStepMove(index, index - 1)}
                    style={[
                      styles.ctrlBtn,
                      index === 0 && styles.ctrlDisabled,
                    ]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    disabled={index === localItems.length - 1}
                    onPress={() => handleStepMove(index, index + 1)}
                    style={[
                      styles.ctrlBtn,
                      index === localItems.length - 1 && styles.ctrlDisabled,
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => onRemoveItem(item.itemId)}
                    style={styles.ctrlBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.danger} />
                  </Pressable>
                  <View
                    {...panResponder.panHandlers}
                    style={styles.dragHandle}
                  >
                    <Ionicons
                      name="reorder-three"
                      size={26}
                      color={isDragging ? theme.primary : theme.textMuted}
                    />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal เลือกเพลงที่อัพคอร์ดแล้ว */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
        >
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: theme.surface, borderBottomColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={styles.ctrlBtn}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              เลือกเพลงเข้าลิส
            </Text>
            <Pressable
              disabled={selectedSongIds.length === 0}
              onPress={confirmAddSelected}
              style={[
                styles.confirmAddBtn,
                {
                  backgroundColor:
                    selectedSongIds.length > 0
                      ? theme.primary
                      : theme.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.confirmAddText,
                  {
                    color:
                      selectedSongIds.length > 0
                        ? theme.onPrimary
                        : theme.textMuted,
                  },
                ]}
              >
                เพิ่ม ({selectedSongIds.length})
              </Text>
            </Pressable>
          </View>

          <View style={styles.pickerSearchWrap}>
            <View
              style={[
                styles.pickerSearchBox,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="ค้นหาเพลงในคลัง..."
                placeholderTextColor={theme.textMuted}
                style={[styles.pickerSearchInput, { color: theme.text }]}
              />
            </View>
          </View>

          {allSongs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="musical-notes-outline"
                size={54}
                color={theme.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                ยังไม่มีเพลงที่อัพคอร์ดไว้
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                กรุณาไปที่หน้า &quot;คลังเพลง&quot; แล้วเพิ่มเพลงและรูปคอร์ดก่อน
              </Text>
            </View>
          ) : (
            <FlatList
              data={pickerFilteredSongs}
              keyExtractor={(s) => String(s.id)}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                const alreadyInList = existingSongIdSet.has(item.id);
                const isSelected = selectedSongIds.includes(item.id);
                const firstFile = item.pageFiles[0];

                return (
                  <Pressable
                    disabled={alreadyInList}
                    onPress={() => toggleSelectSong(item.id)}
                    style={[
                      styles.pickerRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                        opacity: alreadyInList ? 0.55 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.thumbWrap,
                        { backgroundColor: theme.surfaceAlt },
                      ]}
                    >
                      {firstFile ? (
                        <Image
                          source={{
                            uri: ChordDb.instance.getImageUri(firstFile),
                          }}
                          style={styles.thumbImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="musical-note"
                          size={20}
                          color={theme.textMuted}
                        />
                      )}
                    </View>
                    <View style={styles.rowInfo}>
                      <Text
                        numberOfLines={1}
                        style={[styles.rowSongName, { color: theme.text }]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                        {alreadyInList
                          ? `อยู่ในลิสแล้ว · ${item.pageFiles.length} หน้า`
                          : `${item.pageFiles.length} หน้า`}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        alreadyInList || isSelected
                          ? 'checkbox'
                          : 'square-outline'
                      }
                      size={24}
                      color={
                        alreadyInList
                          ? theme.textMuted
                          : isSelected
                          ? theme.primary
                          : theme.textMuted
                      }
                    />
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal สร้าง/เปลี่ยนชื่อลิสเพลง */}
      <Modal
        visible={nameModalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalMode(null)}
      >
        <View style={styles.dialogBackdrop}>
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: theme.text }]}>
              {nameModalMode === 'create'
                ? 'สร้างลิสเพลงใหม่'
                : 'เปลี่ยนชื่อลิสเพลง'}
            </Text>
            <TextInput
              value={setlistNameInput}
              onChangeText={setSetlistNameInput}
              placeholder="เช่น เซ็ตงานคืนนี้, ซ้อมวง"
              placeholderTextColor={theme.textMuted}
              autoFocus
              style={[
                styles.dialogInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setNameModalMode(null)}
                style={styles.dialogCancelBtn}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>
                  ยกเลิก
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitNameModal}
                style={[
                  styles.dialogConfirmBtn,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={{ color: theme.onPrimary, fontWeight: '700' }}>
                  บันทึก
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSetlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newSetlistText: { fontSize: 14, fontWeight: '700' },
  setlistTabsBar: { borderBottomWidth: 1 },
  setlistTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  setlistTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  setlistTabText: { fontSize: 14, fontWeight: '600' },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addSongsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addSongsText: { fontSize: 15, fontWeight: '700' },
  countText: { fontSize: 14, fontWeight: '600' },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 420,
  },
  listScroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  rowCard: {
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
  },
  rowTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: '100%',
  },
  orderNum: {
    width: 24,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  thumbWrap: {
    width: 48,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowSongName: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctrlBtn: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlDisabled: { opacity: 0.25 },
  dragHandle: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  confirmAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmAddText: { fontSize: 14, fontWeight: '700' },
  pickerSearchWrap: { padding: 16, paddingBottom: 8 },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  pickerSearchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  pickerList: { padding: 16, paddingTop: 8, gap: 10 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700' },
  dialogInput: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dialogConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
