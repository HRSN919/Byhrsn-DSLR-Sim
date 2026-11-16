import type {
  CameraSettings,
  DslrCamera,
  DslrLens,
  OpticalMetrics,
  PhotoScene,
} from '../types/dslr';

export function formatShutterLabel(seconds: number): string {
  if (seconds >= 0.99) {
    return `${seconds.toFixed(0)}"`;
  }
  const denom = Math.round(1 / seconds);
  return `1/${denom}`;
}

export function calculateOpticalMetrics(
  settings: CameraSettings,
  scene: PhotoScene,
  camera: DslrCamera,
  lens: DslrLens,
): OpticalMetrics {
  const clampedAperture = Math.max(lens.minAperture, Math.min(lens.maxAperture, settings.aperture));
  const clampedFocal = Math.max(
    lens.minFocalLength,
    Math.min(lens.maxFocalLength, settings.focalLength),
  );
  const effectiveFocalLength = Math.round(clampedFocal * camera.cropFactor);

  // Exact photographic Exposure Value formula normalized to ISO 100
  const evCamera =
    Math.log2((clampedAperture * clampedAperture) / settings.shutterSeconds) -
    Math.log2(settings.iso / 100);
  const evScene = scene.ambientEV;
  const evDelta = evScene - evCamera;

  // Depth of field estimate (meters at 2.5m subject distance)
  const subjectDistMm = 2500;
  const cocMm = 0.03 / camera.cropFactor;
  const hyperfocal = (clampedFocal * clampedFocal) / (clampedAperture * cocMm) + clampedFocal;
  const nearDist = (hyperfocal * subjectDistMm) / (hyperfocal + (subjectDistMm - clampedFocal));
  const farDist =
    subjectDistMm >= hyperfocal
      ? 45000
      : (hyperfocal * subjectDistMm) / (hyperfocal - (subjectDistMm - clampedFocal));
  const dofMeters = Math.max(0.08, Math.min(25, (farDist - nearDist) / 1000));

  // Visual background bokeh blur strength (0 to 18px)
  const apertureFactor = 1.4 / clampedAperture;
  const focalFactor = Math.min(2.0, effectiveFocalLength / 50);
  const blurStrength = Math.max(
    0,
    Math.min(18, apertureFactor * focalFactor * lens.bokehQuality * 14),
  );

  // Subject motion blur based on shutter speed & scene motion intensity
  const safeFreezeShutter = 1 / (250 + scene.motionIntensity * 950);
  const motionRatio =
    settings.shutterSeconds > safeFreezeShutter
      ? Math.min(1, (settings.shutterSeconds - safeFreezeShutter) / 0.12)
      : 0;
  const motionBlurPx = Number((motionRatio * scene.motionIntensity * 14).toFixed(1));

  // Handheld camera shake rule: 1 / effectiveFocalLength + IBIS/OIS stops
  const stabilizationStops =
    settings.tripodEnabled ? 12 : (lens.hasStabilization || camera.hasIbis) && settings.stabilizerEnabled ? 4 : 0;
  const handholdSafeSeconds = (1 / Math.max(18, effectiveFocalLength)) * Math.pow(2, stabilizationStops);
  const shakeRatio =
    settings.tripodEnabled || settings.shutterSeconds <= handholdSafeSeconds
      ? 0
      : Math.min(1, Math.log2(settings.shutterSeconds / handholdSafeSeconds) / 4);
  const cameraShakePx = Number((shakeRatio * 10).toFixed(1));

  // ISO sensor noise calibrated by camera body's cleanIsoLimit
  const isoOverClean = settings.iso / camera.cleanIsoLimit;
  const noiseLevel = Math.max(
    0,
    Math.min(1, isoOverClean > 0.5 ? Math.log2(isoOverClean * 2) * 0.22 : 0.02),
  );

  // Diffraction penalty above f/11
  const diffractionPenalty = clampedAperture > 11 ? (clampedAperture - 11) * 1.4 : 0;
  const rawSharpness =
    lens.sharpnessRating * 100 -
    diffractionPenalty -
    cameraShakePx * 4.5 -
    motionBlurPx * 2.2 -
    noiseLevel * 18;
  const sharpnessScore = Math.max(12, Math.min(99, Math.round(rawSharpness)));

  let exposureLabel = 'نوردهی متعادل';
  if (evDelta > 1.35) exposureLabel = 'بیش‌نوردهی شدید (سوختگی سفیدی‌ها)';
  else if (evDelta > 0.55) exposureLabel = 'کمی پرنور';
  else if (evDelta < -1.35) exposureLabel = 'کم‌نوردهی شدید (تاریک)';
  else if (evDelta < -0.55) exposureLabel = 'کمی کم‌نور';

  let dofLabel = 'عمق میدان متعادل';
  if (blurStrength >= 8.5) dofLabel = 'عمق میدان بسیار کم (بوکه قوی)';
  else if (blurStrength >= 4) dofLabel = 'جداسازی نرم پس‌زمینه';
  else if (clampedAperture >= 11) dofLabel = 'فوکوس گسترده تا پس‌زمینه';

  let motionLabel = 'ثبت ثابت و شارپ';
  if (cameraShakePx > 1.5) motionLabel = 'لرزش دست در کادر';
  else if (motionBlurPx > 2.5) motionLabel = 'کشیدگی حرکتی سوژه';

  let noiseLabel = 'تصویر تمیز و بدون نویز';
  if (noiseLevel > 0.52) noiseLabel = 'نویز دیجیتال بالا';
  else if (noiseLevel > 0.24) noiseLabel = 'گرین ملایم ISO';

  return {
    evCamera,
    evScene,
    evDelta,
    effectiveFocalLength,
    dofMeters,
    blurStrength,
    motionBlurPx,
    cameraShakePx,
    noiseLevel,
    sharpnessScore,
    exposureLabel,
    dofLabel,
    motionLabel,
    noiseLabel,
  };
}

