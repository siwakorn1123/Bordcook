import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Library,
  ListMusic,
  Maximize2,
  Moon,
  MoveHorizontal,
  Music,
  Pencil,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Sun,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  deleteSetlistRecord,
  deleteSongRecord,
  getAllSetlists,
  getAllSongs,
  PageImage,
  readFileAsDataUrl,
  saveSetlistRecord,
  saveSongRecord,
  SetlistRecord,
  SongRecord,
} from './store/chordStore';

type MainTab = 'library' | 'setlists';
type Screen =
  | { type: 'tabs' }
  | { type: 'viewer'; songId: number; setlistIndex?: number }
  | { type: 'edit'; songId?: number; returnToViewer?: boolean; setlistIndex?: number };

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [activeTab, setActiveTab] = useState<MainTab>('library');
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [setlists, setSetlists] = useState<SetlistRecord[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [screen, setScreen] = useState<Screen>({ type: 'tabs' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const loadAll = async (preferredSetlistId?: number) => {
    const [songList, slList] = await Promise.all([
      getAllSongs(),
      getAllSetlists(),
    ]);
    setSongs(songList);
    setSetlists(slList);
    setActiveSetlistId((prev) => {
      if (preferredSetlistId && slList.some((s) => s.id === preferredSetlistId)) {
        return preferredSetlistId;
      }
      if (slList.some((s) => s.id === prev)) {
        return prev;
      }
      return slList[0]?.id ?? 1;
    });
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredSongs = songs.filter((song) =>
    song.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const activeSetlist =
    setlists.find((s) => s.id === activeSetlistId) ?? setlists[0];
  const songMap = new Map(songs.map((s) => [s.id, s]));
  const setlistSongs: SongRecord[] = (activeSetlist?.songIds ?? [])
    .map((id) => songMap.get(id))
    .filter((s): s is SongRecord => Boolean(s));

  const activeViewerSong =
    screen.type === 'viewer'
      ? songs.find((s) => s.id === screen.songId) ?? null
      : null;

  const activeEditSong =
    screen.type === 'edit' && screen.songId !== undefined
      ? songs.find((s) => s.id === screen.songId)
      : undefined;

  if (screen.type === 'viewer' && activeViewerSong) {
    const isSetlistView = screen.setlistIndex !== undefined;
    const slIdx = screen.setlistIndex ?? 0;

    return (
      <ChordViewerScreen
        song={activeViewerSong}
        onBack={() => setScreen({ type: 'tabs' })}
        onEdit={() =>
          setScreen({
            type: 'edit',
            songId: activeViewerSong.id,
            returnToViewer: true,
            setlistIndex: screen.setlistIndex,
          })
        }
        setlistTotal={isSetlistView ? setlistSongs.length : undefined}
        setlistIndex={screen.setlistIndex}
        onPrevSetlistSong={
          isSetlistView && slIdx > 0
            ? () => {
                const prevSong = setlistSongs[slIdx - 1];
                if (prevSong) {
                  setScreen({
                    type: 'viewer',
                    songId: prevSong.id,
                    setlistIndex: slIdx - 1,
                  });
                }
              }
            : undefined
        }
        onNextSetlistSong={
          isSetlistView && slIdx < setlistSongs.length - 1
            ? () => {
                const nextSong = setlistSongs[slIdx + 1];
                if (nextSong) {
                  setScreen({
                    type: 'viewer',
                    songId: nextSong.id,
                    setlistIndex: slIdx + 1,
                  });
                }
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FA] text-slate-900 dark:bg-[#101318] dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#171B22]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setScreen({ type: 'tabs' })}
            className="whitespace-nowrap shrink-0 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            สมุดคอร์ด
          </button>

          {screen.type === 'tabs' && (
            <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Library className="h-4 w-4" />
                <span>คลังเพลง</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('setlists')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'setlists'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <ListMusic className="h-4 w-4" />
                <span>ลิสเพลง</span>
              </button>
            </nav>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
              className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {screen.type === 'edit' ? (
        <EditSongScreen
          song={activeEditSong}
          onCancel={() => {
            if (activeEditSong && screen.returnToViewer) {
              setScreen({
                type: 'viewer',
                songId: activeEditSong.id,
                setlistIndex: screen.setlistIndex,
              });
            } else {
              setScreen({ type: 'tabs' });
            }
          }}
          onSaved={async (savedId) => {
            await loadAll();
            if (activeEditSong && screen.returnToViewer) {
              setScreen({
                type: 'viewer',
                songId: savedId,
                setlistIndex: screen.setlistIndex,
              });
            } else {
              setScreen({ type: 'tabs' });
            }
          }}
          onDeleted={async () => {
            await loadAll();
            setScreen({ type: 'tabs' });
          }}
        />
      ) : activeTab === 'setlists' && activeSetlist ? (
        <SetlistView
          allSongs={songs}
          setlists={setlists}
          activeSetlist={activeSetlist}
          setlistSongs={setlistSongs}
          onSelectSetlist={setActiveSetlistId}
          onCreateSetlist={async (name) => {
            const newId = await saveSetlistRecord({ name, songIds: [] });
            await loadAll(newId);
          }}
          onRenameSetlist={async (id, name) => {
            const target = setlists.find((s) => s.id === id);
            if (!target) return;
            await saveSetlistRecord({
              id,
              name,
              songIds: target.songIds,
            });
            await loadAll(id);
          }}
          onDeleteSetlist={async (id) => {
            await deleteSetlistRecord(id);
            await loadAll();
          }}
          onUpdateSongIds={async (songIds) => {
            await saveSetlistRecord({
              id: activeSetlist.id,
              name: activeSetlist.name,
              songIds,
            });
            await loadAll(activeSetlist.id);
          }}
          onOpenSong={(index) => {
            const song = setlistSongs[index];
            if (song) {
              setScreen({
                type: 'viewer',
                songId: song.id,
                setlistIndex: index,
              });
            }
          }}
        />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6">
          <div className="mb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเพลง..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-[#1D5D9B] dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-100 dark:focus:border-sky-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[45vh] items-center justify-center text-sm text-slate-500">
              กำลังโหลดรายชื่อเพลง...
            </div>
          ) : songs.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1D5D9B]/10 text-[#1D5D9B] dark:bg-sky-400/15 dark:text-sky-400">
                <Music className="h-10 w-10" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ยังไม่มีเพลงในสมุดคอร์ด
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                กดปุ่ม &quot;เพิ่มเพลง&quot; ที่มุมขวาล่าง เพื่อตั้งชื่อเพลงและเลือกรูปคอร์ดจากเครื่องเก็บไว้ดูได้ทันที
              </p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
              <Search className="mb-3 h-12 w-12 text-slate-400" />
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                ไม่พบเพลงที่ตรงกับ &quot;{searchQuery.trim()}&quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                <span>ล้างคำค้นหา</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSongs.map((song) => {
                const firstPage = song.pages[0];
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => setScreen({ type: 'viewer', songId: song.id })}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-transform hover:-translate-y-0.5 dark:border-slate-800 dark:bg-[#171B22]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                      {firstPage ? (
                        <img
                          src={firstPage.dataUrl}
                          alt={song.name}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Music className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <h2 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100">
                        {song.name}
                      </h2>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-4 w-4 text-[#1D5D9B] dark:text-sky-400" />
                        <span className="tabular-nums">{song.pages.length} หน้า</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setScreen({ type: 'edit' })}
            className="fixed bottom-6 right-6 z-20 inline-flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-[#1D5D9B] px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#1D5D9B]/25 transition-transform hover:bg-[#174b7e] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            <span>เพิ่มเพลง</span>
          </button>
        </main>
      )}
    </div>
  );
}

function SetlistView({
  allSongs,
  setlists,
  activeSetlist,
  setlistSongs,
  onSelectSetlist,
  onCreateSetlist,
  onRenameSetlist,
  onDeleteSetlist,
  onUpdateSongIds,
  onOpenSong,
}: {
  allSongs: SongRecord[];
  setlists: SetlistRecord[];
  activeSetlist: SetlistRecord;
  setlistSongs: SongRecord[];
  onSelectSetlist: (id: number) => void;
  onCreateSetlist: (name: string) => Promise<void>;
  onRenameSetlist: (id: number, name: string) => Promise<void>;
  onDeleteSetlist: (id: number) => Promise<void>;
  onUpdateSongIds: (songIds: number[]) => Promise<void>;
  onOpenSong: (index: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [nameModalMode, setNameModalMode] = useState<'create' | 'rename' | null>(
    null
  );
  const [setlistNameInput, setSetlistNameInput] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const touchDragRef = useRef<{ index: number } | null>(null);

  const existingSet = new Set(activeSetlist.songIds);

  const moveSong = async (from: number, to: number) => {
    if (to < 0 || to >= setlistSongs.length || from === to) return;
    const ids = setlistSongs.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    await onUpdateSongIds(ids);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragRef.current || !listRef.current) return;
    const touchY = e.touches[0].clientY;
    const rowElements = Array.from(listRef.current.children) as HTMLElement[];
    for (let i = 0; i < rowElements.length; i++) {
      const rect = rowElements[i].getBoundingClientRect();
      if (touchY >= rect.top && touchY <= rect.bottom) {
        if (i !== touchDragRef.current.index) {
          const from = touchDragRef.current.index;
          touchDragRef.current.index = i;
          setDragIndex(i);
          moveSong(from, i);
        }
        break;
      }
    }
  };

  const pickerFiltered = allSongs.filter((s) =>
    s.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())
  );

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:px-6">
      {/* แถบเลือกลิส + จัดการลิส */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {setlists.map((sl) => {
            const active = sl.id === activeSetlist.id;
            return (
              <button
                key={sl.id}
                type="button"
                onClick={() => onSelectSetlist(sl.id)}
                className={`min-h-[40px] whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-[#1D5D9B] bg-[#1D5D9B] text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-200'
                }`}
              >
                {sl.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSetlistNameInput(activeSetlist.name);
              setNameModalMode('rename');
            }}
            aria-label="เปลี่ยนชื่อลิส"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {setlists.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteSetlist(activeSetlist.id)}
              aria-label="ลบลิสเพลง"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSetlistNameInput('');
              setNameModalMode('create');
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-100"
          >
            <Plus className="h-4 w-4" />
            <span>ลิสใหม่</span>
          </button>
        </div>
      </div>

      {/* ปุ่มเพิ่มเพลงที่อัพคอร์ดแล้วเข้าลิส */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setPickerSearch('');
            setSelectedIds([]);
            setPickerOpen(true);
          }}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1D5D9B] bg-white px-4 py-3 text-sm font-semibold text-[#1D5D9B] transition-colors hover:bg-[#1D5D9B]/5 dark:border-sky-400 dark:bg-[#171B22] dark:text-sky-400"
        >
          <Plus className="h-5 w-5" />
          <span>เพิ่มเพลงที่อัพคอร์ดแล้วเข้าลิส</span>
        </button>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
          {setlistSongs.length} เพลง
        </span>
      </div>

      {setlistSongs.length === 0 ? (
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#171B22]">
          <ListMusic className="mb-3 h-12 w-12 text-[#1D5D9B] dark:text-sky-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ยังไม่มีเพลงในลิสนี้
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            กดปุ่ม &quot;เพิ่มเพลงที่อัพคอร์ดแล้วเข้าลิส&quot; ด้านบน แล้วลากจัดลำดับเพลงก่อนหลังได้เลย
          </p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2.5">
          {setlistSongs.map((song, index) => {
            const firstPage = song.pages[0];
            return (
              <div
                key={song.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    moveSong(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-3 rounded-2xl border bg-white p-3 transition-shadow dark:bg-[#171B22] ${
                  dragIndex === index
                    ? 'border-[#1D5D9B] opacity-70 shadow-lg dark:border-sky-400'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenSong(index)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-6 shrink-0 text-center text-base font-bold tabular-nums text-[#1D5D9B] dark:text-sky-400">
                    {index + 1}
                  </span>
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                    {firstPage ? (
                      <img
                        src={firstPage.dataUrl}
                        alt={song.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Music className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                      {song.name}
                    </div>
                    <div className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {song.pages.length} หน้า
                    </div>
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveSong(index, index - 1)}
                    aria-label="เลื่อนขึ้น"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === setlistSongs.length - 1}
                    onClick={() => moveSong(index, index + 1)}
                    aria-label="เลื่อนลง"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSongIds(
                        activeSetlist.songIds.filter((id) => id !== song.id)
                      )
                    }
                    aria-label="นำออกจากลิส"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div
                    onTouchStart={() => {
                      touchDragRef.current = { index };
                      setDragIndex(index);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => {
                      touchDragRef.current = null;
                      setDragIndex(null);
                    }}
                    title="ลากเพื่อจัดลำดับ"
                    className="flex h-11 w-9 touch-none cursor-grab items-center justify-center text-slate-400"
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal เลือกเพลงเข้าลิส */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#171B22]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                เลือกเพลงที่อัพคอร์ดแล้วเข้าลิส
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="ค้นหาเพลงในคลัง..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#1D5D9B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {allSongs.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  ยังไม่มีเพลงที่อัพคอร์ดไว้ กรุณาเพิ่มเพลงในแท็บ &quot;คลังเพลง&quot; ก่อน
                </div>
              ) : (
                pickerFiltered.map((song) => {
                  const alreadyIn = existingSet.has(song.id);
                  const checked = selectedIds.includes(song.id);
                  const firstPage = song.pages[0];

                  return (
                    <button
                      key={song.id}
                      type="button"
                      disabled={alreadyIn}
                      onClick={() =>
                        setSelectedIds((prev) =>
                          prev.includes(song.id)
                            ? prev.filter((id) => id !== song.id)
                            : [...prev, song.id]
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                        alreadyIn
                          ? 'cursor-not-allowed border-slate-200 opacity-50 dark:border-slate-800'
                          : checked
                          ? 'border-[#1D5D9B] bg-[#1D5D9B]/5 dark:border-sky-400 dark:bg-sky-400/10'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                        {firstPage ? (
                          <img
                            src={firstPage.dataUrl}
                            alt={song.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Music className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {song.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {alreadyIn
                            ? `อยู่ในลิสแล้ว · ${song.pages.length} หน้า`
                            : `${song.pages.length} หน้า`}
                        </div>
                      </div>
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          alreadyIn || checked
                            ? 'border-[#1D5D9B] bg-[#1D5D9B] text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {(alreadyIn || checked) && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="min-h-[42px] rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={async () => {
                  await onUpdateSongIds([...activeSetlist.songIds, ...selectedIds]);
                  setPickerOpen(false);
                }}
                className="min-h-[42px] rounded-xl bg-[#1D5D9B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#174b7e] disabled:opacity-40"
              >
                เพิ่มเข้าลิส ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สร้าง/เปลี่ยนชื่อลิส */}
      {nameModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#171B22]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {nameModalMode === 'create' ? 'สร้างลิสเพลงใหม่' : 'เปลี่ยนชื่อลิสเพลง'}
            </h2>
            <input
              type="text"
              value={setlistNameInput}
              onChange={(e) => setSetlistNameInput(e.target.value)}
              placeholder="เช่น เซ็ตงานคืนนี้, ซ้อมวง"
              autoFocus
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-[#1D5D9B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNameModalMode(null)}
                className="min-h-[42px] rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const clean = setlistNameInput.trim();
                  if (!clean) return;
                  if (nameModalMode === 'create') {
                    await onCreateSetlist(clean);
                  } else {
                    await onRenameSetlist(activeSetlist.id, clean);
                  }
                  setNameModalMode(null);
                }}
                className="min-h-[42px] rounded-xl bg-[#1D5D9B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#174b7e]"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ChordViewerScreen({
  song,
  onBack,
  onEdit,
  setlistTotal,
  setlistIndex,
  onPrevSetlistSong,
  onNextSetlistSong,
}: {
  song: SongRecord;
  onBack: () => void;
  onEdit: () => void;
  setlistTotal?: number;
  setlistIndex?: number;
  onPrevSetlistSong?: () => void;
  onNextSetlistSong?: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [showTopBar, setShowTopBar] = useState(true);
  const [fitWidth, setFitWidth] = useState(false);
  const [zoom, setZoom] = useState(1);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setPageIndex(0);
    setZoom(1);
  }, [song.id]);

  const safeIndex = Math.min(pageIndex, Math.max(0, song.pages.length - 1));
  const currentPage = song.pages[safeIndex];
  const hasMultiplePages = song.pages.length > 1;

  const goToPage = (next: number) => {
    if (next < 0 || next >= song.pages.length) return;
    setPageIndex(next);
    setZoom(1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || zoom > 1.05) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || zoom > 1.05) {
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) {
        goToPage(safeIndex + 1);
      } else {
        goToPage(safeIndex - 1);
      }
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black text-white select-none">
      {showTopBar && (
        <header className="shrink-0 border-b border-white/10 bg-black/95 px-2 py-2 sm:px-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="กลับหน้ารายชื่อเพลง"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">
              {song.name}
            </h1>

            {setlistTotal !== undefined &&
              setlistIndex !== undefined &&
              setlistTotal > 1 && (
                <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-1.5 py-1">
                  <button
                    type="button"
                    disabled={!onPrevSetlistSong}
                    onClick={onPrevSetlistSong}
                    aria-label="เพลงก่อนหน้าในลิส"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <span className="px-1 text-xs font-semibold tabular-nums text-white/90">
                    เพลง {setlistIndex + 1}/{setlistTotal}
                  </span>
                  <button
                    type="button"
                    disabled={!onNextSetlistSong}
                    onClick={onNextSetlistSong}
                    aria-label="เพลงถัดไปในลิส"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              )}

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                aria-label="ซูมออก"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[38px] text-center text-xs tabular-nums text-white/80">
                {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(5, Number((z + 0.5).toFixed(1))))}
                aria-label="ซูมเข้า"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFitWidth((prev) => !prev);
                setZoom(1);
              }}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium text-white hover:bg-white/10 sm:px-3"
            >
              {fitWidth ? (
                <MoveHorizontal className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              <span>{fitWidth ? 'เต็มความกว้าง' : 'พอดีจอ'}</span>
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium text-white hover:bg-white/10 sm:px-3"
            >
              <Pencil className="h-4 w-4" />
              <span>แก้ไข</span>
            </button>
          </div>
        </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {!showTopBar && (
          <button
            type="button"
            onClick={onBack}
            aria-label="กลับหน้ารายชื่อเพลง"
            className="absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div
          onClick={() => setShowTopBar((prev) => !prev)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 ${
            fitWidth
              ? 'overflow-y-auto overflow-x-auto'
              : 'flex items-center justify-center overflow-auto'
          } ${hasMultiplePages ? 'pb-24' : ''}`}
        >
          {currentPage ? (
            <div
              className={
                fitWidth
                  ? 'flex min-h-full w-full justify-center'
                  : 'flex h-full w-full items-center justify-center p-2'
              }
            >
              <img
                src={currentPage.dataUrl}
                alt={`${song.name} หน้า ${safeIndex + 1}`}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: fitWidth ? 'top center' : 'center center',
                }}
                className={`transition-transform duration-150 ${
                  fitWidth
                    ? 'h-auto w-full max-w-none'
                    : 'max-h-full max-w-full object-contain'
                }`}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-white/60">
              ไม่มีรูปคอร์ดในเพลงนี้
            </div>
          )}
        </div>

        {hasMultiplePages && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-2.5 py-1.5 backdrop-blur-md">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() => goToPage(safeIndex - 1)}
                className={`inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-base font-semibold transition-colors ${
                  safeIndex === 0
                    ? 'cursor-not-allowed text-white/35'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="px-3 text-base font-bold tabular-nums text-white">
                {safeIndex + 1} / {song.pages.length}
              </span>

              <button
                type="button"
                disabled={safeIndex === song.pages.length - 1}
                onClick={() => goToPage(safeIndex + 1)}
                className={`inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-base font-semibold transition-colors ${
                  safeIndex === song.pages.length - 1
                    ? 'cursor-not-allowed text-white/35'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span>ถัดไป</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditSongScreen({
  song,
  onCancel,
  onSaved,
  onDeleted,
}: {
  song?: SongRecord;
  onCancel: () => void;
  onSaved: (songId: number) => void;
  onDeleted: () => void;
}) {
  const isEditMode = Boolean(song);
  const [name, setName] = useState(song?.name ?? '');
  const [pages, setPages] = useState<PageImage[]>(song?.pages ?? []);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    let added = 0;
    let duplicates = 0;
    const nextPages = [...pages];

    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      const isDup = nextPages.some(
        (existing) => existing.size === file.size && existing.dataUrl === dataUrl
      );
      if (isDup) {
        duplicates++;
        continue;
      }
      nextPages.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        dataUrl,
      });
      added++;
    }

    setPages(nextPages);
    e.target.value = '';

    if (duplicates > 0 && added === 0) {
      showNotice('รูปที่เลือกซ้ำกับที่มีอยู่แล้ว');
    } else if (duplicates > 0) {
      showNotice(`เพิ่มแล้ว ${added} รูป (ข้ามรูปซ้ำ ${duplicates} รูป)`);
    }
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length || from === to) return;
    const next = [...pages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPages(next);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showNotice('กรุณากรอกชื่อเพลง');
      return;
    }
    if (pages.length === 0) {
      showNotice('กรุณาเลือกรูปคอร์ดอย่างน้อย 1 รูป');
      return;
    }
    const savedId = await saveSongRecord({
      id: song?.id,
      name: cleanName,
      pages,
    });
    onSaved(savedId);
  };

  const handleDelete = async () => {
    if (!song) return;
    await deleteSongRecord(song.id);
    setConfirmDeleteOpen(false);
    onDeleted();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label="ย้อนกลับ"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isEditMode ? 'แก้ไขเพลง' : 'เพิ่มเพลง'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label="ลบเพลง"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              <span>ลบเพลง</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1D5D9B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#174b7e]"
          >
            <Check className="h-4 w-4" />
            <span>บันทึก</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-200">
          {notice}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            ชื่อเพลง
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น คิดถึง, รักแรกพบ"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#1D5D9B] dark:border-slate-800 dark:bg-[#171B22] dark:text-slate-100 dark:focus:border-sky-400"
          />
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilePick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-[#1D5D9B] transition-colors hover:border-[#1D5D9B] hover:bg-[#1D5D9B]/5 dark:border-slate-700 dark:bg-[#171B22] dark:text-sky-400 dark:hover:border-sky-400"
          >
            <ImagePlus className="h-5 w-5" />
            <span>เลือกรูปคอร์ด (เลือกได้หลายรูป)</span>
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#171B22]">
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              ยังไม่ได้เลือกรูปคอร์ด
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              กดปุ่มด้านบนเพื่อเลือกรูปคอร์ดอย่างน้อย 1 รูป
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pages.map((page, index) => (
              <div
                key={page.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    movePage(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#171B22] ${
                  dragIndex === index ? 'opacity-60' : ''
                }`}
              >
                <img
                  src={page.dataUrl}
                  alt={`หน้า ${index + 1}`}
                  className="h-20 w-16 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-900"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    หน้า {index + 1}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {page.name}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePage(index, index - 1)}
                    aria-label="เลื่อนขึ้น"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === pages.length - 1}
                    onClick={() => movePage(index, index + 1)}
                    aria-label="เลื่อนลง"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPages((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label="ลบรูปออก"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div
                    title="ลากเพื่อเรียงลำดับ"
                    className="flex h-10 w-8 cursor-grab items-center justify-center text-slate-400"
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteOpen && song && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#171B22]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ยืนยันการลบเพลง
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              คุณต้องการลบเพลง &quot;{song.name}&quot; และรูปคอร์ดทั้งหมดของเพลงนี้หรือไม่?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="min-h-[42px] rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[42px] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                ลบเพลง
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
