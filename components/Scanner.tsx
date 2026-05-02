import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { Camera, X, RefreshCw, AlertTriangle, Trash2, CheckCircle, Clock } from 'lucide-react';
import { BarcodeData } from '@/types';

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
    existingBarcodes?: BarcodeData[];
    onDelete?: (barcode: BarcodeData) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose, existingBarcodes = [], onDelete }) => {
    const [error, setError] = useState<string>('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [customCameraOpen, setCustomCameraOpen] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isRunning = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Auto barcode scanner (Standard Mode)
    useEffect(() => {
        if (customCameraOpen) return;

        const initScanner = async () => {
            if (scannerRef.current) return;

            const html5QrCode = new Html5Qrcode("reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13],
                verbose: false
            });
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 320, height: 80 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        // Standard scanner: No length validation as per user request
                        onScanSuccess(decodedText);
                    },
                    () => { }
                );
                isRunning.current = true;
            } catch (err) {
                console.error(err);
                if (!customCameraOpen) {
                    setError("Kamera başlatılamadı.");
                }
            }
        };

        const timer = setTimeout(() => {
            initScanner();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && isRunning.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    isRunning.current = false;
                }).catch(console.error);
            }
        };
    }, [onScanSuccess, customCameraOpen]);

    // --- REF: 1. Mode Switching Logic ---
    const openCustomCamera = useCallback(async () => {
        // Stop QR scanner if running
        if (scannerRef.current && isRunning.current) {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            isRunning.current = false;
        }
        // Just switch the mode, the useEffect below will handle the stream
        setCustomCameraOpen(true);
    }, []);

    const closeCustomCamera = useCallback(() => {
        setCustomCameraOpen(false);
        // Stream cleanup handles automatically by the useEffect
    }, []);

    // --- REF: 2. Camera Stream Effect ---
    useEffect(() => {
        if (!customCameraOpen) return;

        let active = true;
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                // Short expiration to allow UI to mount
                await new Promise(r => setTimeout(r, 100));

                if (!active) return;

                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        // Removing 'ideal' constraints for broader compatibility if needed, 
                        // but keeping them for now as they usually work.
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (!active) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Ensure we call play()
                    try {
                        await videoRef.current.play();
                    } catch (playErr) {
                        console.error("Video play error:", playErr);
                    }
                }
            } catch (err) {
                console.error("Camera init error:", err);
                if (active) {
                    alert("Kamera başlatılamadı: " + (err instanceof Error ? err.message : String(err)));
                    setCustomCameraOpen(false); // Fallback to close
                }
            }
        };

        startCamera();

        return () => {
            active = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [customCameraOpen]);

    // Add state for feedback
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const captureFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frameWidth = 300;
        const frameHeight = 60;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const cropX = (videoWidth - frameWidth * 2) / 2;
        const cropY = (videoHeight - frameHeight * 2) / 2;
        const cropW = frameWidth * 2;
        const cropH = frameHeight * 2;

        canvas.width = cropW;
        canvas.height = cropH;

        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            setOcrLoading(true);
            setOcrProgress(0);
            setFeedbackMessage(null);

            try {
                const result = await Tesseract.recognize(blob, 'eng', {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.round(m.progress * 100));
                        }
                    }
                });

                const text = result.data.text;
                console.log("OCR Result:", text);

                const matches = text.match(/[A-Z0-9]{10,}/gi);

                let barcode = "";
                if (matches && matches.length > 0) {
                    barcode = matches.reduce((a, b) => a.length > b.length ? a : b);
                } else {
                    const numMatches = text.match(/\d{6,}/g);
                    if (numMatches && numMatches.length > 0) {
                        barcode = numMatches.reduce((a, b) => a.length > b.length ? a : b);
                    }
                }

                if (barcode) {
                    // VALIDATION CHECK
                    if (barcode.length !== 28) {
                        setFeedbackMessage(`Hatalı Uzunluk: ${barcode.length} (Gereken: 28)`);
                        setTimeout(() => setFeedbackMessage(null), 3000);
                    } else {
                        onScanSuccess(barcode);
                        // Optional: Show success feedback briefly? 
                        // Usually onScanSuccess updates the list instantly, so that's feedback enough.
                    }
                } else {
                    setFeedbackMessage("Okunamadı. Tekrar deneyin.");
                    setTimeout(() => setFeedbackMessage(null), 2000);
                }
            } catch (err) {
                console.error("OCR Error:", err);
                setFeedbackMessage("Hata oluştu. Tekrar deneyin.");
                setTimeout(() => setFeedbackMessage(null), 2000);
            } finally {
                setOcrLoading(false);
                setOcrProgress(0);
            }
        }, 'image/png');
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('tr-TR');
    };

    // --- RENDER: Custom Camera (OCR) ---
    if (customCameraOpen) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col">
                {/* 1. TOP SECTION: Header & Close */}
                <div className="relative z-50 bg-slate-900 border-b border-white/10 p-2 flex justify-between items-center shadow-md">
                    <h3 className="text-white font-bold ml-2">OCR Kamera</h3>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. CAMERA SECTION (Top Half) */}
                <div className="relative w-full h-[45vh] bg-black shrink-0">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                    />

                    {/* Overlay frame */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[60px] border-[3px] border-green-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-green-500 text-sm font-bold whitespace-nowrap bg-black/50 px-2 py-0.5 rounded">
                            Rakamları bu alana hizalayın
                        </div>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    {/* Feedback Message */}
                    {feedbackMessage && (
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-500/80 text-white px-4 py-2 rounded-full text-sm font-bold z-30 animate-in fade-in slide-in-from-bottom-2">
                            {feedbackMessage}
                        </div>
                    )}

                    {/* Capture Button - Overlaying Camera Bottom */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                        <button
                            onClick={captureFrame}
                            disabled={ocrLoading}
                            className={`px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all outline outline-4 outline-black/30 ${ocrLoading ? 'bg-slate-700 text-slate-300' : 'bg-green-600 hover:bg-green-500 text-white'
                                }`}
                        >
                            {ocrLoading ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> Okunuyor...</>
                            ) : (
                                <><Camera className="w-5 h-5" /> Çek ve Kaydet</>
                            )}
                        </button>
                    </div>
                </div>

                {/* 3. LIST SECTION (Bottom Half - Scrollable) */}
                <div className="flex-1 bg-slate-100 overflow-y-auto">
                    <div className="p-4 space-y-3">
                        <h4 className="font-bold text-slate-700 text-sm border-b pb-2 mb-2 flex justify-between items-center">
                            <span>Son Eklenenler</span>
                            <span className="text-xs font-normal bg-slate-200 px-2 py-1 rounded-full text-slate-600">{existingBarcodes.length} Adet</span>
                        </h4>

                        {existingBarcodes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">Henüz barkod taranmadı.</p>
                            </div>
                        ) : (
                            // Show reversed so newest is top
                            [...existingBarcodes].reverse().map((barcode, index) => (
                                <div key={index} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 animate-in slide-in-from-top-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${barcode.status === 'safe' ? 'bg-green-100 text-green-600' :
                                        barcode.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {barcode.status === 'safe' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono font-bold text-slate-800 text-sm break-all">
                                            {barcode.originalCode}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                                            <span>ÜRT: {formatDate(barcode.productionDate)}</span>
                                            <span>SKT: {formatDate(barcode.expiryDate)}</span>
                                        </div>
                                    </div>
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(barcode)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Spacer for bottom safe area */}
                        <div className="h-4"></div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: Standard Barcode Scanner Fallback ---
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="relative z-50 bg-slate-900 border-b border-white/10 p-2 flex justify-between items-center">
                <h3 className="text-white font-bold ml-2">QR/Barkod Tara</h3>
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Standard Scanner Camera Area */}
            <div className="bg-black p-4 flex flex-col items-center shrink-0">
                {error ? (
                    <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-center my-4">
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-2 text-white bg-red-500 px-4 py-2 rounded">Yenile</button>
                    </div>
                ) : (
                    <>
                        <div id="reader" className="w-full max-w-sm rounded-xl border border-white/20 bg-black shadow-2xl overflow-hidden mb-4"></div>
                        <button onClick={openCustomCamera} className="w-full max-w-sm bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                            <Camera className="w-5 h-5" /> OCR Kamerayı Aç
                        </button>
                    </>
                )}
            </div>

            {/* List Section (Shared Logic) */}
            <div className="flex-1 bg-slate-100 overflow-y-auto border-t border-slate-900">
                <div className="p-4 space-y-3">
                    <h4 className="font-bold text-slate-700 text-sm border-b pb-2 mb-2 flex justify-between items-center">
                        <span>Son Eklenenler</span>
                        <span className="text-xs font-normal bg-slate-200 px-2 py-1 rounded-full text-slate-600">{existingBarcodes.length} Adet</span>
                    </h4>

                    {existingBarcodes.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">Henüz barkod taranmadı.</p>
                        </div>
                    ) : (
                        // Show reversed so newest is top
                        [...existingBarcodes].reverse().map((barcode, index) => (
                            <div key={index} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 animate-in slide-in-from-top-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${barcode.status === 'safe' ? 'bg-green-100 text-green-600' :
                                    barcode.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {barcode.status === 'safe' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono font-bold text-slate-800 text-sm break-all">
                                        {barcode.originalCode}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                                        <span>ÜRT: {formatDate(barcode.productionDate)}</span>
                                        <span>SKT: {formatDate(barcode.expiryDate)}</span>
                                    </div>
                                </div>
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(barcode)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}

                    <div className="h-4"></div>
                </div>
            </div>
        </div>
    );
};
