import React, { useState } from 'react';
import { StockCombi, BarcodeData, OutboundBarcodeData } from '@/types';
import { QrCode, AlertTriangle, CheckCircle, Clock, Trash2, X, ArrowUpRight, ArrowDownLeft, User, Pencil, Save } from 'lucide-react';
import { Scanner } from './Scanner';
import { parseBarcode } from '@/utils/barcode';
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/src/firebase';

interface StockCombiRowDetailProps {
    stock: StockCombi;
}

const StockCombiRowDetail: React.FC<StockCombiRowDetailProps> = ({ stock }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
    const [customerNameInput, setCustomerNameInput] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);

    // Editing State
    const [editingBarcode, setEditingBarcode] = useState<{
        item: any;
        index: number;
        type: 'inbound' | 'outbound';
    } | null>(null);
    const [editForm, setEditForm] = useState({
        originalCode: '',
        customerName: '',
        productionDate: '',
        expiryDate: '',
        outputDate: ''
    });

    const toDateInput = (date: any) => {
        if (!date) return '';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            return d.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    const handleEditBarcodeClick = (barcode: any, index: number, type: 'inbound' | 'outbound') => {
        setEditingBarcode({ item: barcode, index, type });
        setEditForm({
            originalCode: barcode.originalCode || '',
            customerName: barcode.customerName || '',
            productionDate: toDateInput(barcode.productionDate),
            expiryDate: toDateInput(barcode.expiryDate),
            outputDate: toDateInput(barcode.outputDate || barcode.scannedAt)
        });
    };

    const handleSaveBarcodeEdit = async () => {
        if (!editingBarcode) return;
        
        const stockRef = doc(db, 'stock_combis', stock.id);
        const { item, index, type } = editingBarcode;
        
        const updatedItem = { ...item };
        updatedItem.originalCode = editForm.originalCode;
        if (editForm.productionDate) updatedItem.productionDate = Timestamp.fromDate(new Date(editForm.productionDate));
        if (editForm.expiryDate) updatedItem.expiryDate = Timestamp.fromDate(new Date(editForm.expiryDate));
        
        if (type === 'outbound') {
            updatedItem.customerName = editForm.customerName;
            if (editForm.outputDate) updatedItem.outputDate = Timestamp.fromDate(new Date(editForm.outputDate));
        }
        
        try {
            if (type === 'inbound') {
                const newArray = [...(stock.barcodes || [])];
                newArray[index] = updatedItem;
                await updateDoc(stockRef, { barcodes: newArray });
            } else {
                const newArray = [...(stock.outboundBarcodes || [])];
                newArray[index] = updatedItem;
                await updateDoc(stockRef, { outboundBarcodes: newArray });
            }
            setEditingBarcode(null);
        } catch (error) {
            console.error("Error updating barcode", error);
            alert("Güncelleme başarısız!");
        }
    };

    // Helper to check for duplicates in the OTHER list
    const isBarcodeInOtherList = (code: string, currentTab: 'inbound' | 'outbound') => {
        if (currentTab === 'inbound') {
            return stock.outboundBarcodes?.some(b => b.originalCode === code);
        } else {
            return stock.barcodes?.some(b => b.originalCode === code);
        }
    };

    const handleStartScanning = () => {
        if (activeTab === 'outbound') {
            setCustomerNameInput('');
            setShowNameModal(true);
        } else {
            setIsScanning(true);
        }
    };

    const handleNameSubmit = () => {
        if (!customerNameInput.trim()) {
            alert("Lütfen Müşteri Adı Giriniz");
            return;
        }
        setShowNameModal(false);
        setIsScanning(true);
    };

    const handleScanSuccess = async (code: string) => {
        const parsedData = parseBarcode(code);
        if (parsedData.status === 'invalid') {
            alert("Geçersiz Barkod Formatı!");
            return;
        }

        const stockRef = doc(db, 'stock_combis', stock.id);

        try {
            if (activeTab === 'inbound') {
                // INBOUND LOGIC
                if (stock.barcodes?.some(b => b.originalCode === code)) {
                    alert("Bu barkod giriş listesinde zaten ekli!");
                    return;
                }

                const newBarcode: BarcodeData = {
                    ...parsedData,
                    scannedAt: Timestamp.now(),
                    productionDate: Timestamp.fromDate(parsedData.productionDate),
                    expiryDate: Timestamp.fromDate(parsedData.expiryDate)
                };

                await updateDoc(stockRef, {
                    barcodes: arrayUnion(newBarcode)
                });

            } else {
                // OUTBOUND LOGIC
                if (stock.outboundBarcodes?.some(b => b.originalCode === code)) {
                    alert("Bu barkod çıkış listesinde zaten ekli!");
                    return;
                }

                const newOutboundBarcode: OutboundBarcodeData = {
                    ...parsedData,
                    customerName: customerNameInput,
                    outputDate: Timestamp.now(),
                    // We also keep original fields
                    scannedAt: Timestamp.now(),
                    productionDate: Timestamp.fromDate(parsedData.productionDate),
                    expiryDate: Timestamp.fromDate(parsedData.expiryDate)
                };

                await updateDoc(stockRef, {
                    outboundBarcodes: arrayUnion(newOutboundBarcode)
                });
            }
        } catch (error) {
            console.error("Error adding barcode:", error);
            alert("Barkod kaydedilemedi.");
        }
    };

    const handleDeleteBarcode = async (barcode: BarcodeData | OutboundBarcodeData) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            const stockRef = doc(db, 'stock_combis', stock.id);
            if (activeTab === 'inbound') {
                await updateDoc(stockRef, {
                    barcodes: arrayRemove(barcode)
                });
            } else {
                await updateDoc(stockRef, {
                    outboundBarcodes: arrayRemove(barcode)
                });
            }
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
        <div className="bg-slate-50 border-t border-b border-slate-200 shadow-inner p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">

            {/* Tab Navigation */}
            {!isScanning && (
                <div className="flex space-x-4 border-b border-slate-200 mb-6">
                    <button
                        onClick={() => setActiveTab('inbound')}
                        className={`pb-2 px-4 flex items-center gap-2 font-bold text-sm transition-colors relative ${activeTab === 'inbound'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowDownLeft className="w-4 h-4" />
                        Giriş (Stok)
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                            {stock.barcodes?.length || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('outbound')}
                        className={`pb-2 px-4 flex items-center gap-2 font-bold text-sm transition-colors relative ${activeTab === 'outbound'
                            ? 'text-orange-600 border-b-2 border-orange-600'
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Çıkış (Satış)
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                            {stock.outboundBarcodes?.length || 0}
                        </span>
                    </button>
                </div>
            )}

            {/* Content Area */}
            {isScanning ? (
                <div className="max-w-xl mx-auto">
                    {activeTab === 'outbound' && (
                        <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-center gap-2 text-orange-800">
                            <User className="w-4 h-4" />
                            <span className="font-bold text-sm">Müşteri: {customerNameInput}</span>
                        </div>
                    )}
                    <Scanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setIsScanning(false)}
                        // Pass relevant list for "Last Scanned" view in scanner
                        existingBarcodes={activeTab === 'inbound' ? (stock.barcodes || []) : (stock.outboundBarcodes || [])}
                        onDelete={handleDeleteBarcode}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Header & Action Button */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {activeTab === 'inbound' ? (
                                <>
                                    <QrCode className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-slate-700">Stoktaki Ürünler</h4>
                                </>
                            ) : (
                                <>
                                    <User className="w-5 h-5 text-orange-600" />
                                    <h4 className="font-bold text-slate-700">Çıkışı Yapılan Ürünler</h4>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleStartScanning}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 ${activeTab === 'inbound'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                }`}
                        >
                            <QrCode className="w-4 h-4" />
                            {activeTab === 'inbound' ? 'Stok Ekle' : 'Çıkış Yap'}
                        </button>
                    </div>

                    {/* Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeTab === 'inbound' ? (
                            // INBOUND LIST
                            (!stock.barcodes || stock.barcodes.length === 0) ? (
                                <div className="col-span-full text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-400 text-sm">Stok girişi yapılmamış.</p>
                                </div>
                            ) : (
                                stock.barcodes.map((barcode, index) => {
                                    const isMatched = isBarcodeInOtherList(barcode.originalCode, 'inbound');
                                    return (
                                        <div key={index} 
                                            onClick={() => handleEditBarcodeClick(barcode, index, 'inbound')}
                                            className={`p-3 rounded-lg border shadow-sm flex items-start gap-3 transition-colors group relative cursor-pointer hover:shadow-md ${isMatched ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-blue-300'
                                            }`}>
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMatched ? 'bg-red-200 text-red-700' :
                                                    barcode.status === 'safe' ? 'bg-green-100 text-green-600' :
                                                        barcode.status === 'expired' ? 'bg-red-100 text-red-600' :
                                                            'bg-orange-100 text-orange-600'
                                                }`}>
                                                {barcode.status === 'safe' ? <CheckCircle className="w-5 h-5" /> :
                                                    barcode.status === 'expired' ? <AlertTriangle className="w-5 h-5" /> :
                                                        <Clock className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-mono font-bold text-sm truncate ${isMatched ? 'text-red-700' : 'text-slate-800'}`} title={barcode.originalCode}>
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
                                                {isMatched && (
                                                    <div className="mt-2 text-[10px] font-bold text-red-600 flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded w-fit">
                                                        <ArrowUpRight className="w-3 h-3" /> Çıkışı Yapıldı
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBarcode(barcode); }}
                                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            // OUTBOUND LIST
                            (!stock.outboundBarcodes || stock.outboundBarcodes.length === 0) ? (
                                <div className="col-span-full text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-400 text-sm">Henüz çıkış yapılmamış.</p>
                                </div>
                            ) : (
                                stock.outboundBarcodes.map((barcode, index) => {
                                    const isMatched = isBarcodeInOtherList(barcode.originalCode, 'outbound');
                                    return (
                                        <div key={index} 
                                            onClick={() => handleEditBarcodeClick(barcode, index, 'outbound')}
                                            className={`p-3 rounded-lg border shadow-sm flex items-start gap-3 transition-colors group relative cursor-pointer hover:shadow-md ${isMatched ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-orange-300'
                                            }`}>
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMatched ? 'bg-red-200 text-red-700' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-500 font-bold mb-0.5">
                                                    {barcode.customerName}
                                                </div>
                                                <div className={`font-mono font-bold text-sm truncate ${isMatched ? 'text-red-700' : 'text-slate-800'}`} title={barcode.originalCode}>
                                                    {barcode.originalCode}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                                    <div className="flex justify-between">
                                                        <span>Çıkış Tarihi:</span>
                                                        <span className="font-medium text-slate-700">{formatDate(barcode.outputDate || barcode.scannedAt)}</span>
                                                    </div>
                                                </div>
                                                {isMatched && (
                                                    <div className="mt-2 text-[10px] font-bold text-red-600 flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded w-fit">
                                                        <ArrowDownLeft className="w-3 h-3" /> Stokta Mevcut
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBarcode(barcode); }}
                                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Customer Name Modal */}
            {showNameModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Müşteri Bilgisi</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Müşteri Adı Soyadı
                                </label>
                                <input
                                    type="text"
                                    value={customerNameInput}
                                    onChange={(e) => setCustomerNameInput(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Örn: Ahmet Yılmaz"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNameModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleNameSubmit}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700"
                                >
                                    Devam Et
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Barcode Edit Modal */}
            {editingBarcode && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-blue-500" />
                                {editingBarcode.type === 'inbound' ? 'Giriş Barkodu Düzenle' : 'Çıkış Barkodu Düzenle'}
                            </h3>
                            <button onClick={() => setEditingBarcode(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Barkod No / Model</label>
                                <input
                                    type="text"
                                    value={editForm.originalCode}
                                    onChange={(e) => setEditForm({...editForm, originalCode: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm transition-all"
                                />
                            </div>

                            {editingBarcode.type === 'outbound' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Müşteri Adı</label>
                                    <input
                                        type="text"
                                        value={editForm.customerName}
                                        onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Üretim Tarihi</label>
                                    <input
                                        type="date"
                                        value={editForm.productionDate}
                                        onChange={(e) => setEditForm({...editForm, productionDate: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SKT</label>
                                    <input
                                        type="date"
                                        value={editForm.expiryDate}
                                        onChange={(e) => setEditForm({...editForm, expiryDate: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            {editingBarcode.type === 'outbound' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Çıkış Tarihi</label>
                                    <input
                                        type="date"
                                        value={editForm.outputDate}
                                        onChange={(e) => setEditForm({...editForm, outputDate: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                                    />
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleSaveBarcodeEdit}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    <Save className="w-5 h-5" /> Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockCombiRowDetail;
