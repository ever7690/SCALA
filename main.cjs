const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { spawn } = require("child_process");
const { exportProject } = require("./lib/exporter.cjs");

function unpacked(p) { return p ? p.replace("app.asar", "app.asar.unpacked") : p; }
const ffprobePath = unpacked(require("ffprobe-static").path);
let mainWindow;
const smoke = process.argv.includes("--smoke-test");
if (smoke) app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b0b0d",
    title: "SCALA CUT PRO",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle("media:select", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Importar videos, audios e imágenes",
    properties: ["openFile","multiSelections"],
    filters: [
      { name: "Medios", extensions: ["mp4","mov","mkv","avi","webm","m4v","mp3","wav","m4a","aac","flac","ogg","png","jpg","jpeg","webp","gif","bmp","tif","tiff"] },
      { name: "Todos", extensions: ["*"] }
    ]
  });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle("file:url", (_e, p) => pathToFileURL(p).href);

ipcMain.handle("media:probe", async (_e, p) => new Promise((resolve, reject) => {
  const cp = spawn(ffprobePath, ["-v","quiet","-print_format","json","-show_format","-show_streams",p]);
  let out="", err="";
  cp.stdout.on("data", d => out += d);
  cp.stderr.on("data", d => err += d);
  cp.on("close", code => {
    if (code !== 0) return reject(new Error(err || "ffprobe error"));
    try {
      const data = JSON.parse(out);
      const streams = data.streams || [];
      const v = streams.find(s => s.codec_type === "video");
      const a = streams.find(s => s.codec_type === "audio");
      const ext = path.extname(p).toLowerCase();
      const imageExt = [".png",".jpg",".jpeg",".webp",".gif",".bmp",".tif",".tiff"];
      let type = imageExt.includes(ext) ? "image" : v ? "video" : a ? "audio" : "unknown";
      const duration = Number(data.format?.duration || v?.duration || a?.duration || (type === "image" ? 5 : 0));
      resolve({
        path:p, name:path.basename(p), type, duration: Number.isFinite(duration) ? duration : 0,
        width:Number(v?.width||0), height:Number(v?.height||0), hasAudio:!!a
      });
    } catch(e) { reject(e); }
  });
}));

ipcMain.handle("export:choose", async (_e, defaultName="scala-cut.mp4") => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title:"Exportar video",
    defaultPath: defaultName.endsWith(".mp4") ? defaultName : defaultName + ".mp4",
    filters:[{name:"Video MP4", extensions:["mp4"]}]
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("export:run", async (_e, project, outPath) => {
  await exportProject(project, outPath, p => mainWindow?.webContents.send("export:progress", p));
  return { ok:true, outPath };
});

ipcMain.handle("project:save", async (_e, project) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title:"Guardar proyecto SCALA CUT",
    defaultPath:(project.name||"Proyecto") + ".scalacut.json",
    filters:[{name:"Proyecto SCALA CUT",extensions:["json"]}]
  });
  if (r.canceled) return null;
  fs.writeFileSync(r.filePath, JSON.stringify(project,null,2));
  return r.filePath;
});

ipcMain.handle("project:load", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title:"Abrir proyecto SCALA CUT",
    properties:["openFile"],
    filters:[{name:"Proyecto SCALA CUT",extensions:["json"]}]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return JSON.parse(fs.readFileSync(r.filePaths[0],"utf8"));
});

ipcMain.on("renderer:ready", async () => {
  if (!smoke) return;
  try {
    const target = process.env.SCALA_SMOKE_SCREENSHOT;
    if (target && mainWindow) {
      await new Promise(r => setTimeout(r, 800));
      const image = await mainWindow.webContents.capturePage();
      fs.writeFileSync(path.resolve(process.cwd(), target), image.toPNG());
    }
    setTimeout(() => app.exit(0), 200);
  } catch (e) {
    console.error("SMOKE_SCREENSHOT_ERROR", e);
    app.exit(3);
  }
});
if (smoke) setTimeout(() => app.exit(2), 15000);
