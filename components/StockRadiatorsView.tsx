import React, { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { StockRadiator } from '@/types';
import StockRadiatorModal from './StockRadiatorModal';

const StockRadiatorsView: React.FC = () => {
    const [stocks, setStocks] = useState<StockRadiator[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStock, setEditingStock] = useState<StockRadiator | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'stock_radiators'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stockList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StockRadiator));
            setStocks(stockList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAdd = () => {
        setEditingStock(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (stock: StockRadiator) => {
        setEditingStock(stock);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu stok kaydını silmek istediğinize emin misiniz?')) {
            try {
                await deleteDoc(doc(db, 'stock_radiators', id));
            } catch (error) {
                console.error("Error deleting stock:", error);
                alert("Silme işlemi başarısız oldu.");
            }
        }
    };

    const handleSave = async (data: Omit<StockRadiator, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (editingStock) {
                // Update
                const stockRef = doc(db, 'stock_radiators', editingStock.id);
                await updateDoc(stockRef, {
                    ...data,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create
                await addDoc(collection(db, 'stock_radiators'), {
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
        stock.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 relative min-w-0">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Radyatör Stok Takibi</h1>
                        <p className="text-sm text-slate-500">Toplam {stocks.reduce((acc, curr) => acc + curr.quantity, 0)} adet radyatör stokta</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Marka ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Stok Ekle
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="space-y-8">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                        </div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center opacity-60 p-8">
                            <Package className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Kayıt Bulunamadı</h3>
                            <p className="text-slate-500">Stok listesi boş veya arama kriterine uygun kayıt yok.</p>
                        </div>
                    ) : (
                        // Group and Sort Logic
                        Object.entries(
                            filteredStocks.reduce((acc, stock) => {
                                const h = stock.height;
                                if (!acc[h]) acc[h] = [];
                                acc[h].push(stock);
                                return acc;
                            }, {} as Record<string, StockRadiator[]>)
                        )
                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // Sort Groups by Height (Numeric)
                            .map(([height, groupStocks]) => (
                                <div key={height} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    {/* Group Header */}
                                    <div className="bg-orange-50 border-b border-orange-100 px-6 py-3 flex items-center gap-2">
                                        <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                                        <h2 className="text-lg font-bold text-slate-800">
                                            {height} mm Yükseklik
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                ({groupStocks.reduce((sum, s) => sum + s.quantity, 0)} Adet)
                                            </span>
                                        </h2>
                                    </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-4 font-bold">Marka</th>
                                                <th className="px-6 py-4 font-bold">Uzunluk</th>
                                                <th className="px-6 py-4 font-bold text-center">Adet</th>
                                                <th className="px-6 py-4 font-bold text-right">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupStocks
                                                .sort((a, b) => parseInt(a.length) - parseInt(b.length)) // Sort Items by Length within Group
                                                .map((stock) => (
                                                    <tr key={stock.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4 font-bold text-slate-700">{stock.brand}</td>
                                                        <td className="px-6 py-4 text-slate-600">
                                                            <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                                {stock.length} mm
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
                                                                    onClick={() => handleEdit(stock)}
                                                                    className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                                                    title="Düzenle"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(stock.id)}
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
                            ))
                    )}
                </div>
            </div>

            <StockRadiatorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingStock}
            />
        </div>
    );
};

export default StockRadiatorsView;
