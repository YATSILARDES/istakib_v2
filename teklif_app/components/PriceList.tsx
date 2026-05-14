
import React, { useState, useEffect } from 'react';
import {
    COMBI_MODELS,
    DEFAULT_RADIATOR_ITEMS,
    DEFAULT_PIPE_ITEMS,
    DEFAULT_VALVE_ITEMS,
    DEFAULT_LABOR_ITEMS,
    DEFAULT_HEATING_INSTALLATION_ITEMS
} from '../constants';
import { TrashIcon, PlusCircleIcon, LockOpenIcon, LockClosedIcon, DownloadIcon } from './icons';
import { MIGRATED_APPLIANCE_MODEL_MAP } from '../migrated_constants';

interface PriceListProps {
    globalPrices: Record<string, number>;
    onSave: (newPrices: Record<string, number>) => void;
}

// Data Structure: Category -> SubCategory -> Items[]
type PriceListData = Record<string, Record<string, string[]>>;

export const PriceList: React.FC<PriceListProps> = ({ globalPrices, onSave }) => {
    const [prices, setPrices] = useState<Record<string, number>>(globalPrices);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // --- INITIALIZATION & MIGRATION LOGIC ---
    const [data, setData] = useState<PriceListData>(() => {
        const saved = localStorage.getItem('global_price_list_structure_v2');
        if (saved) {
            return JSON.parse(saved);
        }

        // Fallback/Migration from V1 or Constants
        // USE MIGRATED COMBI MODELS IF AVAILABLE
        const combiModels = MIGRATED_APPLIANCE_MODEL_MAP['KOMBİ'] || COMBI_MODELS;

        const initialStructure: PriceListData = {
            'KOMBİLER': {
                'DEMİR DÖKÜM': combiModels.filter(m => m.includes('DEMİR DÖKÜM')),
                'VIESSMANN': combiModels.filter(m => m.includes('VIESSMANN')),
                'VAILLANT': combiModels.filter(m => m.includes('VAILLANT')),
                'ECA': combiModels.filter(m => m.includes('ECA')),
                'PROTHERM': combiModels.filter(m => m.includes('PROTHERM')),
                'BAYMAK': combiModels.filter(m => m.includes('BAYMAK')),
                'WARMHAUS': combiModels.filter(m => m.includes('WARMHAUS')),
                'DİĞER': combiModels.filter(m => !['DEMİR DÖKÜM', 'VIESSMANN', 'VAILLANT', 'ECA', 'PROTHERM', 'BAYMAK', 'WARMHAUS'].some(b => m.includes(b))),
            },
            'RADYATÖR & HAVLUPAN': {
                'GENEL': DEFAULT_RADIATOR_ITEMS
            },
            'KALORİFER TESİSATI': {
                'GENEL': DEFAULT_HEATING_INSTALLATION_ITEMS
            },
            'TESİSAT & BORU': {
                'GENEL': DEFAULT_PIPE_ITEMS
            },
            'VANA & EKİPMAN': {
                'GENEL': DEFAULT_VALVE_ITEMS
            },
            'İŞÇİLİK': {
                'GENEL': DEFAULT_LABOR_ITEMS
            }
        };
        return initialStructure;
    });

    const [activeCategory, setActiveCategory] = useState<string>(() => Object.keys(data)[0] || 'KOMBİLER');
    const [activeSubCategory, setActiveSubCategory] = useState<string>(() => {
        const firstCat = Object.keys(data)[0] || 'KOMBİLER';
        return data[firstCat] ? Object.keys(data[firstCat])[0] : '';
    });

    // Update active sub-category when main category changes
    useEffect(() => {
        if (data[activeCategory]) {
            const subCats = Object.keys(data[activeCategory]);
            if (subCats.length > 0 && !subCats.includes(activeSubCategory)) {
                setActiveSubCategory(subCats[0]);
            } else if (subCats.length === 0) {
                setActiveSubCategory('');
            }
        }
    }, [activeCategory, data]);

    // Persistence
    useEffect(() => {
        localStorage.setItem('global_price_list_structure_v2', JSON.stringify(data));
    }, [data]);

    useEffect(() => {
        setPrices(globalPrices);
    }, [globalPrices]);


    // --- CRUD OPERATIONS ---

    const handlePriceChange = (itemName: string, price: number) => {
        setPrices(prev => ({ ...prev, [itemName]: price }));
        setIsSaved(false);
    };

    const handleSaveClick = () => {
        onSave(prices);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleSearchPrice = (itemName: string) => {
        const url = `https://www.akakce.com/arama/?q=${encodeURIComponent(itemName)}`;
        window.open(url, '_blank');
    };

    // 1. CATEGORY (TAB) OPERATIONS
    const handleAddCategory = () => {
        const name = `YENİ KATEGORİ ${Object.keys(data).length + 1}`;
        setData(prev => ({
            ...prev,
            [name]: { 'GENEL': [] }
        }));
        setActiveCategory(name);
    };

    const handleRenameCategory = (oldName: string, newName: string) => {
        if (oldName === newName || !newName.trim()) return;
        if (data[newName]) {
            alert('Bu isimde bir kategori zaten var.');
            return;
        }

        const newData = { ...data };
        newData[newName] = newData[oldName];
        delete newData[oldName];

        setData(newData);
        if (activeCategory === oldName) setActiveCategory(newName);
    };

    const handleDeleteCategory = (name: string) => {
        const newData = { ...data };
        delete newData[name];
        setData(newData);

        const remainingKeys = Object.keys(newData);
        if (remainingKeys.length > 0) {
            setActiveCategory(remainingKeys[0]);
        } else {
            setActiveCategory('');
        }
    };

    // 2. SUB-CATEGORY (SUB-TAB) OPERATIONS
    const handleAddSubCategory = () => {
        if (!activeCategory) return;
        const subCount = Object.keys(data[activeCategory]).length;
        const name = `YENİ BAŞLIK ${subCount + 1}`;

        setData(prev => ({
            ...prev,
            [activeCategory]: {
                ...prev[activeCategory],
                [name]: []
            }
        }));
        setActiveSubCategory(name);
    };

    const handleRenameSubCategory = (oldName: string, newName: string) => {
        if (oldName === newName || !newName.trim()) return;
        if (data[activeCategory][newName]) {
            alert('Bu isimde bir alt başlık zaten var.');
            return;
        }

        const categoryData = { ...data[activeCategory] };
        categoryData[newName] = categoryData[oldName];
        delete categoryData[oldName];

        setData(prev => ({
            ...prev,
            [activeCategory]: categoryData
        }));
        if (activeSubCategory === oldName) setActiveSubCategory(newName);
    };

    const handleDeleteSubCategory = (name: string) => {
        const categoryData = { ...data[activeCategory] };
        delete categoryData[name];

        setData(prev => ({
            ...prev,
            [activeCategory]: categoryData
        }));

        const remaining = Object.keys(categoryData);
        if (remaining.length > 0) {
            setActiveSubCategory(remaining[0]);
        } else {
            setActiveSubCategory('');
        }
    };

    // 3. ITEM OPERATIONS
    const handleAddItem = () => {
        if (!activeCategory || !activeSubCategory) return;
        const newItemName = `YENİ MALZEME ${Date.now().toString().slice(-4)}`;

        const currentItems = data[activeCategory][activeSubCategory] || [];

        setData(prev => ({
            ...prev,
            [activeCategory]: {
                ...prev[activeCategory],
                [activeSubCategory]: [newItemName, ...currentItems]
            }
        }));
    };

    const handleRenameItem = (oldName: string, newName: string) => {
        if (oldName === newName) return;

        const currentItems = data[activeCategory][activeSubCategory];
        const newItems = currentItems.map(i => i === oldName ? newName : i);

        setData(prev => ({
            ...prev,
            [activeCategory]: {
                ...prev[activeCategory],
                [activeSubCategory]: newItems
            }
        }));

        // Migrate price
        const oldPrice = prices[oldName];
        if (oldPrice !== undefined) {
            const newPrices = { ...prices, [newName]: oldPrice };
            delete newPrices[oldName];
            setPrices(newPrices);
        }
        setIsSaved(false);
    };

    const handleDeleteItem = (itemName: string) => {
        const currentItems = data[activeCategory][activeSubCategory];
        const newItems = currentItems.filter(i => i !== itemName);

        setData(prev => ({
            ...prev,
            [activeCategory]: {
                ...prev[activeCategory],
                [activeSubCategory]: newItems
            }
        }));

        const newPrices = { ...prices };
        delete newPrices[itemName];
        setPrices(newPrices);
        setIsSaved(false);
    };


    // --- RENDER HELPERS ---

    const getVisibleItems = () => {
        if (!activeCategory || !activeSubCategory) return [];
        let items = data[activeCategory][activeSubCategory] || [];

        if (searchTerm) {
            items = items.filter(i => i.toLowerCase().includes(searchTerm.toLocaleLowerCase('tr-TR')));
        }
        return items;
    };

    const renderInputRow = (item: string, index: number) => (
        <div key={`${item}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors shadow-sm mb-2 group">
            <div className="mb-1 sm:mb-0 sm:mr-2 flex-grow flex items-center w-full sm:w-auto overflow-hidden">
                <span className="text-[10px] text-slate-400 font-mono mr-2 hidden sm:inline shrink-0">#{index + 1}</span>

                {/* Editable Item Name */}
                {isEditMode ? (
                    <input
                        type="text"
                        defaultValue={item}
                        onBlur={(e) => handleRenameItem(item, e.target.value)}
                        className="font-medium text-slate-800 text-xs sm:text-sm mr-2 flex-grow bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors uppercase w-full"
                    />
                ) : (
                    <span className="font-medium text-slate-800 text-xs sm:text-sm mr-2 flex-grow uppercase w-full truncate" title={item}>
                        {item}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => handleSearchPrice(item)}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center shrink-0"
                    title="En ucuz fiyatı Akakçe'de ara"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            </div>
            <div className="w-full sm:w-auto flex items-center space-x-2 mt-1 sm:mt-0">
                <div className="relative w-full sm:w-32">
                    <input
                        type="number"
                        value={prices[item] || ''}
                        onChange={(e) => handlePriceChange(item, e.target.valueAsNumber)}
                        placeholder="0"
                        className="w-full pl-2 pr-8 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-right text-sm bg-white"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 text-xs font-bold">TL</span>
                </div>

                {isEditMode && (
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleDeleteItem(item); }}
                        className="text-slate-300 hover:text-red-500 p-2 transition-colors rounded hover:bg-red-50"
                        title="Sil"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-50 rounded-lg shadow-md max-w-6xl mx-auto mt-4 mb-12 border border-slate-200">

            {/* TOP HEADER: Title & Global Actions */}
            <div className="bg-white p-6 rounded-t-lg border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Fiyat Listesi Yönetimi</h2>
                    <p className="text-sm text-slate-500 mt-1">Kategorileri ve alt başlıkları düzenleyerek kendi listenizi oluşturun.</p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Lock/Unlock Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center space-x-2 px-4 py-3 font-semibold rounded-lg shadow-sm transition ${isEditMode ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {isEditMode ? <LockOpenIcon className="w-5 h-5" /> : <LockClosedIcon className="w-5 h-5" />}
                        <span>{isEditMode ? 'Düzenleme Açık' : 'Liste Kilitli'}</span>
                    </button>

                    {isEditMode && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleAddCategory(); }}
                            className="flex items-center space-x-2 px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-200 transition"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>Kategori Ekle</span>
                        </button>
                    )}

                    {/* EXPORT / IMPORT ACTIONS */}
                    <div className="flex items-center space-x-2 border-l border-slate-300 pl-3 ml-2">
                        <button
                            type="button"
                            onClick={() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prices, null, 2));
                                const downloadAnchorNode = document.createElement('a');
                                downloadAnchorNode.setAttribute("href", dataStr);
                                downloadAnchorNode.setAttribute("download", "fiyat_listesi_yedek.json");
                                document.body.appendChild(downloadAnchorNode);
                                downloadAnchorNode.click();
                                downloadAnchorNode.remove();
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition text-sm font-medium"
                            title="Fiyat Listesini İndir (Yedekle)"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">İndir</span>
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        try {
                                            const content = event.target?.result as string;
                                            const importedPrices = JSON.parse(content);
                                            // Validate simple check: must be object
                                            if (typeof importedPrices !== 'object' || importedPrices === null) {
                                                alert('Geçersiz dosya formatı.');
                                                return;
                                            }

                                            if (confirm(`Bu işlem mevcut fiyat listenizi güncelleyecek. ${Object.keys(importedPrices).length} adet fiyat yüklenecek. Onaylıyor musunuz?`)) {
                                                onSave(importedPrices);
                                                // Local state update is handled by parent prop change usually, but we update simple state here too to reflect immediately if needed, 
                                                // though onSave triggers parent which updates props.globalPrices.
                                                // For safety we rely on prop update or simple alert.
                                                alert('Fiyat listesi başarıyla yüklendi!');
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert('Dosya okunamadı veya bozuk.');
                                        }
                                    };
                                    reader.readAsText(file);
                                    e.target.value = ''; // Reset
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                title="Fiyat Listesi Yükle"
                            />
                            <button
                                type="button"
                                className="flex items-center space-x-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition text-sm font-medium pointer-events-none"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="hidden sm:inline">Yükle</span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSaveClick}
                        className={`flex items-center space-x-2 px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-all duration-200 ${isSaved ? 'bg-green-600 scale-105' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {isSaved ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <span>Kaydedildi!</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                <span>Fiyatları Kaydet</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 1. CATEGORY TABS (Editable) */}
            <div className="flex overflow-x-auto bg-slate-100 border-b border-slate-200 px-4 pt-4 gap-1 scrollbar-hide">
                {Object.keys(data).map(catName => (
                    <div
                        key={catName}
                        onClick={() => setActiveCategory(catName)}
                        className={`group flex items-center px-3 py-2 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap border-t border-l border-r cursor-pointer ${activeCategory === catName
                            ? 'bg-white border-slate-200 text-blue-600 shadow-sm relative top-[1px] z-10'
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {isEditMode ? (
                            <input
                                type="text"
                                defaultValue={catName}
                                onBlur={(e) => handleRenameCategory(catName, e.target.value)}
                                className={`bg-transparent border-none focus:ring-0 p-0 w-full max-w-[120px] cursor-pointer text-center uppercase ${activeCategory === catName ? 'text-blue-600' : 'text-slate-500'}`}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className={`w-full text-center uppercase px-2 ${activeCategory === catName ? 'text-blue-600' : 'text-slate-500'}`}>
                                {catName}
                            </span>
                        )}

                        {activeCategory === catName && isEditMode && (
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(catName); }}
                                className="ml-2 text-slate-300 hover:text-red-500"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="p-6 bg-slate-50 min-h-[500px]">

                {/* 2. SUB-CATEGORY TABS (Brand/Group) */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-200">
                    {activeCategory && data[activeCategory] && Object.keys(data[activeCategory]).map(subName => (
                        <div
                            key={subName}
                            onClick={() => setActiveSubCategory(subName)}
                            className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-full border cursor-pointer transition-all ${activeSubCategory === subName
                                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                                }`}
                        >
                            {isEditMode ? (
                                <input
                                    type="text"
                                    defaultValue={subName}
                                    onBlur={(e) => handleRenameSubCategory(subName, e.target.value)}
                                    className={`bg-transparent border-none focus:ring-0 p-0 max-w-[100px] cursor-pointer text-center uppercase ${activeSubCategory === subName ? 'text-white placeholder-blue-200' : 'text-slate-600'}`}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className={`uppercase px-1 ${activeSubCategory === subName ? 'text-white' : 'text-slate-600'}`}>
                                    {subName}
                                </span>
                            )}

                            {activeSubCategory === subName && isEditMode && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSubCategory(subName); }}
                                    className="ml-2 text-blue-200 hover:text-white"
                                >
                                    <span className="text-xs font-bold">×</span>
                                </button>
                            )}
                        </div>
                    ))}

                    {activeCategory && isEditMode && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleAddSubCategory(); }}
                            className="flex items-center space-x-1 bg-white border border-dashed border-slate-400 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition"
                        >
                            <PlusCircleIcon className="w-3 h-3" />
                            <span>Alt Başlık Ekle</span>
                        </button>
                    )}
                </div>

                {/* 3. ACTIONS ROW (Search & Add Item) */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="relative w-full md:w-1/2">
                        <input
                            type="text"
                            placeholder="Bu listede ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>

                    {isEditMode && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleAddItem(); }}
                            className="w-full md:w-auto flex items-center justify-center space-x-1 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-emerald-700 shadow transition"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>Malzeme Ekle</span>
                        </button>
                    )}
                </div>

                {/* 4. ITEMS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {getVisibleItems().length > 0 ? (
                        getVisibleItems().map((item, idx) => renderInputRow(item, idx))
                    ) : (
                        <div className="col-span-1 lg:col-span-2 text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                            <p>Bu başlık altında henüz kayıt yok.</p>
                            {isEditMode && (
                                <button type="button" onClick={handleAddItem} className="text-emerald-600 font-medium mt-2 hover:underline">
                                    İlk malzemeyi ekle
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
