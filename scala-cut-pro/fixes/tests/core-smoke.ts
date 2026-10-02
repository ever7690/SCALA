import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { probeMedia, generateThumbnail, runExport } from './electron/ffmpeg';
import type { ExportRequest } from './shared/ipc';

async function main() {
  if (!ffmpegPath) throw new Error('ffmpeg-static path unavailable');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scala-cut-pro-smoke-'));
  const sample = path.join(dir, 'sample.mp4');
  const titlePng = path.join(dir, 'title.png');
  const output = path.join(dir, 'export.mp4');

  execFileSync(ffmpegPath, [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=44100',
    '-t', '2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    sample,
  ], { stdio: 'pipe' });

  const probe = await probeMedia(sample);
  if (!probe.hasVideo || !probe.hasAudio || probe.width !== 640 || probe.height !== 360) {
    throw new Error('media probe did not detect generated A/V file correctly');
  }
  console.log('IMPORT_PROBE=PASS');

  const thumb = await generateThumbnail(sample, 0.5);
  if (!thumb.startsWith('data:image/jpeg;base64,') || thumb.length < 100) {
    throw new Error('thumbnail generation failed');
  }
  console.log('THUMBNAIL=PASS');

  // Tiny valid PNG stands in for Chromium-rasterized text during this headless core test.
  fs.writeFileSync(
    titlePng,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8cXcAAAAASUVORK5CYII=',
      'base64',
    ),
  );

  const req: ExportRequest = {
    width: 640,
    height: 360,
    fps: 30,
    duration: 2,
    outputPath: output,
    videoBitrate: '2M',
    audioBitrate: '128k',
    preset: 'fast',
    clips: [
      {
        id: 'video',
        sourcePath: sample,
        trackIndex: 1,
        trackKind: 'video',
        mediaKind: 'video',
        hasAudio: true,
        hasVideo: true,
        start: 0,
        end: 2,
        trimIn: 0,
        trimOut: 2,
        speed: 1,
        volume: 1,
        opacity: 1,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        brightness: 0.04,
        contrast: 1.05,
        saturation: 1.08,
      },
      {
        id: 'text-raster',
        sourcePath: titlePng,
        trackIndex: 0,
        trackKind: 'text',
        mediaKind: 'image',
        hasAudio: false,
        hasVideo: true,
        start: 0.3,
        end: 1.7,
        trimIn: 0,
        trimOut: 1.4,
        speed: 1,
        volume: 0,
        opacity: 0.9,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
      },
    ],
  };

  const result = await runExport('scala-smoke', req, () => undefined);
  if (!result.ok) throw new Error(`export failed: ${result.error}`);
  if (!fs.existsSync(output) || fs.statSync(output).size < 1000) {
    throw new Error('export output missing or empty');
  }
  const outProbe = await probeMedia(output);
  if (!outProbe.hasVideo || !outProbe.hasAudio || outProbe.width !== 640 || outProbe.height !== 360) {
    throw new Error('exported MP4 failed validation');
  }
  console.log('TEXT_RASTER_PIPELINE=PASS');
  console.log('MP4_EXPORT=PASS');
  console.log('SCALA_CUT_CORE=VERIFICADO');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
