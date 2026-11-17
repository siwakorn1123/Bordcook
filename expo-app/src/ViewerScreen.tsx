import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';

import ChordDb, { Song } from './db';

interface ViewerScreenProps {
  song: Song;
  onBack: () => void;
  onEdit: () => void;
  setlistTotal?: number;
  setlistIndex?: number;
  onPrevSetlistSong?: () => void;
  onNextSetlistSong?: () => void;
}

export default function ViewerScreen({
  song,
  onBack,
  onEdit,
  setlistTotal,
  setlistIndex,
  onPrevSetlistSong,
  onNextSetlistSong,
}: ViewerScreenProps) {
  const { width, height } = useWindowDimensions();
  const [currentPage, setCurrentPage] = useState(0);
  const [showTopBar, setShowTopBar] = useState(true);
  const [fitWidth, setFitWidth] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageAspects, setImageAspects] = useState<Record<string, number>>({});

  const pagerRef = useRef<ScrollView | null>(null);
  const hasMultiplePages = song.pageFiles.length > 1;
  const safePage = Math.min(currentPage, Math.max(0, song.pageFiles.length - 1));

  useEffect(() => {
    setCurrentPage(0);
    setZoom(1);
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  }, [song.id]);

  useEffect(() => {
    const enterImmersive = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch {
          // Ignore on devices that disallow navigation bar hiding
        }
      }
    };
    enterImmersive();

    return () => {
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    for (const fileName of song.pageFiles) {
      if (imageAspects[fileName]) continue;
      const uri = ChordDb.instance.getImageUri(fileName);
      Image.getSize(
        uri,
        (imgW, imgH) => {
          if (imgW > 0 && imgH > 0) {
            setImageAspects((prev) => ({
              ...prev,
              [fileName]: imgH / imgW,
            }));
          }
        },
        () => {}
      );
    }
  }, [song.pageFiles, imageAspects]);

  const goToPage = (target: number) => {
    if (target < 0 || target >= song.pageFiles.length) return;
    setCurrentPage(target);
    setZoom(1);
    pagerRef.current?.scrollTo({ x: target * width, animated: true });
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / width);
    if (nextIndex !== safePage && nextIndex >= 0 && nextIndex < song.pageFiles.length) {
      setCurrentPage(nextIndex);
      setZoom(1);
    }
  };

  const bottomClearance = hasMultiplePages ? 86 : 16;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* แถบด้านบน: วางแยกเหนือพื้นที่รูปเพื่อไม่ให้บังส่วนบนของรูป */}
      {showTopBar && (
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <View style={styles.topBarInner}>
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>

            <Text numberOfLines={1} style={styles.songTitle}>
              {song.name}
            </Text>

            {setlistTotal !== undefined && setlistIndex !== undefined && setlistTotal > 1 && (
              <View style={styles.zoomGroup}>
                <Pressable
                  disabled={!onPrevSetlistSong}
                  onPress={onPrevSetlistSong}
                  style={[styles.smallBtn, !onPrevSetlistSong && { opacity: 0.35 }]}
                >
                  <Ionicons name="play-skip-back" size={16} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.zoomText}>
                  เพลง {setlistIndex + 1}/{setlistTotal}
                </Text>
                <Pressable
                  disabled={!onNextSetlistSong}
                  onPress={onNextSetlistSong}
                  style={[styles.smallBtn, !onNextSetlistSong && { opacity: 0.35 }]}
                >
                  <Ionicons name="play-skip-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            )}

            <View style={styles.zoomGroup}>
              <Pressable
                onPress={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                style={styles.smallBtn}
              >
                <Ionicons name="remove-circle-outline" size={20} color="#E2E8F0" />
              </Pressable>
              <Text style={styles.zoomText}>{zoom.toFixed(1)}x</Text>
              <Pressable
                onPress={() => setZoom((z) => Math.min(5, Number((z + 0.5).toFixed(1))))}
                style={styles.smallBtn}
              >
                <Ionicons name="add-circle-outline" size={20} color="#E2E8F0" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setFitWidth((prev) => !prev);
                setZoom(1);
              }}
              style={styles.textBtn}
            >
              <Ionicons
                name={fitWidth ? 'albums-outline' : 'expand-outline'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.textBtnLabel}>
                {fitWidth ? 'เต็มความกว้าง' : 'พอดีจอ'}
              </Text>
            </Pressable>

            <Pressable onPress={onEdit} style={styles.textBtn}>
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.textBtnLabel}>แก้ไข</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}

      {/* พื้นที่แสดงรูปคอร์ด */}
      <View style={styles.viewerArea}>
        {!showTopBar && (
          <SafeAreaView edges={['top']} style={styles.floatingBackWrap}>
            <Pressable onPress={onBack} style={styles.floatingBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>
        )}

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={zoom <= 1.01}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          style={styles.pager}
        >
          {song.pageFiles.map((fileName) => {
            const uri = ChordDb.instance.getImageUri(fileName);
            const ratio = imageAspects[fileName] ?? 1.4;
            const zoomedWidth = width * zoom;
            const fitWidthHeight = zoomedWidth * ratio;
            const containHeight = Math.max(height - (showTopBar ? 68 : 0) - bottomClearance, 240) * zoom;

            return (
              <View key={fileName} style={{ width, flex: 1 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.pageScrollContent,
                    { paddingBottom: bottomClearance },
                    !fitWidth && zoom <= 1.01 ? styles.centerPage : null,
                  ]}
                >
                  <ScrollView
                    horizontal
                    scrollEnabled={zoom > 1.01}
                    showsHorizontalScrollIndicator={false}
                  >
                    <Pressable onPress={() => setShowTopBar((prev) => !prev)}>
                      <Image
                        source={{ uri }}
                        resizeMode={fitWidth ? 'cover' : 'contain'}
                        style={
                          fitWidth
                            ? { width: zoomedWidth, height: fitWidthHeight }
                            : { width: zoomedWidth, height: containHeight }
                        }
                      />
                    </Pressable>
                  </ScrollView>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {/* แถบนำทางด้านล่าง แสดงตลอดเวลาเมื่อมีหลายหน้า */}
        {hasMultiplePages && (
          <SafeAreaView edges={['bottom']} style={styles.bottomNavWrap}>
            <View style={styles.bottomNavBar}>
              <Pressable
                disabled={safePage === 0}
                onPress={() => goToPage(safePage - 1)}
                style={styles.navBtn}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    safePage === 0 && styles.navBtnDisabled,
                  ]}
                >
                  ‹ ก่อนหน้า
                </Text>
              </Pressable>

              <Text style={styles.pageCounter}>
                {safePage + 1} / {song.pageFiles.length}
              </Text>

              <Pressable
                disabled={safePage === song.pageFiles.length - 1}
                onPress={() => goToPage(safePage + 1)}
                style={styles.navBtn}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    safePage === song.pageFiles.length - 1 &&
                      styles.navBtnDisabled,
                  ]}
                >
                  ถัดไป ›
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    backgroundColor: 'rgba(0,0,0,0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  songTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  smallBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    color: '#E2E8F0',
    fontSize: 12,
    minWidth: 34,
    textAlign: 'center',
  },
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  textBtnLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerArea: {
    flex: 1,
    position: 'relative',
  },
  floatingBackWrap: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 20,
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
  },
  centerPage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    alignItems: 'center',
  },
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  navBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navBtnDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  pageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
});
