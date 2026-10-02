// SCALA CUT PRO - IPC contract
export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaProbe {
  kind: MediaKind;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  codec?: string;
}

export interface ExportClip {
  id: string;
  sourcePath: string;
  trackIndex: number;
  trackKind: 'video' | 'audio' | 'text';
  mediaKind?: MediaKind;
  hasAudio?: boolean;
  hasVideo?: boolean;
  temporary?: boolean;
  start: number;
  end: number;
  trimIn: number;
  trimOut: number;
  speed: number;
  volume: number;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  text?: string;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  fontFamily?: string;
}

export interface ExportRequest {
  clips: ExportClip[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  outputPath: string;
  videoBitrate: string;
  audioBitrate: string;
  preset: string;
}

export interface ExportProgress {
  jobId: string;
  percent: number;
  speed?: string;
  fps?: string;
  time?: string;
}

export interface ExportResult {
  jobId: string;
  ok: boolean;
  outputPath?: string;
  error?: string;
}

export interface ImportedMedia {
  id: string;
  path: string;
  name: string;
  probe: MediaProbe;
  thumbnail?: string;
  previewPath?: string;
}
