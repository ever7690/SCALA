const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

function unpacked(p) {
  return p ? p.replace("app.asar", "app.asar.unpacked") : p;
}
const ffmpegPath = unpacked(require("ffmpeg-static"));

function assTime(sec) {
  sec = Math.max(0, Number(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = (sec % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2,"0")}:${ss}`;
}
function assColor(hex) {
  const h = String(hex || "#ffffff").replace("#","").padEnd(6,"f").slice(0,6);
  const r=h.slice(0,2), g=h.slice(2,4), b=h.slice(4,6);
  return `&H00${b}${g}${r}&`.toUpperCase();
}
function assEscape(text) {
  return String(text ?? "").replace(/\\/g,"\\\\").replace(/\{/g,"\\{").replace(/\}/g,"\\}").replace(/\r?\n/g,"\\N");
}
function writeAss(textClips, w, h) {
  if (!textClips.length) return null;
  const file = path.join(os.tmpdir(), `scala-cut-${process.pid}-${Date.now()}.ass`);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${w}
PlayResY: ${h}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,DejaVu Sans,48,&H00FFFFFF,&H000000FF,&H80000000,&H40000000,-1,0,0,0,100,100,0,0,1,2,1,5,10,10,10,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;
  const events = textClips.map(c => {
    const start = Number(c.start||0), end = start + Number(c.duration||2);
    const x = Math.round(w * Number(c.x ?? 50) / 100);
    const y = Math.round(h * Number(c.y ?? 85) / 100);
    const fsiz = Math.max(12, Number(c.fontSize||48));
    const color = assColor(c.color);
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,{\\an5\\pos(${x},${y})\\fs${fsiz}\\c${color}}${assEscape(c.text||"Texto")}`;
  }).join("\n");
  fs.writeFileSync(file, header + events + "\n", "utf8");
  return file;
}


function run(args, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    cp.stderr.on("data", d => {
      const s = d.toString();
      stderr += s;
      const m = s.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (m) {
        const sec = Number(m[1])*3600 + Number(m[2])*60 + Number(m[3]);
        onProgress(sec);
      }
    });
    cp.on("error", reject);
    cp.on("close", code => code === 0 ? resolve() : reject(new Error(stderr.slice(-5000) || `ffmpeg exited ${code}`)));
  });
}

function resolutionFor(project) {
  const preset = project.exportPreset || "1080p";
  const ratio = project.aspect || "16:9";
  const map = {
    "720p":  { "16:9":[1280,720], "9:16":[720,1280], "1:1":[720,720], "4:5":[720,900] },
    "1080p": { "16:9":[1920,1080], "9:16":[1080,1920], "1:1":[1080,1080], "4:5":[1080,1350] },
    "4K":    { "16:9":[3840,2160], "9:16":[2160,3840], "1:1":[2160,2160], "4:5":[2160,2700] },
    "8K":    { "16:9":[7680,4320], "9:16":[4320,7680], "1:1":[4320,4320], "4:5":[4320,5400] }
  };
  return (map[preset] || map["1080p"])[ratio] || map["1080p"]["16:9"];
}