let audioCtx: AudioContext | null = null;

export function playDslrShutterSound(shutterSeconds: number): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const clickBufferSize = Math.floor(audioCtx.sampleRate * 0.035);
    const buffer = audioCtx.createBuffer(1, clickBufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < clickBufferSize; i++) {
      const env = Math.exp(-i / (clickBufferSize * 0.2));
      data[i] = (Math.random() * 2 - 1) * env * 0.45;
    }

    const playClick = (offset: number, freq: number, gainVal: number) => {
      if (!audioCtx) return;
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 1.6;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(gainVal, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(now + offset);
    };

    playClick(0, 1450, 0.7);
    const curtainDelay = Math.min(0.45, Math.max(0.038, shutterSeconds));
    playClick(curtainDelay, 1100, 0.55);
  } catch {
    // Ignore audio errors if blocked
  }
}

export interface HistogramBins {
  r: number[];
  g: number[];
  b: number[];
}

/**
 * Cross-browser smooth bokeh blur using progressive bilinear downsampling + upsampling.
 * Avoids `ctx.filter` which is unsupported or unreliable on some mobile WebViews & Safari.
 */
function createBlurredBuffer(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  blurRadiusPx: number,
): HTMLCanvasElement {
  const downFactor = Math.max(2, Math.min(18, Math.round(1 + blurRadiusPx * 0.95)));
  const smallW = Math.max(24, Math.round(width / downFactor));
  const smallH = Math.max(18, Math.round(height / downFactor));

  const tempA = document.createElement('canvas');
  tempA.width = Math.max(48, Math.round(width / Math.max(2, downFactor * 0.55)));
  tempA.height = Math.max(36, Math.round(height / Math.max(2, downFactor * 0.55)));
  const ctxA = tempA.getContext('2d');
  if (ctxA) {
    ctxA.imageSmoothingEnabled = true;
    ctxA.imageSmoothingQuality = 'high';
    ctxA.drawImage(source, 0, 0, tempA.width, tempA.height);
  }

  const tempB = document.createElement('canvas');
  tempB.width = smallW;
  tempB.height = smallH;
  const ctxB = tempB.getContext('2d');
  if (ctxB) {
    ctxB.imageSmoothingEnabled = true;
    ctxB.imageSmoothingQuality = 'high';
    ctxB.drawImage(tempA, 0, 0, smallW, smallH);
  }

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const outCtx = out.getContext('2d');
  if (outCtx) {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(tempB, 0, 0, width, height);
  }
  return out;
}

