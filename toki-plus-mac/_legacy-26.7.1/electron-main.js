const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Ngăn chặn mở trùng nhiều cửa sổ gây xung đột cổng 3030
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

process.on('uncaughtException', (err) => {
  console.error('Lỗi process uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Lỗi process unhandledRejection:', reason);
});

// Chạy backend server độc lập của khách
try {
  require(path.join(__dirname, 'server.js'));
} catch (e) {
  console.error('Lỗi khởi động server:', e);
}

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'img', 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'TOKI PLUS - AI Dance & Motion Studio',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const loadUrl = () => {
    if (!mainWindow) return;
    mainWindow.loadURL('http://localhost:3030').catch(() => {
      setTimeout(loadUrl, 500);
    });
  };
  setTimeout(loadUrl, 600);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
  process.exit(0);
});
