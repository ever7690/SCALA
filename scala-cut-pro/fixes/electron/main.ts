import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  probeMedia,
  generateThumbnail,
  runExport,
  cancelExport,
  generatePreviewProxy,
  needsPreviewProxy,
} from './ffmpeg.js';
import type { ExportRequest } from '../shared/ipc.js';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 700,
    backgroundColor: '#090b10',
    title: 'SCALA CUT PRO',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !isDev,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const tag = ['LOG', 'WARN', 'ERROR', 'INFO'][level] ?? `L${level}`;
    process.stdout.write(`[renderer ${tag}] ${message}  (${sourceId}:${line})\n`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    process.stdout.write(`[renderer GONE] ${JSON.stringify(details)}\n`);
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    process.stdout.write(`[renderer FAIL] ${code} ${desc} ${url}\n`);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url);
      const encoded = url.pathname.replace(/^\/+/, '');
      const abs = decodeURIComponent(encoded);
      const response = await net.fetch(pathToFileURL(abs).toString(), {
        bypassCustomProtocolHandlers: true,
      });
      if (!response.headers.get('Content-Type')) {
        const ct = guessContentType(abs);
        if (ct) {
          const headers = new Headers(response.headers);
          headers.set('Content-Type', ct);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }
      }
      return response;
    } catch (err) {
      console.error('media:// handler failed', err);
      return new Response(`Bad media URL: ${(err as Error).message}`, { status: 400 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function guessContentType(p: string): string | null {
  const ext = p.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime',
    webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
    ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', bmp: 'image/bmp', gif: 'image/gif',
  };
  return map[ext] ?? null;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openMedia', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar videos, audio o imágenes',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Todos los medios', extensions: ['mp4','mov','mkv','webm','avi','m4v','mp3','wav','aac','ogg','flac','m4a','jpg','jpeg','png','webp','bmp','gif'] },
      { name: 'Video', extensions: ['mp4','mov','mkv','webm','avi','m4v'] },
      { name: 'Audio', extensions: ['mp3','wav','aac','ogg','flac','m4a'] },
      { name: 'Imágenes', extensions: ['jpg','jpeg','png','webp','bmp','gif'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:saveExport', async (_e, defaultName: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar vídeo MP4',
    defaultPath: defaultName,
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('media:probe', async (_e, filePath: string) => probeMedia(filePath));
ipcMain.handle('media:thumbnail', async (_e, filePath: string, time: number) =>
  generateThumbnail(filePath, time),
);
ipcMain.handle('media:proxy', async (_e, filePath: string, probe) => {
  if (!needsPreviewProxy(filePath, probe)) return null;
  return generatePreviewProxy(filePath, probe);
});

ipcMain.handle('fs:writeTempPng', async (_e, dataUrl: string, name: string) => {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid PNG data');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0 || buffer.length > 32 * 1024 * 1024) {
    throw new Error('Invalid PNG size');
  }
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'text';
  const out = path.join(os.tmpdir(), `scala-cut-${safe}-${crypto.randomUUID()}.png`);
  await fs.writeFile(out, buffer);
  return out;
});

ipcMain.handle('export:run', async (e, jobId: string, req: ExportRequest) => {
  try {
    return await runExport(jobId, req, (p) => e.sender.send('export:progress', p));
  } finally {
    const temps = [...new Set(req.clips.filter((c) => c.temporary).map((c) => c.sourcePath))];
    await Promise.all(temps.map((p) => fs.unlink(p).catch(() => undefined)));
  }
});

ipcMain.handle('export:cancel', async (_e, jobId: string) => {
  cancelExport(jobId);
  return true;
});

ipcMain.handle('fs:exists', async (_e, p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('shell:revealInFolder', async (_e, p: string) => {
  shell.showItemInFolder(p);
});
