import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { X, FolderOpen, Film, CheckCircle2 } from 'lucide-react';
import { useEditor } from '../store/editor';
import { api } from '../lib/electronApi';
import { PRESETS, type ResolutionPreset, type Clip } from '../types';
import { safeFilename } from '../lib/utils';
import type { ExportClip, ExportRequest } from '@shared/ipc';

type ExportSize = 'project' | ResolutionPreset;

export default function ExportDialog() {
  const { project, exporting, exportProgress, exportError, setExporting } = useEditor();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<ExportSize>('project');
  const [fps, setFps] = useState(project.fps || 30);
  const [bitrate, setBitrate] = useState('12M');
  const [quality, setQuality] = useState('medium');
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setDone(null);
      setPreset('project');
      setFps(project.fps || 30);
    };
    window.addEventListener('rhces:open-export', onOpen);
    return () => window.removeEventListener('rhces:open-export', onOpen);
  }, [project.fps]);

  useEffect(() => {
    const off = api().onExportProgress((p) => setExporting(true, p.percent));
    return off;
  }, [setExporting]);

  const dim =
    preset === 'project'
      ? { w: project.width, h: project.height }
      : PRESETS[preset];

  const choosePath = async () => {
    const def = `${safeFilename(project.name)}_${dim.w}x${dim.h}.mp4`;
    const p = await api().saveExport(def);
    if (p) setOutputPath(p);
  };

  const handleExport = async () => {
    if (!outputPath) {
      await choosePath();
      return;
    }

    try {
      setExporting(true, 0);
      setDone(null);

      const exportClips: ExportClip[] = [];
      for (const c of project.clips) {
        const trackIndex = project.tracks.findIndex((t) => t.id === c.trackId);
        const track = project.tracks[trackIndex];
        if (!track) continue;

        if (c.kind === 'text') {
          if (!c.text?.trim()) continue;
          const png = renderTextClip({
            clip: c,
            width: dim.w,
            height: dim.h,
            projectWidth: project.width,
            projectHeight: project.height,
          });
          const tempPath = await api().writeTempPng(png, `text-${c.id}`);
          exportClips.push({
            id: c.id,
            sourcePath: tempPath,
            trackIndex,
            trackKind: 'text',
            mediaKind: 'image',
            hasAudio: false,
            hasVideo: true,
            temporary: true,
            start: c.start,
            end: c.start + c.duration,
            trimIn: 0,
            trimOut: c.duration,
            speed: 1,
            volume: 0,
            opacity: 1,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
          });
          continue;
        }

        const m = c.mediaId ? project.media.find((mm) => mm.id === c.mediaId) : null;
        if (!m) continue;
        exportClips.push({
          id: c.id,
          sourcePath: m.path,
          trackIndex,
          trackKind: track.kind,
          mediaKind: m.probe.kind,
          hasAudio: m.probe.hasAudio,
          hasVideo: m.probe.hasVideo,
          start: c.start,
          end: c.start + c.duration,
          trimIn: c.trimIn,
          trimOut: c.trimOut,
          speed: c.speed,
          volume: track.muted ? 0 : c.volume,
          opacity: c.opacity,
          x: c.x,
          y: c.y,
          scale: c.scale,
          rotation: c.rotation,
          brightness: c.brightness,
          contrast: c.contrast,
          saturation: c.saturation,
        });
      }

      if (exportClips.length === 0) {
        setExporting(false, 0);
        alert('La línea de tiempo está vacía. Agregue video, audio, imágenes o texto.');
        return;
      }

      const req: ExportRequest = {
        clips: exportClips,
        width: dim.w,
        height: dim.h,
        fps,
        duration: project.duration,
        outputPath,
        videoBitrate: bitrate,
        audioBitrate: '192k',
        preset: quality,
      };

      const id = uuid();
      setJobId(id);
      const result = await api().exportRun(id, req);
      setJobId(null);
      if (result.ok) {
        setExporting(false, 100);
        setDone(result.outputPath ?? outputPath);
      } else {
        setExporting(false, 0, result.error);
      }
    } catch (err) {
      setJobId(null);
      setExporting(false, 0, err instanceof Error ? err.message : String(err));
    }
  };

  const handleCancel = async () => {
    if (jobId) await api().exportCancel(jobId);
    setExporting(false, 0);
    setJobId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="panel rounded-2xl w-[520px] max-w-[92vw] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-700">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <Film size={18} />
            </div>
            <div>
              <div className="font-semibold text-white">Exportar vídeo</div>
              <div className="text-[11px] text-zinc-500">SCALA CUT PRO · MP4 H.264 + AAC</div>
            </div>
          </div>
          <button
            className="text-zinc-400 hover:text-white"
            onClick={() => !exporting && setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-3">
                <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                <div>
                  <div className="text-sm font-semibold text-emerald-300">Exportación terminada</div>
                  <div className="text-xs text-zinc-400 mt-1">El MP4 quedó guardado correctamente.</div>
                </div>
              </div>
              <div className="font-mono text-xs text-zinc-400 break-all bg-bg-900 rounded-lg p-3">{done}</div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => api().revealInFolder(done)}>
                  <FolderOpen size={14} className="inline mr-1" /> Ver archivo
                </button>
                <button className="btn btn-primary" onClick={() => setOpen(false)}>Cerrar</button>
              </div>
            </div>
          ) : exporting ? (
            <div className="space-y-4 py-2">
              <div className="flex justify-between text-sm text-zinc-300">
                <span>Renderizando en esta computadora…</span>
                <span className="font-mono">{exportProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-bg-700 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${exportProgress}%` }} />
              </div>
              <div className="text-xs text-zinc-500">Sus archivos permanecen locales. No se suben a una nube.</div>
              <div className="flex justify-end">
                <button className="btn btn-danger" onClick={handleCancel}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <Field label="Tamaño">
                <select className="field" value={preset} onChange={(e) => setPreset(e.target.value as ExportSize)}>
                  <option value="project">Proyecto actual — {project.width}×{project.height}</option>
                  {(Object.keys(PRESETS) as ResolutionPreset[]).map((k) => (
                    <option key={k} value={k}>{k} — {PRESETS[k].w}×{PRESETS[k].h}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="FPS">
                  <select className="field" value={fps} onChange={(e) => setFps(parseInt(e.target.value))}>
                    {[24, 25, 30, 50, 60].map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Bitrate">
                  <select className="field" value={bitrate} onChange={(e) => setBitrate(e.target.value)}>
                    {['4M','8M','12M','20M','40M'].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Calidad">
                  <select className="field" value={quality} onChange={(e) => setQuality(e.target.value)}>
                    <option value="fast">Rápida</option>
                    <option value="medium">Alta</option>
                    <option value="slow">Máxima</option>
                  </select>
                </Field>
              </div>

              <Field label="Guardar en">
                <div className="flex gap-2">
                  <input className="field flex-1 font-mono text-xs" value={outputPath ?? ''} placeholder="Seleccione una carpeta…" readOnly />
                  <button className="btn btn-ghost whitespace-nowrap" onClick={choosePath}>Elegir</button>
                </div>
              </Field>

              {exportError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-36 overflow-auto">
                  {exportError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="btn btn-primary px-5" onClick={handleExport}>
                  {outputPath ? 'Exportar MP4' : 'Elegir destino'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function renderTextClip({
  clip,
  width,
  height,
  projectWidth,
  projectHeight,
}: {
  clip: Clip;
  width: number;
  height: number;
  projectWidth: number;
  projectHeight: number;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el lienzo para el texto');

  const factor = Math.min(width / Math.max(1, projectWidth), height / Math.max(1, projectHeight));
  const fontSize = Math.max(10, (clip.fontSize ?? 64) * factor);
  const family = (clip.fontFamily ?? 'Inter').replace(/["']/g, '');
  const lines = (clip.text ?? '').split(/\r?\n/);
  const lineHeight = fontSize * 1.18;

  ctx.save();
  ctx.translate((clip.x ?? 0.5) * width, (clip.y ?? 0.5) * height);
  ctx.rotate(((clip.rotation ?? 0) * Math.PI) / 180);
  ctx.scale(clip.scale ?? 1, clip.scale ?? 1);
  ctx.globalAlpha = Math.max(0, Math.min(1, clip.opacity ?? 1));
  ctx.font = `700 ${fontSize}px "${family}", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const widths = lines.map((line) => ctx.measureText(line || ' ').width);
  const boxW = Math.max(...widths, fontSize) + fontSize * 0.65;
  const boxH = Math.max(lineHeight, lines.length * lineHeight) + fontSize * 0.45;

  if (clip.bgColor) {
    ctx.fillStyle = hexToRgba(clip.bgColor, 0.62);
    ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
  }

  ctx.fillStyle = clip.fontColor ?? '#ffffff';
  const startY = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, 0, startY + i * lineHeight));
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const n = Number.parseInt(value, 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-zinc-400 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
