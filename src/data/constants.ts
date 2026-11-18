import { StoreSettings } from '../types';

// Single source of truth for the store brand name
export const STORE_NAME = 'AG CROWN';

const LEGACY_BRAND_PATTERN = 'saad\\s*t[ra]+ding\\s*compa[mn]y|saad\\s*t[ra]+ding|as\\s*empire';

export function hasLegacyBrandText(text?: string | null): boolean {
  if (!text) return false;
  return new RegExp(LEGACY_BRAND_PATTERN, 'i').test(text);
}

export function sanitizeStoreName(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed || hasLegacyBrandText(trimmed)) {
    return STORE_NAME;
  }
  return trimmed;
}

export function sanitizeBrandText(text?: string | null): string {
  if (!text) return '';
  return text.replace(new RegExp(LEGACY_BRAND_PATTERN, 'gi'), STORE_NAME);
}

const WRONG_PHONE_PATTERN = '(?:92|\\+?92|0)?315[-\\s]?556[-\\s]?0064';

export function hasWrongPhoneText(text?: string | null): boolean {
  if (!text) return false;
  return new RegExp(WRONG_PHONE_PATTERN, 'i').test(text);
}

export function sanitizeStorePhone(phone?: string | null, fallback = ''): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return fallback;
  if (hasWrongPhoneText(trimmed)) {
    return '03155570064';
  }
  return trimmed;
}

export function replaceWrongPhoneText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/92315[-\s]?556[-\s]?0064/gi, '923155570064')
    .replace(/0?315[-\s]?556[-\s]?0064/gi, '03155570064');
}

export const PAKISTAN_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Gujranwala',
  'Sialkot',
  'Quetta',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Abbottabad',
  'Sukkur',
  'Larkana',
  'Sheikhupura',
  'Jhang',
  'Rahim Yar Khan',
  'Gujrat',
  'Mardan',
  'Kasur',
  'Sahiwal',
  'Okara',
  'Wah Cantonment',
  'Dera Ghazi Khan',
  'Mirpur (AJK)',
  'Muzaffarabad (AJK)',
  'Jhelum',
  'Other City in Pakistan'
];

export const INITIAL_BUSINESS_CATEGORIES = [
  'Mobile LCDs',
  'Mobile LEDs',
  'OLED Screens',
  'Mobile Accessories'
];

export const DEFAULT_CONTACT_NUMBERS = [
  '03330916398',
  '03329940609',
  '03155570064',
] as const;

export function formatWhatsAppInternational(phone: string): string {
  const digits = (phone || DEFAULT_CONTACT_NUMBERS[0]).replace(/[^0-9]/g, '');
  if (!digits) return '923330916398';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return '92' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;
  return digits;
}

export function formatTelLink(phone: string): string {
  const cleaned = (phone || DEFAULT_CONTACT_NUMBERS[0]).replace(/[^0-9+]/g, '');
  return `tel:${cleaned || DEFAULT_CONTACT_NUMBERS[0]}`;
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const intl = formatWhatsAppInternational(phone);
  return message
    ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${intl}`;
}

export function getStorePhones(settings?: Partial<StoreSettings>): string[] {
  const rawList = [
    settings?.whatsappNumber !== undefined ? settings.whatsappNumber : DEFAULT_CONTACT_NUMBERS[0],
    settings?.whatsappNumber2 !== undefined ? settings.whatsappNumber2 : DEFAULT_CONTACT_NUMBERS[1],
    settings?.whatsappNumber3 !== undefined ? settings.whatsappNumber3 : DEFAULT_CONTACT_NUMBERS[2],
  ];
  const valid = rawList
    .map((n) => (n || '').trim())
    .filter((n, idx, arr) => n.length > 0 && arr.indexOf(n) === idx);
  return valid.length > 0 ? valid : [...DEFAULT_CONTACT_NUMBERS];
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: STORE_NAME,
  ownerName: 'Ahmad Saad',
  tagline: 'Premium Mobile LCDs, LEDs, OLED Screens & Accessories',
  whatsappNumber: DEFAULT_CONTACT_NUMBERS[0],
  whatsappNumber2: DEFAULT_CONTACT_NUMBERS[1],
  whatsappNumber3: DEFAULT_CONTACT_NUMBERS[2],
  contactEmail: 'ahmadsaadnoor44550@gmail.com',
  contactPhone: DEFAULT_CONTACT_NUMBERS[0],
  businessAddress: '',
  logoUrl: '',
  bannerUrl: '',
  announcement: `Welcome to ${STORE_NAME} – Premium Mobile Displays & Phone Accessories. Contact us on WhatsApp for verified orders.`,
  aboutText: `${STORE_NAME} is your trusted source for premium Mobile LCDs, Mobile LEDs, OLED Screens, and mobile accessories in Pakistan. Every product is individually inspected for guaranteed display quality.`,
  ownerIntro: '',
  deliveryFee: 250,
  freeDeliveryThreshold: 0,
  paymentInstructions: 'Advance Payment Only: EasyPaisa, JazzCash, and Bank Transfer. Please send payment screenshot on WhatsApp to confirm your order.',
  easyPaisaAccount: '',
  jazzCashAccount: '',
  bankAccountDetails: '',
  categories: INITIAL_BUSINESS_CATEGORIES
};

// Pakistani Rupee Formatter
export function formatPKR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rs. 0';
  }
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}
