import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Map as MapIcon } from 'lucide-react';

// Fix for default marker icons missing in build
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface InteractiveMapProps {
    initialCoords: { lat: number, lng: number };
    onLocationSelect: (lat: number, lng: number) => void;
}

const LocationMarker: React.FC<{ initialCoords: { lat: number, lng: number }, onLocationSelect: (lat: number, lng: number) => void }> = ({ initialCoords, onLocationSelect }) => {
    const [position, setPosition] = useState<{ lat: number, lng: number }>(initialCoords);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    // Update internal position if initialCoords changes (e.g. valid GPS found after load)
    useEffect(() => {
        setPosition(initialCoords);
    }, [initialCoords]);

    return (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const latlng = marker.getLatLng();
                    setPosition(latlng);
                    onLocationSelect(latlng.lat, latlng.lng);
                }
            }}
        />
    );
};

// Helper component to update view when coordinates change
const MapUpdater: React.FC<{ center: { lat: number, lng: number } }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng], map.getZoom());
    }, [center, map]);
    return null;
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ initialCoords, onLocationSelect }) => {
    const [mapType, setMapType] = useState<'streets' | 'hybrid'>('hybrid');

    return (
        <div className="relative w-full h-full">
            {/* Map Type Switcher (Sokak / Uydu) */}
            <div className="absolute top-2 right-2 z-[400] bg-white/95 backdrop-blur-xs p-1 rounded-lg shadow-md border border-slate-300 flex items-center gap-1">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMapType('streets');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                        mapType === 'streets'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Sokak</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMapType('hybrid');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                        mapType === 'hybrid'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Uydu</span>
                </button>
            </div>

            <MapContainer
                center={[initialCoords.lat, initialCoords.lng]}
                zoom={16}
                maxZoom={20}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
                {mapType === 'streets' ? (
                    <TileLayer
                        key="streets"
                        attribution="&copy; Google Maps"
                        url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        maxZoom={20}
                    />
                ) : (
                    <TileLayer
                        key="hybrid"
                        attribution="&copy; Google Maps"
                        url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        maxZoom={20}
                    />
                )}
                <LocationMarker initialCoords={initialCoords} onLocationSelect={onLocationSelect} />
                <MapUpdater center={initialCoords} />
            </MapContainer>
        </div>
    );
};

export default InteractiveMap;
