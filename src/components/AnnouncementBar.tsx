import React from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_NAME, getStorePhones, buildWhatsAppUrl } from '../data/constants';
import { MessageCircle, ShieldCheck } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const { settings } = useStore();
  const phones = getStorePhones(settings);
  const mainPhone = phones[0];
  const activeStoreName = settings.storeName || STORE_NAME;

  return (
    <div className="bg-slate-50 border-b border-slate-200 text-xs py-2 px-4 text-slate-700">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-medium text-slate-800 line-clamp-1">
            {settings.announcement || `Welcome to ${activeStoreName} – Mobile LCDs, LEDs, OLED Screens & Accessories.`}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-500 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Advance Payment Only: EasyPaisa • JazzCash • Bank Transfer
          </span>
          <a
            href={buildWhatsAppUrl(mainPhone, `Assalam-o-Alaikum ${activeStoreName}! I am inquiring about product availability.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp: <strong className="text-slate-900">{mainPhone}</strong></span>
          </a>
          {phones.length > 1 && (
            <a
              href="#contact-section"
              className="hidden sm:inline text-[10px] font-bold text-amber-800 hover:text-amber-900 underline underline-offset-2"
            >
              +{phones.length - 1} more lines
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
