import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { Camera, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
    const [error, setError] = useState<string>('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    // User requested direct Photo/OCR mode, so we default to true
    const [customCameraOpen, setCustomCameraOpen] = useState(true);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isRunning = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Effect to handle Custom Camera Stream
    useEffect(() => {
        if (!customCameraOpen) return;

        let active = true;

        const startCamera = async () => {
            try {
                // We rely on the cleanup of the other useEffect to stop the scanner.
                // Redundant stop() here causes "Cannot transition to a new state" race condition.

                // Small delay to ensure cleanup and camera release
                await new Promise(resolve => setTimeout(resolve, 300));

                if (!active) return;

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Tarayıcınız kamera erişimini desteklemiyor veya SSL (Güvenli Bağlantı) eksik.");
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });

                if (!active) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("Video play error:", e));
                }
            } catch (err) {
                console.error("Camera error:", err);
                let errorMessage = "Bilinmeyen hata";

                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (typeof err === 'string') {
                    errorMessage = err;
                } else if (typeof err === 'object' && err !== null) {
                    // Try to stringify if it's a custom object
                    try {
                        errorMessage = JSON.stringify(err);
                        // If it's empty object, it might be a DOMException behaving purely
                        if (errorMessage === '{}') errorMessage = "Kamera erişim izni verilmedi veya desteklenmiyor.";
                    } catch (e) {
                        errorMessage = "Hata detayları alınamadı.";
                    }
                }

                if (active) alert("Kamera başlatılamadı: " + errorMessage);
            }
        };

        startCamera();

        return () => {
            active = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [customCameraOpen]);

    // Auto barcode scanner (Fallback if they close custom camera)
    useEffect(() => {
        if (customCameraOpen) return;

        const initScanner = async () => {
            if (scannerRef.current) return;
            // ... (rest of scanner init logic is fine to leave or minimal)
            // But since we default to true, this won't run initially.
            // If we want to fully remove the old scanner we could, but allowing fallback is safe.

            // 1. Check for Secure Context
            if (window.isSecureContext === false) {
                setError("Kamera erişimi engellendi! (Güvenli Bağlantı Yok)");
                return;
            }

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
                        onScanSuccess(decodedText);
                    },
                    () => { }
                );
                isRunning.current = true;
            } catch (err) {
                console.error(err);
                setError("Kamera başlatılamadı.");
            }
        };

        initScanner();

        return () => {
            if (scannerRef.current && isRunning.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    isRunning.current = false;
                }).catch(console.error);
            }
        };
    }, [onScanSuccess, customCameraOpen]);

    // Function to manually switch (if we add a button to switch modes)
    const openCustomCamera = () => setCustomCameraOpen(true);

    const closeCustomCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCustomCameraOpen(false);
    }, []);

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
            closeCustomCamera();
            setOcrLoading(true);
            setOcrProgress(0);

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

                if (matches && matches.length > 0) {
                    const barcode = matches.reduce((a, b) => a.length > b.length ? a : b);
                    onScanSuccess(barcode);
                } else {
                    const numMatches = text.match(/\d{6,}/g);
                    if (numMatches && numMatches.length > 0) {
                        const barcode = numMatches.reduce((a, b) => a.length > b.length ? a : b);
                        onScanSuccess(barcode);
                    } else {
                        alert("Fotoğraftan barkod okunamadı. Lütfen tekrar deneyin.");
                    }
                }
            } catch (err) {
                console.error("OCR Error:", err);
                alert("OCR başarısız. Tekrar deneyin.");
            } finally {
                setOcrLoading(false);
                setOcrProgress(0);
            }
        }, 'image/png');
    };

    if (customCameraOpen) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                />

                {/* Overlay frame */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[60px] border-2 border-green-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none z-10">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-green-500 text-sm font-bold whitespace-nowrap drop-shadow-md bg-black/50 px-3 py-1 rounded-full">
                        Rakamları bu alana hizalayın
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Controls - Floating at bottom with extra padding for mobile browser bars */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-24 bg-gradient-to-t from-black via-black/80 to-transparent flex gap-3 z-20">
                    <button
                        onClick={closeCustomCamera}
                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform border border-white/10"
                    >
                        İptal
                    </button>
                    <button
                        onClick={captureFrame}
                        className="flex-[2] bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-green-600/30"
                    >
                        <Camera className="w-6 h-6" />
                        Çek ve Oku
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                <h3 className="font-bold text-white text-lg">Barkod Tara</h3>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-4 relative">
                {error ? (
                    <div className="p-6 bg-red-500/10 border border-red-500/50 text-red-200 rounded-2xl text-center max-w-sm backdrop-blur-sm">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                        <p className="font-bold mb-2">Kamera Hatası</p>
                        <p className="text-sm opacity-90">{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">
                            Yenile
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Reader Container - Centered */}
                        <div id="reader" className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl relative z-0"></div>

                        {/* Helper Text */}
                        <p className="text-white/70 text-sm mt-6 text-center max-w-xs animate-pulse">
                            Barkodu kare içine hizalayın
                        </p>

                        {/* OCR Switch Button - Floating at bottom */}
                        <div className="absolute bottom-8 left-0 right-0 px-6">
                            <button
                                onClick={openCustomCamera}
                                disabled={ocrLoading}
                                className="w-full max-w-sm mx-auto bg-white/10 hover:bg-white/20 resize-none backdrop-blur-md border border-white/10 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {ocrLoading ? (
                                    <><RefreshCw className="w-5 h-5 animate-spin" /> Okunuyor... {ocrProgress}%</>
                                ) : (
                                    <><Camera className="w-5 h-5" /> Fotoğraf Çek (OCR)</>
                                )}
                            </button>
                            <p className="text-center text-white/40 text-[10px] mt-3">
                                Otomatik okumuyorsa fotoğraf çekmeyi deneyin
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
