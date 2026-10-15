// Shared by the browser (BookingForm) and the server endpoint (api/booking.ts),
// so both validate exactly the same way. public/booking.php mirrors these rules.

export const SERVICES = ['furniture', 'garage', 'estate', 'yard', 'storage', 'commercial', 'other'] as const;
export const TIME_WINDOWS = ['morning', 'afternoon', 'evening'] as const;

export const MAX_FILES = 3;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Honeypot field: real people never see or fill it. */
export const HONEYPOT = 'company_website';

export type ErrorCode = 'required' | 'phone' | 'email' | 'zip' | 'date' | 'fileCount' | 'fileSize' | 'fileType';
export type Errors = Partial<Record<string, ErrorCode>>;

export interface BookingData {
  name: string;
  phone: string;
  email: string;
  zip: string;
  service: string;
  date: string;
  time: string;
  description: string;
  lang: string;
}

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export const phoneDigits = (v: string) => {
  const digits = v.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};

/** Today in Los Angeles as YYYY-MM-DD (the business's local date, not the server's). */
export const todayLA = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

export function validateField(name: keyof BookingData, value: string): ErrorCode | undefined {
  const v = value.trim();
  switch (name) {
    case 'name':
      return v.length < 2 ? 'required' : undefined;
    case 'phone':
      if (!v) return 'required';
      return phoneDigits(v).length === 10 ? undefined : 'phone';
    case 'email':
      return v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'email' : undefined;
    case 'zip':
      if (!v) return 'required';
      return /^\d{5}$/.test(v) ? undefined : 'zip';
    case 'service':
      return (SERVICES as readonly string[]).includes(v) ? undefined : 'required';
    case 'date':
      if (!v) return undefined;
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= todayLA() ? undefined : 'date';
    case 'time':
      return !v || (TIME_WINDOWS as readonly string[]).includes(v) ? undefined : 'required';
    default:
      return undefined;
  }
}

export function validateFiles(files: FileLike[]): ErrorCode | undefined {
  const real = files.filter((f) => f && f.size > 0);
  if (real.length > MAX_FILES) return 'fileCount';
  if (real.some((f) => f.size > MAX_FILE_SIZE)) return 'fileSize';
  if (real.some((f) => !ALLOWED_TYPES.includes(f.type.toLowerCase()))) return 'fileType';
  return undefined;
}

export function validateBooking(data: BookingData, files: FileLike[]): Errors {
  const errors: Errors = {};
  for (const key of ['name', 'phone', 'email', 'zip', 'service', 'date', 'time'] as const) {
    const err = validateField(key, data[key] ?? '');
    if (err) errors[key] = err;
  }
  const fileErr = validateFiles(files);
  if (fileErr) errors.photos = fileErr;
  return errors;
}
