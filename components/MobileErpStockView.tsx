import React, { useState, useEffect, useMemo } from 'react';
import {
    Package,
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Barcode,
    Filter,
    Pencil,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Flame,
    LayoutGrid,
    Sparkles,
    Droplets,
    Wind,
    Power,
    Gauge,
    ArrowDownLeft,
    ArrowUpRight,
    QrCode,
    X,
    Layers
} from 'lucide-react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    query
} from 'firebase/firestore';
import { db } from '@/src/firebase';
import { StockCombi, StockRadiator, StockGenericItem, UserPermission } from '@/types';
import StockCombiModal from './StockCombiModal';
import StockRadiatorModal from './StockRadiatorModal';
import StockGenericModal from './StockGenericModal';
import StockCombiRowDetail from './StockCombiRowDetail';
import StockGenericRowDetail from './StockGenericRowDetail';

export type StockCategoryType =
    | 'combis'
    | 'radiators'
    | 'heatpumps'
    | 'thermosiphons'
    | 'acs'
    | 'electric_combis'
    | 'instant_heaters'
    | 'others';

interface MobileErpStockViewProps {
    category: StockCategoryType;
    userPermissions?: UserPermission | null;
    onBackToMenu: () => void;
    onSwitchToClassic?: () => void;
}

interface CategoryConfig {
    title: string;
    itemLabel: string;
    collectionName: string;
    icon: React.ElementType;
    type: 'combi' | 'radiator' | 'generic';
}

const CATEGORY_CONFIGS: Record<StockCategoryType, CategoryConfig> = {
    combis: {
        title: 'Kombi Modelleri',
        itemLabel: 'Kombi',
        collectionName: 'stock_combis',
        icon: Flame,
        type: 'combi'
    },
    radiators: {
        title: 'Radyatör Modelleri',
        itemLabel: 'Radyatör',
        collectionName: 'stock_radiators',
        icon: LayoutGrid,
        type: 'radiator'
    },
    heatpumps: {
        title: 'Isı Pompası Modelleri',
        itemLabel: 'Isı Pompası',
        collectionName: 'stock_heatpumps',
        icon: Sparkles,
        type: 'generic'
    },
    thermosiphons: {
        title: 'Termosifon Modelleri',
        itemLabel: 'Termosifon',
        collectionName: 'stock_thermosiphons',
        icon: Droplets,
        type: 'generic'
    },
    acs: {
        title: 'Klima Modelleri',
        itemLabel: 'Klima',
        collectionName: 'stock_acs',
        icon: Wind,
        type: 'generic'
    },
    electric_combis: {
        title: 'Elektrikli Kombi Modelleri',
        itemLabel: 'Elektrikli Kombi',
        collectionName: 'stock_electric_combis',
        icon: Power,
        type: 'generic'
    },
    instant_heaters: {
        title: 'Ani Isıtıcı (DDEİ) Modelleri',
        itemLabel: 'Ani Isıtıcı',
        collectionName: 'stock_instant_heaters',
        icon: Gauge,
        type: 'generic'
    },
    others: {
        title: 'Diğer Malzemeler',
        itemLabel: 'Malzeme',
        collectionName: 'stock_others',
        icon: Package,
        type: 'generic'
    }
};

