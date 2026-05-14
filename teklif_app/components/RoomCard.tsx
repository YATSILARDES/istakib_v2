
import React, { useState } from 'react';
import { Room, Radiator } from '../types';
import { TOWEL_RAIL_SIZES, RADIATOR_HEIGHT_OPTIONS } from '../constants';
import { TrashIcon, PlusCircleIcon, CheckIcon, XMarkIcon } from './icons';
import { calculateRoomVolume, calculateRadiatorLength } from '../services/calculationService';

interface RoomCardProps {
    room: Room;
    onUpdateRoom: (roomId: number, field: keyof Room, value: string | number | boolean | Radiator[]) => void;
    onDeleteRoom: (roomId: number) => void;
    isEditMode: boolean;
    radiatorModels?: string[];
    onAddRadiatorModel?: (name: string) => void;
    onDeleteRadiatorModel?: (name: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
    room,
    onUpdateRoom,
    onDeleteRoom,
    isEditMode,
    radiatorModels = ['DEMİRDÖKÜM', 'PİYASA'],
    onAddRadiatorModel,
    onDeleteRadiatorModel
}) => {
    const isBathroom = room.name.toLowerCase().includes('banyo');
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [newModelName, setNewModelName] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'number' ? e.target.valueAsNumber || 0 : e.target.value;
        onUpdateRoom(room.id, e.target.name as keyof Room, value);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.name === 'radiatorHeight' ? parseInt(e.target.value, 10) : e.target.value;
        onUpdateRoom(room.id, e.target.name as keyof Room, val);
    };

    const handleTowelRailToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateRoom(room.id, 'isTowelRail', e.target.checked);
    };

    const handleAddRadiator = () => {
        const newRadiator = { id: `rad-${Date.now()}`, length: 0 };
        onUpdateRoom(room.id, 'radiators', [...(room.radiators || []), newRadiator]);
    };

    const handleRadiatorChange = (radiatorId: string, newValue: number) => {
        const updatedRadiators = (room.radiators || []).map(r =>
            r.id === radiatorId ? { ...r, length: newValue } : r
        );
        onUpdateRoom(room.id, 'radiators', updatedRadiators);
    };

    const handleDeleteRadiator = (radiatorId: string) => {
        const updatedRadiators = (room.radiators || []).filter(r => r.id !== radiatorId);
        onUpdateRoom(room.id, 'radiators', updatedRadiators);
    };

    // Inline Model Addition Handlers (like PricingForm)
    const handleStartAddModel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingModel(true);
        setNewModelName('');
    };

    const handleSaveModel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (newModelName.trim() && onAddRadiatorModel) {
            onAddRadiatorModel(newModelName.trim());
        }
        setIsAddingModel(false);
    };

    const handleCancelModel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingModel(false);
    };

    const handleDeleteModelClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (room.radiatorModel && onDeleteRadiatorModel) {
            onDeleteRadiatorModel(room.radiatorModel);
        }
    };

    const volume = calculateRoomVolume(room);
    const radiatorLength = calculateRadiatorLength(room);

    // Fallback for legacy data without radiators array
    const safeRadiators = room.radiators || [];

    return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-grow mr-4">
                    <input
                        type="text"
                        name="name"
                        value={room.name}
                        onChange={handleInputChange}
                        placeholder="Oda Adı (örn. Mutfak)"
                        className="text-lg font-semibold text-slate-700 bg-transparent border-b-2 border-transparent focus:border-blue-500 focus:outline-none w-full"
                    />
                </div>
                {isEditMode && (
                    <button onClick={() => onDeleteRoom(room.id)} className="no-print text-red-500 hover:text-red-700 transition">
                        <TrashIcon />
                    </button>
                )}
            </div>

            {/* Bathroom Specific Toggle */}
            {isBathroom && (
                <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-100 flex items-center space-x-3">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={!!room.isTowelRail}
                                onChange={handleTowelRailToggle}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${room.isTowelRail ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${room.isTowelRail ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-slate-700">
                            {room.isTowelRail ? 'Havlupan' : 'Standart Petek'}
                        </div>
                    </label>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs text-slate-500">Genişlik (m)</label>
                    <input
                        type="number"
                        name="width"
                        value={room.width === 0 ? '' : room.width}
                        placeholder="0"
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md bg-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Uzunluk (m)</label>
                    <input
                        type="number"
                        name="length"
                        value={room.length === 0 ? '' : room.length}
                        placeholder="0"
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md bg-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Yükseklik (m)</label>
                    <input
                        type="number"
                        name="height"
                        value={room.height === 0 ? '' : room.height}
                        placeholder="0"
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md bg-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Hacim (m³)</label>
                    <p className="w-full p-2 font-bold text-lg text-blue-700">{volume.toFixed(2)}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-sm text-slate-600 mb-2">
                    {room.isTowelRail ? 'Havlupan Seçimi' : 'Isı Kaybı & Petek Hesaplaması'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
                    {!room.isTowelRail && (
                        <>
                            <div>
                                <label className="text-xs text-slate-500">Isı Kaybı Katsayısı</label>
                                <input
                                    type="number"
                                    name="heatLossCoefficient"
                                    value={room.heatLossCoefficient}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border rounded-md bg-white"
                                />
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-500 flex justify-between items-center">
                                        <span>Petek Modeli</span>
                                        {isEditMode && !isAddingModel && (
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={handleStartAddModel}
                                                    className="text-blue-600 hover:underline font-semibold text-xs"
                                                >
                                                    + Model Ekle
                                                </button>
                                                {room.radiatorModel && onDeleteRadiatorModel && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDeleteModelClick}
                                                        className="text-red-500 hover:underline font-semibold text-xs"
                                                    >
                                                        Modeli Sil
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </label>

                                    {isAddingModel ? (
                                        <div className="flex items-center gap-1 w-full">
                                            <input
                                                type="text"
                                                value={newModelName}
                                                onChange={(e) => setNewModelName(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveModel(e as any);
                                                    if (e.key === 'Escape') handleCancelModel(e as any);
                                                }}
                                                className="w-full p-2 border-2 border-blue-500 rounded-md bg-white uppercase text-sm"
                                                placeholder="YENİ MODEL İSMİ"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSaveModel}
                                                className="bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600"
                                                title="Kaydet"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelModel}
                                                className="bg-slate-300 text-slate-600 p-2 rounded hover:bg-slate-400"
                                                title="İptal"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <select name="radiatorModel" value={room.radiatorModel} onChange={handleSelectChange} className="w-full p-2 border rounded-md bg-white">
                                            {radiatorModels.map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Yükseklik (mm)</label>
                                    <select name="radiatorHeight" value={room.radiatorHeight || 600} onChange={handleSelectChange} className="w-full p-2 border rounded-md bg-white">
                                        {RADIATOR_HEIGHT_OPTIONS.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Gerekli Petek (m)</label>
                                <p className="w-full p-2 font-bold text-lg text-green-700">{radiatorLength.toFixed(2)}</p>
                            </div>
                        </>
                    )}

                    <div className={room.isTowelRail ? 'col-span-4' : 'col-span-1'}>
                        <label className="text-xs text-slate-500 block mb-1">
                            {room.isTowelRail ? 'Seçilen Havlupan' : 'Seçilen Petekler (m)'}
                        </label>
                        {room.isTowelRail ? (
                            <select
                                name="towelRailSize"
                                value={room.towelRailSize || TOWEL_RAIL_SIZES[0]}
                                onChange={handleSelectChange}
                                className="w-full p-2 border rounded-md bg-white"
                            >
                                {TOWEL_RAIL_SIZES.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-2">
                                {safeRadiators.map((rad, idx) => (
                                    <div key={rad.id} className="flex items-center space-x-1">
                                        <input
                                            type="number"
                                            value={rad.length === 0 ? '' : rad.length}
                                            onChange={(e) => handleRadiatorChange(rad.id, e.target.valueAsNumber || 0)}
                                            className="w-full p-2 border rounded-md bg-white"
                                            placeholder="0"
                                        />
                                        {/* Only allow deleting if there is more than 1 OR allow clearing if locked/edit mode allows */}
                                        {(isEditMode || safeRadiators.length > 1) && (
                                            <button
                                                onClick={() => handleDeleteRadiator(rad.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Peteği Sil"
                                                // Disable delete if it's the only radiator and edit mode is off to prevent empty room
                                                disabled={!isEditMode && safeRadiators.length <= 1}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {/* Always allow adding extra radiator, regardless of edit mode */}
                                <button
                                    onClick={handleAddRadiator}
                                    className="w-full flex items-center justify-center space-x-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded py-1.5 transition"
                                >
                                    <PlusCircleIcon className="w-4 h-4" />
                                    <span>İlave Petek Ekle</span>
                                </button>
                            </div>
                        )}
                        {room.isTowelRail && <span className="text-[10px] text-slate-400 block mt-1">*Havlupanlar toplam radyatör metre hesabına dahil edilmez.</span>}
                    </div>
                </div>

                {/* Towel Rail Pricing Section */}
                {room.isTowelRail && (
                    <div className="mt-4 bg-blue-50/50 p-3 rounded border border-blue-100">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 mb-1">
                            <div className="col-span-4">Havlupan Cinsi</div>
                            <div className="col-span-2">Birim (Adet)</div>
                            <div className="col-span-3">Birim Fiyat</div>
                            <div className="col-span-3 text-right">Tutar</div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                                <span className="text-sm font-semibold text-slate-700">{room.towelRailSize || TOWEL_RAIL_SIZES[0]}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-sm text-slate-700 font-medium pl-2">1</span>
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    name="towelRailPrice"
                                    value={room.towelRailPrice === 0 ? '' : room.towelRailPrice}
                                    placeholder="0"
                                    onChange={handleInputChange}
                                    className="w-full p-1.5 text-sm border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-3 text-right">
                                <span className="text-sm font-bold text-slate-800">{(room.towelRailPrice || 0).toLocaleString('tr-TR')} TL</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
