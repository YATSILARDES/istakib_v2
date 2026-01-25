import React, { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../src/firebase'; // Fixed import
import { StockGenericItem } from '../types'; // Fixed import
import StockGenericModal from './StockGenericModal';
import StockGenericRowDetail from './StockGenericRowDetail';

interface StockGenericViewProps {
    collectionName: string;
    title: string;
    itemLabel: string; // e.g., 'Klima', 'Isı Pompası'
}

const StockGenericView: React.FC<StockGenericViewProps> = ({ collectionName, title, itemLabel }) => {
    const [stocks, setStocks] = useState<StockGenericItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStock, setEditingStock] = useState<StockGenericItem | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stockList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StockGenericItem));
            setStocks(stockList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const handleAdd = () => {
        setEditingStock(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (stock: StockGenericItem) => {
        setEditingStock(stock);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (window.confirm('Bu stok kaydını silmek istediğinize emin misiniz?')) {
            try {
                await deleteDoc(doc(db, collectionName, id));
            } catch (error) {
                console.error("Error deleting stock:", error);
                alert("Silme işlemi başarısız oldu.");
            }
        }
    };

    const handleSave = async (data: Omit<StockGenericItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (editingStock) {
                const stockRef = doc(db, collectionName, editingStock.id);
                await updateDoc(stockRef, {
                    ...data,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, collectionName), {
                    ...data,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error saving stock:", error);
            alert("Kaydetme işlemi başarısız oldu.");
            throw error;
        }
    };

    const toggleRow = (id: string) => {
        if (expandedRowId === id) {
            setExpandedRowId(null);
        } else {
            setExpandedRowId(id);
        }
    };

    // Filter Logic
    const filteredStocks = stocks.filter(stock =>
        stock.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.feature.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-900 md:bg-slate-50 relative min-w-0">
            {/* Header - Adaptive */}
            <div className="bg-slate-900 md:bg-white border-b border-slate-800 md:border-slate-200 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 md:bg-blue-100 text-blue-400 md:text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white md:text-slate-800">{title}</h1>
                        <p className="text-xs text-slate-400 md:text-slate-500">Toplam {stocks.reduce((acc, curr) => acc + curr.quantity, 0)} adet</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 md:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Marka/Model Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-9 pr-4 py-2.5 bg-slate-800 md:bg-slate-100 border border-slate-700 md:border-none rounded-xl text-sm text-white md:text-slate-900 placeholder:text-slate-600 md:placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="bg-blue-600 hover:bg-blue-500 md:hover:bg-blue-700 text-white p-2.5 md:px-4 md:py-2 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0 font-bold flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5 md:w-4 md:h-4" />
                        <span className="hidden md:inline">Stok Ekle</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-blue-500/30 md:border-blue-200 border-t-blue-500 md:border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : filteredStocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                        <Package className="w-16 h-16 text-slate-700 md:text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-400 md:text-slate-700">Kayıt Yok</h3>
                        <p className="text-slate-600 md:text-slate-500 text-sm">Aradığınız kriterde stok bulunamadı.</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: Dark Card List View */}
                        <div className="md:hidden space-y-3">
                            {filteredStocks.map(stock => {
                                const isExpanded = expandedRowId === stock.id;
                                return (
                                    <div key={stock.id} className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
                                        <div
                                            onClick={() => toggleRow(stock.id)}
                                            className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-700/50' : 'active:bg-slate-700/30'}`}
                                        >
                                            {/* Quantity Badge */}
                                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 ${stock.quantity === 0 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                <span className="text-lg font-bold leading-none">{stock.quantity}</span>
                                                <span className="text-[9px] uppercase opacity-70">Adet</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-bold text-white text-sm truncate">{stock.brand}</h3>
                                                    <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-600 shrink-0">
                                                        {stock.feature}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 truncate">{stock.model}</div>
                                            </div>

                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-700 bg-slate-900/30 p-3">
                                                {(editingStock === undefined) && (
                                                    <div className="flex gap-2 mb-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(stock); }}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> Düzenle
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(stock.id, e)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Sil
                                                        </button>
                                                    </div>
                                                )}

                                                <StockGenericRowDetail stock={stock} collectionName={collectionName} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP: Light Table View */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 font-bold"></th>
                                        <th className="px-6 py-4 font-bold">Marka</th>
                                        <th className="px-6 py-4 font-bold">Model</th>
                                        <th className="px-6 py-4 font-bold">Özellik (KW/Litre/BTU)</th>
                                        <th className="px-6 py-4 font-bold text-center">Adet</th>
                                        <th className="px-6 py-4 font-bold text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStocks.map((stock) => {
                                        const isExpanded = expandedRowId === stock.id;
                                        return (
                                            <React.Fragment key={stock.id}>
                                                <tr
                                                    onClick={() => toggleRow(stock.id)}
                                                    className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
                                                >
                                                    <td className="px-6 py-4 text-slate-400">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-700">{stock.brand}</td>
                                                    <td className="px-6 py-4 text-slate-600">{stock.model}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                                            {stock.feature}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`font-bold ${stock.quantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                            {stock.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(stock); }}
                                                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(stock.id, e)}
                                                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                                                title="Sil"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={6} className="p-0">
                                                            <StockGenericRowDetail stock={stock} collectionName={collectionName} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <StockGenericModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingStock}
                itemLabel={itemLabel}
            />
        </div>
    );
};

export default StockGenericView;
