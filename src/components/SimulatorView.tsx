import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Aperture,
  Camera,
  CheckCircle2,
  Clock,
  Focus,
  Gauge,
  Grid3X3,
  HelpCircle,
  Layers,
  RotateCcw,
  Sliders,
  Sparkles,
  Thermometer,
  Video,
} from 'lucide-react';
import {
  APERTURE_STOPS,
  DSLR_CAMERAS,
  DSLR_LENSES,
  EDUCATIONAL_MISSIONS,
  ISO_STOPS,
  PHOTO_SCENES,
  SHUTTER_STOPS,
} from '../data/dslrCatalog';
import type {
  CameraSettings,
  CapturedPhoto,
  DslrCamera,
  DslrLens,
  OpticalMetrics,
  PhotoScene,
} from '../types/dslr';
import {
  calculateOpticalMetrics,
  formatShutterLabel,
  playDslrShutterSound,
  renderSimulatedFrame,
  type HistogramBins,
} from '../utils/opticsEngine';

interface SimulatorViewProps {
  cameraBody: DslrCamera;
  lens: DslrLens;
  settings: CameraSettings;
  selectedSceneId: string;
  educationalMode: boolean;
  activeMissionId: string;
  onChangeCamera: (cameraId: string) => void;
  onChangeLens: (lensId: string) => void;
  onUpdateSettings: (patch: Partial<CameraSettings>) => void;
  onSelectScene: (sceneId: string) => void;
  onSelectMission: (missionId: string) => void;
  onToggleEducationalMode: (enabled: boolean) => void;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onGoCompare: () => void;
  capturedCount: number;
}

