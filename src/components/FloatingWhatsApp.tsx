import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_NAME, getStorePhones, buildWhatsAppUrl, formatTelLink } from '../data/constants';
import { MessageCircle, Phone, X } from 'lucide-react';

export const FloatingWhatsApp: React.FC = () => {
  const { settings } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const phones = getStorePhones(settings);
  const activeStoreName = settings.storeName || STORE_NAME;
  const inquiryMsg = `Assalam-o-Alaikum ${activeStoreName}! I am inquiring about product availability.`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40">
      {menuOpen && (
        <div className="absolute bottom-16 right-0 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn mb-1">
          <div className="px-4 py-3 bg-emerald-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <div>
                <div className="text-xs font-bold leading-tight">{activeStoreName} Support</div>
                <div className="text-[10px] text-emerald-100">Choose a number to chat or call</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              aria-label="Close WhatsApp menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2">
            {phones.map((phone, idx) => (
              <div
                key={phone}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {idx === 0 ? 'Main Line' : `Line ${idx + 1}`}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 block">
                    {phone}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={formatTelLink(phone)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-800 text-[11px] font-bold transition-colors"
                    title={`Call ${phone}`}
                  >
                    <Phone className="w-3 h-3 text-amber-600" />
                    <span>Call</span>
                  </a>
                  <a
                    href={buildWhatsAppUrl(phone, inquiryMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
                    title={`WhatsApp ${phone}`}
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="p-3.5 sm:p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-2 border-white cursor-pointer"
        aria-label="Open WhatsApp numbers menu"
        title={`Chat with ${activeStoreName} on WhatsApp`}
      >
        {menuOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 fill-current" />}
      </button>
    </div>
  );
};
