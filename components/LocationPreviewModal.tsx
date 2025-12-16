import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, MapPin, Hand } from 'lucide-react';
import InteractiveMap from './InteractiveMap';

interface LocationPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (locationUrl: string) => void;
    initialCoords?: { lat: number; lng: number } | null;
}

const LocationPreviewModal: React.FC<LocationPreviewModalProps> = ({ isOpen, onClose, onConfirm, initialCoords }) => {
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');

    // Modal açıldığında konum al
    useEffect(() => {
        if (isOpen) {
            setMode('auto'); // Reset to auto on open
            setManualCoords(null);

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
            setManualCoords(null);
            setLoading(true);
            setError(null);
        }
    }, [isOpen, initialCoords]);

    // Update manual coords when switching to manual mode
    useEffect(() => {
        if (mode === 'manual' && coords && !manualCoords) {
            setManualCoords(coords);
        }
    }, [mode, coords]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const targetCoords = mode === 'manual' ? manualCoords : coords;

        if (targetCoords) {
            // Google Maps linki oluştur (q parametresi ile)
            const url = `https://www.google.com/maps?q=${targetCoords.lat},${targetCoords.lng}`;
            onConfirm(url);
        }
    };

    const activeCoords = mode === 'manual'
        ? (manualCoords || coords || { lat: 41.0082, lng: 28.9784 }) // Default Istanbul if no coords
        : coords;

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

                {/* Mode Toggles */}
                <div className="px-4 pt-4">
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'auto' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => setMode('auto')}
                        >
                            <Loader2 className={`w-4 h-4 ${mode === 'auto' && loading ? 'animate-spin' : ''}`} />
                            GPS (Otomatik)
                        </button>
                        <button
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => setMode('manual')}
                        >
                            <Hand className="w-4 h-4" />
                            Haritadan Seç (Manuel)
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-0 bg-slate-100 relative min-h-[350px] mt-4">
                    {mode === 'auto' ? (
                        <>
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
                                    {/* OpenStreetMap iframe (Read Only Preview) */}
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight={0}
                                        marginWidth={0}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005}%2C${coords.lat - 0.005}%2C${coords.lng + 0.005}%2C${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                                        className="w-full h-full bg-slate-200"
                                    />
                                    <div className="absolute top-2 right-2 bg-white/90 text-slate-800 text-[10px] px-2 py-1 rounded shadow pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        /* Manual Mode uses InteractiveMap */
                        <InteractiveMap
                            initialCoords={activeCoords || { lat: 41.0082, lng: 28.9784 }}
                            onLocationSelect={(lat, lng) => setManualCoords({ lat, lng })}
                        />
                    )}
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
                        disabled={mode === 'auto' ? (loading || !!error || !coords) : (!manualCoords && !coords)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Check className="w-4 h-4" />
                        {mode === 'manual' ? 'Seçili Konumu Kaydet' : 'Bu Konumu Kullan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPreviewModal;
