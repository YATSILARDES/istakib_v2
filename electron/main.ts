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

ipcMain.on('app-version', (event) => {
    event.sender.send('app-version', { version: app.getVersion() });
});
