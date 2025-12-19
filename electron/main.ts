import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import log from 'electron-log';

// Define autoUpdater variable but don't import yet
let autoUpdater: any = null;

// Loglama ayarları
log.transports.file.level = 'info';

// Geliştirme ortamında mı çalışıyoruz?
const isDev = process.env.NODE_ENV === 'development';

// Setup AutoUpdater Function - Only called in Production
function setupAutoUpdater() {
    if (isDev) return;

    try {
        // Dynamic import to prevent dev crashes
        autoUpdater = require('electron-updater').autoUpdater;
        autoUpdater.logger = log;

        autoUpdater.on('checking-for-update', () => {
            log.info('Güncelleme kontrol ediliyor...');
        });

        autoUpdater.on('update-available', (info: any) => {
            log.info('Güncelleme mevcut:', info);
        });

        autoUpdater.on('update-not-available', (info: any) => {
            log.info('Güncelleme yok:', info);
        });

        autoUpdater.on('error', (err: any) => {
            log.error('Güncelleme hatası:', err);
        });

        autoUpdater.on('download-progress', (progressObj: any) => {
            let log_message = "İndirme hızı: " + progressObj.bytesPerSecond;
            log_message = log_message + ' - İndirilen %' + progressObj.percent;
            log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
            log.info(log_message);
        });

        autoUpdater.on('update-downloaded', (info: any) => {
            log.info('Güncelleme indirildi:', info);
            const dialogOpts = {
                type: 'info' as const,
                buttons: ['Yeniden Başlat', 'Daha Sonra'],
                title: 'Uygulama Güncellemesi',
                message: process.platform === 'win32' ? (info.releaseNotes as string) : (info.releaseName as string),
                detail: 'Yeni bir sürüm indirildi. Uygulamayı güncellemek için yeniden başlatın.'
            };

            dialog.showMessageBox(dialogOpts).then((returnValue) => {
                if (returnValue.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        // Check for updates
        autoUpdater.checkForUpdatesAndNotify().catch((e: any) => log.error(e));

    } catch (error) {
        console.error("Failed to setup autoUpdater:", error);
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (isDev) {
        // Using Port 3000 as requested
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    } else {
        // Production
        win.loadURL('https://istakib-v2.vercel.app');

        // Initialize updater only after window creation in prod
        setupAutoUpdater();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('open-demirdokum', async (event, data) => {
    const { customerName, phone, address, city, district, email } = data;

    // Create new window for DemirDöküm
    const externalWin = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // We don't need preload for the external site necessarily if we use executeJavaScript
        },
        autoHideMenuBar: true
    });

    externalWin.loadURL('https://servis.demirdokum.com.tr/was/Frames.html');

    // Inject script to fill form
    // We wait for page to load then inject button
    externalWin.webContents.on('did-finish-load', () => {
        const script = `
            // Create Floating Button
            if (!document.getElementById('dd-auto-fill-btn')) {
                const btn = document.createElement('button');
                btn.id = 'dd-auto-fill-btn';
                btn.innerText = 'BİLGİLERİ DOLDUR (${customerName})';
                btn.style.position = 'fixed';
                btn.style.top = '10px';
                btn.style.right = '10px';
                btn.style.zIndex = '99999';
                btn.style.padding = '10px 20px';
                btn.style.backgroundColor = '#dc2626'; // Red
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.style.cursor = 'pointer';
                btn.style.fontWeight = 'bold';
                btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                
                document.body.appendChild(btn);

                btn.onclick = () => {
                    // Try to find the frames
                    // The site uses frameset: 'main' frame -> 'ustForm' or input fields usually in 'main' frame
                    // We need to access the correct frame document. 
                    // Since executeJavaScript runs in top frame, we might need to access frames.
                    
                    const mainFrame = window.frames['main'];
                    const targetDoc = mainFrame ? mainFrame.document : document;

                    function setVal(id, val) {
                        if (!val) return;
                        const el = targetDoc.getElementById(id);
                        if (el) el.value = val;
                    }

                    // Fill Fields
                    setVal('adi1', '${customerName || ''}');
                    setVal('cepTel1', '${phone || ''}');
                    setVal('evTel1', '${phone || ''}'); // Use mobile for home too if available
                    setVal('eposta1', '${email || ''}');
                    
                    // Address - simple mapping
                    // We put full address in 'apartman1' as a safe bet for now if it fits, 
                    // or try to split if possible. 
                    // User said: "apartman1" is Apartman/Site. 
                    setVal('apartman1', '${address ? address.replace(/\n/g, " ") : ""}');
                    
                    // City Selection (Dropdown)
                    // ID: sehir1
                    // Options values are IDs (e.g. 51=Adana, 17=Ankara). Text match is safer.
                    const citySelect = targetDoc.getElementById('sehir1');
                    if (citySelect && '${city}') {
                        const searchText = '${city}'.toLocaleUpperCase(['tr-TR']);
                        for (let i = 0; i < citySelect.options.length; i++) {
                            if (citySelect.options[i].text.toLocaleUpperCase(['tr-TR']).includes(searchText)) {
                                citySelect.selectedIndex = i;
                                // Trigger change event if needed
                                const event = new Event('change');
                                citySelect.dispatchEvent(event);
                                break;
                            }
                        }
                    }

                    // District handling would require waiting for reload, complicated for v1.
                    // Let's stick to basic fields first.

                    alert('Bilgiler form alanlarına aktarıldı! Lütfen kontrolleri yapınız.');
                };
            }
        `;
        externalWin.webContents.executeJavaScript(script).catch(e => console.error("Script injection failed", e));
    });
});

