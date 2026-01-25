import React, { useState } from 'react';
import { StockGenericItem, BarcodeData } from '@/types';
import { QrCode, AlertTriangle, CheckCircle, Clock, Trash2, X } from 'lucide-react';
import { Scanner } from './Scanner';
import { parseBarcode } from '@/utils/barcode';
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/src/firebase';

interface StockGenericRowDetailProps {
    stock: StockGenericItem;
    collectionName: string;
}

const StockGenericRowDetail: React.FC<StockGenericRowDetailProps> = ({ stock, collectionName }) => {
    const [isScanning, setIsScanning] = useState(false);

    const handleScanSuccess = async (code: string) => {
        setIsScanning(false);

        const parsedData = parseBarcode(code);
        if (parsedData.status === 'invalid') {
            alert("Geçersiz Barkod Formatı!");
            return;
        }

        if (stock.barcodes?.some(b => b.originalCode === code)) {
            alert("Bu barkod zaten ekli!");
            return;
        }

        try {
            const stockRef = doc(db, collectionName, stock.id);
            const newBarcode: BarcodeData = {
                ...parsedData,
                scannedAt: Timestamp.now(),
                productionDate: Timestamp.fromDate(parsedData.productionDate),
                expiryDate: Timestamp.fromDate(parsedData.expiryDate)
            };

            await updateDoc(stockRef, {
                barcodes: arrayUnion(newBarcode)
            });
        } catch (error) {
            console.error("Error adding barcode:", error);
            alert("Barkod kaydedilemedi.");
        }
    };

    const handleDeleteBarcode = async (barcode: BarcodeData) => {
        if (!confirm('Bu barkodu silmek istediğinize emin misiniz?')) return;
        try {
            const stockRef = doc(db, collectionName, stock.id);
            await updateDoc(stockRef, {
                barcodes: arrayRemove(barcode)
            });
        } catch (error) {
            console.error("Error deleting barcode:", error);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('tr-TR');
    };

    return (
        <div className="bg-slate-50 border-t border-b border-slate-200 shadow-inner p-6 animate-in slide-in-from-top-2 duration-200">
            {isScanning ? (
                <div className="max-w-xl mx-auto">
                    <Scanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setIsScanning(false)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-slate-500" />
                            <h4 className="font-bold text-slate-700">Kayıtlı Barkodlar / Seri Numaraları</h4>
                        </div>
                        <button
                            onClick={() => setIsScanning(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
                        >
                            <QrCode className="w-4 h-4" />
                            Yeni Barkod Tara
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(!stock.barcodes || stock.barcodes.length === 0) ? (
                            <div className="col-span-full text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-400 text-sm">Henüz barkod eklenmemiş.</p>
                            </div>
                        ) : (
                            stock.barcodes.map((barcode, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3 hover:border-blue-300 transition-colors group relative">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${barcode.status === 'safe' ? 'bg-green-100 text-green-600' :
                                        barcode.status === 'expired' ? 'bg-red-100 text-red-600' :
                                            'bg-orange-100 text-orange-600'
                                        }`}>
                                        {barcode.status === 'safe' ? <CheckCircle className="w-5 h-5" /> :
                                            barcode.status === 'expired' ? <AlertTriangle className="w-5 h-5" /> :
                                                <Clock className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono font-bold text-slate-800 text-sm truncate" title={barcode.originalCode}>
                                            {barcode.originalCode}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                            <div className="flex justify-between">
                                                <span>Üretim:</span>
                                                <span className="font-medium text-slate-700">{formatDate(barcode.productionDate)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Son Kull:</span>
                                                <span className={`font-medium ${barcode.status === 'expired' ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {formatDate(barcode.expiryDate)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteBarcode(barcode)}
                                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockGenericRowDetail;
