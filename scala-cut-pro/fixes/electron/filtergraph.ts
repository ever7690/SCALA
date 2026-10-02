import type { ExportClip, ExportRequest } from '../shared/ipc.js';

interface InputSpec {
  path: string;
  loop?: boolean;
  duration?: number;
}

interface BuildResult {
  inputs: InputSpec[];
  filter: string;
  vMap?: string;
  aMap?: string;
}

/**
 * SCALA CUT PRO export graph.
 * Text is rasterized by Chromium to a transparent PNG before export, so the
 * portable FFmpeg binary does not need the optional drawtext/libfreetype filter.
 */
export function buildFilterGraph(clips: ExportClip[], req: ExportRequest): BuildResult {
  const inputs: InputSpec[] = [];
  const inputIndex = new Map<string, number>();

  for (const c of clips) {
    if (!c.sourcePath || inputIndex.has(c.sourcePath)) continue;
    const isImage =
      c.mediaKind === 'image' || /\.(png|jpe?g|webp|bmp|gif)$/i.test(c.sourcePath);
    inputIndex.set(c.sourcePath, inputs.length);
    inputs.push({
      path: c.sourcePath,
      loop: isImage,
      duration: isImage ? req.duration : undefined,
    });
  }

  const parts: string[] = [
    `color=c=black:s=${req.width}x${req.height}:d=${req.duration}:r=${req.fps},format=yuv420p[bg]`,
  ];

  let vCanvas = 'bg';
  let visualIndex = 0;
  const audioLabels: string[] = [];

  const appendVisual = (clip: ExportClip) => {
    if (!clip.sourcePath || clip.trackKind === 'audio') return;
    const inIdx = inputIndex.get(clip.sourcePath);
    if (inIdx === undefined) return;

    const speed = Math.max(0.05, clip.speed || 1);
    const vLabel = `v${visualIndex}`;
    const ptsExpr = (1 / speed).toFixed(6);
    const tx = Number.isFinite(clip.x) ? clip.x : 0.5;
    const ty = Number.isFinite(clip.y) ? clip.y : 0.5;
    const scale = Math.max(0.01, clip.scale || 1);
    const targetW = Math.max(2, Math.round(req.width * scale / 2) * 2);
    const opacity = Math.max(0, Math.min(1, clip.opacity ?? 1));
    const delaySec = clip.start.toFixed(6);

    let chain = `[${inIdx}:v]`;
    chain += `trim=start=${Math.max(0, clip.trimIn).toFixed(3)}:end=${Math.max(clip.trimIn + 0.01, clip.trimOut).toFixed(3)},`;
    chain += `setpts=(PTS-STARTPTS)*${ptsExpr}+${delaySec}/TB,`;
    chain += `scale=${targetW}:-2:flags=lanczos,`;

    const brightness = clip.brightness ?? 0;
    const contrast = clip.contrast ?? 1;
    const saturation = clip.saturation ?? 1;
    if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
      chain += `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)},`;
    }

    if (clip.rotation) {
      const radians = (clip.rotation * Math.PI / 180).toFixed(6);
      chain += `rotate=${radians}:c=none:ow=rotw(${radians}):oh=roth(${radians}),`;
    }

    chain += `format=yuva420p,colorchannelmixer=aa=${opacity}[${vLabel}]`;
    parts.push(chain);

    const overlayX = `(W-w)*${tx.toFixed(4)}`;
    const overlayY = `(H-h)*${ty.toFixed(4)}`;
    const enable = `between(t,${clip.start.toFixed(3)},${clip.end.toFixed(3)})`;
    const next = `vc${visualIndex}`;
    parts.push(
      `[${vCanvas}][${vLabel}]overlay=x=${overlayX}:y=${overlayY}:enable='${enable}':eof_action=pass[${next}]`,
    );
    vCanvas = next;
    visualIndex++;
  };

  // Regular video/image media first, respecting order supplied by the caller.
  for (const clip of clips.filter((c) => c.trackKind !== 'text')) {
    appendVisual(clip);

    const inIdx = clip.sourcePath ? inputIndex.get(clip.sourcePath) : undefined;
    const shouldHaveAudio =
      inIdx !== undefined &&
      clip.mediaKind !== 'image' &&
      (clip.trackKind === 'audio' ||
        (clip.trackKind === 'video' && clip.hasAudio !== false));

    if (!shouldHaveAudio || inIdx === undefined) continue;

    const speed = Math.max(0.05, clip.speed || 1);
    const aLabel = `a${audioLabels.length}`;
    let aChain = `[${inIdx}:a]`;
    aChain += `atrim=start=${Math.max(0, clip.trimIn).toFixed(3)}:end=${Math.max(clip.trimIn + 0.01, clip.trimOut).toFixed(3)},`;
    aChain += 'asetpts=PTS-STARTPTS,';
    aChain += atempoChain(speed) + ',';
    aChain += `volume=${(clip.volume ?? 1).toFixed(3)},`;
    aChain += `adelay=${Math.round(clip.start * 1000)}|${Math.round(clip.start * 1000)}[${aLabel}]`;
    parts.push(aChain);
    audioLabels.push(aLabel);
  }

  // Rasterized text overlays always render above media, matching the editor.
  for (const textClip of clips.filter((c) => c.trackKind === 'text')) {
    appendVisual(textClip);
  }

  parts.push(`[${vCanvas}]format=yuv420p[vout]`);

  let aMap: string | undefined;
  if (audioLabels.length > 0) {
    parts.push(
      `${audioLabels.map((l) => `[${l}]`).join('')}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=0,aresample=44100[aout]`,
    );
    aMap = '[aout]';
  }

  return { inputs, filter: parts.join(';'), vMap: '[vout]', aMap };
}

function atempoChain(speed: number): string {
  const stages: number[] = [];
  let s = speed;
  while (s > 2) {
    stages.push(2);
    s /= 2;
  }
  while (s < 0.5) {
    stages.push(0.5);
    s /= 0.5;
  }
  stages.push(s);
  return stages.map((v) => `atempo=${v.toFixed(4)}`).join(',');
}
