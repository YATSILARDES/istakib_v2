import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Phone, Navigation, ExternalLink, MapPin } from 'lucide-react';
import { Task } from '../types';

interface PaintingMultiMapViewProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    extractCoords: (str?: string) => { lat: number; lng: number; formatted: string } | null;
    googleMapsListUrl?: string;
}

// Custom Leaflet DivIcon with Customer Name & Phone Badge
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

// Component to auto-fit bounds of all markers
const FitMapBounds: React.FC<{ coordsList: { lat: number; lng: number }[] }> = ({ coordsList }) => {
    const map = useMap();
    React.useEffect(() => {
        if (coordsList.length === 0) return;
        if (coordsList.length === 1) {
            map.setView([coordsList[0].lat, coordsList[0].lng], 15);
            return;
        }
        const bounds = L.latLngBounds(coordsList.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }, [coordsList, map]);

    return null;
};

export const PaintingMultiMapView: React.FC<PaintingMultiMapViewProps> = ({
    isOpen,
    onClose,
    tasks,
    extractCoords,
    googleMapsListUrl
}) => {
    // Collect tasks that have valid coordinates
    const validTasksWithCoords = useMemo(() => {
        return tasks.map((task, index) => {
            const coords = extractCoords(task.locationCoordinates);
            return {
                task,
                stopNumber: index + 1,
                coords
            };
        }).filter(item => item.coords !== null) as {
            task: Task;
            stopNumber: number;
            coords: { lat: number; lng: number; formatted: string };
        }[];
    }, [tasks, extractCoords]);

    const initialCenter = useMemo(() => {
        if (validTasksWithCoords.length === 0) return { lat: 37.2153, lng: 28.3636 }; // Muğla Menteşe default
        const lats = validTasksWithCoords.map(i => i.coords.lat);
        const lngs = validTasksWithCoords.map(i => i.coords.lng);
        return {
            lat: (Math.min(...lats) + Math.max(...lats)) / 2,
            lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
        };
    }, [validTasksWithCoords]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[280] bg-black/70 backdrop-blur-xs flex flex-col animate-in fade-in duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 text-white p-3.5 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm truncate">Boyacı Müşteri Konumları (Canlı Harita)</h3>
                        <p className="text-[11px] text-amber-100 truncate">
                            {validTasksWithCoords.length} Adres Haritada İşaretli
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {googleMapsListUrl && (
                        <a
                            href={googleMapsListUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs border border-white/30"
                            title="Google Haritalar Uygulamasında Listeyi Aç"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Google Maps Listesi</span>
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative w-full h-full bg-slate-100">
                {validTasksWithCoords.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                        <MapPin className="w-12 h-12 text-slate-300 mb-2" />
                        <h4 className="font-bold text-base text-slate-700">Haritada Gösterilecek Konum Bulunamadı</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                            Seçilen müşteri kartlarında henüz GPS konumu kaydedilmemiş. Kartların içine girerek veya 'Konum Ekle' ile konum ekleyebilirsiniz.
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

                        {validTasksWithCoords.map(({ task, stopNumber, coords }) => {
                            const phoneToCall = task.tenantPhone || task.phone;
                            const customIcon = createCustomMarkerIcon(stopNumber, task.title, phoneToCall);

                            return (
                                <Marker
                                    key={task.id}
                                    position={[coords.lat, coords.lng]}
                                    icon={customIcon}
                                >
                                    <Popup className="custom-popup" closeButton={true}>
                                        <div className="p-1 space-y-1.5 max-w-[240px]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-orange-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full">
                                                    #{stopNumber}
                                                </span>
                                                <h4 className="font-extrabold text-xs text-slate-900 truncate">
                                                    {task.title}
                                                </h4>
                                            </div>

                                            <p className="text-[11px] text-slate-600 leading-snug">
                                                {task.district && <strong>{task.district} · </strong>}
                                                {task.address || 'Adres belirtilmemiş'}
                                            </p>

                                            {task.paintNote && (
                                                <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-[10.5px] text-amber-900">
                                                    <strong>Boyacı Notu:</strong> {task.paintNote}
                                                </div>
                                            )}

                                            <div className="pt-1.5 border-t border-slate-200 flex flex-col gap-1.5">
                                                {phoneToCall && (
                                                    <a
                                                        href={`tel:${phoneToCall}`}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>Ara ({phoneToCall})</span>
                                                    </a>
                                                )}
                                                <a
                                                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}+(${encodeURIComponent(task.title)})`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" />
                                                    <span>Google Haritalar'da Konumu Aç</span>
                                                </a>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        <FitMapBounds coordsList={validTasksWithCoords.map(v => v.coords)} />
                    </MapContainer>
                )}
            </div>

            {/* Bottom Info Bar */}
            <div className="bg-white border-t border-slate-200 p-3 flex items-center justify-between text-xs shrink-0">
                <span className="text-slate-600 font-medium">
                    💡 İpucu: Haritadaki pinlere dokunarak müşteri detayını görebilir ve tek tıkla arayabilirsiniz.
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                    Kapat
                </button>
            </div>
        </div>
    );
};

