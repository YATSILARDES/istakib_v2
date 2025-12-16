import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
        <Marker position={position} />
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
    return (
        <MapContainer
            center={[initialCoords.lat, initialCoords.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker initialCoords={initialCoords} onLocationSelect={onLocationSelect} />
            <MapUpdater center={initialCoords} />
        </MapContainer>
    );
};

export default InteractiveMap;
