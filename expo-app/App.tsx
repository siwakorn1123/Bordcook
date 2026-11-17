import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import ChordDb, { Setlist, SetlistItem, Song } from './src/db';
import EditScreen from './src/EditScreen';
import SetlistScreen from './src/SetlistScreen';
import SongListScreen from './src/SongListScreen';
import ViewerScreen from './src/ViewerScreen';
import { useAppTheme } from './src/theme';

type MainTab = 'library' | 'setlists';
type ScreenState =
  | { name: 'tabs' }
  | { name: 'viewer'; songId: number; setlistIndex?: number }
  | { name: 'edit'; song?: Song; returnToViewer?: boolean; setlistIndex?: number };

export default function App() {
  const theme = useAppTheme();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('library');

  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<number>(1);
  const [setlistItems, setSetlistItems] = useState<SetlistItem[]>([]);

  const [screen, setScreen] = useState<ScreenState>({ name: 'tabs' });

  const reloadAll = async (preferredSetlistId?: number) => {
    const [songList, slList] = await Promise.all([
      ChordDb.instance.getSongs(),
      ChordDb.instance.getSetlists(),
    ]);
    const targetId =
      preferredSetlistId && slList.some((s) => s.id === preferredSetlistId)
        ? preferredSetlistId
        : slList.some((s) => s.id === activeSetlistId)
        ? activeSetlistId
        : slList[0]?.id ?? 1;

    const slItems = await ChordDb.instance.getSetlistItems(targetId);
    setSongs(songList);
    setSetlists(slList);
    setActiveSetlistId(targetId);
    setSetlistItems(slItems);
  };

  useEffect(() => {
    let mounted = true;
    ChordDb.instance.init().then(async () => {
      const [songList, slList] = await Promise.all([
        ChordDb.instance.getSongs(),
        ChordDb.instance.getSetlists(),
      ]);
      const firstId = slList[0]?.id ?? 1;
      const slItems = await ChordDb.instance.getSetlistItems(firstId);
      if (!mounted) return;
      setSongs(songList);
      setSetlists(slList);
      setActiveSetlistId(firstId);
      setSetlistItems(slItems);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectSetlist = async (setlistId: number) => {
    setActiveSetlistId(setlistId);
    const items = await ChordDb.instance.getSetlistItems(setlistId);
    setSetlistItems(items);
  };

  const activeViewerSong =
    screen.name === 'viewer'
      ? songs.find((s) => s.id === screen.songId) ?? null
      : null;

  const isInSetlistViewer =
    screen.name === 'viewer' && screen.setlistIndex !== undefined;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {!ready ? (
          <View
            style={[
              styles.loadingBox,
              { backgroundColor: theme.background },
            ]}
          >
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : screen.name === 'viewer' && activeViewerSong ? (
          <ViewerScreen
            song={activeViewerSong}
            onBack={() => setScreen({ name: 'tabs' })}
            onEdit={() =>
              setScreen({
                name: 'edit',
                song: activeViewerSong,
                returnToViewer: true,
                setlistIndex: screen.setlistIndex,
              })
            }
            setlistTotal={isInSetlistViewer ? setlistItems.length : undefined}
            setlistIndex={screen.setlistIndex}
            onPrevSetlistSong={
              isInSetlistViewer && (screen.setlistIndex ?? 0) > 0
                ? () => {
                    const prevIdx = (screen.setlistIndex ?? 0) - 1;
                    const prevItem = setlistItems[prevIdx];
                    if (prevItem) {
                      setScreen({
                        name: 'viewer',
                        songId: prevItem.song.id,
                        setlistIndex: prevIdx,
                      });
                    }
                  }
                : undefined
            }
            onNextSetlistSong={
              isInSetlistViewer &&
              (screen.setlistIndex ?? 0) < setlistItems.length - 1
                ? () => {
                    const nextIdx = (screen.setlistIndex ?? 0) + 1;
                    const nextItem = setlistItems[nextIdx];
                    if (nextItem) {
                      setScreen({
                        name: 'viewer',
                        songId: nextItem.song.id,
                        setlistIndex: nextIdx,
                      });
                    }
                  }
                : undefined
            }
          />
        ) : screen.name === 'edit' ? (
          <EditScreen
            song={screen.song}
            onCancel={() => {
              if (screen.song && screen.returnToViewer) {
                setScreen({
                  name: 'viewer',
                  songId: screen.song.id,
                  setlistIndex: screen.setlistIndex,
                });
              } else {
                setScreen({ name: 'tabs' });
              }
            }}
            onSaved={async (savedId) => {
              await reloadAll();
              if (screen.song && screen.returnToViewer) {
                setScreen({
                  name: 'viewer',
                  songId: savedId,
                  setlistIndex: screen.setlistIndex,
                });
              } else {
                setScreen({ name: 'tabs' });
              }
            }}
            onDeleted={async () => {
              await reloadAll();
              setScreen({ name: 'tabs' });
            }}
          />
        ) : (
          <View style={styles.flex}>
            <View style={styles.flex}>
              {activeTab === 'library' ? (
                <SongListScreen
                  songs={songs}
                  searchQuery={searchQuery}
                  onChangeSearch={setSearchQuery}
                  onPressSong={(song) =>
                    setScreen({ name: 'viewer', songId: song.id })
                  }
                  onPressAdd={() => setScreen({ name: 'edit' })}
                />
              ) : (
                <SetlistScreen
                  allSongs={songs}
                  setlists={setlists}
                  activeSetlistId={activeSetlistId}
                  items={setlistItems}
                  onSelectSetlist={handleSelectSetlist}
                  onCreateSetlist={async (name) => {
                    const newId = await ChordDb.instance.createSetlist(name);
                    await reloadAll(newId);
                  }}
                  onRenameSetlist={async (id, name) => {
                    await ChordDb.instance.renameSetlist(id, name);
                    await reloadAll(id);
                  }}
                  onDeleteSetlist={async (id) => {
                    await ChordDb.instance.deleteSetlist(id);
                    await reloadAll();
                  }}
                  onAddSongs={async (songIds) => {
                    await ChordDb.instance.addSongsToSetlist(
                      activeSetlistId,
                      songIds
                    );
                    await reloadAll(activeSetlistId);
                  }}
                  onReorderItems={async (ordered) => {
                    setSetlistItems(ordered);
                    await ChordDb.instance.reorderSetlistItems(
                      activeSetlistId,
                      ordered.map((o) => o.itemId)
                    );
                  }}
                  onRemoveItem={async (itemId) => {
                    await ChordDb.instance.removeSetlistItem(itemId);
                    await reloadAll(activeSetlistId);
                  }}
                  onPressSong={(index) => {
                    const item = setlistItems[index];
                    if (item) {
                      setScreen({
                        name: 'viewer',
                        songId: item.song.id,
                        setlistIndex: index,
                      });
                    }
                  }}
                />
              )}
            </View>

            <SafeAreaView
              edges={['bottom']}
              style={[
                styles.bottomTabBar,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <Pressable
                onPress={() => setActiveTab('library')}
                style={styles.tabBtn}
              >
                <Ionicons
                  name={
                    activeTab === 'library' ? 'library' : 'library-outline'
                  }
                  size={22}
                  color={
                    activeTab === 'library' ? theme.primary : theme.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        activeTab === 'library'
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  คลังเพลง
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('setlists')}
                style={styles.tabBtn}
              >
                <Ionicons
                  name={activeTab === 'setlists' ? 'list' : 'list-outline'}
                  size={22}
                  color={
                    activeTab === 'setlists' ? theme.primary : theme.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        activeTab === 'setlists'
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  ลิสเพลง
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
