
import React from 'react';
import { MapPin } from 'lucide-react';

interface AddressLinkProps {
    address?: string;
    className?: string;
    showIcon?: boolean;
}

const AddressLink: React.FC<AddressLinkProps> = ({ address, className, showIcon = false }) => {
    if (!address) return null;

    // 'q' parametresi genellikle doğrudan pinleme (işaretleme) yapma konusunda 'search/?query=' den daha agresiftir.
    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

    return (
        <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline hover:text-blue-400 cursor-pointer inline-flex items-center gap-1 ${className || ''}`}
            onClick={(e) => e.stopPropagation()}
            title="Google Haritalar'da Göster"
        >
            {showIcon && <MapPin className="w-3 h-3 flex-shrink-0" />}
            {address}
        </a>
    );
};

export default AddressLink;
