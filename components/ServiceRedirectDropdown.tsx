import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, ChevronDown, Wrench } from 'lucide-react';

interface ServiceRedirectDropdownProps {
  isDarkMode: boolean;
}

const ServiceRedirectDropdown: React.FC<ServiceRedirectDropdownProps> = ({ isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const services = [
    { 
      name: 'Demirdöküm', 
      url: 'https://servis.demirdokum.com.tr/was/Login.html',
      iconUrl: 'https://www.google.com/s2/favicons?domain=demirdokum.com.tr&sz=128'
    },
    { 
      name: 'Viessmann', 
      url: 'https://serviskayit.viessmann.com.tr/login-redirect',
      iconUrl: 'https://www.google.com/s2/favicons?domain=viessmann.com.tr&sz=128'
    },
    { 
      name: 'Warmhaus', 
      url: 'https://partnerpro.warmhaus.com.tr',
      iconUrl: 'https://www.google.com/s2/favicons?domain=warmhaus.com.tr&sz=128'
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors shadow-sm text-sm font-medium ${
          isDarkMode 
            ? 'border-white/20 hover:bg-white/10 text-white' 
            : 'border-slate-300 hover:bg-slate-200 text-slate-700'
        }`}
      >
        <Wrench className="w-4 h-4" />
        <span className="hidden md:inline">Servis Yönlendirme</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right z-50 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <div className="p-1.5 space-y-1">
            {services.map((service) => (
              <a
                key={service.name}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={service.iconUrl} alt={service.name} className="w-5 h-5 object-contain bg-white rounded-full p-0.5" />
                  <span>{service.name}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRedirectDropdown;
