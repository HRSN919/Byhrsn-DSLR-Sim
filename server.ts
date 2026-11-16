import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TARGET_ADMIN_EMAIL = 'h.sotoudeh@gmail.com';
const CREATOR_DOMAIN = 'byhrsn.com';
const DATA_DIR = path.join(__dirname, '.data');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');

interface RegistrationRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  targetEmail: string;
  source: string;
  createdAt: string;
}

function saveRegistration(record: RegistrationRecord): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
  let existing: RegistrationRecord[] = [];
  if (fs.existsSync(REGISTRATIONS_FILE)) {
    try {
      const raw = fs.readFileSync(REGISTRATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existing = parsed;
      }
    } catch {
      existing = [];
    }
  }
  existing.unshift(record);
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(existing.slice(0, 500), null, 2), 'utf-8');
}

async function tryWebhookOrEmailRelay(record: RegistrationRecord): Promise<boolean> {
  const webhookUrl = process.env.REGISTRATION_EMAIL_WEBHOOK;
  if (!webhookUrl) {
    return false;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        to: TARGET_ADMIN_EMAIL,
        subject: `ثبت ورود کاربر جدید در لنزنگار: ${record.firstName} ${record.lastName}`,
        record,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'LenzNegar DSLR Simulator',
      creator: CREATOR_DOMAIN,
      targetEmail: TARGET_ADMIN_EMAIL,
    });
  });

  app.post('/api/auth/register-notify', async (req, res) => {
    const body = req.body ?? {};
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const mobile = typeof body.mobile === 'string' ? body.mobile.trim() : '';

    if (!firstName || !lastName) {
      res.status(400).json({
        ok: false,
        error: 'لطفاً نام و نام خانوادگی را به صورت کامل وارد کنید.',
      });
      return;
    }

    const normalizedMobile = mobile.replace(/[\s-]/g, '');
    if (normalizedMobile.length < 10) {
      res.status(400).json({
        ok: false,
        error: 'شماره موبایل معتبر وارد کنید (حداقل ۱۰ رقم).',
      });
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        ok: false,
        error: 'فرمت آدرس ایمیل وارد شده صحیح نیست.',
      });
      return;
    }

    const record: RegistrationRecord = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      firstName,
      lastName,
      email: email || 'ثبت نشده',
      mobile: normalizedMobile,
      targetEmail: TARGET_ADMIN_EMAIL,
      source: CREATOR_DOMAIN,
      createdAt: new Date().toISOString(),
    };

    try {
      saveRegistration(record);
    } catch {
      // Non-fatal if filesystem is read-only
    }

    const relayed = await tryWebhookOrEmailRelay(record);

    const subject = encodeURIComponent(`ورود کاربر جدید به شبیه‌ساز DSLR - ${firstName} ${lastName}`);
    const mailBody = encodeURIComponent(
      [
        'اطلاعات ورود کاربر جدید در شبیه‌ساز دوربین DSLR لنزنگار:',
        `نام: ${firstName}`,
        `نام خانوادگی: ${lastName}`,
        `شماره موبایل: ${normalizedMobile}`,
        `ایمیل کاربر: ${email || 'ثبت نشده'}`,
        `تاریخ ثبت: ${record.createdAt}`,
        `منبع: ${CREATOR_DOMAIN}`,
      ].join('\n'),
    );

    res.json({
      ok: true,
      deliveryMode: relayed ? 'relayed' : 'recorded',
      targetEmail: TARGET_ADMIN_EMAIL,
      mailtoUrl: `mailto:${TARGET_ADMIN_EMAIL}?subject=${subject}&body=${mailBody}`,
      record,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DSLR Simulator server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
