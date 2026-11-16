import {useEffect, useMemo, useState} from 'react';
import {
  BookOpen,
  Camera,
  GraduationCap,
  Layers,
  LogOut,
  UserCheck,
} from 'lucide-react';
import {CompareGalleryView} from './components/CompareGalleryView';
import {GuideView} from './components/GuideView';
import {LoginView} from './components/LoginView';
import {SimulatorView} from './components/SimulatorView';
import {
  APP_ICON_URL,
  DSLR_CAMERAS,
  DSLR_LENSES,
  EDUCATIONAL_MISSIONS,
  PHOTO_SCENES,
} from './data/dslrCatalog';
import type {CameraSettings, CapturedPhoto, UserProfile} from './types/dslr';

type AppTab = 'simulator' | 'tutorial' | 'compare' | 'guide';

const STORAGE_USER_KEY = 'lenznegar_user_profile_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('simulator');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(PHOTO_SCENES[0].id);
  const [activeMissionId, setActiveMissionId] = useState<string>(EDUCATIONAL_MISSIONS[0].id);
  const [educationalMode, setEducationalMode] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? (JSON.parse(saved) as UserProfile) : null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState<CameraSettings>({
    cameraId: DSLR_CAMERAS[0].id,
    lensId: DSLR_LENSES[0].id,
    aperture: 2.0,
    shutterSeconds: 1 / 500,
    iso: 200,
    focalLength: 50,
    whiteBalanceK: 5500,
    tripodEnabled: false,
    stabilizerEnabled: true,
    focusX: PHOTO_SCENES[0].defaultFocusX,
    focusY: PHOTO_SCENES[0].defaultFocusY,
    showGrid: true,
    showHistogram: false,
  });

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

  const cameraBody = useMemo(
    () => DSLR_CAMERAS.find((c) => c.id === settings.cameraId) ?? DSLR_CAMERAS[0],
    [settings.cameraId],
  );

  const lens = useMemo(
    () => DSLR_LENSES.find((l) => l.id === settings.lensId) ?? DSLR_LENSES[0],
    [settings.lensId],
  );

  useEffect(() => {
    if (userProfile) {
      try {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userProfile));
      } catch {
        // Ignore storage errors
      }
    }
  }, [userProfile]);

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // Ignore storage errors
    }
    setUserProfile(null);
    setShowAccountModal(false);
  };

  // Show Login page first before entering the simulator
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0D0F13] text-[#F3F4F6]">
        <LoginView
          isModal={false}
          currentUser={null}
          onSuccess={(profile) => setUserProfile(profile)}
        />
      </div>
    );
  }

  const handleChangeCamera = (cameraId: string) => {
    const nextCamera = DSLR_CAMERAS.find((c) => c.id === cameraId) ?? DSLR_CAMERAS[0];
    const currentLensStillCompatible = nextCamera.compatibleMounts.includes(lens.mount);
    const nextLens = currentLensStillCompatible
      ? lens
      : DSLR_LENSES.find((l) => nextCamera.compatibleMounts.includes(l.mount)) ?? DSLR_LENSES[0];

    setSettings((prev) => ({
      ...prev,
      cameraId: nextCamera.id,
      lensId: nextLens.id,
      aperture: Math.max(nextLens.minAperture, Math.min(nextLens.maxAperture, prev.aperture)),
      focalLength: Math.max(
        nextLens.minFocalLength,
        Math.min(nextLens.maxFocalLength, prev.focalLength),
      ),
      iso: Math.min(nextCamera.maxIso, prev.iso),
    }));
  };

  const handleChangeLens = (lensId: string) => {
    const nextLens = DSLR_LENSES.find((l) => l.id === lensId) ?? DSLR_LENSES[0];
    setSettings((prev) => ({
      ...prev,
      lensId: nextLens.id,
      aperture: Math.max(nextLens.minAperture, Math.min(nextLens.maxAperture, prev.aperture)),
      focalLength: Math.max(
        nextLens.minFocalLength,
        Math.min(nextLens.maxFocalLength, prev.focalLength),
      ),
    }));
  };

  const handleUpdateSettings = (patch: Partial<CameraSettings>) => {
    setSettings((prev) => ({...prev, ...patch}));
  };

  const handleSelectNav = (tab: AppTab) => {
    if (tab === 'tutorial') {
      setEducationalMode(true);
      const mission =
        EDUCATIONAL_MISSIONS.find((m) => m.id === activeMissionId) ?? EDUCATIONAL_MISSIONS[0];
      setSelectedSceneId(mission.targetSceneId);
      setActiveTab('tutorial');
      return;
    }
    if (tab === 'simulator') {
      setEducationalMode(false);
    }
    setActiveTab(tab);
  };

  const navItems: {id: AppTab; label: string; icon: typeof Camera}[] = [
    {id: 'simulator', label: 'شبیه‌ساز', icon: Camera},
    {id: 'tutorial', label: 'آموزش', icon: GraduationCap},
    {id: 'compare', label: 'مقایسه', icon: Layers},
    {id: 'guide', label: 'راهنما', icon: BookOpen},
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0F13] text-[#F3F4F6] pb-20 md:pb-0">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#0D0F13]/95 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => handleSelectNav('simulator')}
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            <img
              src={APP_ICON_URL}
              alt="لنزنگار"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover border border-orange-500/50"
            />
            <span>لنزنگار</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-orange-500 text-orange-400 font-bold'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors">
              <UserCheck className="w-4 h-4" />
              <span className="max-w-[120px] truncate">
                {userProfile.firstName} {userProfile.lastName}
              </span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="خروج به صفحه ورود"
              aria-label="خروج به صفحه ورود"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#151921] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-5">
        {(activeTab === 'simulator' || activeTab === 'tutorial') && (
          <SimulatorView
            cameraBody={cameraBody}
            lens={lens}
            settings={settings}
            selectedSceneId={selectedSceneId}
            educationalMode={educationalMode || activeTab === 'tutorial'}
            activeMissionId={activeMissionId}
            onChangeCamera={handleChangeCamera}
            onChangeLens={handleChangeLens}
            onUpdateSettings={handleUpdateSettings}
            onSelectScene={setSelectedSceneId}
            onSelectMission={setActiveMissionId}
            onToggleEducationalMode={(enabled) => {
              setEducationalMode(enabled);
              setActiveTab(enabled ? 'tutorial' : 'simulator');
            }}
            onPhotoCaptured={(photo) => setCapturedPhotos((prev) => [photo, ...prev])}
            onGoCompare={() => setActiveTab('compare')}
            capturedCount={capturedPhotos.length}
          />
        )}

        {activeTab === 'compare' && (
          <CompareGalleryView
            photos={capturedPhotos}
            onDeletePhoto={(id) =>
              setCapturedPhotos((prev) => prev.filter((item) => item.id !== id))
            }
            onGoShoot={() => setActiveTab('simulator')}
          />
        )}

        {activeTab === 'guide' && <GuideView />}
      </main>

      {/* Quiet Editorial Footer with Creator Attribution */}
      <footer className="hidden md:block border-t border-white/10 bg-[#0A0C10]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <span>لنزنگار · شبیه‌ساز تخصصی دوربین‌های DSLR و لنزها</span>
          <div className="flex items-center gap-4">
            <span>
              سازنده سایت:{' '}
              <a
                href="https://byhrsn.com"
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-orange-400 hover:text-orange-300">
                byhrsn.com
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Ergonomic Bottom Thumb Bar */}
      <nav
        aria-label="منوی موبایل"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#11141B]/95 border-t border-white/10 grid grid-cols-4 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? 'text-orange-400 font-bold' : 'text-zinc-400'
              }`}>
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Account Edit Modal */}
      {showAccountModal && (
        <LoginView
          isModal
          currentUser={userProfile}
          onSuccess={(profile) => setUserProfile(profile)}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}