// Persistent module-level image cache so tab switches never lose decoded images
const sceneImageCache = new Map<string, HTMLImageElement>();

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  cameraBody,
  lens,
  settings,
  selectedSceneId,
  educationalMode,
  activeMissionId,
  onChangeCamera,
  onChangeLens,
  onUpdateSettings,
  onSelectScene,
  onSelectMission,
  onToggleEducationalMode,
  onPhotoCaptured,
  onGoCompare,
  capturedCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageReadyTick, setImageReadyTick] = useState(0);
  const [canvasRendered, setCanvasRendered] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [histogram, setHistogram] = useState<HistogramBins>({
    r: new Array(32).fill(0),
    g: new Array(32).fill(0),
    b: new Array(32).fill(0),
  });
  const [showTipId, setShowTipId] = useState<string | null>(null);

  const scene: PhotoScene = useMemo(
    () => PHOTO_SCENES.find((s) => s.id === selectedSceneId) ?? PHOTO_SCENES[0],
    [selectedSceneId],
  );

  const activeMission = useMemo(
    () => EDUCATIONAL_MISSIONS.find((m) => m.id === activeMissionId) ?? EDUCATIONAL_MISSIONS[0],
    [activeMissionId],
  );

  const availableApertures = useMemo(
    () => APERTURE_STOPS.filter((a) => a >= lens.minAperture && a <= lens.maxAperture),
    [lens],
  );

  const metrics: OpticalMetrics = useMemo(
    () => calculateOpticalMetrics(settings, scene, cameraBody, lens),
    [settings, scene, cameraBody, lens],
  );

  // Preload all scene images on mount so switching scenes is instantaneous and reliable
  useEffect(() => {
    let cancelled = false;

    const loadImage = (url: string) => {
      const cached = sceneImageCache.get(url);
      if (cached && cached.complete && cached.naturalWidth > 0) {
        if (!cancelled) setImageReadyTick((t) => t + 1);
        return;
      }

      const img = cached ?? new Image();
      if (!cached) {
        sceneImageCache.set(url, img);
      }

      const markReady = () => {
        if (!cancelled && img.naturalWidth > 0) {
          setImageReadyTick((t) => t + 1);
        }
      };

      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(markReady).catch(markReady);
        } else {
          markReady();
        }
      };
      img.onerror = () => {
        // Retry once without cache busting if transient error occurred
        sceneImageCache.delete(url);
      };

      if (!img.src) {
        img.src = url;
      } else if (img.complete && img.naturalWidth > 0) {
        markReady();
      }
    };

    loadImage(scene.imageUrl);
    for (const sc of PHOTO_SCENES) {
      if (sc.id !== scene.id) {
        loadImage(sc.imageUrl);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [scene.imageUrl, scene.id]);

  // Render live simulated optical viewfinder via requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    const sourceImg = sceneImageCache.get(scene.imageUrl);
    if (!canvas || !sourceImg || !sourceImg.complete || sourceImg.naturalWidth === 0) {
      return;
    }

    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      try {
        const bins = renderSimulatedFrame(
          canvas,
          sourceImg,
          settings,
          scene,
          cameraBody,
          lens,
          metrics,
        );
        setHistogram(bins);
        setCanvasRendered(true);
      } catch {
        setCanvasRendered(false);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [imageReadyTick, settings, scene, cameraBody, lens, metrics]);

  const handleViewfinderTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height));
    onUpdateSettings({focusX: Number(x.toFixed(2)), focusY: Number(y.toFixed(2))});
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playDslrShutterSound(settings.shutterSeconds);
    setShutterFlash(true);
    window.setTimeout(() => setShutterFlash(false), 180);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const shot: CapturedPhoto = {
      id: `SHOT-${Date.now().toString(36).toUpperCase()}`,
      dataUrl,
      sceneId: scene.id,
      sceneTitle: scene.title,
      capturedAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      settings: {...settings},
      cameraLabel: `${cameraBody.brand} ${cameraBody.model}`,
      lensLabel: lens.name,
      metrics,
    };
    onPhotoCaptured(shot);
  };

  const apertureIndex = Math.max(
    0,
    availableApertures.findIndex((a) => Math.abs(a - settings.aperture) < 0.15),
  );
  const shutterIndex = Math.max(
    0,
    SHUTTER_STOPS.findIndex((s) => Math.abs(s.seconds - settings.shutterSeconds) < 0.0002),
  );
  const isoOptions = ISO_STOPS.filter((v) => v <= cameraBody.maxIso);
  const isoIndex = Math.max(
    0,
    isoOptions.findIndex((iso) => iso === settings.iso),
  );

  const evMeterClamped = Math.max(-3, Math.min(3, metrics.evDelta));
  const evMeterPercent = ((evMeterClamped + 3) / 6) * 100;

  const compatibleLenses = DSLR_LENSES.filter((l) => cameraBody.compatibleMounts.includes(l.mount));
  const missionDoneCount = activeMission.steps.filter((st) =>
    st.check(settings, scene, cameraBody, lens),
  ).length;
  const missionAllPassed = missionDoneCount === activeMission.steps.length;

  return (
    <div className="space-y-4">
      {/* Educational Mode Interactive Guided Mission Deck */}
      {educationalMode && (
        <section className="rounded-2xl bg-[#151921] border border-orange-500/35 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs text-orange-400 font-medium">
                <span>حالت آموزش گام‌به‌گام عکاسی</span>
                <span aria-hidden="true">·</span>
                <span>سطح {activeMission.level}</span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-white mt-0.5">
                {activeMission.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeMission.id}
                onChange={(e) => {
                  const nextMission = EDUCATIONAL_MISSIONS.find((m) => m.id === e.target.value);
                  onSelectMission(e.target.value);
                  if (nextMission) {
                    onSelectScene(nextMission.targetSceneId);
                  }
                }}
                className="min-h-[40px] rounded-xl bg-[#0D0F13] border border-white/15 px-3 text-xs text-zinc-100 focus:outline-none focus:border-orange-500">
                {EDUCATIONAL_MISSIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onToggleEducationalMode(false)}
                className="min-h-[40px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300">
                خروج از حالت آموزش
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-3 mb-3">{activeMission.objective}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {activeMission.steps.map((step, idx) => {
              const passed = step.check(settings, scene, cameraBody, lens);
              const tipOpen = showTipId === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl p-3 border transition-colors ${
                    passed
                      ? 'bg-emerald-950/35 border-emerald-500/40'
                      : 'bg-[#0D0F13]/80 border-white/10'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-orange-400">
                      گام {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowTipId(tipOpen ? null : step.id)}
                        aria-label="راهنمای این مرحله"
                        className="text-zinc-400 hover:text-orange-400 p-0.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                      {passed && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-white mt-1">{step.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {step.instruction}
                  </p>
                  {tipOpen && (
                    <p className="text-[11px] text-orange-200 bg-orange-500/10 rounded-lg p-2 mt-2 leading-relaxed">
                      {step.tip}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {missionAllPassed && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-4 py-2.5">
              <span className="text-xs font-semibold text-emerald-200">
                آفرین! تمام تنظیمات این درس را با موفقیت انجام دادید. اکنون دکمه شاتر را بزنید تا عکس نهایی ثبت شود.
              </span>
              <button
                type="button"
                onClick={handleCapture}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold whitespace-nowrap">
                ثبت عکس درس
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Viewfinder & Scene Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Iranian Scene Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {PHOTO_SCENES.map((sc) => {
              const active = sc.id === scene.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    onSelectScene(sc.id);
                    onUpdateSettings({
                      focusX: sc.defaultFocusX,
                      focusY: sc.defaultFocusY,
                    });
                  }}
                  className={`flex items-center gap-2.5 rounded-xl p-1.5 pr-2 pl-3 border transition-colors shrink-0 min-h-[48px] ${
                    active
                      ? 'bg-[#1D222D] border-orange-500 text-white'
                      : 'bg-[#141820] border-white/10 text-zinc-400 hover:text-white'
                  }`}>
                  <img
                    src={sc.imageUrl}
                    alt={sc.title}
                    referrerPolicy="no-referrer"
                    className="w-11 h-8 rounded-lg object-cover shrink-0"
                  />
                  <div className="text-right">
                    <div className="text-xs font-semibold whitespace-nowrap">{sc.title}</div>
                    <div className="text-[10px] text-zinc-400 whitespace-nowrap">{sc.category}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Optical DSLR Viewfinder Frame */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0D0F13] border-b border-white/10 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="font-semibold text-white">{cameraBody.model}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-orange-400">{lens.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-zinc-400">
                  معادل {metrics.effectiveFocalLength}mm
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({showGrid: !settings.showGrid})}
                  aria-label="خطوط راهنمای یک‌سوم"
                  className={`p-1.5 rounded-lg text-xs ${
                    settings.showGrid
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-zinc-400 hover:text-white'
                  }`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({showHistogram: !settings.showHistogram})}
                  aria-label="نمایش هیستوگرام"
                  className={`p-1.5 rounded-lg text-xs ${
                    settings.showHistogram
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-zinc-400 hover:text-white'
                  }`}>
                  <Gauge className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas + Guaranteed Instant Fallback Layer */}
            <div className="relative aspect-[4/3] w-full bg-[#090B0E]">
              {/* Base image underneath ensures zero blank frame while decoding */}
              <img
                src={scene.imageUrl}
                alt={scene.title}
                referrerPolicy="no-referrer"
                onLoad={() => setImageReadyTick((t) => t + 1)}
                className="absolute inset-0 w-full h-full object-cover"
              />

              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onClick={handleViewfinderTap}
                className={`relative z-10 w-full h-full object-cover cursor-crosshair block transition-opacity duration-150 ${
                  canvasRendered ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {settings.showGrid && (
                <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-3 grid-rows-3">
                  {Array.from({length: 9}).map((_, i) => (
                    <div key={i} className="border border-white/15" />
                  ))}
                </div>
              )}

              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                style={{
                  left: `${settings.focusX * 100}%`,
                  top: `${settings.focusY * 100}%`,
                }}>
                <div className="w-11 h-11 rounded-lg border-2 border-orange-500 flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                </div>
                <span className="block text-[9px] font-mono text-orange-300 text-center mt-0.5 bg-black/70 rounded px-1">
                  AF
                </span>
              </div>

              {settings.showHistogram && (
                <div className="pointer-events-none absolute top-3 left-3 z-20 w-36 h-16 rounded-xl bg-black/75 border border-white/15 p-1.5">
                  <svg viewBox="0 0 32 16" preserveAspectRatio="none" className="w-full h-full">
                    {histogram.r.map((val, idx) => (
                      <rect
                        key={`r-${idx}`}
                        x={idx}
                        y={16 - val * 15}
                        width={0.9}
                        height={val * 15}
                        fill="rgba(239,68,68,0.55)"
                      />
                    ))}
                    {histogram.g.map((val, idx) => (
                      <rect
                        key={`g-${idx}`}
                        x={idx}
                        y={16 - val * 15}
                        width={0.9}
                        height={val * 15}
                        fill="rgba(34,197,94,0.45)"
                      />
                    ))}
                    {histogram.b.map((val, idx) => (
                      <rect
                        key={`b-${idx}`}
                        x={idx}
                        y={16 - val * 15}
                        width={0.9}
                        height={val * 15}
                        fill="rgba(59,130,246,0.45)"
                      />
                    ))}
                  </svg>
                </div>
              )}

              {shutterFlash && (
                <div className="pointer-events-none absolute inset-0 z-30 bg-black/90" />
              )}
            </div>

            <div className="bg-[#0D0F13] border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 font-mono tabular-nums text-xs md:text-sm">
                <span className="text-orange-400 font-bold">f/{settings.aperture}</span>
                <span className="text-white font-semibold">
                  {formatShutterLabel(settings.shutterSeconds)}s
                </span>
                <span className="text-zinc-300">ISO {settings.iso}</span>
                <span className="text-zinc-400 hidden sm:inline">
                  {settings.whiteBalanceK}K
                </span>
              </div>

              <div className="flex items-center gap-2 min-w-[180px]" dir="ltr">
                <span className="text-[10px] font-mono text-zinc-500">-3</span>
                <div className="relative flex-1 h-2 rounded-full bg-zinc-800">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-400 -translate-x-1/2" />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border border-black ${
                      Math.abs(metrics.evDelta) <= 0.6
                        ? 'bg-emerald-400'
                        : Math.abs(metrics.evDelta) <= 1.3
                          ? 'bg-orange-400'
                          : 'bg-rose-500'
                    }`}
                    style={{left: `${evMeterPercent}%`}}
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-500">+3</span>
                <span className="text-[11px] font-mono tabular-nums text-zinc-300 w-12 text-right">
                  {metrics.evDelta >= 0 ? `+${metrics.evDelta.toFixed(1)}` : metrics.evDelta.toFixed(1)}EV
                </span>
              </div>
            </div>
          </div>

          {/* Live Output Quality Readout Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl bg-[#151921] border border-white/10 p-3">
              <div className="text-[11px] text-zinc-400">وضعیت نوردهی</div>
              <div className="text-xs font-semibold text-white mt-1">{metrics.exposureLabel}</div>
            </div>
            <div className="rounded-xl bg-[#151921] border border-white/10 p-3">
              <div className="text-[11px] text-zinc-400">عمق میدان (DoF)</div>
              <div className="text-xs font-semibold text-orange-300 mt-1">
                {metrics.dofMeters.toFixed(2)} متر · {metrics.dofLabel.split(' ')[0]}
              </div>
            </div>
            <div className="rounded-xl bg-[#151921] border border-white/10 p-3">
              <div className="text-[11px] text-zinc-400">ثبت حرکت و لرزش</div>
              <div className="text-xs font-semibold text-white mt-1">{metrics.motionLabel}</div>
            </div>
            <div className="rounded-xl bg-[#151921] border border-white/10 p-3">
              <div className="text-[11px] text-zinc-400">امتیاز وضوح خروجی</div>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-1 tabular-nums">
                {metrics.sharpnessScore} / 100 · {metrics.noiseLabel.split(' ')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Camera Body, Lens & Manual Exposure Controls Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#151921] border border-white/10 p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="flex-1 min-h-[52px] flex items-center justify-center gap-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-zinc-950 font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all">
              <Camera className="w-5 h-5" />
              <span>ثبت عکس (شاتر)</span>
            </button>

            <button
              type="button"
              onClick={onGoCompare}
              className="min-h-[52px] px-4 rounded-xl bg-[#1F2532] hover:bg-[#272F3F] border border-white/10 text-xs font-semibold text-zinc-200 whitespace-nowrap flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>مقایسه ({capturedCount})</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[#151921] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                <span>انتخاب مدل دوربین و لنز</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    aperture: Math.max(lens.minAperture, scene.recommendedSettings.aperture),
                    shutterSeconds: scene.recommendedSettings.shutterSeconds,
                    iso: scene.recommendedSettings.iso,
                    focalLength: Math.min(
                      lens.maxFocalLength,
                      Math.max(lens.minFocalLength, scene.recommendedSettings.focalLength),
                    ),
                  })
                }
                className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                <span>تنظیم خودکار صحنه</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">بدنه دوربین (مدل جدید و DSLR)</label>
                <select
                  value={cameraBody.id}
                  onChange={(e) => onChangeCamera(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl bg-[#0D0F13] border border-white/12 px-3 text-xs text-white focus:outline-none focus:border-orange-500">
                  {DSLR_CAMERAS.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.persianTitle} · {cam.releaseYear}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {cameraBody.megapixels}MP · {cameraBody.sensorFormat} · DR {cameraBody.dynamicRangeStops}EV
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  لنزهای سازگار ({cameraBody.compatibleMounts.join(' / ')})
                </label>
                <select
                  value={lens.id}
                  onChange={(e) => onChangeLens(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl bg-[#0D0F13] border border-white/12 px-3 text-xs text-white focus:outline-none focus:border-orange-500">
                  {compatibleLenses.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.persianCategory})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  حداکثر دیافراگم f/{lens.minAperture} · مانت {lens.mount}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 bg-[#0D0F13] rounded-xl p-2.5 border border-white/5">
              {cameraBody.summary}
            </p>
          </div>

          <div className="rounded-2xl bg-[#151921] border border-white/10 p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Aperture className="w-4 h-4 text-orange-400" />
                  <span>دیافراگم (Aperture)</span>
                </span>
                <span className="font-mono font-bold text-orange-400 tabular-nums">
                  f/{settings.aperture}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={availableApertures.length - 1}
                step={1}
                value={apertureIndex}
                onChange={(e) =>
                  onUpdateSettings({aperture: availableApertures[Number(e.target.value)]})
                }
                className="w-full dslr-range"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>f/{availableApertures[0]} (بوکه قوی و پرنور)</span>
                <span>f/{availableApertures[availableApertures.length - 1]} (عمق زیاد)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>سرعت شاتر (Shutter Speed)</span>
                </span>
                <span className="font-mono font-bold text-orange-400 tabular-nums">
                  {formatShutterLabel(settings.shutterSeconds)}s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={SHUTTER_STOPS.length - 1}
                step={1}
                value={shutterIndex}
                onChange={(e) =>
                  onUpdateSettings({
                    shutterSeconds: SHUTTER_STOPS[Number(e.target.value)].seconds,
                  })
                }
                className="w-full dslr-range"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>1/4000s (فریز حرکت)</span>
                <span>2" (نوردهی طولانی)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>حساسیت سنسور (ISO)</span>
                </span>
                <span className="font-mono font-bold text-orange-400 tabular-nums">
                  ISO {settings.iso}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={isoOptions.length - 1}
                step={1}
                value={isoIndex}
                onChange={(e) => onUpdateSettings({iso: isoOptions[Number(e.target.value)]})}
                className="w-full dslr-range"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>ISO 100 (بدون نویز)</span>
                <span>ISO {isoOptions[isoOptions.length - 1]} (نور کم + نویز)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Focus className="w-3.5 h-3.5 text-orange-400" />
                    فاصله کانونی
                  </span>
                  <span className="font-mono text-orange-400 tabular-nums">
                    {settings.focalLength}mm
                  </span>
                </div>
                <input
                  type="range"
                  min={lens.minFocalLength}
                  max={lens.maxFocalLength}
                  step={1}
                  disabled={lens.minFocalLength === lens.maxFocalLength}
                  value={settings.focalLength}
                  onChange={(e) => onUpdateSettings({focalLength: Number(e.target.value)})}
                  className="w-full dslr-range disabled:opacity-40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                    تراز سفیدی (WB)
                  </span>
                  <span className="font-mono text-orange-400 tabular-nums">
                    {settings.whiteBalanceK}K
                  </span>
                </div>
                <input
                  type="range"
                  min={2800}
                  max={7600}
                  step={200}
                  value={settings.whiteBalanceK}
                  onChange={(e) => onUpdateSettings({whiteBalanceK: Number(e.target.value)})}
                  className="w-full dslr-range"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({tripodEnabled: !settings.tripodEnabled})}
                className={`flex-1 min-h-[42px] px-3 rounded-xl text-xs font-medium border transition-colors ${
                  settings.tripodEnabled
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                    : 'bg-[#0D0F13] border-white/10 text-zinc-400 hover:text-white'
                }`}>
                سه‌پایه (Tripod): {settings.tripodEnabled ? 'متصل' : 'دستی'}
              </button>

              <button
                type="button"
                disabled={!lens.hasStabilization && !cameraBody.hasIbis}
                onClick={() => onUpdateSettings({stabilizerEnabled: !settings.stabilizerEnabled})}
                className={`flex-1 min-h-[42px] px-3 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 ${
                  settings.stabilizerEnabled && (lens.hasStabilization || cameraBody.hasIbis)
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#0D0F13] border-white/10 text-zinc-400'
                }`}>
                <span className="inline-flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" />
                  لرزشگیر:{' '}
                  {lens.hasStabilization || cameraBody.hasIbis
                    ? settings.stabilizerEnabled
                      ? 'روشن'
                      : 'خاموش'
                    : 'ندارد'}
                </span>
              </button>
            </div>
          </div>

          {!educationalMode && (
            <div className="rounded-xl bg-[#151921] border border-white/10 p-3.5 text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-orange-400">نکته صحنه: </span>
              {scene.lessonHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
