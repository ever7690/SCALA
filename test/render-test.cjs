const fs=require("fs");
const path=require("path");
const {spawnSync}=require("child_process");
const {exportProject,ffmpegPath}=require("../lib/exporter.cjs");
(async()=>{
 const d=path.join(__dirname,"tmp");fs.mkdirSync(d,{recursive:true});
 const v=path.join(d,"in.mp4"), a=path.join(d,"music.wav"), img=path.join(d,"img.png"), out=path.join(d,"out.mp4");
 let r=spawnSync(ffmpegPath,["-y","-f","lavfi","-i","testsrc2=size=640x360:rate=30","-f","lavfi","-i","sine=frequency=440:sample_rate=48000","-t","2","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",v],{stdio:"inherit"}); if(r.status)process.exit(r.status);
 r=spawnSync(ffmpegPath,["-y","-f","lavfi","-i","sine=frequency=220:sample_rate=48000","-t","3",a],{stdio:"inherit"});if(r.status)process.exit(r.status);
 r=spawnSync(ffmpegPath,["-y","-f","lavfi","-i","color=c=blue:s=640x360","-frames:v","1",img],{stdio:"inherit"});if(r.status)process.exit(r.status);
 const p={aspect:"16:9",exportPreset:"720p",customResolution:[640,360],fps:30,clips:[
  {id:"v",type:"video",path:v,start:0,duration:2,trimStart:0,speed:1,volume:1,hasAudio:true,brightness:0,contrast:1,saturation:1},
  {id:"i",type:"image",path:img,start:2,duration:1,brightness:0,contrast:1,saturation:1},
  {id:"a",type:"audio",path:a,start:0,duration:3,trimStart:0,speed:1,volume:.25},
  {id:"t",type:"text",text:"SCALA CUT",start:.25,duration:2,fontSize:36,color:"#ffffff",x:50,y:80}
 ]};
 await exportProject(p,out);
 assert(fs.existsSync(out)&&fs.statSync(out).size>10000);
 console.log("RENDER_TEST=PASS",fs.statSync(out).size);
})().catch(e=>{console.error(e);process.exit(1)});
