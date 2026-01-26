import React, { useState, useEffect } from 'react';
import { StockCombi } from '@/types';
import { Package, Save, X } from 'lucide-react';

interface StockCombiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<StockCombi, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    initialData?: StockCombi;
}

const StockCombiModal: React.FC<StockCombiModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        capacity: '',
        quantity: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    brand: initialData.brand,
                    model: initialData.model,
                    capacity: initialData.capacity,
                    quantity: initialData.quantity
                });
            } else {
                setFormData({
                    brand: '',
                    model: '',
                    capacity: '',
                    quantity: 0
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Error saving stock:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        {initialData ? 'Kombi Stoğu Düzenle' : 'Yeni Kombi Stoğu Ekle'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700">Marka</label>
                        <input
                            type="text"
                            required
                            value={formData.brand}
                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="Örn: Demirdöküm, Vaillant"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700">Model</label>
                        <input
                            type="text"
                            required
                            value={formData.model}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="Örn: Nitromix, Atromix"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">Kapasite</label>
                            <input
                                type="text"
                                required
                                value={formData.capacity}
                                onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                placeholder="Örn: 24kW"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">Adet</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-bold text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockCombiModal;
