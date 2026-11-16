export type CameraMount = 'RF' | 'Z' | 'FE' | 'EF' | 'EF-S' | 'F' | 'DX' | 'K';

export type SensorFormat = 'Full-Frame' | 'APS-C';

export interface DslrCamera {
  id: string;
  brand: string;
  model: string;
  persianTitle: string;
  releaseYear: number;
  tier: 'مقدماتی' | 'نیمه‌حرفه‌ای' | 'حرفه‌ای' | 'پرچمدار';
  sensorFormat: SensorFormat;
  cropFactor: number;
  megapixels: number;
  dynamicRangeStops: number;
  maxIso: number;
  cleanIsoLimit: number;
  burstFps: number;
  hasIbis: boolean;
  mount: CameraMount;
  compatibleMounts: CameraMount[];
  summary: string;
}

export interface DslrLens {
  id: string;
  name: string;
  persianCategory: string;
  mount: CameraMount;
  minFocalLength: number;
  maxFocalLength: number;
  minAperture: number;
  maxAperture: number;
  hasStabilization: boolean;
  bokehQuality: number;
  sharpnessRating: number;
  vignetteStrength: number;
  description: string;
}

export interface PhotoScene {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  ambientEV: number;
  motionIntensity: number;
  defaultFocusX: number;
  defaultFocusY: number;
  focalPlaneRadius: number;
  recommendedSettings: {
    aperture: number;
    shutterSeconds: number;
    iso: number;
    focalLength: number;
  };
  lessonHint: string;
}

export interface CameraSettings {
  cameraId: string;
  lensId: string;
  aperture: number;
  shutterSeconds: number;
  iso: number;
  focalLength: number;
  whiteBalanceK: number;
  tripodEnabled: boolean;
  stabilizerEnabled: boolean;
  focusX: number;
  focusY: number;
  showGrid: boolean;
  showHistogram: boolean;
}

export interface OpticalMetrics {
  evCamera: number;
  evScene: number;
  evDelta: number;
  effectiveFocalLength: number;
  dofMeters: number;
  blurStrength: number;
  motionBlurPx: number;
  cameraShakePx: number;
  noiseLevel: number;
  sharpnessScore: number;
  exposureLabel: string;
  dofLabel: string;
  motionLabel: string;
  noiseLabel: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  sceneId: string;
  sceneTitle: string;
  capturedAt: string;
  settings: CameraSettings;
  cameraLabel: string;
  lensLabel: string;
  metrics: OpticalMetrics;
}

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  tip: string;
  check: (settings: CameraSettings, scene: PhotoScene, camera: DslrCamera, lens: DslrLens) => boolean;
}

export interface EducationalMission {
  id: string;
  title: string;
  level: 'مبتدی' | 'متوسط' | 'پیشرفته';
  targetSceneId: string;
  objective: string;
  steps: TutorialStep[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  loggedInAt: string;
}
