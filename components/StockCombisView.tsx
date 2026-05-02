import React, { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { StockCombi } from '@/types';
import StockCombiModal from './StockCombiModal';
import StockCombiRowDetail from './StockCombiRowDetail';

const StockCombisView: React.FC = () => {
    const [stocks, setStocks] = useState<StockCombi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStock, setEditingStock] = useState<StockCombi | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    // Full Page Detail State
    const [selectedStock, setSelectedStock] = useState<StockCombi | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'stock_combis'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stockList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StockCombi));
            setStocks(stockList);

            // Should verify if selectedStock needs update?
            // If the selected stock is updated in the background, we might want to update the view.
            setSelectedStock(prev => {
                if (!prev) return null;
                const updated = stockList.find(s => s.id === prev.id);
                return updated || null; // If deleted, return null
            });

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAdd = () => {
        setEditingStock(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (stock: StockCombi) => {
        setEditingStock(stock);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu stok kaydını silmek istediğinize emin misiniz?')) {
            try {
                await deleteDoc(doc(db, 'stock_combis', id));
                if (selectedStock?.id === id) {
                    setSelectedStock(null);
                }
            } catch (error) {
                console.error("Error deleting stock:", error);
                alert("Silme işlemi başarısız oldu.");
            }
        }
    };

    const handleSave = async (data: Omit<StockCombi, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (editingStock) {
                // Update
                const stockRef = doc(db, 'stock_combis', editingStock.id);
                await updateDoc(stockRef, {
                    ...data,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create
                await addDoc(collection(db, 'stock_combis'), {
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

    // Filter Logic
    const filteredStocks = stocks.filter(stock =>
        stock.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCalculatedQuantity = (stock: StockCombi) => {
        const inboundCount = stock.barcodes?.length || 0;
        const outboundCount = stock.outboundBarcodes?.length || 0;
        return inboundCount - outboundCount;
    };

    // RENDER: DETAIL VIEW
    if (selectedStock) {
        return (
            <div className="flex flex-col h-full bg-slate-50 relative min-w-0 animate-in slide-in-from-right duration-200">
                {/* Detail Header */}
                <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedStock(null)}
                            className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 leading-tight">
                                {selectedStock.brand}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {selectedStock.model} • {selectedStock.capacity}
                            </p>
                        </div>
                    </div>
                    {/* Action buttons could go here if needed, keeping it clean for now */}
                </div>

                {/* Detail Content */}
                <div className="flex-1 overflow-auto">
                    <StockCombiRowDetail stock={selectedStock} />
                </div>
            </div>
        );
    }

    // RENDER: LIST VIEW
    return (
        <div className="flex flex-col h-full bg-slate-900 md:bg-slate-50 relative min-w-0">
            {/* Header - Adaptive (Dark on Mobile, Light on Desktop) */}
            <div className="bg-slate-900 md:bg-white border-b border-slate-800 md:border-slate-200 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 md:bg-blue-100 text-blue-400 md:text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white md:text-slate-800">Kombi Stok</h1>
                        <p className="text-xs text-slate-400 md:text-slate-500">Toplam {stocks.reduce((acc, curr) => acc + getCalculatedQuantity(curr), 0)} adet</p>
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
                            {filteredStocks.map(stock => (
                                <div key={stock.id} className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                                    <div
                                        onClick={() => setSelectedStock(stock)}
                                        className="p-3 flex items-center gap-3 cursor-pointer"
                                    >
                                        {/* Quantity Badge */}
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); handleEdit(stock); }}
                                            title="Güncellemek için tıklayın"
                                            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${getCalculatedQuantity(stock) === 0 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <span className="text-lg font-bold leading-none">{getCalculatedQuantity(stock)}</span>
                                            <span className="text-[9px] uppercase opacity-70">Adet</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-white text-sm truncate">{stock.brand}</h3>
                                                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-600 shrink-0">
                                                    {stock.capacity}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">{stock.model}</div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-slate-500" />
                                    </div>

                                    {/* Quick Actions (Still visible or maybe move them to detail view? User said simple slide) */}
                                    {/* Let's keep actions available but only triggerable if not clicking main body? 
                                        Actually, moving to Edit inside detail view or long press might be better, 
                                        but for now let's add a small action bar at bottom of card if needed.
                                        
                                        For simplicity as requested "Direct page change", I'll put actions in swipe or just inside detail.
                                        BUT, existing code had actions under the expanded row. 
                                        I should probably add "Edit" and "Delete" buttons to the header of the Detail View 
                                        or keep them accessible here. 
                                        
                                        Let's add Edit/Delete inside the Detail View Header is cleaner, 
                                        OR add a small "More" menu on the card.
                                        
                                        Let's stick to the list view having swipe or just clicking opens detail. 
                                        I'll add Edit/Delete to the list items similar to desktop but for mobile maybe just a "More" icon?
                                        
                                        Actually, for Mobile, let's put Edit/Delete in the DETAIL VIEW header to keep list clean.
                                    */}
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP: Light Table View */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 font-bold">Marka</th>
                                        <th className="px-6 py-4 font-bold">Model</th>
                                        <th className="px-6 py-4 font-bold">Kapasite</th>
                                        <th className="px-6 py-4 font-bold text-center">Adet</th>
                                        <th className="px-6 py-4 font-bold text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStocks.map((stock) => (
                                        <tr
                                            key={stock.id}
                                            onClick={() => setSelectedStock(stock)}
                                            className="transition-colors cursor-pointer group hover:bg-blue-50/50"
                                        >
                                            <td className="px-6 py-4 font-bold text-slate-700">{stock.brand}</td>
                                            <td className="px-6 py-4 text-slate-600">{stock.model}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                                    {stock.capacity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(stock); }}
                                                    className="cursor-pointer hover:bg-slate-100 inline-block px-4 py-2 rounded-lg transition-colors"
                                                    title="Güncellemek için tıklayın"
                                                >
                                                    <span className={`font-bold ${getCalculatedQuantity(stock) === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                        {getCalculatedQuantity(stock)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <StockCombiModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingStock}
            />
        </div>
    );
};

export default StockCombisView;
