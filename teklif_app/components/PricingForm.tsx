
import React, { useState } from 'react';
import { PricingItem, PricingSubItem } from '../types';
import { PlusCircleIcon, TrashIcon, LockOpenIcon, LockClosedIcon, CheckIcon, XMarkIcon } from './icons';
import { SuggestionInput } from './SuggestionInput';

interface PricingFormProps {
    items: PricingItem[];
    onItemChange: (itemId: number, newValues: Partial<PricingItem>) => void;
    onAddItem: (name: string) => void;
    onDeleteItem: (id: number) => void;
    onAddOption: (itemId: number, name: string) => void;
    onDeleteOption: (itemId: number, name: string) => void;
    onAddSubItem: (itemId: number, name: string) => void;
    onDeleteSubItem: (itemId: number, subId: string) => void;
    suggestions?: string[];
    globalPrices?: Record<string, number>;
}

interface RowProps {
    item: PricingItem;
    onChange: (updates: Partial<PricingItem>) => void;
    onDelete: (id: number) => void;
    onAddOption?: (itemId: number, name: string) => void;
    onDeleteOption?: (itemId: number, name: string) => void;
    onAddSubItem?: (itemId: number, name: string) => void;
    onDeleteSubItem?: (itemId: number, subId: string) => void;
    isEditMode: boolean;
    suggestions?: string[];
    globalPrices?: Record<string, number>;
}

