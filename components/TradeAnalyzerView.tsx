import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, TrendingUp, TrendingDown, AlertCircle, RefreshCw, X, ArrowDown, ArrowUp, BarChart2 } from 'lucide-react';

interface TradeData {
  hisse: string;
  islem: string;
  fiyat: number;
  miktar: number;
  mesaj: string;
}

interface StockSummary {
  hisse: string;
  totalBuyQty: number;
  totalSellQty: number;
  netQty: number;
  totalBuyVol: number;
  totalSellVol: number;
  netVol: number;
}

interface FailedTrade {
  hisse: string;
  mesaj: string;
  islem: string;
  miktar: number;
  fiyat: number;
  hacim: number;
}

export default function TradeAnalyzerView() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stockSummaries, setStockSummaries] = useState<StockSummary[]>([]);
  const [failedTrades, setFailedTrades] = useState<FailedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processData = (data: any[]) => {
    // Normalizing keys since Excel imports can have leading/trailing spaces
    // and special Turkish characters might be slightly off sometimes
    const normalizedData: TradeData[] = data.map(row => {
      const keys = Object.keys(row);
      const findKey = (searchStrs: string[]) => {
        return keys.find(k => searchStrs.some(s => k.toLowerCase().includes(s.toLowerCase())));
      };

      const hisseKey = findKey(['hisse']);
      const islemKey = findKey(['işlem', 'islem']); // Can be 'İşlem'
      const fiyatKey = findKey(['fiyat']);
      const miktarKey = findKey(['miktar']);
      const mesajKey = findKey(['işlem mesajı', 'islem mesaji', 'mesajı', 'mesaji', 'mesaj']); // Should prioritize 'İşlem Mesajı'

      // We specifically want 'İşlem Mesajı', not just 'Mesaj'
      // Try to find the exact or closest match for İşlem Mesajı
      const islemMesajiExactKey = keys.find(k => k.replace(/\s+/g, '').toLowerCase().includes('işlemmesaj'));
      const finalMesajKey = islemMesajiExactKey || mesajKey;

      return {
        hisse: hisseKey ? String(row[hisseKey]).trim() : 'BİLİNMEYEN',
        islem: islemKey ? String(row[islemKey]).trim().toLowerCase() : '',
        fiyat: fiyatKey ? Number(String(row[fiyatKey]).replace(',', '.')) || 0 : 0,
        miktar: miktarKey ? Number(String(row[miktarKey]).replace(',', '.')) || 0 : 0,
        mesaj: finalMesajKey ? String(row[finalMesajKey]).trim() : ''
      };
    }).filter(row => row.hisse !== 'BİLİNMEYEN' && row.hisse !== 'undefined' && row.hisse !== '');

    const summaries: Record<string, StockSummary> = {};
    const fails: FailedTrade[] = [];

    normalizedData.forEach(row => {
      // Check message status
      const isSuccess = row.mesaj.toLowerCase().includes('gerçekleşti') || row.mesaj.toLowerCase().includes('gerceklesti');
      
      if (!isSuccess) {
        fails.push({
          hisse: row.hisse,
          mesaj: row.mesaj,
          islem: row.islem.includes('al') ? 'Alış' : 'Satış',
          miktar: row.miktar,
          fiyat: row.fiyat,
          hacim: row.miktar * row.fiyat
        });
        return; // Don't add failed trades to total summary
      }

      if (!summaries[row.hisse]) {
        summaries[row.hisse] = {
          hisse: row.hisse,
          totalBuyQty: 0,
          totalSellQty: 0,
          netQty: 0,
          totalBuyVol: 0,
          totalSellVol: 0,
          netVol: 0
        };
      }

      const isBuy = row.islem.includes('al') || row.islem === 'buy'; // Alış, Alis vs
      const isSell = row.islem.includes('sat') || row.islem === 'sell'; // Satış, Satis vs
      const volume = row.fiyat * row.miktar;

      if (isBuy) {
        summaries[row.hisse].totalBuyQty += row.miktar;
        summaries[row.hisse].totalBuyVol += volume;
      } else if (isSell) {
        summaries[row.hisse].totalSellQty += row.miktar;
        summaries[row.hisse].totalSellVol += volume;
      }
    });

    // Calculate net values
    const finalSummaries = Object.values(summaries).map(s => ({
      ...s,
      netQty: s.totalBuyQty - s.totalSellQty,
      netVol: s.totalBuyVol - s.totalSellVol
    })).sort((a, b) => a.hisse.localeCompare(b.hisse));

    setStockSummaries(finalSummaries);
    setFailedTrades(fails);
  };

  const handleFileUpload = (file: File) => {
    setError(null);
    setFileName(file.name);
    
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Lütfen geçerli bir Excel dosyası (.xlsx, .xls veya .csv) yükleyin.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (jsonData.length === 0) {
          setError('Dosya boş görünüyor.');
          return;
        }

        processData(jsonData);
      } catch (err) {
        console.error("Excel parse error:", err);
        setError('Dosya okunurken bir hata oluştu. Lütfen formatı kontrol edin.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleReset = () => {
    setFileName(null);
    setStockSummaries([]);
    setFailedTrades([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(val);
  };
  
  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 h-full w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Borsa Analiz</h1>
              <p className="text-slate-500 text-sm">Günlük alım-satım işlemlerinizi Excel üzerinden analiz edin.</p>
            </div>
          </div>
          
          {fileName && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Yeni Dosya Yükle
            </button>
          )}
        </div>

        {/* Drag & Drop Zone */}
        {!fileName && (
          <div 
            className={`
              border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
              flex flex-col items-center justify-center cursor-pointer min-h-[400px]
              ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'}
              ${error ? 'border-red-400 bg-red-50' : ''}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            />
            
            <div className={`p-6 rounded-full mb-4 ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <UploadCloud className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Excel Dosyasını Sürükleyip Bırakın</h3>
            <p className="text-slate-500 max-w-md">veya dosyayı seçmek için tıklayın (.xlsx, .xls formatında)</p>
            
            {error && (
              <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {fileName && stockSummaries.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Status */}
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{fileName}</h3>
                <p className="text-xs text-slate-500">{stockSummaries.length} farklı hisse analiz edildi.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-bold text-slate-800 text-lg">Hisse Özeti (Gerçekleşen İşlemler)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-4">Hisse</th>
                        <th className="px-5 py-4 text-right text-emerald-600">Toplam Alış</th>
                        <th className="px-5 py-4 text-right text-red-500">Toplam Satış</th>
                        <th className="px-5 py-4 text-right font-bold text-slate-700">Fark (Net)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockSummaries.map((s, idx) => {
                        const isNetQtyPositive = s.netQty > 0;
                        const isNetQtyNegative = s.netQty < 0;
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-800">{s.hisse}</td>
                            
                            {/* Alış */}
                            <td className="px-5 py-4 text-right">
                              <div className="font-medium text-slate-800">{formatNumber(s.totalBuyQty)} Lot</div>
                              <div className="text-xs text-emerald-600">{formatCurrency(s.totalBuyVol)}</div>
                            </td>
                            
                            {/* Satış */}
                            <td className="px-5 py-4 text-right">
                              <div className="font-medium text-slate-800">{formatNumber(s.totalSellQty)} Lot</div>
                              <div className="text-xs text-red-500">{formatCurrency(s.totalSellVol)}</div>
                            </td>
                            
                            {/* Net */}
                            <td className="px-5 py-4 text-right">
                              <div className={`font-bold flex items-center justify-end gap-1 ${
                                isNetQtyPositive ? 'text-emerald-600' : isNetQtyNegative ? 'text-red-500' : 'text-slate-500'
                              }`}>
                                {isNetQtyPositive ? <ArrowUp className="w-3 h-3" /> : isNetQtyNegative ? <ArrowDown className="w-3 h-3" /> : null}
                                {formatNumber(Math.abs(s.netQty))} Lot
                              </div>
                              <div className={`text-xs mt-0.5 ${
                                s.netVol > 0 ? 'text-emerald-600' : s.netVol < 0 ? 'text-red-500' : 'text-slate-500'
                              }`}>
                                {s.netVol > 0 ? '+' : ''}{formatCurrency(s.netVol)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Failed/Other Messages Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-orange-50/30 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <h2 className="font-bold text-slate-800 text-lg">Gerçekleşmeyen İşlemler</h2>
                  </div>
                  
                  <div className="p-5 flex-1 overflow-y-auto">
                    {failedTrades.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                        <TrendingUp className="w-12 h-12 mb-3 text-slate-200" />
                        <p>Tüm işlemler başarıyla gerçekleşti.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {failedTrades.map((ft, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-slate-800">{ft.hisse}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${ft.islem === 'Alış' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {ft.islem}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-slate-700 mb-2">
                              {formatNumber(ft.miktar)} Lot <span className="text-slate-400 mx-1">•</span> {formatCurrency(ft.fiyat)}
                            </div>
                            <div className="text-xs p-2 bg-white rounded border border-orange-200 text-orange-800 break-words font-medium">
                              {ft.mesaj}
                            </div>
                            <div className="mt-2 text-right text-xs font-bold text-slate-500">
                              Etkilenen Hacim: {formatCurrency(ft.hacim)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
