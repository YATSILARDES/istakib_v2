import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase';
import L from 'leaflet';

// Fix Leaflet Default Icon in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface UserLocation {
    email: string;
    lat: number;
    lng: number;
    userName: string;
    updatedAt: Timestamp;
    userRole: string;
}

const StaffMap: React.FC = () => {
    const [locations, setLocations] = useState<UserLocation[]>([]);

    useEffect(() => {
        // Subscribe to user_locations
        const q = query(collection(db, 'user_locations'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const locs: UserLocation[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.lat && data.lng) {
                    locs.push(data as UserLocation);
                }
            });
            setLocations(locs);
        });

        return () => unsubscribe();
    }, []);

    const formatTimeAgo = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const diff = (Date.now() - date.getTime()) / 1000 / 60; // minutes
        if (diff < 1) return 'Az önce';
        if (diff < 60) return `${Math.floor(diff)} dk önce`;
        return `${Math.floor(diff / 60)} saat önce`;
    };

    // Default center (Turkey or generic)
    const center = { lat: 39.9334, lng: 32.8597 }; // Ankara

    return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700 shadow-xl relative z-10 group">
            {/* Info Overlay */}
            <div className="absolute top-4 right-4 z-[500] bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-2xl flex flex-col gap-1">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif Personel: {locations.length}
                </span>
                {locations.length === 0 && (
                    <span className="text-xs text-slate-400 max-w-[150px]">
                        Henüz konum verisi alınamadı.
                    </span>
                )}
            </div>

            <MapContainer
                center={center}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.map(loc => (
                    <Marker key={loc.email} position={[loc.lat, loc.lng]}>
                        <Popup>
                            <div className="text-sm font-sans">
                                <strong className='block text-blue-600'>{loc.userName}</strong>
                                <span className='text-xs text-slate-500'>Son Görülme: {formatTimeAgo(loc.updatedAt)}</span>
                                <br />
                                <span className='text-xs opacity-70'>{loc.userRole}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default StaffMap;
