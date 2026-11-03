import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone, Navigation, ChevronUp, ChevronDown, List, Layers, CheckCircle2 } from 'lucide-react';

export interface PublicMapCustomer {
    id: string;
    n: string; // name
    p: string; // phone
    a: string; // address
    d?: string; // district
    m?: string; // painter note
    lat: number;
    lng: number;
}

// Custom Marker Icon with Permanent Name & Phone Badge
const createCustomMarkerIcon = (stopNumber: number, title: string, phone?: string) => {
    const safeTitle = (title || 'Müşteri').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safePhone = phone ? phone.replace(/</g, '&lt;') : '';

    return L.divIcon({
        className: 'custom-paint-pin',
        html: `
            <div style="position: relative; transform: translate(-50%, -100%); pointer-events: auto; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11.5px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2px solid #ffffff; display: flex; align-items: center; gap: 5px; font-family: system-ui, -apple-system, sans-serif;">
                    <span style="background: white; color: #ea580c; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; shrink: 0;">${stopNumber}</span>
                    <span style="letter-spacing: -0.2px;">${safeTitle}</span>
                    ${safePhone ? `<span style="opacity: 0.9; font-weight: 600; font-size: 10px; background: rgba(0,0,0,0.25); padding: 1px 5px; border-radius: 6px;">📞 ${safePhone}</span>` : ''}
                </div>
                <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #ea580c; margin-top: -1px;"></div>
                <div style="width: 8px; height: 8px; background: #c2410c; border: 1.5px solid white; border-radius: 50%; margin-top: -3px; box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
};

// Component to auto-fit bounds or pan to target
const MapController: React.FC<{
    customers: PublicMapCustomer[];
    focusedCustomer: PublicMapCustomer | null;
}> = ({ customers, focusedCustomer }) => {
    const map = useMap();

    useEffect(() => {
        if (focusedCustomer) {
            map.flyTo([focusedCustomer.lat, focusedCustomer.lng], 16, { duration: 1.2 });
            return;
        }

        if (customers.length === 0) return;
        if (customers.length === 1) {
            map.setView([customers[0].lat, customers[0].lng], 15);
            return;
        }

        const bounds = L.latLngBounds(customers.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }, [customers, focusedCustomer, map]);

    return null;
};

export const PublicPaintingMapView: React.FC = () => {
    const [customers, setCustomers] = useState<PublicMapCustomer[]>([]);
    const [focusedCustomer, setFocusedCustomer] = useState<PublicMapCustomer | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
    const [completedIds, setCompletedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('boyaci_completed_tasks');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const toggleCompleted = (id: string) => {
        setCompletedIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            try {
                localStorage.setItem('boyaci_completed_tasks', JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    // Parse data from URL query parameter
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const dataParam = params.get('data');
            if (dataParam) {
                const binString = atob(dataParam);
                const bytes = new Uint8Array(binString.length);
                for (let i = 0; i < binString.length; i++) {
                    bytes[i] = binString.charCodeAt(i);
                }
                const jsonStr = new TextDecoder().decode(bytes);
                const parsed = JSON.parse(jsonStr) as PublicMapCustomer[];
                if (Array.isArray(parsed)) {
                    setCustomers(parsed);
                }
            }
        } catch (e) {
            console.error('Failed to parse public map data from url', e);
        }
    }, []);

    const initialCenter = useMemo(() => {
        if (customers.length === 0) return { lat: 37.2153, lng: 28.3636 };
        const lats = customers.map(c => c.lat);
        const lngs = customers.map(c => c.lng);
        return {
            lat: (Math.min(...lats) + Math.max(...lats)) / 2,
            lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
        };
    }, [customers]);

    const todayStr = useMemo(() => {
        return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    }, []);

    return (
        <div className="fixed inset-0 w-screen h-screen bg-slate-900 flex flex-col overflow-hidden font-sans select-none">
            {/* Top Bar */}
            <header className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3 shadow-lg z-[1000] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs">
                        <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-black text-sm tracking-tight truncate">
                            Boyacı Günlük İş & Konum Haritası
                        </h1>
                        <p className="text-[11px] text-amber-100 truncate font-medium">
                            {todayStr} · <strong>{customers.length}</strong> Müşteri Haritada
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(prev => !prev)}
                        className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                    >
                        <List className="w-4 h-4" />
                        <span className="text-[11px]">{isDrawerOpen ? 'Haritayı Büyüt' : 'Listeyi Aç'}</span>
                    </button>
                </div>
            </header>

            {/* Map Area */}
            <main className="flex-1 relative w-full h-full bg-slate-100">
                {customers.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 z-10 bg-white">
                        <MapPin className="w-16 h-16 text-orange-400 mb-3 animate-bounce" />
                        <h2 className="font-black text-lg text-slate-800">Haritada Konum Bulunamadı</h2>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                            Bağlantıdaki konum verisi okunamadı veya henüz hiçbir müşteri konumu eklenmemiş. Lütfen yöneticinizden güncel listeyi tekrar isteyin.
                        </p>
                    </div>
                ) : (
                    <MapContainer
                        center={[initialCenter.lat, initialCenter.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%', zIndex: 1 }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {customers.map((c, idx) => {
                            const isDone = completedIds.includes(c.id);
                            const customIcon = createCustomMarkerIcon(idx + 1, (isDone ? '✓ ' : '') + c.n, c.p);

                            return (
                                <Marker
                                    key={c.id || idx}
                                    position={[c.lat, c.lng]}
                                    icon={customIcon}
                                >
                                    <Popup className="custom-popup" closeButton={true}>
                                        <div className="p-1 space-y-2 max-w-[260px] text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-orange-600 text-white font-black text-[10.5px] px-2 py-0.5 rounded-full shrink-0">
                                                    #{idx + 1}
                                                </span>
                                                <h3 className="font-extrabold text-[13px] text-slate-900 truncate">
                                                    {c.n}
                                                </h3>
                                            </div>

                                            <p className="text-[11.5px] text-slate-600 leading-snug">
                                                {c.d && <strong className="text-slate-800">{c.d} · </strong>}
                                                {c.a || 'Adres belirtilmemiş'}
                                            </p>

                                            {c.m && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-950">
                                                    <strong className="text-amber-800">Boyacı Notu:</strong> {c.m}
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                                                {c.p && (
                                                    <a
                                                        href={`tel:${c.p}`}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>Müşteriyi Ara ({c.p})</span>
                                                    </a>
                                                )}
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" />
                                                    <span>Google Haritalar ile Yol Tarifi Al</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCompleted(c.id)}
                                                    className={`text-xs font-bold py-1.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                                                        isDone 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>{isDone ? 'Boya Tamamlandı (İptal Et)' : 'Boyayı Tamamlandı İşaretle'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        <MapController customers={customers} focusedCustomer={focusedCustomer} />
                    </MapContainer>
                )}
            </main>

            {/* Bottom Collapsible Customer Drawer / List */}
            {customers.length > 0 && (
                <div
                    className={`bg-white border-t border-slate-200 shadow-2xl z-[1000] flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
                        isDrawerOpen ? 'max-h-[42vh]' : 'max-h-[50px]'
                    }`}
                >
                    {/* Drawer Header Toggle Bar */}
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(prev => !prev)}
                        className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between border-b border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                            <span>Müşteri & Adres Listesi ({customers.length} Müşteri)</span>
                            {completedIds.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {completedIds.length} / {customers.length} Bitti
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                            <span className="text-[11px] font-medium">{isDrawerOpen ? 'Küçült' : 'Listeyi Aç'}</span>
                            {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                    </button>

                    {/* Scrollable Customer Cards */}
                    {isDrawerOpen && (
                        <div className="p-3 overflow-y-auto space-y-2 flex-1 custom-scrollbar bg-slate-100/60">
                            {customers.map((c, idx) => {
                                const isDone = completedIds.includes(c.id);
                                return (
                                    <div
                                        key={c.id || idx}
                                        onClick={() => setFocusedCustomer(c)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                            isDone 
                                                ? 'bg-emerald-50/70 border-emerald-300 opacity-80' 
                                                : 'bg-white border-slate-200 hover:border-orange-300 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                                    isDone ? 'bg-emerald-600' : 'bg-orange-600'
                                                }`}>
                                                    {isDone ? '✓' : idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className={`font-black text-xs uppercase truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                        {c.n}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 truncate">
                                                        {c.d && <strong className="text-slate-700">{c.d} · </strong>}
                                                        {c.a || 'Adres yok'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Each Customer */}
                                            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                {c.p && (
                                                    <a
                                                        href={`tel:${c.p}`}
                                                        className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center active:scale-95 transition-all shadow-2xs"
                                                        title="Telefonla Ara"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                                                    title="Yol Tarifi Al"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" />
                                                    <span>Git</span>
                                                </a>
                                            </div>
                                        </div>

                                        {c.m && (
                                            <div className="mt-2 text-[10.5px] bg-amber-50 text-amber-900 border border-amber-200 rounded px-2 py-1">
                                                <strong>Not:</strong> {c.m}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

