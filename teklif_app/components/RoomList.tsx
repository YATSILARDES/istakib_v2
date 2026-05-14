
import React, { useMemo, useState, useEffect } from 'react';
import { Room, Radiator } from '../types';
import { RoomCard } from './RoomCard';
import { PlusCircleIcon, BuildingIcon, LockOpenIcon, LockClosedIcon } from './icons';

interface RoomListProps {
    rooms: Room[];
    onAddRoom: () => void;
    onUpdateRoom: (roomId: number, field: keyof Room, value: string | number | boolean | Radiator[]) => void;
    onDeleteRoom: (roomId: number) => void;
    radiatorMeterPrice: number;
    radiatorValvePrice: number;
    onPriceChange: (field: 'radiatorMeterPrice' | 'radiatorValvePrice', value: number) => void;
    // New dynamic props
    radiatorModels?: string[];
    onAddRadiatorModel?: (name: string) => void;
    onDeleteRadiatorModel?: (name: string) => void;
    suggestions?: string[];
    globalPrices?: Record<string, number>; // Add globalPrices prop
}

export const RoomList: React.FC<RoomListProps> = ({
    rooms,
    onAddRoom,
    radiatorMeterPrice,
    radiatorValvePrice,
    onPriceChange,
    radiatorModels,
    onAddRadiatorModel,
    onDeleteRadiatorModel,
    suggestions,
    globalPrices = {},
    ...restProps
}) => {
    const [isEditMode, setIsEditMode] = useState(false);

    // Auto-update prices from Price List based on radiator model
    useEffect(() => {
        if (!globalPrices || Object.keys(globalPrices).length === 0) return;

        // Get the radiator model from the first non-towel-rail room (since all rooms use the same model)
        const firstRoom = rooms.find(r => !r.isTowelRail);
        if (!firstRoom || !firstRoom.radiatorModel) return;

        const model = firstRoom.radiatorModel;

        // Try to get radiator price: "{MODEL} RADYATÖR FİYATI (METRE)"
        const radiatorPriceKey = `${model} RADYATÖR FİYATI (METRE)`;
        if (globalPrices[radiatorPriceKey] !== undefined && globalPrices[radiatorPriceKey] !== radiatorMeterPrice) {
            onPriceChange('radiatorMeterPrice', globalPrices[radiatorPriceKey]);
        }

        // Try to get valve price: "RADYATÖR VANASI (ADET)"
        const valvePriceKey = "RADYATÖR VANASI (ADET)";
        if (globalPrices[valvePriceKey] !== undefined && globalPrices[valvePriceKey] !== radiatorValvePrice) {
            onPriceChange('radiatorValvePrice', globalPrices[valvePriceKey]);
        }
    }, [globalPrices, rooms, radiatorMeterPrice, radiatorValvePrice, onPriceChange]);

    const totalRadiatorMeters = useMemo(() => {
        return rooms.filter(r => !r.isTowelRail).reduce((sum, r) => {
            const roomSum = r.radiators ? r.radiators.reduce((acc, rad) => acc + (rad.length || 0), 0) : 0;
            return sum + roomSum;
        }, 0);
    }, [rooms]);

    const totalValves = useMemo(() => {
        // For each radiator (non-towel), add 2 valves
        const radiatorCount = rooms
            .filter(r => !r.isTowelRail)
            .reduce((sum, r) => sum + (r.radiators ? r.radiators.length : 0), 0);

        // For each towel rail room, add 2 valves
        const towelRailCount = rooms.filter(r => r.isTowelRail).length;

        return (radiatorCount + towelRailCount) * 2;
    }, [rooms]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md print-container">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <div className="flex items-center space-x-2">
                    <BuildingIcon className="w-6 h-6 text-slate-600" />
                    <h2 className="text-xl font-bold text-slate-800">Odalar ve Petekler</h2>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition border ${isEditMode ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                    >
                        {isEditMode ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                        <span>{isEditMode ? 'Düzenleme Açık' : 'Kilitli'}</span>
                    </button>

                    <button
                        onClick={onAddRoom}
                        className="no-print flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 text-sm"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>Oda Ekle</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {rooms.map(room => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        isEditMode={isEditMode}
                        radiatorModels={radiatorModels}
                        onAddRadiatorModel={onAddRadiatorModel}
                        onDeleteRadiatorModel={onDeleteRadiatorModel}
                        {...restProps}
                    />
                ))}
                {rooms.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <p>Henüz oda eklenmedi.</p>
                        <p className="text-sm">Başlamak için 'Oda Ekle' düğmesine tıklayın.</p>
                    </div>
                )}
            </div>

            {/* Radiator & Valve Summary Section */}
            {rooms.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-slate-100 space-y-3">
                    {/* Total Radiator Length */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg">
                        <div className="sm:col-span-6">
                            <span className="font-semibold text-slate-700">Seçilen Toplam Radyatör Metresi</span>
                            <span className="block text-xs text-slate-500">(Havlupanlar hariç)</span>
                        </div>
                        <div className="sm:col-span-2">
                            <div className="flex items-center bg-white border border-slate-300 rounded-md px-3 py-2">
                                <span className="font-bold text-slate-800">{totalRadiatorMeters.toFixed(2)}</span>
                                <span className="ml-1 text-xs text-slate-500">mt</span>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5 sm:hidden">Birim Fiyat</label>
                            <input
                                type="number"
                                value={radiatorMeterPrice === 0 ? '' : radiatorMeterPrice}
                                placeholder="0"
                                onChange={(e) => onPriceChange('radiatorMeterPrice', e.target.valueAsNumber || 0)}
                                className="w-full px-3 py-2 text-right bg-white border border-slate-300 rounded-md focus:ring-blue-500"
                            />
                        </div>
                        <div className="sm:col-span-2 text-right">
                            <span className="block text-[10px] text-slate-500 sm:hidden">Tutar</span>
                            <span className="font-bold text-lg text-slate-800">{(totalRadiatorMeters * radiatorMeterPrice).toLocaleString('tr-TR')} TL</span>
                        </div>
                    </div>

                    {/* Radiator Valves */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg">
                        <div className="sm:col-span-6">
                            <span className="font-semibold text-slate-700">Radyatör Vanası</span>
                            <span className="block text-xs text-slate-500">(Toplam Radyatör ve Havlupan Sayısı * 2)</span>
                        </div>
                        <div className="sm:col-span-2">
                            <div className="flex items-center bg-white border border-slate-300 rounded-md px-3 py-2">
                                <span className="font-bold text-slate-800">{totalValves}</span>
                                <span className="ml-1 text-xs text-slate-500">adet</span>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5 sm:hidden">Birim Fiyat</label>
                            <input
                                type="number"
                                value={radiatorValvePrice === 0 ? '' : radiatorValvePrice}
                                placeholder="0"
                                onChange={(e) => onPriceChange('radiatorValvePrice', e.target.valueAsNumber || 0)}
                                className="w-full px-3 py-2 text-right bg-white border border-slate-300 rounded-md focus:ring-blue-500"
                            />
                        </div>
                        <div className="sm:col-span-2 text-right">
                            <span className="block text-[10px] text-slate-500 sm:hidden">Tutar</span>
                            <span className="font-bold text-lg text-slate-800">{(totalValves * radiatorValvePrice).toLocaleString('tr-TR')} TL</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
