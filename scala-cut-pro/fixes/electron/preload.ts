import { contextBridge, ipcRenderer } from 'electron';
import type { ExportRequest, ExportProgress, ExportResult, MediaProbe } from '../shared/ipc.js';

const api = {
  openMedia: (): Promise<string[]> => ipcRenderer.invoke('dialog:openMedia'),
  saveExport: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveExport', defaultName),
  probe: (filePath: string): Promise<MediaProbe> =>
    ipcRenderer.invoke('media:probe', filePath),
  thumbnail: (filePath: string, time: number): Promise<string> =>
    ipcRenderer.invoke('media:thumbnail', filePath, time),
  proxy: (filePath: string, probe: MediaProbe): Promise<string | null> =>
    ipcRenderer.invoke('media:proxy', filePath, probe),
  writeTempPng: (dataUrl: string, name: string): Promise<string> =>
    ipcRenderer.invoke('fs:writeTempPng', dataUrl, name),
  exportRun: (jobId: string, req: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke('export:run', jobId, req),
  exportCancel: (jobId: string): Promise<boolean> =>
    ipcRenderer.invoke('export:cancel', jobId),
  onExportProgress: (cb: (p: ExportProgress) => void) => {
    const listener = (_: unknown, p: ExportProgress) => cb(p);
    ipcRenderer.on('export:progress', listener);
    return () => {
      ipcRenderer.removeListener('export:progress', listener);
    };
  },
  exists: (p: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', p),
  revealInFolder: (p: string): Promise<void> =>
    ipcRenderer.invoke('shell:revealInFolder', p),
  toMediaUrl: (abs: string): string => `media://local/${encodeURIComponent(abs)}`,
};

contextBridge.exposeInMainWorld('rhces', api);
export type RhcesApi = typeof api;
