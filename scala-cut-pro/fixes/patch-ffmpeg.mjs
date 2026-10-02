import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node patch-ffmpeg.mjs <electron/ffmpeg.ts>');
let s = fs.readFileSync(file, 'utf8');

const outputNeedle = "  args.push('-progress', 'pipe:1');\n  args.push(req.outputPath);";
const outputReplacement =
  "  args.push('-progress', 'pipe:1');\n" +
  "  // Hard output bound: image/text loop inputs must never make a render run forever.\n" +
  "  args.push('-t', String(Math.max(0.05, req.duration)));\n" +
  "  args.push(req.outputPath);";

if (!s.includes(outputNeedle)) {
  throw new Error('Could not locate FFmpeg output block');
}
s = s.replace(outputNeedle, outputReplacement);

const stderrNeedle = "      stderr += c.toString();";
const stderrReplacement =
  "      // Keep only the tail of FFmpeg diagnostics; never allow an unbounded log in RAM.\n" +
  "      stderr = (stderr + c.toString()).slice(-128 * 1024);";
if (!s.includes(stderrNeedle)) {
  throw new Error('Could not locate FFmpeg stderr block');
}
s = s.replace(stderrNeedle, stderrReplacement);

fs.writeFileSync(file, s);
console.log('FFMPEG_EXPORT_GUARDS=APPLIED');
