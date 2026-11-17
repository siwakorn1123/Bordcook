import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChordDb, { Song } from './db';
import { useAppTheme } from './theme';

interface SongListScreenProps {
  songs: Song[];
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  onPressSong: (song: Song) => void;
  onPressAdd: () => void;
}

export default function SongListScreen({
  songs,
  searchQuery,
  onChangeSearch,
  onPressSong,
  onPressAdd,
}: SongListScreenProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  const numColumns = Math.max(1, Math.floor((width - 24) / 340));
  const trimmed = searchQuery.trim().toLowerCase();
  const filteredSongs = trimmed
    ? songs.filter((s) => s.name.toLowerCase().includes(trimmed))
    : songs;

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
          สมุดคอร์ด
        </Text>
      </View>

      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={theme.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearch}
            placeholder="ค้นหาชื่อเพลง..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onChangeSearch('')}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="musical-notes-outline"
            size={68}
            color={theme.primary}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            ยังไม่มีเพลงในสมุดคอร์ด
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            กดปุ่ม &quot;เพิ่มเพลง&quot; ที่มุมขวาล่าง
            เพื่อตั้งชื่อเพลงและเลือกรูปคอร์ดจากเครื่องเก็บไว้ดูได้ทันที
          </Text>
        </View>
      ) : filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={58} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            ไม่พบเพลงที่ตรงกับ &quot;{searchQuery.trim()}&quot;
          </Text>
          <Pressable
            onPress={() => onChangeSearch('')}
            style={[
              styles.clearSearchButton,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <Text style={[styles.clearSearchText, { color: theme.text }]}>
              ล้างคำค้นหา
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          key={`grid-${numColumns}`}
          data={filteredSongs}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => {
            const firstFile = item.pageFiles[0];
            return (
              <Pressable
                onPress={() => onPressSong(item)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.thumbnailBox,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  {firstFile ? (
                    <Image
                      source={{ uri: ChordDb.instance.getImageUri(firstFile) }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text
                    numberOfLines={2}
                    style={[styles.cardTitle, { color: theme.text }]}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons
                      name="book-outline"
                      size={15}
                      color={theme.primary}
                    />
                    <Text
                      style={[styles.cardMetaText, { color: theme.textMuted }]}
                    >
                      {item.pageFiles.length} หน้า
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <SafeAreaView edges={['bottom']} style={styles.fabContainer}>
        <Pressable
          onPress={onPressAdd}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={22} color={theme.onPrimary} />
          <Text style={[styles.fabLabel, { color: theme.onPrimary }]}>
            เพิ่มเพลง
          </Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 104,
    gap: 14,
  },
  gridRow: {
    gap: 14,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailBox: {
    aspectRatio: 4 / 3,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  cardMetaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 420,
  },
  clearSearchButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  clearSearchText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
