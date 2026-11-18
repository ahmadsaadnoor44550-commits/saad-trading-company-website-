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

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: STORE_NAME,
  ownerName: 'Ahmad Saad',
  tagline: 'Premium Mobile LCDs, LEDs, OLED Screens & Accessories',
  whatsappNumber: '03330916398', // Owner real WhatsApp number
  contactEmail: 'ahmadsaadnoor44550@gmail.com',
  contactPhone: '03330916398',
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
