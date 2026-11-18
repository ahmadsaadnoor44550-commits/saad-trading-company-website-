import React from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_NAME, getStorePhones, buildWhatsAppUrl, formatTelLink } from '../data/constants';
import { Crown, MessageCircle, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onOpenOwnerPortal: () => void;
  onSelectCategory: (cat: string) => void;
  onOpenTracking: () => void;
  onOpenCustomerAuth: (mode?: 'login' | 'register') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenOwnerPortal,
  onSelectCategory,
  onOpenTracking,
  onOpenCustomerAuth,
}) => {
  const { settings } = useStore();

  const phones = getStorePhones(settings);
  const activeStoreName = settings.storeName || STORE_NAME;
  const categories = settings.categories || ['Mobile LCDs', 'Mobile LEDs', 'OLED Screens', 'Mobile Accessories'];
  const inquiryMsg = `Assalam-o-Alaikum ${activeStoreName}! I am inquiring about mobile displays & accessories.`;

  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand & All 3 Contact Numbers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
                <Crown className="w-4 h-4" />
              </div>
              <span className="font-empire text-lg font-black text-slate-900 tracking-wide">
                {activeStoreName}
              </span>
            </div>

            <p className="text-slate-500 leading-relaxed text-xs">
              {settings.aboutText ||
                `${activeStoreName} provides tested Mobile LCDs, LEDs, OLED Screens, and mobile accessories across Pakistan. Order directly with personalized WhatsApp verification.`}
            </p>

            {/* All 3 Contact Numbers with Call & WhatsApp buttons */}
            <div className="pt-1 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Call & WhatsApp Support
              </span>
              <div className="space-y-1.5">
                {phones.map((phone) => (
                  <div
                    key={phone}
                    className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {phone}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={formatTelLink(phone)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 text-[10px] font-bold transition-colors"
                      >
                        <Phone className="w-3 h-3 text-amber-600" />
                        <span>Call</span>
                      </a>
                      <a
                        href={buildWhatsAppUrl(phone, inquiryMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1 space-y-1.5 text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{settings.contactEmail || 'ahmadsaadnoor44550@gmail.com'}</span>
              </div>
              {settings.businessAddress && (
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings.businessAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              Business Categories
            </h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      onSelectCategory(cat);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-amber-700 transition-colors text-left"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              Customer Services
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-amber-700 transition-colors"
                >
                  Track Order Status
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenCustomerAuth('register')}
                  className="hover:text-amber-700 transition-colors"
                >
                  Create Customer Account
                </button>
              </li>
              <li>
                <a
                  href="#contact-section"
                  className="hover:text-emerald-700 transition-colors"
                >
                  WhatsApp Inquiries & Orders (3 Lines)
                </a>
              </li>
              <li>
                <span className="text-slate-500">Nationwide TCS / Leopards Courier</span>
              </li>
            </ul>
          </div>

          {/* Payment info */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              Payment Methods
            </h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Advance payments are verified directly on WhatsApp with the seller. We support:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                EasyPaisa
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                JazzCash
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center col-span-2">
                Bank Transfer (Any Pakistani Bank)
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {activeStoreName}. All Rights Reserved.
          </span>
          <div className="flex items-center gap-3">
            <span>Prices in Pakistani Rupees (PKR)</span>
            <span className="text-slate-300">•</span>
            <button 
              onClick={onOpenOwnerPortal}
              className="text-slate-500 hover:text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Access Owner Dashboard to add & edit products"
            >
              <Crown className="w-3 h-3 text-amber-600" />
              <span>Owner Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
