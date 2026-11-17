import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import ChordDb, { Song } from './src/db';
import EditScreen from './src/EditScreen';
import SongListScreen from './src/SongListScreen';
import ViewerScreen from './src/ViewerScreen';
import { useAppTheme } from './src/theme';

type ScreenState =
  | { name: 'list' }
  | { name: 'viewer'; songId: number }
  | { name: 'edit'; song?: Song };

export default function App() {
  const theme = useAppTheme();
  const [ready, setReady] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [screen, setScreen] = useState<ScreenState>({ name: 'list' });

  const reloadSongs = async () => {
    const list = await ChordDb.instance.getSongs();
    setSongs(list);
  };

  useEffect(() => {
    let mounted = true;
    ChordDb.instance.init().then(async () => {
      const list = await ChordDb.instance.getSongs();
      if (!mounted) return;
      setSongs(list);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeViewerSong =
    screen.name === 'viewer'
      ? songs.find((s) => s.id === screen.songId) ?? null
      : null;

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
            onBack={() => setScreen({ name: 'list' })}
            onEdit={() => setScreen({ name: 'edit', song: activeViewerSong })}
          />
        ) : screen.name === 'edit' ? (
          <EditScreen
            song={screen.song}
            onCancel={() => {
              if (screen.song) {
                setScreen({ name: 'viewer', songId: screen.song.id });
              } else {
                setScreen({ name: 'list' });
              }
            }}
            onSaved={async (savedId) => {
              await reloadSongs();
              if (screen.song) {
                setScreen({ name: 'viewer', songId: savedId });
              } else {
                setScreen({ name: 'list' });
              }
            }}
            onDeleted={async () => {
              await reloadSongs();
              setScreen({ name: 'list' });
            }}
          />
        ) : (
          <SongListScreen
            songs={songs}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            onPressSong={(song) => setScreen({ name: 'viewer', songId: song.id })}
            onPressAdd={() => setScreen({ name: 'edit' })}
          />
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
});
