import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LockOpenIcon, LockClosedIcon, PlusCircleIcon, TrashIcon } from './icons';
import { ColumnData, ColumnItem } from '../types';
import { SuggestionInput } from './SuggestionInput';

interface ColumnCalculationProps {
    globalPrices?: Record<string, number>;
    data?: ColumnData;
    onChange?: (data: ColumnData) => void;
}

export const ColumnCalculation: React.FC<ColumnCalculationProps> = ({ globalPrices = {}, data, onChange }) => {
    const [localData, setLocalData] = useState<ColumnData>({
        customerName: '', phone: '', address: '', date: new Date().toLocaleDateString('tr-TR'), description: '', items: [], laborCost: 0, projectCost: 0, paintCost: 0, safetyCost: 0, totalCost: 0, isIncludedInProposal: false, agreedColumnPrice: 0
    });

    const columnData = data || localData;
    const updateData = (newData: ColumnData) => {
        if (onChange) onChange(newData);
        else setLocalData(newData);
    };

    const [isEditMode, setIsEditMode] = useState(false);
    const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (Object.keys(globalPrices).length === 0) return;
        const newItems = columnData.items.map(item => {
            if (globalPrices[item.name] !== undefined && globalPrices[item.name] !== item.price) {
                return { ...item, price: globalPrices[item.name] };
            }
            return item;
        });
        if (JSON.stringify(newItems) !== JSON.stringify(columnData.items)) {
            updateData({ ...columnData, items: newItems });
        }
    }, [globalPrices]);

    useEffect(() => {
        const totalMaterialCost = columnData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        if (totalMaterialCost !== columnData.totalCost) {
            updateData({ ...columnData, totalCost: totalMaterialCost });
        }
    }, [columnData.items]);

    const handleInfoChange = (field: keyof ColumnData, value: string) => {
        updateData({ ...columnData, [field]: value });
    };

    const handleItemChange = (id: string, field: keyof ColumnItem, value: any) => {
        updateData({
            ...columnData,
            items: columnData.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        });
    };

    const handleOptionChange = (id: string, optionName: string) => {
        const item = columnData.items.find(i => i.id === id);
        if (item && item.options) {
            const selectedOption = item.options.find(o => o.name === optionName);
            if (selectedOption) {
                updateData({
                    ...columnData,
                    items: columnData.items.map(i => i.id === id ? { ...i, name: selectedOption.name, price: selectedOption.price } : i)
                });
            }
        }
    };

    const handleAddItem = (group: string = 'DİĞER') => {
        const newItem: ColumnItem = {
            id: `col-${Date.now()}`,
            group: group,
            name: 'YENİ MALZEME',
            unit: 'ADET',
            quantity: 0,
            price: 0
        };
        updateData({ ...columnData, items: [...columnData.items, newItem] });
    };

    const handleDeleteItem = (id: string) => {
        updateData({ ...columnData, items: columnData.items.filter(i => i.id !== id) });
    };

    const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextInput = quantityRefs.current[index + 1];
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevInput = quantityRefs.current[index - 1];
            if (prevInput) {
                prevInput.focus();
                prevInput.select();
            }
        }
    };

    // Group items for rendering
    const groupedItems = useMemo(() => {
        const groups: { [key: string]: ColumnItem[] } = {};
        columnData.items.forEach(item => {
            if (!groups[item.group]) groups[item.group] = [];
            groups[item.group].push(item);
        });
        return groups;
    }, [columnData.items]);

    // Calculate pipe totals
    const steelPipeTotal = columnData.items
        .filter(i => i.group === 'DG BORUSU' || i.name.includes('DOĞALGAZ BORUSU'))
        .reduce((sum, i) => sum + i.quantity, 0);

    const pePipeTotal = columnData.items
        .filter(i => i.name.includes('PE KAPLI'))
        .reduce((sum, i) => sum + i.quantity, 0);

    let globalRowIndex = 0;

    return (
        <div className="bg-white p-4 rounded-lg shadow-md font-sans text-black">
            {/* Control Bar */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
                <div className="flex items-center space-x-2">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={columnData.isIncludedInProposal}
                                onChange={(e) => updateData({ ...columnData, isIncludedInProposal: e.target.checked })}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${columnData.isIncludedInProposal ? 'bg-green-600' : 'bg-gray-400'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${columnData.isIncludedInProposal ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-bold text-gray-800">
                            {columnData.isIncludedInProposal ? 'BU HESABI TEKLİFE DAHİL ET' : 'TEKLİFE DAHİL DEĞİL'}
                        </div>
                    </label>
                </div>
                <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition border ${isEditMode ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                >
                    {isEditMode ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                    <span>{isEditMode ? 'Düzenleme Açık' : 'Kilitli'}</span>
                </button>
            </div>

            <div className="text-center font-bold text-lg mb-2 text-black">KOLON TESİSATI MALİYET RAPORU (KMR)</div>

            {/* Header Info */}
            <div className="border-2 border-gray-500 mb-2 bg-gray-100">
                <div className="grid grid-cols-3 border-b border-gray-500 bg-gray-300 text-black">
                    <div className="p-1 border-r border-gray-500 text-center text-xs font-bold">AD-SOYAD / ÜNVAN</div>
                    <div className="p-1 border-r border-gray-500 text-center text-xs font-bold">TEL</div>
                    <div className="p-1 text-center text-xs font-bold">ADRES</div>
                </div>
                <div className="grid grid-cols-3 bg-white">
                    <div className="p-1 border-r border-gray-500">
                        <input type="text" value={columnData.customerName} onChange={(e) => handleInfoChange('customerName', e.target.value)} className="w-full text-center text-sm text-black bg-transparent outline-none" placeholder="-" />
                    </div>
                    <div className="p-1 border-r border-gray-500">
                        <input type="text" value={columnData.phone} onChange={(e) => handleInfoChange('phone', e.target.value)} className="w-full text-center text-sm text-black bg-transparent outline-none" placeholder="-" />
                    </div>
                    <div className="p-1">
                        <input type="text" value={columnData.address} onChange={(e) => handleInfoChange('address', e.target.value)} className="w-full text-center text-sm text-black bg-transparent outline-none" placeholder="-" />
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-500 text-xs">
                    <thead>
                        <tr className="bg-gray-400 text-black">
                            <th className="border border-gray-500 p-1 w-8">SIRA NO</th>
                            <th className="border border-gray-500 p-1 w-8">GRUP</th>
                            <th className="border border-gray-500 p-1 text-left pl-2">MALZEMENİN CİNSİ</th>
                            <th className="border border-gray-500 p-1 w-16">MİKTAR</th>
                            <th className="border border-gray-500 p-1 w-12">BİRİM</th>
                            <th className="border border-gray-500 p-1 w-20">BİRİM FİYAT</th>
                            <th className="border border-gray-500 p-1 w-24">TUTAR</th>
                            {isEditMode && <th className="border border-gray-500 p-1 w-8">SİL</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedItems).map(([groupName, itemsRaw], groupIndex) => {
                            // Fix for type inference issue with Object.entries on indexed types
                            const items = itemsRaw as ColumnItem[];
                            const isEvenGroup = groupIndex % 2 === 0;
                            const groupBgClass = isEvenGroup ? 'bg-gray-100' : 'bg-gray-300';

                            return (
                                <React.Fragment key={groupName}>
                                    {items.map((item, itemIndex) => {
                                        const currentRowIndex = globalRowIndex++;
                                        return (
                                            <tr key={item.id} className={`${groupBgClass} hover:bg-gray-200 transition-colors`}>
                                                {itemIndex === 0 && (
                                                    <>
                                                        <td className="border border-gray-500 text-center font-bold text-black" rowSpan={items.length}>
                                                            {groupIndex + 1}
                                                        </td>
                                                        <td className={`border border-gray-500 text-center font-bold text-[9px] text-black ${isEvenGroup ? 'bg-gray-200' : 'bg-gray-400'}`} rowSpan={items.length}>
                                                            <div className="flex justify-center items-center h-full w-full">
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        value={item.group}
                                                                        onChange={(e) => handleItemChange(item.id, 'group', e.target.value.toUpperCase())}
                                                                        className="w-full h-full bg-transparent text-center outline-none"
                                                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{groupName}</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="border border-gray-500 p-0.5 pl-2">
                                                    {item.options ? (
                                                        <select
                                                            value={item.name}
                                                            onChange={(e) => handleOptionChange(item.id, e.target.value)}
                                                            className="w-full bg-transparent outline-none font-medium text-black"
                                                        >
                                                            {item.options.map(opt => (
                                                                <option key={opt.name} value={opt.name}>{opt.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        isEditMode ? (
                                                            <SuggestionInput
                                                                value={item.name}
                                                                onChange={(val) => handleItemChange(item.id, 'name', val.toUpperCase())}
                                                                onSelect={(val) => {
                                                                    const price = globalPrices[val];
                                                                    // Update both name and price in a single state update
                                                                    updateData({
                                                                        ...columnData,
                                                                        items: columnData.items.map(i =>
                                                                            i.id === item.id
                                                                                ? { ...i, name: val.toUpperCase(), price: price !== undefined ? price : i.price }
                                                                                : i
                                                                        )
                                                                    });
                                                                }}
                                                                suggestions={Object.keys(globalPrices)}
                                                                className="w-full bg-transparent outline-none font-medium text-black"
                                                            />
                                                        ) : (
                                                            <span className="font-medium text-black">{item.name}</span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="border border-gray-500 p-0.5">
                                                    <input
                                                        ref={(el) => { quantityRefs.current[currentRowIndex] = el; }}
                                                        type="number"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.valueAsNumber || 0)}
                                                        onKeyDown={(e) => handleQuantityKeyDown(e, currentRowIndex)}
                                                        className="w-full text-center bg-white border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-black font-bold h-6"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="border border-gray-500 text-center text-black">{item.unit}</td>
                                                <td className="border border-gray-500 text-right pr-1 text-black">
                                                    {isEditMode ? (
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(item.id, 'price', e.target.valueAsNumber || 0)}
                                                            className="w-full text-right bg-transparent outline-none"
                                                        />
                                                    ) : (
                                                        item.price.toFixed(2)
                                                    )}
                                                </td>
                                                <td className="border border-gray-500 text-right pr-1 font-bold text-black">
                                                    {(item.quantity * item.price).toFixed(2)}
                                                </td>
                                                {isEditMode && (
                                                    <td className="border border-gray-500 text-center">
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-400 text-black font-bold">
                            <td colSpan={6} className="border border-gray-500 text-right pr-2 p-1">TOPLAM:</td>
                            <td className="border border-gray-500 text-right pr-1 p-1 text-sm">{columnData.totalCost.toLocaleString('tr-TR')} ₺</td>
                            {isEditMode && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Add Item Button */}
            <div className="mt-2 text-right">
                <button
                    onClick={() => handleAddItem()}
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold text-xs"
                >
                    <PlusCircleIcon className="w-4 h-4" />
                    <span>Yeni Malzeme Ekle</span>
                </button>
            </div>

            {/* Bottom Calculation Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: Extra Info */}
                <div className="bg-gray-200 border border-gray-400 rounded-sm p-2">
                    <h4 className="text-xs font-bold text-gray-600 border-b border-gray-400 mb-2 pb-1">HESAPLANAN TOPLAM BORU METRAJI</h4>
                    <div className="flex justify-between items-center mb-1 text-xs text-black">
                        <span>ÇELİK DOĞALGAZ BORUSU:</span>
                        <span className="font-bold">{steelPipeTotal} M</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-black">
                        <span>PE KAPLI (YER ALTI) BORU:</span>
                        <span className="font-bold">{pePipeTotal} M</span>
                    </div>
                </div>

                {/* Right: Profit & Final Price */}
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-sm p-3">
                    <h4 className="text-sm font-bold text-center mb-2 text-black bg-yellow-200 py-1 border border-yellow-300">VERİLEN FİYATA GÖRE NET KAR</h4>

                    <div className="flex justify-between items-center mb-2 text-sm text-black">
                        <span className="font-bold">TOPLAM MALİYET:</span>
                        <span>{columnData.totalCost.toLocaleString('tr-TR')} TL</span>
                    </div>

                    <div className="mb-2">
                        <label className="block text-xs font-bold text-black mb-1">TEKLİFE YANSITILACAK FİYAT (KDV DAHİL)</label>
                        <input
                            type="number"
                            value={columnData.agreedColumnPrice === 0 ? '' : columnData.agreedColumnPrice}
                            onChange={(e) => updateData({ ...columnData, agreedColumnPrice: e.target.valueAsNumber })}
                            placeholder={columnData.totalCost.toString()}
                            className="w-full text-center p-2 text-lg font-bold bg-white border-2 border-yellow-500 text-black focus:outline-none focus:ring-2 focus:ring-yellow-600"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-yellow-200 text-sm">
                        <span className="font-bold text-black">NET KAR:</span>
                        <span className={`font-bold ${((columnData.agreedColumnPrice || 0) - columnData.totalCost) > 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {((columnData.agreedColumnPrice || 0) - columnData.totalCost).toLocaleString('tr-TR')} TL
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