export const MobileErpStockView: React.FC<MobileErpStockViewProps> = ({
    category,
    userPermissions,
    onBackToMenu,
    onSwitchToClassic
}) => {
    const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.combis;
    const IconComponent = config.icon;

    // State for items
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

    // Selected brand for Level 1 -> Level 2 navigation
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

    // Selected item for full-page detail view (Level 2 -> Level 3)
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Initial brand for Add Modal (pre-fills selected brand if adding from inside a brand)
    const [initialBrandForAdd, setInitialBrandForAdd] = useState<string>('');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    // Reset brand and selected item whenever category changes
    useEffect(() => {
        setSelectedBrand(null);
        setSelectedId(null);
        setSearchTerm('');
        setStockFilter('all');
    }, [category]);

    // Subscribe to Firestore collection
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, config.collectionName), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                setRawItems(list);
                setLoading(false);
            },
            (error) => {
                console.error(`Error fetching ${config.collectionName}:`, error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [config.collectionName]);

    // Calculate item quantity
    const getItemQuantity = (item: any): number => {
        if (config.type === 'radiator') {
            return Number(item.quantity || 0);
        }
        const inboundCount = item.barcodes?.length || 0;
        const outboundCount = item.outboundBarcodes?.length || 0;
        return inboundCount - outboundCount;
    };

    // Calculate inbound and outbound
    const getItemCounts = (item: any) => {
        const inbound = item.barcodes?.length || 0;
        const outbound = item.outboundBarcodes?.length || 0;
        const current = inbound - outbound;
        return { inbound, outbound, current };
    };

    // Total quantity across all items
    const totalStockQuantity = useMemo(() => {
        return rawItems.reduce((acc, curr) => acc + getItemQuantity(curr), 0);
    }, [rawItems, config.type]);

    // BRAND GROUPS (For Level 1: Brand list view)
    const brandGroups = useMemo(() => {
        const map = new Map<string, { brand: string; models: any[]; totalQty: number; inStockCount: number }>();
        rawItems.forEach((item) => {
            const rawBrand = (item.brand || '').trim();
            const b = (rawBrand || 'DİĞER').toLocaleUpperCase('tr-TR');
            if (!map.has(b)) {
                map.set(b, { brand: b, models: [], totalQty: 0, inStockCount: 0 });
            }
            const group = map.get(b)!;
            const qty = getItemQuantity(item);
            group.models.push(item);
            group.totalQty += qty;
            if (qty > 0) group.inStockCount += 1;
        });
        return Array.from(map.values()).sort((a, b) => a.brand.localeCompare(b.brand, 'tr-TR'));
    }, [rawItems, config.type]);

    // Filtered Brand Groups (Level 1 search)
    const filteredBrands = useMemo(() => {
        if (!searchTerm.trim()) return brandGroups;
        const s = searchTerm.trim().toLocaleLowerCase('tr-TR');
        return brandGroups.filter((bg) => bg.brand.toLocaleLowerCase('tr-TR').includes(s));
    }, [brandGroups, searchTerm]);

    // Models of currently selected brand (For Level 2)
    const currentBrandModels = useMemo(() => {
        if (!selectedBrand) return [];
        return rawItems.filter((item) => {
            const b = (item.brand || '').trim().toLocaleUpperCase('tr-TR') || 'DİĞER';
            return b === selectedBrand;
        });
    }, [rawItems, selectedBrand]);

    // Total quantity of currently selected brand
    const currentBrandTotalQty = useMemo(() => {
        return currentBrandModels.reduce((acc, curr) => acc + getItemQuantity(curr), 0);
    }, [currentBrandModels, config.type]);

    // Filtered models of currently selected brand (Level 2 search + stock filter)
    const filteredBrandModels = useMemo(() => {
        return currentBrandModels.filter((item) => {
            const searchLower = searchTerm.toLowerCase().trim();
            const modelMatches = (item.model || '').toLowerCase().includes(searchLower);
            const featureMatches = (item.capacity || item.feature || item.height || item.length || '')
                .toString()
                .toLowerCase()
                .includes(searchLower);

            const matchesSearch = !searchLower || modelMatches || featureMatches;
            if (!matchesSearch) return false;

            const qty = getItemQuantity(item);
            if (stockFilter === 'in_stock') return qty > 0;
            if (stockFilter === 'out_of_stock') return qty <= 0;
            return true;
        });
    }, [currentBrandModels, searchTerm, stockFilter]);

    // Currently selected item (For Level 3: Detail view)
    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        return rawItems.find((it) => it.id === selectedId) || null;
    }, [selectedId, rawItems]);

    // Handle delete
    const handleDeleteItem = async (item: any) => {
        const name = `${item.brand} ${item.model || ''}`;
        if (!window.confirm(`"${name}" kaydını silmek istediğinize emin misiniz?`)) return;

        try {
            await deleteDoc(doc(db, config.collectionName, item.id));
            if (selectedId === item.id) {
                setSelectedId(null);
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Kayıt silinemedi.');
        }
    };

    // Handle Save (Add or Update)
    const handleSaveCombi = async (data: Omit<StockCombi, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingItem) {
            await updateDoc(doc(db, config.collectionName, editingItem.id), {
                ...data,
                updatedAt: serverTimestamp()
            });
            setEditingItem(null);
        } else {
            await addDoc(collection(db, config.collectionName), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsAddModalOpen(false);
        }
    };

    const handleSaveRadiator = async (data: Omit<StockRadiator, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingItem) {
            await updateDoc(doc(db, config.collectionName, editingItem.id), {
                ...data,
                updatedAt: serverTimestamp()
            });
            setEditingItem(null);
        } else {
            await addDoc(collection(db, config.collectionName), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsAddModalOpen(false);
        }
    };

    const handleSaveGeneric = async (data: Omit<StockGenericItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingItem) {
            await updateDoc(doc(db, config.collectionName, editingItem.id), {
                ...data,
                updatedAt: serverTimestamp()
            });
            setEditingItem(null);
        } else {
            await addDoc(collection(db, config.collectionName), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsAddModalOpen(false);
        }
    };

    // Radiator quantity quick adjuster
    const handleAdjustRadiatorQuantity = async (item: StockRadiator, delta: number) => {
        const newQty = Math.max(0, (Number(item.quantity) || 0) + delta);
        try {
            await updateDoc(doc(db, config.collectionName, item.id), {
                quantity: newQty,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error('Adet güncellenemedi', err);
            alert('Adet güncellenemedi');
        }
    };

    // =========================================================================
    // RENDER: MODEL DETAIL VIEW (When a user clicks on a model)
    // =========================================================================
    if (selectedItem) {
        const qty = getItemQuantity(selectedItem);
        const { inbound, outbound } = getItemCounts(selectedItem);

        return (
            <div className="flex flex-col h-screen bg-[#f1f5f9] font-sans overflow-hidden">
                {/* Sticky Orange ERP Header */}
                <div className="sticky top-0 z-30 px-4 py-3 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-md shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setSelectedId(null)}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs shrink-0"
                            title="Geri Dön"
                        >
                            <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-sm font-black tracking-tight text-white uppercase truncate">
                                {selectedItem.brand} {selectedItem.model || ''}
                            </h2>
                            <p className="text-[11px] text-orange-100 font-medium truncate">
                                {selectedItem.capacity || selectedItem.feature || (selectedItem.height ? `${selectedItem.height}x${selectedItem.length} mm` : '')} •{' '}
                                <span className="font-bold text-white">{qty} Adet Stokta</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setEditingItem(selectedItem)}
                            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                            title="Modeli Düzenle"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDeleteItem(selectedItem)}
                            className="w-8 h-8 rounded-lg bg-red-600/40 hover:bg-red-600/60 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                            title="Modeli Sil"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-Header: Metric Summary Cards */}
                <div className="bg-[#1e293b] px-4 py-3 grid grid-cols-3 gap-2 shrink-0 shadow-inner">
                    <div className="bg-slate-800/80 rounded-xl p-2.5 text-center border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kalan Stok</span>
                        <span className={`text-lg font-black ${qty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {qty} <span className="text-[11px] font-semibold text-slate-400">Adet</span>
                        </span>
                    </div>
                    {config.type !== 'radiator' ? (
                        <>
                            <div className="bg-slate-800/80 rounded-xl p-2.5 text-center border border-slate-700/60">
                                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">Giriş</span>
                                <span className="text-lg font-black text-blue-400">
                                    {inbound} <span className="text-[11px] font-semibold text-slate-400">Adet</span>
                                </span>
                            </div>
                            <div className="bg-slate-800/80 rounded-xl p-2.5 text-center border border-slate-700/60">
                                <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wider block">Çıkış</span>
                                <span className="text-lg font-black text-orange-400">
                                    {outbound} <span className="text-[11px] font-semibold text-slate-400">Adet</span>
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-800/80 rounded-xl p-2.5 text-center border border-slate-700/60">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Yükseklik</span>
                                <span className="text-sm font-bold text-slate-200 mt-1 block">{selectedItem.height || '-'} mm</span>
                            </div>
                            <div className="bg-slate-800/80 rounded-xl p-2.5 text-center border border-slate-700/60">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Uzunluk</span>
                                <span className="text-sm font-bold text-slate-200 mt-1 block">{selectedItem.length || '-'} mm</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Detail Body */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {config.type === 'combi' && (
                        <div className="bg-slate-50 min-h-full">
                            <StockCombiRowDetail stock={selectedItem} />
                        </div>
                    )}

                    {config.type === 'generic' && (
                        <div className="bg-slate-50 min-h-full">
                            <StockGenericRowDetail stock={selectedItem} collectionName={config.collectionName} />
                        </div>
                    )}

                    {config.type === 'radiator' && (
                        <div className="p-4 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
                                        <LayoutGrid className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-lg">{selectedItem.brand} Radyatör</h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {selectedItem.height} mm (Y) × {selectedItem.length} mm (U)
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-slate-500 font-semibold block">Mevcut Stok</span>
                                        <span className="text-3xl font-black text-slate-900">{selectedItem.quantity || 0} Adet</span>
                                    </div>

                                    {/* Quick Quantity Adjusters */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAdjustRadiatorQuantity(selectedItem, -1)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-lg flex items-center justify-center transition-all"
                                        >
                                            -1
                                        </button>
                                        <button
                                            onClick={() => handleAdjustRadiatorQuantity(selectedItem, 1)}
                                            className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-lg flex items-center justify-center transition-all shadow-md shadow-orange-500/20"
                                        >
                                            +1
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => handleAdjustRadiatorQuantity(selectedItem, 5)}
                                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all text-center"
                                    >
                                        +5 Adet Ekle
                                    </button>
                                    <button
                                        onClick={() => handleAdjustRadiatorQuantity(selectedItem, -5)}
                                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all text-center"
                                    >
                                        -5 Adet Düşür
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals for Editing */}
                {editingItem && config.type === 'combi' && (
                    <StockCombiModal
                        isOpen={true}
                        onClose={() => setEditingItem(null)}
                        onSave={handleSaveCombi}
                        initialData={editingItem}
                    />
                )}
                {editingItem && config.type === 'radiator' && (
                    <StockRadiatorModal
                        isOpen={true}
                        onClose={() => setEditingItem(null)}
                        onSave={handleSaveRadiator}
                        initialData={editingItem}
                    />
                )}
                {editingItem && config.type === 'generic' && (
                    <StockGenericModal
                        isOpen={true}
                        onClose={() => setEditingItem(null)}
                        onSave={handleSaveGeneric}
                        initialData={editingItem}
                        itemLabel={config.itemLabel}
                    />
                )}
            </div>
        );
    }

    // =========================================================================
    // RENDER: LEVEL 2 - MODELS OF SELECTED BRAND (When a user clicks on a brand)
    // =========================================================================
    if (selectedBrand) {
        return (
            <div className="flex flex-col h-screen bg-[#f1f5f9] font-sans overflow-hidden">
                {/* 1. STICKY TOP ORANGE ERP HEADER */}
                <div className="sticky top-0 z-30 px-4 py-3 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-md shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => {
                                setSelectedBrand(null);
                                setSearchTerm('');
                                setStockFilter('all');
                            }}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs shrink-0"
                            title="Markalara Dön"
                        >
                            <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-sm font-black tracking-tight text-white uppercase truncate">
                                {selectedBrand} {config.itemLabel.toUpperCase()}LERİ
                            </h2>
                            <span className="text-[11px] text-orange-100 font-medium">
                                Toplam <span className="font-black text-white">{currentBrandTotalQty}</span> Adet • {currentBrandModels.length} Model
                            </span>
                        </div>
                    </div>

                    {onSwitchToClassic && (
                        <button
                            onClick={onSwitchToClassic}
                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold border border-white/30 active:scale-95 transition-all shrink-0"
                            title="Klasik Görünüme Geç"
                        >
                            Klasik
                        </button>
                    )}
                </div>

                {/* 2. SEARCH ROW */}
                <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 shadow-xs">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={`${selectedBrand} modellerinde ara...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100/90 text-slate-800 text-xs rounded-xl pl-9 pr-8 py-2 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:bg-white transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. DARK SLATE TOOLBAR ROW */}
                <div className="bg-[#1e293b] px-3 py-2 flex items-center justify-between text-white shrink-0 text-xs shadow-inner">
                    {/* Quick Filters */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                        <button
                            onClick={() => setStockFilter('all')}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                                stockFilter === 'all'
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                        >
                            Tümü ({currentBrandModels.length})
                        </button>
                        <button
                            onClick={() => setStockFilter('in_stock')}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                                stockFilter === 'in_stock'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-700'
                            }`}
                        >
                            Stokta Var
                        </button>
                        <button
                            onClick={() => setStockFilter('out_of_stock')}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                                stockFilter === 'out_of_stock'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-700'
                            }`}
                        >
                            Tükenenler
                        </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 pl-2">
                        <IconComponent className="w-3.5 h-3.5 text-orange-400" />
                        <span className="font-medium">{filteredBrandModels.length} Model</span>
                    </div>
                </div>

                {/* 4. MODEL LIST */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-24 min-h-0">
                    {filteredBrandModels.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-xs my-4">
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
                                <IconComponent className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                {searchTerm ? 'Aramaya Uygun Model Bulunamadı' : `${selectedBrand} İçin Henüz Model Eklenmemiş`}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                {searchTerm
                                    ? 'Farklı bir arama terimi deneyebilir veya filtreleri temizleyebilirsiniz.'
                                    : 'Aşağıdaki turuncu "+" butonuna basarak bu markaya yeni model ekleyebilirsiniz.'}
                            </p>
                        </div>
                    ) : (
                        filteredBrandModels.map((item) => {
                            const qty = getItemQuantity(item);
                            const { inbound, outbound } = getItemCounts(item);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs hover:border-orange-300 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group"
                                >
                                    {/* Left Color Stripe based on stock availability */}
                                    <div
                                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                                            qty > 0 ? 'bg-gradient-to-b from-emerald-500 to-teal-500' : 'bg-rose-500'
                                        }`}
                                    />

                                    {/* Row 1: Model Feature / Capacity + Quantity Badge */}
                                    <div className="flex items-center justify-between gap-2 mb-1 pl-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[#e65100] font-black text-xs uppercase tracking-wide truncate">
                                                {item.brand}
                                            </span>
                                            {(item.capacity || item.feature) && (
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">
                                                    {item.capacity || item.feature}
                                                </span>
                                            )}
                                            {config.type === 'radiator' && item.height && item.length && (
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">
                                                    {item.height}x{item.length} mm
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock Badge */}
                                        <div className="shrink-0">
                                            {qty > 0 ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                                                    {qty} ADET
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                                                    TÜKENDİ (0)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 2: Model Name */}
                                    <div className="mb-2 pl-1">
                                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                                            {item.model || `${item.brand} ${config.itemLabel}`}
                                        </h3>
                                    </div>

                                    {/* Row 3: Sub-details (Inbound / Outbound counts + Chevron prompt) */}
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 pl-1 text-slate-500">
                                        <div className="flex items-center gap-3">
                                            {config.type !== 'radiator' ? (
                                                <>
                                                    <span className="flex items-center gap-1 text-[11px]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        Giriş: <strong className="text-slate-700 font-bold">{inbound}</strong>
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[11px]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                        Çıkış: <strong className="text-slate-700 font-bold">{outbound}</strong>
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-slate-500">
                                                    Radyatör paneli • <strong>{qty} adet</strong>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-[#e65100] font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                                            <span>Detay & Barkodlar</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 5. FLOATING ACTION BUTTON (FAB) FOR ADDING NEW MODEL UNDER CURRENT BRAND */}
                <div className="fixed bottom-6 right-5 z-40">
                    <button
                        onClick={() => {
                            setInitialBrandForAdd(selectedBrand);
                            setIsAddModalOpen(true);
                        }}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f57c00] to-[#e65100] text-white shadow-xl shadow-orange-500/40 flex items-center justify-center active:scale-95 transition-all hover:brightness-105 border-2 border-white/30"
                        title={`${selectedBrand} Modeli Ekle`}
                    >
                        <Plus className="w-7 h-7 stroke-[2.5]" />
                    </button>
                </div>

                {/* MODALS */}
                {isAddModalOpen && config.type === 'combi' && (
                    <StockCombiModal
                        isOpen={true}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setInitialBrandForAdd('');
                        }}
                        onSave={handleSaveCombi}
                        initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                    />
                )}
                {isAddModalOpen && config.type === 'radiator' && (
                    <StockRadiatorModal
                        isOpen={true}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setInitialBrandForAdd('');
                        }}
                        onSave={handleSaveRadiator}
                        initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                    />
                )}
                {isAddModalOpen && config.type === 'generic' && (
                    <StockGenericModal
                        isOpen={true}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setInitialBrandForAdd('');
                        }}
                        onSave={handleSaveGeneric}
                        itemLabel={config.itemLabel}
                        initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                    />
                )}
            </div>
        );
    }

    // =========================================================================
    // RENDER: LEVEL 1 - BRAND LIST VIEW (Default Screen for Category)
    // =========================================================================
    return (
        <div className="flex flex-col h-screen bg-[#f1f5f9] font-sans overflow-hidden">
            {/* 1. STICKY TOP ORANGE ERP HEADER */}
            <div className="sticky top-0 z-30 px-4 py-3 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToMenu}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs shrink-0"
                        title="Ana Menüye Dön"
                    >
                        <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black tracking-tight text-white uppercase">{config.title}</h2>
                        <span className="text-[11px] text-orange-100 font-medium">
                            Toplam <span className="font-black text-white">{brandGroups.length}</span> Marka • {totalStockQuantity} Adet Stok
                        </span>
                    </div>
                </div>

                {onSwitchToClassic && (
                    <button
                        onClick={onSwitchToClassic}
                        className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold border border-white/30 active:scale-95 transition-all shrink-0"
                        title="Klasik Görünüme Geç"
                    >
                        Klasik
                    </button>
                )}
            </div>

            {/* 2. SEARCH ROW */}
            <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 shadow-xs">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Marka ara (Demirdöküm, E.C.A, Vaillant...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100/90 text-slate-800 text-xs rounded-xl pl-9 pr-8 py-2 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:bg-white transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. DARK SLATE TOOLBAR ROW */}
            <div className="bg-[#1e293b] px-3 py-2 flex items-center justify-between text-white shrink-0 text-xs shadow-inner">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                    <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-[11px]">
                        Markalar ({brandGroups.length})
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 shrink-0">
                    <IconComponent className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-bold text-emerald-400">{totalStockQuantity}</span>
                    <span className="text-slate-400">Adet Toplam Stok</span>
                </div>
            </div>

            {/* 4. BRAND LIST */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 pb-24 min-h-0">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        <span className="text-xs font-semibold">Markalar yükleniyor...</span>
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-xs my-4">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
                            <IconComponent className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            {searchTerm ? 'Aramaya Uygun Marka Bulunamadı' : 'Henüz Marka Kaydı Yok'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            {searchTerm
                                ? 'Farklı bir arama terimi deneyebilir veya aramayı temizleyebilirsiniz.'
                                : 'Aşağıdaki turuncu "+" butonuna basarak ilk stok modelinizi kaydedebilirsiniz.'}
                        </p>
                    </div>
                ) : (
                    filteredBrands.map((bg) => {
                        return (
                            <div
                                key={bg.brand}
                                onClick={() => {
                                    setSelectedBrand(bg.brand);
                                    setSearchTerm('');
                                    setStockFilter('all');
                                }}
                                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-orange-300 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group flex items-center justify-between"
                            >
                                {/* Left accent indicator */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#e65100] to-[#fb8c00]" />

                                <div className="flex items-center gap-3.5 pl-2 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#e65100] flex items-center justify-center font-black shrink-0 border border-orange-100/80 group-hover:scale-105 transition-transform shadow-xs">
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-[#e65100] transition-colors">
                                            {bg.brand}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                {bg.models.length} Model
                                            </span>
                                            <span className="text-[11px] text-slate-300">•</span>
                                            {bg.totalQty > 0 ? (
                                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                                    {bg.totalQty} Adet Stokta
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                                    Tükendi (0)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#e65100] group-hover:translate-x-1 transition-all shrink-0 pr-1">
                                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 5. FLOATING ACTION BUTTON (FAB) FOR ADDING NEW MODEL */}
            <div className="fixed bottom-6 right-5 z-40">
                <button
                    onClick={() => {
                        setInitialBrandForAdd('');
                        setIsAddModalOpen(true);
                    }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f57c00] to-[#e65100] text-white shadow-xl shadow-orange-500/40 flex items-center justify-center active:scale-95 transition-all hover:brightness-105 border-2 border-white/30"
                    title="Yeni Stok Kaydı Ekle"
                >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                </button>
            </div>

            {/* MODALS */}
            {isAddModalOpen && config.type === 'combi' && (
                <StockCombiModal
                    isOpen={true}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setInitialBrandForAdd('');
                    }}
                    onSave={handleSaveCombi}
                    initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                />
            )}
            {isAddModalOpen && config.type === 'radiator' && (
                <StockRadiatorModal
                    isOpen={true}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setInitialBrandForAdd('');
                    }}
                    onSave={handleSaveRadiator}
                    initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                />
            )}
            {isAddModalOpen && config.type === 'generic' && (
                <StockGenericModal
                    isOpen={true}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setInitialBrandForAdd('');
                    }}
                    onSave={handleSaveGeneric}
                    itemLabel={config.itemLabel}
                    initialData={initialBrandForAdd ? ({ brand: initialBrandForAdd } as any) : undefined}
                />
            )}
        </div>
    );
};

export default MobileErpStockView;