export function renderSimulatedFrame(
  targetCanvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLCanvasElement,
  settings: CameraSettings,
  scene: PhotoScene,
  camera: DslrCamera,
  lens: DslrLens,
  metrics: OpticalMetrics,
): HistogramBins {
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const ctx = targetCanvas.getContext('2d', {willReadFrequently: true});
  const emptyHist: HistogramBins = {
    r: new Array(32).fill(0),
    g: new Array(32).fill(0),
    b: new Array(32).fill(0),
  };
  if (!ctx) return emptyHist;

  const srcWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!srcWidth || !srcHeight) return emptyHist;

  const zoomScale = Math.max(0.85, Math.min(2.8, metrics.effectiveFocalLength / 44));
  const cropW = Math.min(srcWidth, srcWidth / zoomScale);
  const cropH = Math.min(srcHeight, srcHeight / zoomScale);

  const focusShiftX = (settings.focusX - 0.5) * (srcWidth - cropW) * 0.5;
  const focusShiftY = (settings.focusY - 0.5) * (srcHeight - cropH) * 0.5;
  const sx = Math.max(0, Math.min(srcWidth - cropW, (srcWidth - cropW) / 2 + focusShiftX));
  const sy = Math.max(0, Math.min(srcHeight - cropH, (srcHeight - cropH) / 2 + focusShiftY));

  const sharpCanvas = document.createElement('canvas');
  sharpCanvas.width = width;
  sharpCanvas.height = height;
  const sharpCtx = sharpCanvas.getContext('2d');
  if (!sharpCtx) return emptyHist;

  sharpCtx.drawImage(source, sx, sy, cropW, cropH, 0, 0, width, height);

  const totalMotion = metrics.motionBlurPx + metrics.cameraShakePx;
  if (totalMotion > 0.6) {
    sharpCtx.save();
    sharpCtx.globalAlpha = 0.34;
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const dx = (i / steps) * (metrics.motionBlurPx * 1.4 + metrics.cameraShakePx * 0.8);
      const dy = (i / steps) * (metrics.cameraShakePx * 0.9);
      sharpCtx.drawImage(sharpCanvas, dx, dy);
      sharpCtx.drawImage(sharpCanvas, -dx * 0.5, -dy * 0.5);
    }
    sharpCtx.restore();
  }

  ctx.clearRect(0, 0, width, height);

  if (metrics.blurStrength > 0.8) {
    const blurredBg = createBlurredBuffer(sharpCanvas, width, height, metrics.blurStrength);
    ctx.drawImage(blurredBg, 0, 0);

    const sharpMaskCanvas = document.createElement('canvas');
    sharpMaskCanvas.width = width;
    sharpMaskCanvas.height = height;
    const maskCtx = sharpMaskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.drawImage(sharpCanvas, 0, 0);
      maskCtx.globalCompositeOperation = 'destination-in';

      const fx = settings.focusX * width;
      const fy = settings.focusY * height;
      const dofNormalized = Math.min(
        1.6,
        Math.max(0.22, scene.focalPlaneRadius + (settings.aperture - 1.2) * 0.085),
      );
      const innerR = Math.min(width, height) * dofNormalized * 0.45;
      const outerR = Math.min(width, height) * dofNormalized * 1.18;

      const grad = maskCtx.createRadialGradient(fx, fy, innerR, fx, fy, outerR);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.88)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      maskCtx.fillStyle = grad;
      maskCtx.fillRect(0, 0, width, height);

      ctx.drawImage(sharpMaskCanvas, 0, 0);
    }
  } else if (settings.aperture > 13) {
    const blurredDiff = createBlurredBuffer(sharpCanvas, width, height, (settings.aperture - 13) * 0.25);
    ctx.drawImage(sharpCanvas, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(blurredDiff, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(sharpCanvas, 0, 0);
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const drMargin = Math.max(1.0, (camera.dynamicRangeStops - 11.5) * 0.22);
  const exposureGain = Math.pow(2, metrics.evDelta);

  const wbShift = (settings.whiteBalanceK - 5500) / 3000;
  const rWb = 1 + Math.max(-0.22, Math.min(0.28, wbShift * 0.24));
  const bWb = 1 - Math.max(-0.24, Math.min(0.26, wbShift * 0.26));

  const noiseAmp = metrics.noiseLevel * 58;
  const rBins = new Array(32).fill(0);
  const gBins = new Array(32).fill(0);
  const bBins = new Array(32).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * exposureGain * rWb;
    let g = data[i + 1] * exposureGain;
    let b = data[i + 2] * exposureGain * bWb;

    if (r > 215) r = 215 + (r - 215) / (1 + (r - 215) / (120 * drMargin));
    if (g > 215) g = 215 + (g - 215) / (1 + (g - 215) / (120 * drMargin));
    if (b > 215) b = 215 + (b - 215) / (1 + (b - 215) / (120 * drMargin));

    if (noiseAmp > 1.5) {
      const lumaNoise = (Math.random() - 0.5) * noiseAmp;
      const chromaR = (Math.random() - 0.5) * noiseAmp * 0.55;
      const chromaB = (Math.random() - 0.5) * noiseAmp * 0.6;
      r += lumaNoise + chromaR;
      g += lumaNoise * 0.85;
      b += lumaNoise + chromaB;
    }

    const rClamped = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    const gClamped = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    const bClamped = b < 0 ? 0 : b > 255 ? 255 : b | 0;

    data[i] = rClamped;
    data[i + 1] = gClamped;
    data[i + 2] = bClamped;

    if ((i & 15) === 0) {
      rBins[rClamped >> 3]++;
      gBins[gClamped >> 3]++;
      bBins[bClamped >> 3]++;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const wideOpenRatio = Math.max(0, (4.0 - settings.aperture) / 2.8);
  const vignetteAlpha = Math.min(0.62, lens.vignetteStrength * (0.35 + wideOpenRatio * 0.9));
  if (vignetteAlpha > 0.05) {
    const vGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.34,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, `rgba(0,0,0,${vignetteAlpha.toFixed(2)})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);
  }

  const maxBin = Math.max(1, ...rBins, ...gBins, ...bBins);
  return {
    r: rBins.map((v) => v / maxBin),
    g: gBins.map((v) => v / maxBin),
    b: bBins.map((v) => v / maxBin),
  };
}
