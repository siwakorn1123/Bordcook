import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#1D5D9B] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#174b7e]"
      >
        <Download className="h-4 w-4" />
        <span>ติดตั้งแอป</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Download className="h-4 w-4" />
        <span>ติดตั้งลงแท็บเล็ต</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#171B22]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ติดตั้ง &quot;สมุดคอร์ด&quot; ลงแท็บเล็ต
              </h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="ปิด"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>กดปุ่มแชร์ (Share) บนแถบเครื่องมือ Safari</li>
                <li>เลื่อนลงแล้วเลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</li>
              </ol>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>
                  เปิดลิงก์แอปเต็มจอในแท็บ Chrome โดยตรง (กดปุ่ม Share ด้านบนแล้วเปิดลิงก์ในแท็บใหม่)
                </li>
                <li>
                  กดเมนูจุด 3 จุด (⋮) มุมขวาบนของ Chrome แล้วเลือก{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    เพิ่มลงในหน้าจอหลัก / ติดตั้งแอป
                  </strong>
                </li>
                <li>เปิดใช้งานได้เต็มจอและดูคอร์ดแบบออฟไลน์ได้ทันทีโดยไม่ต้องใช้คอมพิวเตอร์</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[42px] rounded-xl bg-[#1D5D9B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174b7e]"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
