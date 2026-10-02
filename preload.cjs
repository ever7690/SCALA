const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scala", {
  selectMedia: () => ipcRenderer.invoke("media:select"),
  probeMedia: (path) => ipcRenderer.invoke("media:probe", path),
  chooseExport: (defaultName) => ipcRenderer.invoke("export:choose", defaultName),
  exportProject: (project, outPath) => ipcRenderer.invoke("export:run", project, outPath),
  saveProject: (project) => ipcRenderer.invoke("project:save", project),
  loadProject: () => ipcRenderer.invoke("project:load"),
  fileUrl: (path) => ipcRenderer.invoke("file:url", path),
  onExportProgress: (cb) => ipcRenderer.on("export:progress", (_e, v) => cb(v)),
  markReady: () => ipcRenderer.send("renderer:ready")
});
