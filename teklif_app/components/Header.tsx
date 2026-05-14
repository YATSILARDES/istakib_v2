
import React from 'react';
import { PrintIcon, DownloadIcon, ShareIcon, PhotoIcon, BuildingIcon } from './icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface HeaderProps {
    viewMode?: 'editor' | 'proposal' | 'pricelist' | 'column' | 'wizard';
    setViewMode?: (mode: 'editor' | 'proposal' | 'pricelist' | 'column' | 'wizard') => void;
    onPrint?: () => void;
    onDownloadPdf?: () => void;
    onSave?: () => void;
    onClose?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode, onPrint, onDownloadPdf, onSave, onClose }) => {

    const handlePrint = () => {
        const element = document.getElementById('printable-area');
        if (!element) return;

        // 1. Pencere aç
        const printWindow = window.open('', '_blank', 'width=900,height=900');
        if (!printWindow) {
            alert('Lütfen pop-up engelleyicisini kapatın.');
            return;
        }

        // 2. HTML içeriğini hazırla
        // Tailwind'i CDN ile yüklüyoruz ki stiller korunsun
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Onay Mühendislik Teklifi Yazdır</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <script>
                  tailwind.config = {
                    theme: {
                      extend: {
                        colors: {
                          brand: {
                            50: '#fff7ed',
                            100: '#ffedd5',
                            500: '#f97316',
                            600: '#ea580c',
                            700: '#c2410c',
                          }
                        },
                        fontFamily: {
                          sans: ['Inter', 'sans-serif'],
                          oswald: ['Oswald', 'sans-serif'],
                        }
                      }
                    }
                  }
                </script>
                <style>
                    /* Sıfır Kenar Boşluğu Ayarı */
                    @page { 
                        size: A4 portrait; 
                        margin: 0; 
                    }
                    
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background-color: white;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }

                    #printable-area {
                        /* Sayfaya tam oturtmak için hafif küçültme ve hizalama */
                        transform: scale(0.99); 
                        transform-origin: top center;
                        margin: 0 auto;
                        box-shadow: none !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                ${element.outerHTML}
                <script>
                    // Resimlerin ve fontların yüklenmesini bekle, sonra yazdır
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 800);
                    };
                </script>
            </body>
            </html>
        `;

        // 3. İçeriği yaz
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleDownloadPdf = async () => {
        const element = document.getElementById('printable-area');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('onay-muhendislik-teklif.pdf');
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            alert('PDF oluşturulurken bir hata oluştu.');
        }
    };

    const handleDownloadImage = async () => {
        const element = document.getElementById('printable-area');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const image = canvas.toDataURL("image/jpeg", 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = 'onay-muhendislik-teklif.jpg';
            link.click();
        } catch (err) {
            console.error(err);
            alert("Resim oluşturulurken bir hata oluştu.");
        }
    };

    const handleShare = async () => {
        const element = document.getElementById('printable-area');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');
            const file = new File([pdfBlob], "Teklif.pdf", { type: "application/pdf" });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Doğalgaz Keşif Teklifi',
                    text: 'Onay Mühendislik Doğalgaz Keşif Teklifi ektedir.'
                });
            } else {
                alert("Tarayıcınız dosya paylaşımını desteklemiyor. Lütfen 'PDF İndir' butonunu kullanın.");
            }
        } catch (error) {
            console.error('Paylaşım hatası:', error);
            alert('Paylaşım sırasındabir hata oluştu.');
        }
    };

    return (
        <header className="bg-white shadow-md no-print relative z-10">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

                {/* Üst Satır: Logo + Aksiyon Butonları */}
                <div className="flex items-center justify-between py-3 gap-2">
                    {/* Logo & Başlık */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2.25 2.25 0 00-2.25-2.25a2.25 2.25 0 00-2.25 2.25a2.25 2.25 0 002.25 2.25a2.25 2.25 0 002.25-2.25z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.732 3.732a2.25 2.25 0 00-2.25 2.25a2.25 2.25 0 002.25 2.25a2.25 2.25 0 00-2.25-2.25a2.25 2.25 0 00-2.25-2.25z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75a2.25 2.25 0 002.25 2.25a2.25 2.25 0 002.25-2.25a2.25 2.25 0 00-2.25-2.25z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 15.75v-3.75a.75.75 0 00-1.5 0v3.75m0 0a2.25 2.25 0 00-4.5 0m4.5 0v.75a.75.75 0 01-1.5 0v-.75m-6-12v3.75a.75.75 0 01-1.5 0V3.75m0 0a2.25 2.25 0 00-4.5 0m4.5 0v.75a.75.75 0 001.5 0v-.75M4.5 15.75v-3.75a.75.75 0 00-1.5 0v3.75m0 0a2.25 2.25 0 00-4.5 0m4.5 0v.75a.75.75 0 01-1.5 0v-.75" />
                        </svg>
                        <h1 className="font-bold text-slate-800 tracking-tight truncate">
                            <span className="hidden sm:inline text-2xl">Doğalgaz Keşif Asistanı</span>
                            <span className="sm:hidden text-base">Teklif Hazırla</span>
                        </h1>
                    </div>

                    {/* Kaydet + Geri Dön */}
                    <div className="flex items-center gap-2 shrink-0">
                        {onSave && (
                            <button
                                type="button"
                                onClick={onSave}
                                className="flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-sm font-bold shadow transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span>Kaydet</span>
                            </button>
                        )}
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white rounded-lg text-sm font-bold shadow transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline">Geri Dön</span>
                                <span className="sm:hidden">Geri</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Sekme Navigasyonu - yatay kaydırmalı */}
                {setViewMode && (
                    <div className="pb-2 -mx-3 px-3 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-1.5 min-w-max">
                            {([
                                { id: 'editor',    label: 'Veri Girişi',   activeClass: 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' },
                                { id: 'column',    label: 'Kolon',         activeClass: 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm' },
                                { id: 'wizard',    label: 'Sihirbaz',      activeClass: 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' },
                                { id: 'pricelist', label: 'Fiyat Listesi', activeClass: 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' },
                                { id: 'proposal',  label: 'Teklif Formu',  activeClass: 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' },
                            ] as { id: string; label: string; activeClass: string }[]).map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setViewMode(tab.id as any)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap active:scale-95 ${
                                        viewMode === tab.id
                                            ? tab.activeClass + ' border'
                                            : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Teklif Formu Araçları - yatay kaydırmalı */}
                {viewMode === 'proposal' && (
                    <div className="flex gap-2 pb-3 -mx-3 px-3 overflow-x-auto scrollbar-hide">
                        <button type="button" onClick={handleShare}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap">
                            <ShareIcon className="w-4 h-4 shrink-0" />
                            <span>Paylaş</span>
                        </button>
                        <button type="button" onClick={handleDownloadImage}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap">
                            <PhotoIcon className="w-4 h-4 shrink-0" />
                            <span>Resim İndir</span>
                        </button>
                        <button type="button" onClick={handleDownloadPdf}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap">
                            <DownloadIcon className="w-4 h-4 shrink-0" />
                            <span>PDF</span>
                        </button>
                        <button type="button" onClick={handlePrint}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap">
                            <PrintIcon className="w-4 h-4 shrink-0" />
                            <span>Yazdır</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

