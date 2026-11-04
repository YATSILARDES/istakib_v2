import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone, Navigation, ChevronUp, ChevronDown, List, CheckCircle2, X } from 'lucide-react';

export interface PublicMapCustomer {
    id: string;
    n: string; // name
    p: string; // phone
    a: string; // address
    d?: string; // district
    m?: string; // painter note
    lat: number;
    lng: number;
    isDone?: boolean;
}

export interface DisplayCustomer extends PublicMapCustomer {
    displayLat: number;
    displayLng: number;
    clusterSize: number;
    clusterIndex: number;
}

export interface PublicPaintingMapViewProps {
    initialCustomers?: PublicMapCustomer[];
    onClose?: () => void;
    onToggleTaskDone?: (customerId: string, isDone: boolean) => void;
}

// Custom Marker Icon with Permanent Name & Phone Badge + Active/Done Styling
const createCustomMarkerIcon = (
    stopNumber: number,
    title: string,
    phone?: string,
    isDone?: boolean,
    isFocused?: boolean
) => {
    const safeTitle = (title || 'Müşteri').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safePhone = phone ? phone.replace(/</g, '&lt;') : '';

    const bgGradient = isDone
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        : isFocused
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';

    const stemColor = isDone ? '#059669' : (isFocused ? '#d97706' : '#ea580c');
    const dotColor = isDone ? '#047857' : (isFocused ? '#b45309' : '#c2410c');

    const focusStyles = isFocused
        ? 'box-shadow: 0 0 0 3px #fef08a, 0 6px 20px rgba(0,0,0,0.5); transform: scale(1.06);'
        : 'box-shadow: 0 4px 14px rgba(0,0,0,0.35);';

    return L.divIcon({
        className: 'custom-paint-pin',
        html: `
            <div style="position: relative; transform: translate(-50%, -100%); pointer-events: auto; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s ease;">
                <div style="background: ${bgGradient}; color: white; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11.5px; white-space: nowrap; ${focusStyles} border: 2px solid #ffffff; display: flex; align-items: center; gap: 5px; font-family: system-ui, -apple-system, sans-serif;">
                    <span style="background: white; color: ${stemColor}; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; shrink: 0;">${isDone ? '✓' : stopNumber}</span>
                    <span style="letter-spacing: -0.2px;">${safeTitle}</span>
                    ${safePhone ? `<span style="opacity: 0.9; font-weight: 600; font-size: 10px; background: rgba(0,0,0,0.25); padding: 1px 5px; border-radius: 6px;">📞 ${safePhone}</span>` : ''}
                </div>
                <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid ${stemColor}; margin-top: -1px;"></div>
                <div style="width: 8px; height: 8px; background: ${dotColor}; border: 1.5px solid white; border-radius: 50%; margin-top: -3px; box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
};

// Component to auto-fit bounds or pan to target
const MapController: React.FC<{
    customers: DisplayCustomer[];
    focusedCustomer: PublicMapCustomer | null;
    markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}> = ({ customers, focusedCustomer, markerRefs }) => {
    const map = useMap();
    const hasFittedRef = useRef<boolean>(false);
    const prevFocusedIdRef = useRef<string | null>(null);

    // Initial bounds fit: only once on mount or when customer count changes
    useEffect(() => {
        if (customers.length === 0) return;
        if (!hasFittedRef.current) {
            hasFittedRef.current = true;
            if (customers.length === 1) {
                map.setView([customers[0].displayLat, customers[0].displayLng], 15);
            } else {
                const bounds = L.latLngBounds(customers.map(c => [c.displayLat, c.displayLng]));
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
            }
        }
    }, [customers.length, map]);

    // Handle focused customer flyTo & popup open
    useEffect(() => {
        if (!focusedCustomer) {
            prevFocusedIdRef.current = null;
            return;
        }

        if (prevFocusedIdRef.current === focusedCustomer.id) {
            return;
        }
        prevFocusedIdRef.current = focusedCustomer.id;

        const display = customers.find(c => c.id === focusedCustomer.id);
        const targetLat = display ? display.displayLat : focusedCustomer.lat;
        const targetLng = display ? display.displayLng : focusedCustomer.lng;

        map.flyTo([targetLat, targetLng], 17, { duration: 0.8 });

        const timer = setTimeout(() => {
            const marker = markerRefs.current[focusedCustomer.id];
            if (marker && !marker.isPopupOpen()) {
                marker.openPopup();
            }
        }, 850);

        return () => clearTimeout(timer);
    }, [focusedCustomer?.id, map, customers, markerRefs]);

    return null;
};

export const PublicPaintingMapView: React.FC<PublicPaintingMapViewProps> = ({ initialCustomers, onClose, onToggleTaskDone }) => {
    const [customers, setCustomers] = useState<PublicMapCustomer[]>(initialCustomers || []);
    const [focusedCustomer, setFocusedCustomer] = useState<PublicMapCustomer | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
    const markerRefs = useRef<Record<string, L.Marker | null>>({});

    const [completedIds, setCompletedIds] = useState<string[]>(() => {
        const fromProps = (initialCustomers || []).filter(c => c.isDone).map(c => c.id);
        try {
            const saved = localStorage.getItem('boyaci_completed_tasks');
            const savedIds: string[] = saved ? JSON.parse(saved) : [];
            return Array.from(new Set([...fromProps, ...savedIds]));
        } catch {
            return fromProps;
        }
    });

    const toggleCompleted = (id: string) => {
        setCompletedIds(prev => {
            const isCurrentlyDone = prev.includes(id);
            const next = isCurrentlyDone ? prev.filter(x => x !== id) : [...prev, id];
            try {
                localStorage.setItem('boyaci_completed_tasks', JSON.stringify(next));
            } catch {}
            if (onToggleTaskDone) {
                onToggleTaskDone(id, !isCurrentlyDone);
            }
            return next;
        });
    };

    // Parse data from URL query parameter or initialCustomers prop
    useEffect(() => {
        if (initialCustomers && initialCustomers.length > 0) {
            setCustomers(initialCustomers);
            return;
        }
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
    }, [initialCustomers]);

    // Calculate intelligent offset/staggering for overlapping & close markers
    const displayCustomers = useMemo<DisplayCustomer[]>(() => {
        if (!customers || customers.length === 0) return [];

        const clusters: PublicMapCustomer[][] = [];
        const visited = new Set<string>();

        // Distance threshold: ~32 meters (roughly 0.00030 degrees)
        const THRESHOLD = 0.00030;

        for (let i = 0; i < customers.length; i++) {
            const c1 = customers[i];
            const id1 = c1.id || String(i);
            if (visited.has(id1)) continue;

            const cluster: PublicMapCustomer[] = [c1];
            visited.add(id1);

            for (let j = i + 1; j < customers.length; j++) {
                const c2 = customers[j];
                const id2 = c2.id || String(j);
                if (visited.has(id2)) continue;

                const dLat = c1.lat - c2.lat;
                const dLng = (c1.lng - c2.lng) * Math.cos((c1.lat * Math.PI) / 180);
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                if (dist < THRESHOLD) {
                    cluster.push(c2);
                    visited.add(id2);
                }
            }
            clusters.push(cluster);
        }

        const mapById = new Map<string, DisplayCustomer>();

        clusters.forEach(cluster => {
            const count = cluster.length;
            if (count === 1) {
                const c = cluster[0];
                mapById.set(c.id, {
                    ...c,
                    displayLat: c.lat,
                    displayLng: c.lng,
                    clusterSize: 1,
                    clusterIndex: 0
                });
            } else {
                // Vertical & diagonal staggering
                // Height of badge is ~32px. In leaflet zoom 16/17, ~0.00028 lat provides ~45px clean separation.
                const latStep = 0.00028;
                const lngStep = 0.00015;
                const centerLat = cluster.reduce((sum, c) => sum + c.lat, 0) / count;
                const centerLng = cluster.reduce((sum, c) => sum + c.lng, 0) / count;

                cluster.forEach((c, idx) => {
                    const offsetFactor = idx - (count - 1) / 2;
                    const lngDirection = (idx % 2 === 0 ? -1 : 1) * (count > 2 ? 1 : 0.6);

                    const displayLat = centerLat + (offsetFactor * latStep);
                    const displayLng = centerLng + (lngDirection * lngStep);

                    mapById.set(c.id, {
                        ...c,
                        displayLat,
                        displayLng,
                        clusterSize: count,
                        clusterIndex: idx
                    });
                });
            }
        });

        // Maintain original array ordering
        return customers.map((c, idx) => mapById.get(c.id) || {
            ...c,
            displayLat: c.lat,
            displayLng: c.lng,
            clusterSize: 1,
            clusterIndex: 0
        });
    }, [customers]);

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
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs ml-1"
                            title="Kapat"
                        >
                            <X className="w-4 h-4" />
                            <span>Kapat</span>
                        </button>
                    )}
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

                        {/* Connecting dashed guide lines & anchor dots for clustered/offset markers */}
                        {displayCustomers.map((c, idx) => {
                            if (c.clusterSize <= 1) return null;
                            return (
                                <React.Fragment key={`cluster-guide-${c.id || idx}`}>
                                    <Polyline
                                        positions={[
                                            [c.lat, c.lng],
                                            [c.displayLat, c.displayLng]
                                        ]}
                                        pathOptions={{
                                            color: '#ea580c',
                                            weight: 2,
                                            dashArray: '4, 4',
                                            opacity: 0.7
                                        }}
                                    />
                                    <CircleMarker
                                        center={[c.lat, c.lng]}
                                        radius={4}
                                        pathOptions={{
                                            fillColor: '#ea580c',
                                            fillOpacity: 0.9,
                                            color: '#ffffff',
                                            weight: 1.5
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Marker Badges */}
                        {displayCustomers.map((c, idx) => {
                            const isDone = completedIds.includes(c.id);
                            const isFocused = focusedCustomer?.id === c.id;
                            const customIcon = createCustomMarkerIcon(idx + 1, c.n, c.p, isDone, isFocused);

                            return (
                                <Marker
                                    key={c.id || idx}
                                    ref={(ref) => { markerRefs.current[c.id] = ref; }}
                                    position={[c.displayLat, c.displayLng]}
                                    icon={customIcon}
                                    zIndexOffset={isFocused ? 10000 : (isDone ? 50 : 200 + idx)}
                                    eventHandlers={{
                                        click: () => {
                                            setFocusedCustomer(c);
                                        },
                                        popupclose: () => {
                                            setFocusedCustomer(prev => (prev?.id === c.id ? null : prev));
                                        }
                                    }}
                                >
                                    <Popup
                                        className="custom-popup"
                                        closeButton={true}
                                        eventHandlers={{
                                            remove: () => {
                                                setFocusedCustomer(prev => (prev?.id === c.id ? null : prev));
                                            }
                                        }}
                                    >
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

                        <MapController
                            customers={displayCustomers}
                            focusedCustomer={focusedCustomer}
                            markerRefs={markerRefs}
                        />
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
                                            <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-1">
                                                <span className={`w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                                                    isDone ? 'bg-emerald-600' : 'bg-orange-600'
                                                }`}>
                                                    {isDone ? '✓' : idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-black text-xs uppercase leading-tight ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                        {c.n}
                                                    </h4>
                                                    <p className="text-[11.5px] text-slate-600 mt-1 leading-snug break-words">
                                                        {c.d && <strong className="text-slate-800">{c.d} · </strong>}
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
