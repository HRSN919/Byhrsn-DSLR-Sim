import React, {useState} from 'react';
import {CheckCircle2, Mail, Phone, User, X} from 'lucide-react';
import {APP_ICON_URL} from '../data/dslrCatalog';
import type {UserProfile} from '../types/dslr';

interface LoginViewProps {
  currentUser: UserProfile | null;
  onSuccess: (profile: UserProfile) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  currentUser,
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const [firstName, setFirstName] = useState(currentUser?.firstName ?? '');
  const [lastName, setLastName] = useState(currentUser?.lastName ?? '');
  const [email, setEmail] = useState(
    currentUser?.email && currentUser.email !== 'ثبت نشده' ? currentUser.email : '',
  );
  const [mobile, setMobile] = useState(currentUser?.mobile ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInSuccess, setLoggedInSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register-notify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({firstName, lastName, email, mobile}),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json.error || 'خطا در ثبت اطلاعات ورود. لطفاً مجدداً تلاش کنید.');
        setSubmitting(false);
        return;
      }

      const profile: UserProfile = {
        firstName: json.record.firstName,
        lastName: json.record.lastName,
        email: json.record.email,
        mobile: json.record.mobile,
        loggedInAt: json.record.createdAt,
      };
      setLoggedInSuccess(true);
      onSuccess(profile);
    } catch {
      setError('ارتباط با سرور برقرار نشد. لطفاً دوباره امتحان کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4'
          : 'min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4'
      }>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#151921] border border-white/12 p-6 md:p-8 shadow-2xl">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="absolute top-4 left-4 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-4 mb-6">
          <img
            src={APP_ICON_URL}
            alt="آیکن برنامه لنزنگار"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border border-orange-500/40 shrink-0"
          />
          <div>
            <h2 className="text-xl font-bold text-white">حساب کاربری عکاس</h2>
            <p className="text-xs text-zinc-400 mt-1">
              لطفاً مشخصات خود را برای ورود به شبیه‌ساز وارد نمایید.
            </p>
          </div>
        </div>

        {loggedInSuccess ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>خوش آمدید {firstName} {lastName}</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                ثبت‌نام و ورود شما با موفقیت انجام شد.
              </p>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[46px] px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold">
                ورود به شبیه‌ساز
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  نام <span className="text-orange-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: علی"
                    className="w-full min-h-[44px] rounded-xl bg-[#0D0F13] border border-white/12 pr-9 pl-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  نام خانوادگی <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="مثال: رضایی"
                  className="w-full min-h-[44px] rounded-xl bg-[#0D0F13] border border-white/12 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                شماره موبایل <span className="text-orange-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full min-h-[44px] rounded-xl bg-[#0D0F13] border border-white/12 pr-9 pl-3 text-sm font-mono text-left text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                آدرس ایمیل <span className="text-zinc-500 text-[11px]">(در صورت وجود)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="photographer@example.com"
                  className="w-full min-h-[44px] rounded-xl bg-[#0D0F13] border border-white/12 pr-9 pl-3 text-sm font-mono text-left text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-950/70 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-sm font-bold transition-colors">
              <span>{submitting ? 'در حال بررسی...' : 'ثبت‌نام و ورود'}</span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>طراحی و توسعه:</span>
          <a
            href="https://byhrsn.com"
            target="_blank"
            rel="noreferrer"
            dir="ltr"
            className="font-mono font-semibold text-orange-400 hover:text-orange-300">
            byhrsn.com
          </a>
        </div>
      </div>
    </div>
  );
};