async function exportProject(project, outPath, onProgress = () => {}) {
  const clips = Array.isArray(project.clips) ? project.clips : [];
  const duration = Math.max(0.1, ...clips.map(c => Number(c.start||0) + Number(c.duration||0)));
  const [w,h] = project.customResolution || resolutionFor(project);
  const fps = Number(project.fps || 30);
  const args = [
    "-y",
    "-f","lavfi","-t",String(duration),"-i",`color=c=#111111:s=${w}x${h}:r=${fps}`,
    "-f","lavfi","-t",String(duration),"-i","anullsrc=r=48000:cl=stereo"
  ];

  const mediaClips = clips.filter(c => ["video","image","audio"].includes(c.type));
  const inputIndex = new Map();
  let idx = 2;
  for (const c of mediaClips) {
    if (c.type === "image") {
      args.push("-loop","1","-t",String(Math.max(0.1, c.duration)),"-i",c.path);
    } else {
      args.push("-i",c.path);
    }
    inputIndex.set(c.id, idx++);
  }

  const filters = [];
  filters.push(`[0:v]format=yuv420p[vbase0]`);
  let vbase = "vbase0";
  let vi = 0;
  const visual = clips.filter(c => ["video","image"].includes(c.type)).sort((a,b)=>a.start-b.start);
  for (const c of visual) {
    const i = inputIndex.get(c.id);
    const speed = Math.min(2, Math.max(0.5, Number(c.speed||1)));
    const trim = Math.max(0, Number(c.trimStart||0));
    const dur = Math.max(0.05, Number(c.duration||1));
    const srcDur = dur * speed;
    const b = Number(c.brightness||0);
    const contrast = Number(c.contrast||1);
    const sat = Number(c.saturation||1);
    let chain;
    if (c.type === "video") {
      chain = `[${i}:v]trim=start=${trim}:duration=${srcDur},setpts=(PTS-STARTPTS)/${speed},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},eq=brightness=${b}:contrast=${contrast}:saturation=${sat},setpts=PTS+${Number(c.start||0)}/TB[v${vi}]`;
    } else {
      chain = `[${i}:v]trim=duration=${dur},setpts=PTS-STARTPTS,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},eq=brightness=${b}:contrast=${contrast}:saturation=${sat},setpts=PTS+${Number(c.start||0)}/TB[v${vi}]`;
    }
    filters.push(chain);
    filters.push(`[${vbase}][v${vi}]overlay=eof_action=pass:shortest=0[vbase${vi+1}]`);
    vbase = `vbase${vi+1}`;
    vi++;
  }

  let textBase = vbase;
  const assFile = writeAss(clips.filter(c => c.type === "text"), w, h);
  if (assFile) {
    const escapedAss = assFile.replace(/\\/g, "/").replace(/:/g, "\\:");
    filters.push(`[${textBase}]subtitles=filename='${escapedAss}'[vtext]`);
    textBase = "vtext";
  }
  filters.push(`[${textBase}]trim=duration=${duration},setpts=PTS-STARTPTS[vout]`);

  const audioLabels = ["[1:a]"];
  let ai = 0;
  for (const c of mediaClips.filter(c => c.type === "audio" || (c.type === "video" && c.hasAudio))) {
    const i = inputIndex.get(c.id);
    const speed = Math.min(2, Math.max(0.5, Number(c.speed||1)));
    const trim = Math.max(0, Number(c.trimStart||0));
    const dur = Math.max(0.05, Number(c.duration||1));
    const srcDur = dur * speed;
    const delay = Math.max(0, Math.round(Number(c.start||0)*1000));
    const vol = Math.max(0, Number(c.volume ?? 1));
    const label = `aud${ai}`;
    filters.push(`[${i}:a]atrim=start=${trim}:duration=${srcDur},asetpts=PTS-STARTPTS,atempo=${speed},volume=${vol},adelay=${delay}|${delay}[${label}]`);
    audioLabels.push(`[${label}]`);
    ai++;
  }
  if (audioLabels.length > 1) {
    filters.push(`${audioLabels.join("")}amix=inputs=${audioLabels.length}:duration=first:dropout_transition=0,atrim=duration=${duration}[aout]`);
  } else {
    filters.push(`[1:a]atrim=duration=${duration}[aout]`);
  }

  args.push("-filter_complex", filters.join(";"));
  args.push("-map","[vout]","-map","[aout]","-c:v","libx264","-preset","veryfast","-crf","20","-c:a","aac","-b:a","192k","-pix_fmt","yuv420p","-movflags","+faststart","-t",String(duration),outPath);

  try {
    await run(args, sec => onProgress(Math.max(0, Math.min(1, sec/duration))));
    onProgress(1);
    return outPath;
  } finally {
    if (assFile) {
      try { fs.unlinkSync(assFile); } catch {}
    }
  }
}

module.exports = { exportProject, resolutionFor, ffmpegPath };
