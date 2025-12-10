import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, MapPin } from 'lucide-react';

interface LocationPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (locationUrl: string) => void;
    initialCoords?: { lat: number; lng: number } | null;
}

const LocationPreviewModal: React.FC<LocationPreviewModalProps> = ({ isOpen, onClose, onConfirm, initialCoords }) => {
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal açıldığında konum al
    useEffect(() => {
        if (isOpen) {
            if (initialCoords) {
                setCoords(initialCoords);
                setLoading(false);
            } else {
                setLoading(true);
                setError(null);
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setCoords({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        setLoading(false);
                    },
                    (err) => {
                        console.error('Konum alma hatası:', err);
                        setError('Konum alınamadı. Lütfen konum izni verdiğinizden emin olun.');
                        setLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            }
        } else {
            setCoords(null);
            setLoading(true);
            setError(null);
        }
    }, [isOpen, initialCoords]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (coords) {
            // Google Maps linki oluştur (q parametresi ile)
            const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
            onConfirm(url);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        Konum Ekle
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-0 bg-slate-100 relative min-h-[300px]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-3 bg-slate-900 z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>Konum alınıyor...</p>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-3 bg-slate-900 p-6 text-center z-10">
                            <MapPin className="w-12 h-12 opacity-50" />
                            <p>{error}</p>
                            <button
                                onClick={() => {
                                    setLoading(true);
                                    setError(null);
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoading(false); },
                                        (err) => { setError('Konum tekrar alınamadı.'); setLoading(false); }
                                    );
                                }}
                                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white border border-slate-600 transition-colors"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    ) : coords ? (
                        <div className="w-full h-full relative group">
                            {/* OpenStreetMap iframe */}
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005}%2C${coords.lat - 0.005}%2C${coords.lng + 0.005}%2C${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                                className="w-full h-full min-h-[350px] bg-slate-200"
                            />
                            <div className="absolute top-2 right-2 bg-white/90 text-slate-800 text-[10px] px-2 py-1 rounded shadow pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || !!error || !coords}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Check className="w-4 h-4" />
                        Bu Konumu Kullan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPreviewModal;
