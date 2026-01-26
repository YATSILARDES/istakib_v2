import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { Camera, X, RefreshCw, AlertTriangle, ScanLine } from 'lucide-react';

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
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
        if (customCameraOpen) return; // Don't run if custom camera is open

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
                    (decodedText) => onScanSuccess(decodedText),
                    () => { }
                );
                isRunning.current = true;
            } catch (err) {
                console.error(err);
                // Only show error if we are still mounted and in this mode
                if (!customCameraOpen) {
                    setError("Kamera başlatılamadı.");
                }
            }
        };

        // Small timeout to prevent immediate initialization issues during renders
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

    // Open custom camera for OCR
    const openCustomCamera = async () => {
        try {
            // Stop barcode scanner first
            if (scannerRef.current && isRunning.current) {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                isRunning.current = false;
                scannerRef.current = null;
            }

            // Wait for camera to be released
            await new Promise(resolve => setTimeout(resolve, 300));

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;

            // Set state first so video element renders
            setCustomCameraOpen(true);

            // Then attach stream after a short delay
            setTimeout(() => {
                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch(e => console.error("Video play error:", e));
                }
            }, 100);

        } catch (err) {
            console.error("Camera error:", err);
            let errorMessage = "Kamera açılamadı";
            if (err instanceof Error) errorMessage += ": " + err.message;
            alert(errorMessage);
        }
    };

    const closeCustomCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCustomCameraOpen(false);
    }, []);

    // Capture the framed area
    const captureFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Frame dimensions (the narrow strip for barcode numbers)
        const frameWidth = 300;
        const frameHeight = 60;

        // Calculate the crop area from the video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Center crop
        const cropX = (videoWidth - frameWidth * 2) / 2;
        const cropY = (videoHeight - frameHeight * 2) / 2;
        const cropW = frameWidth * 2;
        const cropH = frameHeight * 2;

        canvas.width = cropW;
        canvas.height = cropH;

        // Draw cropped area to canvas
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        // Convert to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            // We keep the camera open until we get a result or error? 
            // Reference implementation closes it immediately:
            closeCustomCamera();

            // Process with OCR
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

                // Extract alphanumeric barcode
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
                        alert("Fotoğraftan rakam okunamadı. Lütfen tekrar deneyin.");
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

    // --- RENDER: Custom Camera (OCR) ---
    if (customCameraOpen) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                {/* Video Container */}
                <div className="relative w-full h-[60vh] bg-black">
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

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls Area */}
                <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-slate-900 flex flex-col items-center justify-center p-6 space-y-4">
                    <button
                        onClick={captureFrame}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg active:scale-95 transition-transform"
                    >
                        <Camera className="w-6 h-6" />
                        Çek ve Oku
                    </button>

                    <button
                        onClick={closeCustomCamera}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                    >
                        İptal
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDER: Standard Barcode Scanner + Entry ---
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900/90 backdrop-blur-sm z-10 border-b border-white/10">
                <h3 className="font-bold text-white text-lg">Barkod Tara</h3>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-y-auto">
                {error ? (
                    <div className="w-full max-w-sm p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-center">
                        <p>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-white bg-red-500 px-4 py-2 rounded-lg text-sm"
                        >
                            Sayfayı Yenile
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Html5Qrcode DOM element */}
                        <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl"></div>

                        <div className="mt-8 w-full max-w-sm space-y-4">
                            <p className="text-slate-400 text-center text-sm">
                                Otomatik okumuyorsa fotoğraf çekin:
                            </p>

                            <button
                                onClick={openCustomCamera}
                                disabled={ocrLoading}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                            >
                                {ocrLoading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                                        <span>Okunuyor... {ocrProgress}%</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-5 h-5 text-green-400" />
                                        <span>Fotoğraf Çek (OCR)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
