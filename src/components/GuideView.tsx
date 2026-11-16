import React from 'react';
import {
  Aperture,
  Camera,
  Clock,
  Layers,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {APP_ICON_URL} from '../data/dslrCatalog';

export const GuideView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={APP_ICON_URL}
            alt="آیکن برنامه لنزنگار"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border border-orange-500/40 shrink-0"
          />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white">
              راهنمای استفاده از شبیه‌ساز عکاسی لنزنگار
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              آموزش سریع کار با دوربین‌ها، لنزهای جدید، مثلث نوردهی و مقایسه عکس‌ها · سازنده:{' '}
              <a
                href="https://byhrsn.com"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-orange-400 hover:underline">
                byhrsn.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-step Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">۱. انتخاب دوربین و لنز</h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            بدنه دوربین مورد نظر خود را از میان مدل‌های جدید و کلاسیک (Canon، Nikon، Sony و Pentax) انتخاب کنید. لنزهای سازگار با مانت بدنه به‌صورت خودکار فیلتر شده و ضریب کراپ محاسبه می‌شود.
          </p>
        </div>

        <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Aperture className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">۲. تنظیم مثلث نوردهی</h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            روی هر نقطه از منظره‌یاب کلیک کنید تا فوکوس (AF) روی آن قرار گیرد. با اسلایدرهای دیافراگم، سرعت شاتر و ISO نورسنج EV را نزدیک صفر تنظیم کنید و تغییر کیفیت را زنده ببینید.
          </p>
        </div>

        <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">۳. حالت آموزش گام‌به‌گام</h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            در تب آموزش، مأموریت‌های واقعی روی صحنه‌های پرتره، ورزشی، عکاسی در شب و ماکرو را مرحله‌به‌مرحله با بررسی خودکار پارامترها تمرین کنید.
          </p>
        </div>

        <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">۴. مقایسه دو خروجی</h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            پس از ثبت دو یا چند عکس با تنظیمات مختلف، در بخش مقایسه با اسلایدر دوصفحه‌ای و جدول فنی دقیقاً ببینید دیافراگم، شاتر و ISO چگونه تصویر را تغییر داده‌اند.
          </p>
        </div>
      </div>

      {/* Exposure Triangle Cheat Sheet Table */}
      <div className="rounded-2xl bg-[#151921] border border-white/10 p-5 space-y-4">
        <h3 className="text-base font-bold text-white">جدول مرجع تاثیر پارامترها بر کیفیت تصویر خروجی</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="py-2.5 px-3 text-right">پارامتر</th>
                <th className="py-2.5 px-3 text-right">مقدار کم / باز</th>
                <th className="py-2.5 px-3 text-right">مقدار زیاد / بسته</th>
                <th className="py-2.5 px-3 text-right">کاربرد پیشنهادی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-3 px-3 font-semibold text-orange-400 flex items-center gap-1.5">
                  <Aperture className="w-4 h-4" />
                  دیافراگم (f)
                </td>
                <td className="py-3 px-3 text-zinc-200">f/1.2 تا f/2.8 ← نور زیاد و پس‌زمینه محو (بوکه)</td>
                <td className="py-3 px-3 text-zinc-200">f/8 تا f/22 ← نور کمتر و فوکوس سرتاسری</td>
                <td className="py-3 px-3 text-zinc-400">پرتره: f/1.4 یا f/1.8 · منظره: f/8 تا f/11</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-orange-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  سرعت شاتر
                </td>
                <td className="py-3 px-3 text-zinc-200">1/4 تا 2" ← نور بیشتر، ثبت حرکت آب و نور (با سه‌پایه)</td>
                <td className="py-3 px-3 text-zinc-200">1/1000 تا 1/4000 ← منجمد کردن حرکت سریع</td>
                <td className="py-3 px-3 text-zinc-400">ورزشی: 1/1000 · شب: 1/4 با سه‌پایه</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-orange-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  حساسیت (ISO)
                </td>
                <td className="py-3 px-3 text-zinc-200">100 تا 400 ← بیشترین شارپنس و بدون نویز</td>
                <td className="py-3 px-3 text-zinc-200">3200 تا 25600 ← افزایش نور همراه با گرین دیجیتال</td>
                <td className="py-3 px-3 text-zinc-400">روز: ISO 100 · شب دستی: 1600-3200</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
