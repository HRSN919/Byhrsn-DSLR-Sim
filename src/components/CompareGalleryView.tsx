import React, {useEffect, useState} from 'react';
import {ArrowLeftRight, Camera, Trash2} from 'lucide-react';
import type {CapturedPhoto} from '../types/dslr';
import {formatShutterLabel} from '../utils/opticsEngine';

interface CompareGalleryViewProps {
  photos: CapturedPhoto[];
  onDeletePhoto: (id: string) => void;
  onGoShoot: () => void;
}

export const CompareGalleryView: React.FC<CompareGalleryViewProps> = ({
  photos,
  onDeletePhoto,
  onGoShoot,
}) => {
  const [leftId, setLeftId] = useState<string>(photos[0]?.id ?? '');
  const [rightId, setRightId] = useState<string>(photos[1]?.id ?? photos[0]?.id ?? '');
  const [splitPercent, setSplitPercent] = useState(50);

  useEffect(() => {
    if (photos.length > 0 && !photos.some((p) => p.id === leftId)) {
      setLeftId(photos[0].id);
    }
    if (photos.length > 1 && !photos.some((p) => p.id === rightId)) {
      setRightId(photos[1].id);
    } else if (photos.length === 1) {
      setRightId(photos[0].id);
    }
  }, [photos, leftId, rightId]);

  const photoA = photos.find((p) => p.id === leftId) ?? photos[0] ?? null;
  const photoB = photos.find((p) => p.id === rightId) ?? photos[1] ?? photoA;

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl bg-[#151921] border border-white/10 p-10 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <Camera className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">هنوز عکسی برای مقایسه ثبت نشده است</h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          در بخش شبیه‌ساز یا استودیوی سه‌بعدی با تنظیمات مختلف دیافراگم، سرعت شاتر و ISO دو یا چند عکس بگیرید تا تاثیر دقیق هر پارامتر را اینجا مقایسه کنید.
        </p>
        <button
          type="button"
          onClick={onGoShoot}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold">
          بازگشت به شبیه‌ساز عکاسی
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Split-Screen Interactive Comparison Stage */}
      {photoA && photoB && (
        <section className="rounded-2xl bg-[#151921] border border-white/10 p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-orange-400" />
                <span>مقایسه تطبیقی کیفیت خروجی</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                اسلایدر زیر را جابجا کنید تا تاثیر تغییر دیافراگم، شاتر و ایزو را مستقیماً ببینید.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto">
              <select
                value={photoA.id}
                onChange={(e) => setLeftId(e.target.value)}
                className="min-h-[40px] rounded-xl bg-[#0D0F13] border border-orange-500/40 px-2.5 text-xs text-white">
                {photos.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    عکس A ({idx + 1}): f/{p.settings.aperture} · {formatShutterLabel(p.settings.shutterSeconds)} · ISO {p.settings.iso}
                  </option>
                ))}
              </select>

              <select
                value={photoB.id}
                onChange={(e) => setRightId(e.target.value)}
                className="min-h-[40px] rounded-xl bg-[#0D0F13] border border-sky-500/40 px-2.5 text-xs text-white">
                {photos.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    عکس B ({idx + 1}): f/{p.settings.aperture} · {formatShutterLabel(p.settings.shutterSeconds)} · ISO {p.settings.iso}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Split Overlay */}
          <div className="relative w-full max-w-4xl mx-auto aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/15 select-none">
            <img
              src={photoB.dataUrl}
              alt={photoB.sceneTitle}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            <div
              className="absolute inset-0 overflow-hidden"
              style={{clipPath: `inset(0 ${100 - splitPercent}% 0 0)`}}>
              <img
                src={photoA.dataUrl}
                alt={photoA.sceneTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Divider Line */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-orange-500 shadow-lg"
              style={{left: `${splitPercent}%`}}>
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center shadow-xl">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>

            {/* Corner Labels */}
            <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-black/80 border border-orange-500/50 px-2.5 py-1 text-[11px] font-mono text-orange-300">
              A · f/{photoA.settings.aperture} · {formatShutterLabel(photoA.settings.shutterSeconds)} · ISO {photoA.settings.iso}
            </div>
            <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-black/80 border border-sky-500/50 px-2.5 py-1 text-[11px] font-mono text-sky-300">
              B · f/{photoB.settings.aperture} · {formatShutterLabel(photoB.settings.shutterSeconds)} · ISO {photoB.settings.iso}
            </div>
          </div>

          <div className="max-w-4xl mx-auto flex items-center gap-3" dir="ltr">
            <span className="text-xs font-mono text-orange-400">A</span>
            <input
              type="range"
              min={5}
              max={95}
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              className="w-full dslr-range"
            />
            <span className="text-xs font-mono text-sky-400">B</span>
          </div>

          {/* Side-by-Side Technical EXIF & Optical Metrics Table */}
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400">
                  <th className="py-2.5 px-3 text-right font-medium">پارامتر و کیفیت خروجی</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-orange-400">عکس A</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-sky-400">عکس B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 tabular-nums">
                <tr>
                  <td className="py-2.5 px-3 text-zinc-400">دوربین و لنز</td>
                  <td className="py-2.5 px-3 text-white">{photoA.cameraLabel} · {photoA.lensLabel}</td>
                  <td className="py-2.5 px-3 text-white">{photoB.cameraLabel} · {photoB.lensLabel}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-400">مثلث نوردهی</td>
                  <td className="py-2.5 px-3 font-mono text-white">
                    f/{photoA.settings.aperture} · {formatShutterLabel(photoA.settings.shutterSeconds)}s · ISO {photoA.settings.iso}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-white">
                    f/{photoB.settings.aperture} · {formatShutterLabel(photoB.settings.shutterSeconds)}s · ISO {photoB.settings.iso}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-400">تراز نوردهی (EV)</td>
                  <td className="py-2.5 px-3 text-white">
                    {photoA.metrics.evDelta.toFixed(1)} EV ({photoA.metrics.exposureLabel})
                  </td>
                  <td className="py-2.5 px-3 text-white">
                    {photoB.metrics.evDelta.toFixed(1)} EV ({photoB.metrics.exposureLabel})
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-400">عمق میدان و بوکه</td>
                  <td className="py-2.5 px-3 text-white">
                    {photoA.metrics.dofMeters.toFixed(2)}m · {photoA.metrics.dofLabel}
                  </td>
                  <td className="py-2.5 px-3 text-white">
                    {photoB.metrics.dofMeters.toFixed(2)}m · {photoB.metrics.dofLabel}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-400">نویز سنسور و شارپنس</td>
                  <td className="py-2.5 px-3 text-emerald-300 font-semibold">
                    امتیاز {photoA.metrics.sharpnessScore}/100 · {photoA.metrics.noiseLabel}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-300 font-semibold">
                    امتیاز {photoB.metrics.sharpnessScore}/100 · {photoB.metrics.noiseLabel}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Captured Gallery Grid */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">گالری عکس‌های ثبت‌شده ({photos.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => {
            const isA = photo.id === photoA?.id;
            const isB = photo.id === photoB?.id;
            return (
              <article
                key={photo.id}
                className="rounded-2xl bg-[#151921] border border-white/10 overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-black">
                  <img
                    src={photo.dataUrl}
                    alt={photo.sceneTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    aria-label="حذف عکس"
                    className="absolute top-2.5 left-2.5 p-2 rounded-lg bg-black/75 text-zinc-300 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <span>صحنه شبیه‌ساز</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{photo.capturedAt}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">{photo.sceneTitle}</h4>
                    <p className="text-[11px] font-mono text-orange-400 mt-1 tabular-nums">
                      f/{photo.settings.aperture} · {formatShutterLabel(photo.settings.shutterSeconds)}s · ISO {photo.settings.iso} · {photo.metrics.effectiveFocalLength}mm
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {photo.cameraLabel} · امتیاز وضوح {photo.metrics.sharpnessScore}/100
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setLeftId(photo.id)}
                      className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors ${
                        isA
                          ? 'bg-orange-500 border-orange-500 text-zinc-950'
                          : 'bg-[#0D0F13] border-white/10 text-zinc-300 hover:border-orange-500/50'
                      }`}>
                      انتخاب برای A
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightId(photo.id)}
                      className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors ${
                        isB
                          ? 'bg-sky-500 border-sky-500 text-zinc-950'
                          : 'bg-[#0D0F13] border-white/10 text-zinc-300 hover:border-sky-500/50'
                      }`}>
                      انتخاب برای B
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
