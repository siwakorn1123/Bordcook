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
  Maximize2,
  Moon,
  MoveHorizontal,
  Music,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  deleteSongRecord,
  getAllSongs,
  PageImage,
  readFileAsDataUrl,
  saveSongRecord,
  SongRecord,
} from './store/chordStore';

type Screen =
  | { type: 'list' }
  | { type: 'viewer'; songId: number }
  | { type: 'edit'; songId?: number };

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [screen, setScreen] = useState<Screen>({ type: 'list' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const loadSongs = async () => {
    const list = await getAllSongs();
    setSongs(list);
    setLoading(false);
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const filteredSongs = songs.filter((song) =>
    song.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const activeViewerSong =
    screen.type === 'viewer'
      ? songs.find((s) => s.id === screen.songId) ?? null
      : null;

  const activeEditSong =
    screen.type === 'edit' && screen.songId !== undefined
      ? songs.find((s) => s.id === screen.songId)
      : undefined;

  if (screen.type === 'viewer' && activeViewerSong) {
    return (
      <ChordViewerScreen
        song={activeViewerSong}
        onBack={() => setScreen({ type: 'list' })}
        onEdit={() => setScreen({ type: 'edit', songId: activeViewerSong.id })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FA] text-slate-900 dark:bg-[#101318] dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#171B22]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setScreen({ type: 'list' })}
            className="whitespace-nowrap shrink-0 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            สมุดคอร์ด
          </button>

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
            if (activeEditSong) {
              setScreen({ type: 'viewer', songId: activeEditSong.id });
            } else {
              setScreen({ type: 'list' });
            }
          }}
          onSaved={async (savedId) => {
            await loadSongs();
            if (activeEditSong) {
              setScreen({ type: 'viewer', songId: savedId });
            } else {
              setScreen({ type: 'list' });
            }
          }}
          onDeleted={async () => {
            await loadSongs();
            setScreen({ type: 'list' });
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

function ChordViewerScreen({
  song,
  onBack,
  onEdit,
}: {
  song: SongRecord;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [showTopBar, setShowTopBar] = useState(true);
  const [fitWidth, setFitWidth] = useState(false);
  const [zoom, setZoom] = useState(1);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
      {/* แถบด้านบน: วางเป็น flex row เหนือพื้นที่แสดงรูปเพื่อไม่ให้บังส่วนบนของรูป */}
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

      {/* พื้นที่แสดงรูปคอร์ด */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* ปุ่มกลับวงกลมมุมซ้ายบนเมื่อแถบบนถูกซ่อน */}
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

        {/* แตะ 1 ครั้งเพื่อซ่อน/แสดงแถบด้านบน */}
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

        {/* แถบนำทางด้านล่าง แสดงตลอดเวลาเมื่อมีหลายหน้า */}
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
