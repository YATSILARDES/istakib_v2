import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Save } from 'lucide-react';
import { StockGenericItem } from '@/types';

interface StockGenericModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<StockGenericItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    initialData?: StockGenericItem;
    itemLabel: string;
}

const StockGenericModal: React.FC<StockGenericModalProps> = ({ isOpen, onClose, onSave, initialData, itemLabel }) => {
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [feature, setFeature] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setBrand(initialData.brand);
            setModel(initialData.model);
            setFeature(initialData.feature);
            setQuantity(initialData.quantity);
        } else {
            setBrand('');
            setModel('');
            setFeature('');
            setQuantity(1);
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brand || !model || !feature) {
            alert("Lütfen marka, model ve özellik alanlarını doldurun.");
            return;
        }

        setLoading(true);
        try {
            await onSave({
                brand,
                model,
                feature,
                quantity
            });
            onClose();
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">
                        {initialData ? `${itemLabel} Düzenle` : `Yeni ${itemLabel} Ekle`}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Marka</label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Örn: Daikin, Baymak..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Model</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Örn: 24000 BTU, 12 KW..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Özellik (Kapasite/Tip)</label>
                        <input
                            type="text"
                            value={feature}
                            onChange={(e) => setFeature(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Örn: 12000 BTU, 65 Litre..."
                        />
                        <p className="text-xs text-slate-500 mt-1">İlgili ürünün kapasite veya ayırt edici özelliği.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Stok Adedi</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setQuantity(q => Math.max(0, q - 1))}
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                className="flex-1 p-3 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                            />
                            <button
                                type="button"
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Kaydediliyor...' : <><Save className="w-5 h-5" /> Kaydet</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockGenericModal;