const NumericRow: React.FC<RowProps> = ({ item, onChange, onDelete, isEditMode, suggestions = [], globalPrices = {} }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-lg border border-slate-200 transition-colors hover:border-blue-200">
            <div className="sm:col-span-4 flex flex-col">
               {isEditMode ? (
                   <SuggestionInput 
                        value={item.name}
                        onChange={(val) => onChange({ name: val })}
                        onSelect={(val) => {
                            const price = globalPrices[val];
                            if (price !== undefined) {
                                onChange({ name: val, rate: price });
                            } else {
                                onChange({ name: val });
                            }
                        }}
                        suggestions={suggestions}
                        className="font-medium text-slate-700 bg-white border border-slate-300 focus:border-blue-500 rounded px-2 py-1 transition-colors focus:outline-none w-full uppercase text-sm"
                   />
               ) : (
                   <span className="font-medium text-slate-700 uppercase text-sm px-1 py-1">{item.name}</span>
               )}
               {item.description && <p className="text-xs text-slate-500 mt-1 px-1">{item.description}</p>}
            </div>
            <div className="sm:col-span-2">
                <label htmlFor={`units-${item.id}`} className="text-xs text-slate-500 block mb-1">Birim</label>
                <input
                    type="number"
                    id={`units-${item.id}`}
                    value={item.units === 0 ? '' : item.units}
                    placeholder="0"
                    onChange={(e) => onChange({ units: e.target.valueAsNumber || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                    step="0.1"
                />
            </div>
            <div className="sm:col-span-3">
                <label htmlFor={`rate-${item.id}`} className="text-xs text-slate-500 block mb-1">Birim Fiyatı (TL)</label>
                <input
                    type="number"
                    id={`rate-${item.id}`}
                    value={item.rate === 0 ? '' : item.rate}
                    placeholder="0"
                    onChange={(e) => onChange({ rate: e.target.valueAsNumber || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                />
            </div>
            <div className="sm:col-span-2 text-right">
                <p className="text-xs text-slate-500 mb-1">Tutar</p>
                <p className="font-bold text-lg text-slate-800">
                    {(item.units * item.rate).toLocaleString('tr-TR')} TL
                </p>
            </div>
             <div className="sm:col-span-1 flex justify-end h-8">
                {isEditMode && (
                    <button 
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }} 
                        className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                        title="Sil"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

const ToggleRow: React.FC<RowProps> = ({ item, onChange, onDelete, onAddSubItem, onDeleteSubItem, isEditMode, suggestions = [], globalPrices = {} }) => {
    const isEnabled = item.units > 0;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const handleSubItemChange = (subId: string, updates: Partial<PricingSubItem>) => {
        if (!item.subItems) return;
        const updatedSubItems = item.subItems.map(sub => 
            sub.id === subId ? { ...sub, ...updates } : sub
        );
        onChange({ subItems: updatedSubItems });
    };

    const handleAddSubItemClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAddSubItem) onAddSubItem(item.id, "YENİ MALZEME");
    }

    return (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 transition-colors hover:border-blue-200">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5 flex flex-col">
                 <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange({ units: isEnabled ? 0 : 1 }); }}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 shrink-0 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isEnabled ? 'bg-green-600' : 'bg-slate-300'}`}
                        aria-pressed={isEnabled}
                    >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    
                    {isEditMode ? (
                        <SuggestionInput 
                            value={item.name}
                            onChange={(val) => onChange({ name: val })}
                            onSelect={(val) => {
                                const price = globalPrices[val];
                                if (price !== undefined) {
                                    onChange({ name: val, rate: price });
                                } else {
                                    onChange({ name: val });
                                }
                            }}
                            suggestions={suggestions}
                            className="font-medium text-slate-800 bg-white border border-slate-300 focus:border-blue-500 rounded px-2 py-1 transition-colors focus:outline-none w-full uppercase text-sm"
                        />
                    ) : (
                        <span className="font-medium text-slate-800 uppercase text-sm px-1 py-1">{item.name}</span>
                    )}

                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEnabled ? 'text-green-800 bg-green-100' : 'text-slate-600 bg-slate-200'} whitespace-nowrap ml-2`}>
                        {isEnabled ? 'Var' : 'Yok'}
                    </span>
                </div>
                {item.description && <p className="text-xs text-slate-500 mt-1 pl-1">{item.description}</p>}
            </div>
            
            <div className="sm:col-span-4 flex space-x-2">
                {isEnabled && (
                    <div className="w-1/3">
                        <label htmlFor={`units-${item.id}`} className="text-xs text-slate-500 block mb-1">Adet</label>
                        <input
                            type="number"
                            id={`units-${item.id}`}
                            value={item.units === 0 ? '' : item.units}
                            placeholder="0"
                            onChange={(e) => onChange({ units: e.target.valueAsNumber || 0 })}
                            className="w-full px-2 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            min="1"
                        />
                    </div>
                )}
                <div className={isEnabled ? "w-2/3" : "w-full"}>
                    <label htmlFor={`rate-${item.id}`} className="text-xs text-slate-500 block mb-1">Birim Fiyatı</label>
                    <input
                        type="number"
                        id={`rate-${item.id}`}
                        value={item.rate === 0 ? '' : item.rate}
                        placeholder="0"
                        onChange={(e) => onChange({ rate: e.target.valueAsNumber || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 text-sm"
                        min="0"
                        disabled={!isEnabled}
                        readOnly={hasSubItems}
                        title={hasSubItems ? "Bu fiyat alt başlıkların toplamından hesaplanır." : ""}
                    />
                </div>
            </div>
            <div className="sm:col-span-2 text-right">
                <p className="text-xs text-slate-500 mb-1">Tutar</p>
                <p className="font-bold text-lg text-slate-800">
                    {(item.units * item.rate).toLocaleString('tr-TR')} TL
                </p>
            </div>
             <div className="sm:col-span-1 flex justify-end h-8">
                {isEditMode && (
                    <button 
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }} 
                        className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                        title="Sil"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        {/* Sub Items for Toggle Row */}
        { (hasSubItems || isEditMode) && isEnabled && (
             <div className="mt-2 ml-2 pl-4 border-l-2 border-slate-200">
                 <div className="bg-slate-100/50 rounded p-2">
                     <div className="flex justify-between items-center mb-2 pl-4 pr-2">
                        {hasSubItems ? (
                            <div className="hidden sm:grid grid-cols-12 gap-2 w-full text-xs text-slate-500 font-medium">
                                <div className="col-span-4">Malzeme / Ekstra</div>
                                <div className="col-span-1 text-center" title="Teklifte Göster">Gör.</div>
                                <div className="col-span-2">Birim</div>
                                <div className="col-span-2">Fiyat</div>
                                <div className="col-span-2 text-right">Tutar</div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic">Alt başlık yok.</div>
                        )}
                        
                         {isEditMode && (
                             <button 
                                type="button" 
                                onMouseDown={handleAddSubItemClick} 
                                className="ml-2 text-blue-600 hover:bg-blue-50 p-1 rounded whitespace-nowrap text-xs font-semibold"
                            >
                                 + Alt Başlık
                             </button>
                         )}
                     </div>
                     
                     {item.subItems?.map(sub => (
                         <SubItemRow 
                            key={sub.id} 
                            subItem={sub} 
                            onChange={handleSubItemChange}
                            onDelete={(subId) => onDeleteSubItem && onDeleteSubItem(item.id, subId)}
                            isEditMode={isEditMode}
                            suggestions={suggestions}
                            globalPrices={globalPrices}
                        />
                     ))}
                     
                     {hasSubItems && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-right text-xs text-slate-500 italic">
                            * Ana fiyat, buradaki kalemlerin toplamına otomatik eşitlenir.
                        </div>
                     )}
                 </div>
             </div>
        )}
        </div>
    );
};

const SubItemRow: React.FC<{ subItem: PricingSubItem; onChange: (id: string, updates: Partial<PricingSubItem>) => void; onDelete: (id: string) => void; isEditMode: boolean; suggestions?: string[]; globalPrices?: Record<string, number>; }> = ({ subItem, onChange, onDelete, isEditMode, suggestions = [], globalPrices = {} }) => {
    const isEnabled = subItem.units > 0;

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(subItem.id, { units: isEnabled ? 0 : 1 });
    };

    return (
        <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-2 items-start sm:items-center mt-2 py-3 sm:py-2 border-t border-slate-200/50 group">
             {/* Name & Toggle */}
             <div className="w-full sm:col-span-4 sm:pl-4 flex items-center justify-between sm:justify-start">
                 <div className="flex items-center w-full min-w-0 pr-2">
                     <div className="mr-2 flex items-center shrink-0">
                        <button
                            type="button"
                            onMouseDown={handleToggle}
                            className={`relative inline-flex items-center h-5 sm:h-4 rounded-full w-9 sm:w-8 shrink-0 transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-green-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block w-4 h-4 sm:w-3 sm:h-3 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                     </div>
                     <div className="flex-1 min-w-0">
                         {isEditMode ? (
                            <SuggestionInput 
                                value={subItem.name}
                                onChange={(val) => onChange(subItem.id, { name: val })}
                                onSelect={(val) => {
                                    const price = globalPrices[val];
                                    if (price !== undefined) {
                                        onChange(subItem.id, { name: val, rate: price });
                                    } else {
                                        onChange(subItem.id, { name: val });
                                    }
                                }}
                                suggestions={suggestions}
                                className={`text-xs flex items-center bg-white border border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 sm:py-0.5 transition-colors focus:outline-none w-full uppercase ${isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400'}`}
                            />
                         ) : (
                            <span className={`text-xs block truncate px-1 py-0.5 w-full uppercase ${isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                {subItem.name}
                            </span>
                         )}
                     </div>
                 </div>
                 {/* Mobile Delete Button */}
                 <div className="sm:hidden flex items-center shrink-0">
                     {isEditMode && (
                         <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(subItem.id); }}
                            className="text-slate-400 hover:text-red-500 transition p-1 bg-slate-100 rounded"
                            title="Sil"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                     )}
                 </div>
             </div>

             {/* Controls (Desktop: Grid, Mobile: Flex Wrap) */}
             <div className="flex flex-col sm:contents w-full gap-2 mt-1 sm:mt-0">
                 {/* Proposal Checkbox */}
                 <div className="sm:col-span-1 flex items-center gap-2 sm:justify-center px-1 sm:px-0">
                     <input 
                        type="checkbox"
                        checked={subItem.showInProposal !== false}
                        onChange={(e) => onChange(subItem.id, { showInProposal: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        title="Teklifte Göster/Gizle"
                     />
                     <span className="text-xs text-slate-600 sm:hidden">Teklif Formunda Görünsün</span>
                 </div>

                 {/* Desktop: side-by-side, Mobile: side-by-side flex */}
                 <div className="flex items-center gap-2 sm:contents w-full px-1 sm:px-0">
                     {/* Units */}
                     <div className="flex-1 sm:col-span-2 flex flex-col sm:block">
                         <span className="text-[10px] text-slate-500 sm:hidden mb-0.5">Adet / Birim</span>
                         <input
                            type="number"
                            value={subItem.units === 0 ? '' : subItem.units}
                            placeholder="0"
                            onChange={(e) => onChange(subItem.id, { units: e.target.valueAsNumber || 0 })}
                            className={`w-full px-2 py-1.5 sm:py-1 text-sm sm:text-xs bg-white border border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 ${!isEnabled ? 'text-slate-300 bg-slate-50' : ''}`}
                            min="0"
                         />
                     </div>
                     {/* Rate */}
                     <div className="flex-1 sm:col-span-2 flex flex-col sm:block">
                         <span className="text-[10px] text-slate-500 sm:hidden mb-0.5">Birim Fiyatı</span>
                         <input
                            type="number"
                            value={subItem.rate === 0 ? '' : subItem.rate}
                            placeholder="0"
                            onChange={(e) => onChange(subItem.id, { rate: e.target.valueAsNumber || 0 })}
                            className={`w-full px-2 py-1.5 sm:py-1 text-sm sm:text-xs bg-white border border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 ${!isEnabled ? 'text-slate-300 bg-slate-50' : ''}`}
                            min="0"
                         />
                     </div>
                 </div>

                 {/* Total */}
                 <div className="sm:col-span-2 flex justify-between items-center sm:block sm:text-right px-1 sm:px-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                     <span className="text-xs text-slate-500 sm:hidden font-medium">Toplam Tutar:</span>
                     <span className={`text-sm sm:text-xs font-bold sm:font-semibold ${isEnabled ? 'text-slate-800 sm:text-slate-700' : 'text-slate-400 sm:text-slate-300'}`}>
                         {(subItem.units * subItem.rate).toLocaleString('tr-TR')} TL
                     </span>
                 </div>

                 {/* Desktop Delete Button */}
                 <div className="hidden sm:flex col-span-1 justify-end h-6">
                     {isEditMode && (
                         <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(subItem.id); }}
                            className="text-slate-300 hover:text-red-500 transition p-1"
                            title="Sil"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                     )}
                 </div>
             </div>
        </div>
    )
}

const SelectableRow: React.FC<RowProps> = ({ item, onChange, onDelete, onAddOption, onDeleteOption, onAddSubItem, onDeleteSubItem, isEditMode, suggestions = [], globalPrices = {} }) => {
    const [isAddingOption, setIsAddingOption] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const handleSubItemChange = (subId: string, updates: Partial<PricingSubItem>) => {
        if (!item.subItems) return;
        const updatedSubItems = item.subItems.map(sub => 
            sub.id === subId ? { ...sub, ...updates } : sub
        );
        onChange({ subItems: updatedSubItems });
    };

    // Inline Option Add Handlers
    const handleStartAddOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingOption(true);
        setNewOptionName('');
    };

    const handleSaveOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (newOptionName.trim() && onAddOption) {
            onAddOption(item.id, newOptionName);
        }
        setIsAddingOption(false);
    };

    const handleCancelOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingOption(false);
    };

    const handleDeleteOptionClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.selectedOptionName && onDeleteOption) {
            onDeleteOption(item.id, item.selectedOptionName);
        }
    }

    // Instant Add Sub Item
    const handleAddSubItemClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAddSubItem) onAddSubItem(item.id, "YENİ MALZEME");
    }

    return (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 hover:border-blue-200 transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-4 flex flex-col">
                    {isEditMode ? (
                        <SuggestionInput 
                            value={item.name}
                            onChange={(val) => onChange({ name: val })}
                            onSelect={(val) => {
                                const price = globalPrices[val];
                                if (price !== undefined) onChange({ name: val, rate: price });
                                else onChange({ name: val });
                            }}
                            suggestions={suggestions}
                            className="font-medium text-slate-800 bg-white border border-slate-300 focus:border-blue-500 rounded px-2 py-1 transition-colors focus:outline-none w-full uppercase text-sm"
                        />
                    ) : (
                        <span className="font-medium text-slate-800 uppercase text-sm px-1 py-1">{item.name}</span>
                    )}
                    {item.description && <p className="text-xs text-slate-500 mt-1 px-1">{item.description}</p>}
                </div>
                <div className="sm:col-span-2 sm:col-start-10 text-right">
                    <p className="text-xs text-slate-500 mb-1">Tutar (Toplam)</p>
                    <p className="font-bold text-lg text-slate-800">
                        {(item.units * item.rate).toLocaleString('tr-TR')} TL
                    </p>
                </div>
                 <div className="sm:col-span-1 flex justify-end h-8">
                    {isEditMode && (
                        <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                            className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                            title="Sil"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
                 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center mb-4">
                        <div className={`sm:col-span-${hasSubItems ? '11' : '8'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor={`select-${item.id}`} className="text-xs text-slate-500">Seçenek</label>
                                {isEditMode && !isAddingOption && (
                                    <div className="flex space-x-3">
                                        <button 
                                            type="button" 
                                            onMouseDown={handleStartAddOption} 
                                            className="text-blue-600 hover:underline font-semibold text-xs"
                                        >
                                            + Seçenek Ekle
                                        </button>
                                        {item.selectedOptionName && (
                                            <button 
                                                type="button" 
                                                onMouseDown={handleDeleteOptionClick} 
                                                className="text-red-500 hover:underline font-semibold text-xs"
                                            >
                                                Seçeneği Sil
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {isAddingOption ? (
                                <div className="flex items-center gap-1 w-full">
                                    <SuggestionInput 
                                        value={newOptionName}
                                        onChange={(val) => setNewOptionName(val)}
                                        onSelect={(val) => {
                                            setNewOptionName(val);
                                        }}
                                        suggestions={suggestions}
                                        className="w-full px-3 py-2 bg-white border border-blue-500 rounded-md shadow-sm focus:outline-none uppercase text-sm"
                                        placeholder="YENİ SEÇENEK İSMİ"
                                        autoFocus
                                    />
                                    <button 
                                        type="button"
                                        onMouseDown={handleSaveOption}
                                        className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                                        title="Kaydet"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                    <button 
                                        type="button"
                                        onMouseDown={handleCancelOption}
                                        className="bg-slate-300 text-slate-600 p-2 rounded hover:bg-slate-400"
                                        title="İptal"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <select
                                    id={`select-${item.id}`}
                                    value={item.selectedOptionName}
                                    onChange={(e) => onChange({ selectedOptionName: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {item.options?.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                                </select>
                            )}
                        </div>
                         {!hasSubItems && (
                             <div className="sm:col-span-3">
                                <label htmlFor={`option-rate-${item.id}`} className="text-xs text-slate-500 block mb-1">Seçenek Fiyatı (TL)</label>
                                <input
                                    type="number"
                                    id={`option-rate-${item.id}`}
                                    value={item.rate === 0 ? '' : item.rate}
                                    placeholder="0"
                                    onChange={(e) => onChange({ rate: e.target.valueAsNumber || 0 })}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    min="0"
                                    readOnly={hasSubItems}
                                    title={hasSubItems ? "Bu fiyat alt başlıkların toplamından hesaplanır." : ""}
                                />
                            </div>
                         )}
                 </div>

                 {/* Sub Items List & Add Button */}
                 { (hasSubItems || isEditMode) && (
                     <div className="mt-2 bg-slate-100/50 rounded p-2">
                         <div className="flex justify-between items-center mb-2 pl-4 pr-2">
                            {hasSubItems ? (
                                <div className="hidden sm:grid grid-cols-12 gap-2 w-full text-xs text-slate-500 font-medium">
                                    <div className="col-span-4">Malzeme / Ekstra</div>
                                    <div className="col-span-1 text-center" title="Teklifte Göster">Gör.</div>
                                    <div className="col-span-2">Birim</div>
                                    <div className="col-span-2">Fiyat</div>
                                    <div className="col-span-2 text-right">Tutar</div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic">Bu seçeneğe ait alt malzeme yok.</div>
                            )}
                            
                             {isEditMode && (
                                 <button 
                                    type="button" 
                                    onMouseDown={handleAddSubItemClick} 
                                    className="ml-2 text-blue-600 hover:bg-blue-50 p-1 rounded whitespace-nowrap text-xs font-semibold"
                                >
                                     + Alt Başlık
                                 </button>
                             )}
                         </div>
                         
                         {item.subItems?.map(sub => (
                             <SubItemRow 
                                key={sub.id} 
                                subItem={sub} 
                                onChange={handleSubItemChange}
                                onDelete={(subId) => onDeleteSubItem && onDeleteSubItem(item.id, subId)}
                                isEditMode={isEditMode}
                                suggestions={suggestions}
                                globalPrices={globalPrices}
                            />
                         ))}
                         
                         {hasSubItems && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-right text-xs text-slate-500 italic">
                                * Ana fiyat, buradaki kalemlerin toplamına otomatik eşitlenir.
                            </div>
                         )}
                     </div>
                 )}
            </div>
        </div>
    );
};

const SelectableToggleRow: React.FC<RowProps> = ({ item, onChange, onDelete, onAddOption, onDeleteOption, onAddSubItem, onDeleteSubItem, isEditMode, suggestions = [], globalPrices = {} }) => {
    // Same structure as SelectableRow, reusing SubItemRow and logic
    // For brevity, using exact same implementation as SelectableRow but with Toggle Header logic
    
    const isEnabled = item.units > 0;
    // If disabled, we might still want to show subItems if they were previously configured, but usually we hide details.
    // Requirement: allow editing subItems even if toggle is off? Usually better to be on.
    // Let's stick to: Only show details if Enabled.
    
    // Reuse SelectableRow internal logic
    return (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 hover:border-blue-200 transition-colors">
             {/* Header Part */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-4 flex flex-col">
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange({ units: isEnabled ? 0 : 1 }); }}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 shrink-0 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isEnabled ? 'bg-green-600' : 'bg-slate-300'}`}
                            aria-pressed={isEnabled}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        
                        {isEditMode ? (
                            <SuggestionInput 
                                value={item.name}
                                onChange={(val) => onChange({ name: val })}
                                onSelect={(val) => {
                                    const price = globalPrices[val];
                                    if (price !== undefined) onChange({ name: val, rate: price });
                                    else onChange({ name: val });
                                }}
                                suggestions={suggestions}
                                className="font-medium text-slate-800 bg-white border border-slate-300 focus:border-blue-500 rounded px-2 py-1 transition-colors focus:outline-none w-full uppercase text-sm"
                            />
                        ) : (
                            <span className="font-medium text-slate-800 uppercase text-sm px-1 py-1">{item.name}</span>
                        )}

                         <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isEnabled ? 'text-green-800 bg-green-100' : 'text-slate-600 bg-slate-200'} whitespace-nowrap ml-2`}>
                            {isEnabled ? 'Var' : 'Yok'}
                        </span>
                    </div>
                    {item.description && <p className="text-xs text-slate-500 mt-1 pl-1">{item.description}</p>}
                </div>
                <div className="sm:col-span-2 sm:col-start-10 text-right">
                    <p className="text-xs text-slate-500 mb-1">Tutar (Toplam)</p>
                    <p className="font-bold text-lg text-slate-800">
                        {(item.units * item.rate).toLocaleString('tr-TR')} TL
                    </p>
                </div>
                 <div className="sm:col-span-1 flex justify-end h-8">
                    {isEditMode && (
                        <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                            className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                            title="Sil"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Details Part (Only if Enabled) */}
            {isEnabled && (
                <SelectableRowContent 
                    item={item} 
                    onChange={onChange} 
                    onDelete={onDelete} 
                    onAddOption={onAddOption} 
                    onDeleteOption={onDeleteOption} 
                    onAddSubItem={onAddSubItem} 
                    onDeleteSubItem={onDeleteSubItem} 
                    isEditMode={isEditMode} 
                    suggestions={suggestions} 
                    globalPrices={globalPrices} 
                />
            )}
        </div>
    );
};

// Helper to reuse the content between SelectableRow and SelectableToggleRow
const SelectableRowContent: React.FC<RowProps> = ({ item, onChange, onAddOption, onDeleteOption, onAddSubItem, onDeleteSubItem, isEditMode, suggestions = [], globalPrices = {} }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const [isAddingOption, setIsAddingOption] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');

    const handleSubItemChange = (subId: string, updates: Partial<PricingSubItem>) => {
        if (!item.subItems) return;
        const updatedSubItems = item.subItems.map(sub => 
            sub.id === subId ? { ...sub, ...updates } : sub
        );
        onChange({ subItems: updatedSubItems });
    };

    const handleStartAddOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingOption(true);
        setNewOptionName('');
    };

    const handleSaveOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (newOptionName.trim() && onAddOption) {
            onAddOption(item.id, newOptionName);
        }
        setIsAddingOption(false);
    };

    const handleCancelOption = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingOption(false);
    };

    const handleDeleteOptionClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.selectedOptionName && onDeleteOption) {
            onDeleteOption(item.id, item.selectedOptionName);
        }
    }

    const handleAddSubItemClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAddSubItem) onAddSubItem(item.id, "YENİ MALZEME");
    }

    return (
        <div className="pl-2 sm:pl-4 border-l-2 border-slate-200 ml-2">
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center mb-4">
                <div className={`sm:col-span-${hasSubItems ? '11' : '8'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor={`select-${item.id}`} className="text-xs text-slate-500">Seçenek</label>
                        {isEditMode && !isAddingOption && (
                            <div className="flex space-x-3">
                                <button 
                                    type="button" 
                                    onMouseDown={handleStartAddOption} 
                                    className="text-blue-600 hover:underline mr-3 font-semibold text-xs"
                                >
                                    + Seçenek Ekle
                                </button>
                                {item.selectedOptionName && (
                                    <button 
                                        type="button" 
                                        onMouseDown={handleDeleteOptionClick} 
                                        className="text-red-500 hover:underline font-semibold text-xs"
                                    >
                                        Seçeneği Sil
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {isAddingOption ? (
                        <div className="flex items-center gap-1 w-full">
                            <SuggestionInput 
                                value={newOptionName}
                                onChange={(val) => setNewOptionName(val)}
                                onSelect={(val) => setNewOptionName(val)}
                                suggestions={suggestions}
                                className="w-full px-3 py-2 bg-white border border-blue-500 rounded-md shadow-sm focus:outline-none uppercase text-sm"
                                placeholder="YENİ SEÇENEK İSMİ"
                                autoFocus
                            />
                            <button 
                                type="button"
                                onMouseDown={handleSaveOption}
                                className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                                title="Kaydet"
                            >
                                <CheckIcon className="w-5 h-5" />
                            </button>
                            <button 
                                type="button"
                                onMouseDown={handleCancelOption}
                                className="bg-slate-300 text-slate-600 p-2 rounded hover:bg-slate-400"
                                title="İptal"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <select
                            id={`select-${item.id}`}
                            value={item.selectedOptionName}
                            onChange={(e) => onChange({ selectedOptionName: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {item.options?.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                        </select>
                    )}
                </div>
                 {!hasSubItems && (
                     <div className="sm:col-span-3">
                        <label htmlFor={`option-rate-${item.id}`} className="text-xs text-slate-500 block mb-1">Seçenek Fiyatı (TL)</label>
                        <input
                            type="number"
                            id={`option-rate-${item.id}`}
                            value={item.rate === 0 ? '' : item.rate}
                            placeholder="0"
                            onChange={(e) => onChange({ rate: e.target.valueAsNumber || 0 })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            min="0"
                            readOnly={hasSubItems}
                            title={hasSubItems ? "Bu fiyat alt başlıkların toplamından hesaplanır." : ""}
                        />
                    </div>
                 )}
             </div>

             {/* Sub Items List & Add Button */}
             { (hasSubItems || isEditMode) && (
                 <div className="mt-2 bg-slate-100/50 rounded p-2">
                     <div className="flex justify-between items-center mb-2 pl-4 pr-2">
                        {hasSubItems ? (
                            <div className="grid grid-cols-12 gap-2 w-full text-xs text-slate-500 font-medium">
                                <div className="col-span-4">Malzeme / Ekstra</div>
                                <div className="col-span-1 text-center">Göster</div>
                                <div className="col-span-2">Birim</div>
                                <div className="col-span-2">Fiyat</div>
                                <div className="col-span-2 text-right">Tutar</div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic">Bu seçeneğe ait alt malzeme yok.</div>
                        )}
                        
                         {isEditMode && (
                             <button 
                                type="button" 
                                onMouseDown={handleAddSubItemClick} 
                                className="ml-2 text-blue-600 hover:bg-blue-50 p-1 rounded whitespace-nowrap text-xs font-semibold"
                            >
                                 + Alt Başlık
                             </button>
                         )}
                     </div>
                     
                     {item.subItems?.map(sub => (
                         <SubItemRow 
                            key={sub.id} 
                            subItem={sub} 
                            onChange={handleSubItemChange}
                            onDelete={(subId) => onDeleteSubItem && onDeleteSubItem(item.id, subId)}
                            isEditMode={isEditMode}
                            suggestions={suggestions}
                            globalPrices={globalPrices}
                        />
                     ))}
                     
                     {hasSubItems && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-right text-xs text-slate-500 italic">
                            * Ana fiyat, buradaki kalemlerin toplamına otomatik eşitlenir.
                        </div>
                     )}
                 </div>
             )}
        </div>
    );
};


export const PricingForm: React.FC<PricingFormProps> = ({ items, onItemChange, onAddItem, onDeleteItem, onAddOption, onDeleteOption, onAddSubItem, onDeleteSubItem, suggestions = [], globalPrices = {} }) => {
    const [isEditMode, setIsEditMode] = useState(false);

    const totalCost = items.reduce((total, item) => {
        return total + (item.units * item.rate);
    }, 0);

    // Instant Add Item
    const handleAddItemClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAddItem) onAddItem("YENİ FİYATLANDIRMA KALEMİ");
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md print-container">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800">Doğalgaz Fiyatlandırması</h2>
                
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition border ${isEditMode ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                    >
                        {isEditMode ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                        <span>{isEditMode ? 'Düzenleme Açık' : 'Kilitli'}</span>
                    </button>

                    {isEditMode && (
                        <button 
                            type="button"
                            onMouseDown={handleAddItemClick} 
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-sm bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 hover:border-blue-200 transition"
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            <span>Ana Kalem Ekle</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="space-y-4">
                {items.map(item => {
                    const handleChange = (updates: Partial<PricingItem>) => {
                        onItemChange(item.id, updates);
                    };
                    
                    const props: RowProps = {
                        item,
                        onChange: handleChange,
                        onDelete: onDeleteItem,
                        onAddOption,
                        onDeleteOption,
                        onAddSubItem,
                        onDeleteSubItem,
                        isEditMode,
                        suggestions,
                        globalPrices
                    };

                    switch(item.type) {
                        case 'numeric':
                            return <NumericRow key={item.id} {...props} />;
                        case 'toggle':
                             return <ToggleRow key={item.id} {...props} />;
                        case 'selectableToggle':
                            return <SelectableToggleRow key={item.id} {...props} />;
                        case 'selectable':
                            return <SelectableRow key={item.id} {...props} />;
                        default:
                            return null;
                    }
                })}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end items-center">
                 <span className="text-lg font-semibold text-slate-600 mr-4">Toplam Tutar:</span>
                 <span className="text-2xl font-bold text-emerald-600">
                     {totalCost.toLocaleString('tr-TR')} TL
                 </span>
            </div>
        </div>
    );
};
