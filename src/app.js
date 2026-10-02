(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={
  name:"Nuevo proyecto", aspect:"16:9", exportPreset:"1080p", fps:30,
  media:[], clips:[], playhead:0, selected:null, px:60, playing:false
};
let history=[], future=[], raf=0, lastTs=0;

function uid(){return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}
function snap(){history.push(JSON.stringify({...state,playhead:state.playhead,selected:state.selected})); if(history.length>60)history.shift(); future=[]; persist()}
function restore(raw){const o=JSON.parse(raw);Object.assign(state,o);renderAll()}
function undo(){if(!history.length)return;future.push(JSON.stringify(state));restore(history.pop())}
function redo(){if(!future.length)return;history.push(JSON.stringify(state));restore(future.pop())}
function persist(){localStorage.setItem("scala-cut-project",JSON.stringify(state))}
function loadPersisted(){try{const p=JSON.parse(localStorage.getItem("scala-cut-project"));if(p)Object.assign(state,p)}catch{}}
function fmt(t){t=Math.max(0,t||0);const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,"0")+":"+s.toFixed(2).padStart(5,"0")}
function totalDuration(){return Math.max(0,...state.clips.map(c=>(c.start||0)+(c.duration||0)))}
function laneFor(c){return c.type==="audio"?"audio":c.type==="text"?"text":"visual"}
function mediaById(id){return state.media.find(m=>m.id===id)}
async function importPaths(paths){
  $("#status").textContent="Analizando medios...";
  for(const path of paths){
    try{
      const info=await window.scala.probeMedia(path);
      if(info.type==="unknown")continue;
      const url=await window.scala.fileUrl(path);
      state.media.push({...info,id:uid(),url});
    }catch(e){console.error(e)}
  }
  persist();renderMedia();$("#status").textContent="Medios importados";
}
async function pickMedia(){const paths=await window.scala.selectMedia();if(paths.length)await importPaths(paths)}
function addMediaClip(media,at=null){
  snap();
  const type=media.type;
  const same=state.clips.filter(c=>laneFor(c)===laneFor({type}));
  const end=same.length?Math.max(...same.map(c=>c.start+c.duration)):0;
  const duration=type==="image"?5:Math.max(.2,Math.min(media.duration||5,3600));
  const c={id:uid(),mediaId:media.id,path:media.path,name:media.name,type,start:at==null?end:Math.max(0,at),duration,trimStart:0,speed:1,volume:1,hasAudio:!!media.hasAudio,brightness:0,contrast:1,saturation:1};
  state.clips.push(c);state.selected=c.id;renderAll();
}
function addText(){
  snap();const c={id:uid(),type:"text",name:"Texto",text:"Texto",start:state.playhead,duration:3,fontSize:48,color:"#ffffff",x:50,y:85};
  state.clips.push(c);state.selected=c.id;renderAll();
}
function renderMedia(){
  const grid=$("#mediaGrid");grid.innerHTML="";
  for(const m of state.media){
    const card=document.createElement("div");card.className="media-card";card.draggable=true;card.dataset.id=m.id;
    const thumb=document.createElement("div");thumb.className="media-thumb";
    if(m.type==="image"){const im=new Image();im.src=m.url;thumb.append(im)}
    else if(m.type==="video"){const v=document.createElement("video");v.src=m.url;v.muted=true;v.preload="metadata";thumb.append(v)}
    else thumb.textContent="♫ AUDIO";
    const meta=document.createElement("div");meta.className="media-meta";meta.innerHTML=`<b>${escapeHtml(m.name)}</b><span>${m.type.toUpperCase()} · ${fmt(m.duration)}</span>`;
    const add=document.createElement("button");add.className="media-add";add.textContent="+ Timeline";add.onclick=e=>{e.stopPropagation();addMediaClip(m)};
    meta.append(add);card.append(thumb,meta);
    card.ondragstart=e=>e.dataTransfer.setData("text/scala-media",m.id);
    grid.append(card);
  }
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderRuler(){
  const r=$("#ruler"),dur=Math.max(30,totalDuration()+10),w=dur*state.px;r.style.width=w+"px";r.innerHTML="";
  for(let t=0;t<=dur;t++){if(t%(state.px<50?5:1))continue;const d=document.createElement("div");d.className="tick";d.style.left=(t*state.px)+"px";d.innerHTML=`<span>${t}s</span>`;r.append(d)}
  $$(".lane").forEach(l=>l.style.width=w+"px");
}
function renderTimeline(){
  renderRuler();$$(".lane").forEach(l=>l.innerHTML="");
  for(const c of state.clips){
    const lane=$(`.lane[data-lane="${laneFor(c)}"]`);
    const d=document.createElement("div");d.className=`clip ${laneFor(c)} ${state.selected===c.id?"selected":""}`;d.dataset.id=c.id;
    d.style.left=(c.start*state.px)+"px";d.style.width=Math.max(18,c.duration*state.px)+"px";
    d.innerHTML=`<span class="handle left"></span><div class="clipname">${escapeHtml(c.name||c.text||c.type)}</div><span class="handle right"></span>`;
    d.onclick=e=>{e.stopPropagation();state.selected=c.id;renderTimeline();renderProperties();renderPreview()};
    d.draggable=true;
    d.ondragstart=e=>{if(e.target.classList.contains("handle")){e.preventDefault();return}e.dataTransfer.setData("text/scala-clip",c.id)};
    setupResize(d,c);
    lane.append(d);
  }
  $("#playhead").style.left=(state.playhead*state.px)+"px";$("#zoomLabel").textContent=state.px+" px/s";
}
function setupResize(el,c){
  el.querySelector(".handle.right").onpointerdown=e=>{e.preventDefault();e.stopPropagation();const x=e.clientX,orig=c.duration;snap();const move=ev=>{c.duration=Math.max(.1,orig+(ev.clientX-x)/state.px);renderTimeline();renderPreview()};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);persist()};addEventListener("pointermove",move);addEventListener("pointerup",up)};
  el.querySelector(".handle.left").onpointerdown=e=>{e.preventDefault();e.stopPropagation();const x=e.clientX,os=c.start,od=c.duration,ot=c.trimStart||0;snap();const move=ev=>{let dt=(ev.clientX-x)/state.px;dt=Math.max(-os,Math.min(od-.1,dt));c.start=os+dt;c.duration=od-dt;if(c.type!=="text")c.trimStart=Math.max(0,ot+dt*(c.speed||1));renderTimeline();renderPreview()};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);persist()};addEventListener("pointermove",move);addEventListener("pointerup",up)};
}
function setupLanes(){
  $$(".lane").forEach(l=>{
    l.ondragover=e=>e.preventDefault();
    l.ondrop=e=>{e.preventDefault();const rect=l.getBoundingClientRect(),at=Math.max(0,(e.clientX-rect.left+l.parentElement.parentElement.scrollLeft)/state.px);
      const mid=e.dataTransfer.getData("text/scala-media");if(mid){const m=mediaById(mid);if(m && laneFor({type:m.type})===l.dataset.lane)addMediaClip(m,at);return}
      const cid=e.dataTransfer.getData("text/scala-clip");const c=state.clips.find(x=>x.id===cid);if(c && laneFor(c)===l.dataset.lane){snap();c.start=at;renderAll()}
    };
    l.onclick=e=>{const rect=l.getBoundingClientRect();state.playhead=Math.max(0,(e.clientX-rect.left+l.parentElement.parentElement.scrollLeft)/state.px);state.selected=null;renderAll()}
  });
}
function selected(){return state.clips.find(c=>c.id===state.selected)}
function renderProperties(){
  const c=selected();$("#noSelection").hidden=!!c;$("#clipProps").hidden=!c;if(!c)return;
  $("#propName").value=c.name||"";const isText=c.type==="text";
  $("#speedRow").hidden=isText||c.type==="image";$("#volumeRow").hidden=isText||c.type==="image";$("#visualProps").hidden=isText||c.type==="audio";$("#textProps").hidden=!isText;
  if(!isText){
    $("#propSpeed").value=c.speed||1;$("#speedVal").textContent=Number(c.speed||1).toFixed(2)+"x";
    $("#propVolume").value=c.volume??1;$("#volumeVal").textContent=Math.round((c.volume??1)*100)+"%";
    $("#propBrightness").value=c.brightness||0;$("#propContrast").value=c.contrast||1;$("#propSaturation").value=c.saturation||1;
  }else{
    $("#propText").value=c.text||"";$("#propFontSize").value=c.fontSize||48;$("#propColor").value=c.color||"#ffffff";$("#propX").value=c.x??50;$("#propY").value=c.y??85;
  }
}
function currentVisual(){
  return state.clips.filter(c=>["video","image"].includes(c.type)&&state.playhead>=c.start&&state.playhead<c.start+c.duration).sort((a,b)=>a.start-b.start).at(-1)
}
async function renderPreview(){
  const c=currentVisual(),v=$("#previewVideo"),im=$("#previewImage"),empty=$("#emptyPreview");
  v.style.display="none";im.style.display="none";empty.style.display=c?"none":"block";
  const txt=state.clips.filter(x=>x.type==="text"&&state.playhead>=x.start&&state.playhead<x.start+x.duration).at(-1);
  const to=$("#textOverlay");
  if(txt){to.style.display="block";to.textContent=txt.text||"Texto";to.style.fontSize=(txt.fontSize||48)+"px";to.style.color=txt.color||"#fff";to.style.left=(txt.x??50)+"%";to.style.top=(txt.y??85)+"%"}else to.style.display="none";
  if(c){
    const m=mediaById(c.mediaId); if(!m)return;
    const filter=`brightness(${1+(c.brightness||0)}) contrast(${c.contrast||1}) saturate(${c.saturation||1})`;
    if(c.type==="video"){v.style.display="block";v.style.filter=filter;if(v.src!==m.url)v.src=m.url;const target=(c.trimStart||0)+(state.playhead-c.start)*(c.speed||1);if(Math.abs((v.currentTime||0)-target)>.25)try{v.currentTime=target}catch{};v.volume=Math.min(1,c.volume??1)}
    else{im.style.display="block";im.src=m.url;im.style.filter=filter}
  }
  $("#timeLabel").textContent=`${fmt(state.playhead)} / ${fmt(totalDuration())}`;$("#scrubber").value=totalDuration()?Math.round(state.playhead/totalDuration()*1000):0;$("#playhead").style.left=(state.playhead*state.px)+"px";
}
function play(){
  state.playing=!state.playing;$("#playBtn").textContent=state.playing?"❚❚":"▶";
  const v=$("#previewVideo");if(state.playing){lastTs=performance.now();if(v.style.display!=="none")v.play().catch(()=>{});tick(lastTs)}else{cancelAnimationFrame(raf);v.pause()}
}
function tick(ts){
  if(!state.playing)return;const dt=(ts-lastTs)/1000;lastTs=ts;state.playhead+=dt;if(state.playhead>=totalDuration()){state.playhead=totalDuration();state.playing=false;$("#playBtn").textContent="▶";$("#previewVideo").pause();renderPreview();return}renderPreview();raf=requestAnimationFrame(tick)
}
function split(){
  const c=selected();if(!c||c.type==="text")return;const t=state.playhead;if(t<=c.start+.05||t>=c.start+c.duration-.05)return;snap();const left=t-c.start,right=c.duration-left;const n={...c,id:uid(),start:t,duration:right,trimStart:(c.trimStart||0)+left*(c.speed||1)};c.duration=left;state.clips.push(n);state.selected=n.id;renderAll()
}
function del(){if(!state.selected)return;snap();state.clips=state.clips.filter(c=>c.id!==state.selected);state.selected=null;renderAll()}
function applyProp(id,key,parse=v=>v){$(id).oninput=e=>{const c=selected();if(!c)return;c[key]=parse(e.target.value);persist();renderProperties();renderPreview();renderTimeline()}}
function renderAll(){renderMedia();renderTimeline();renderProperties();renderPreview();$("#aspect").value=state.aspect;$("#quality").value=state.exportPreset;$("#previewStage").className="preview-stage ratio-"+state.aspect.replace(":","-")}
async function exportNow(){
  if(!state.clips.length)return alert("Agregue contenido a la línea de tiempo.");
  const out=await window.scala.chooseExport((state.name||"SCALA-CUT")+".mp4");if(!out)return;
  state.aspect=$("#aspect").value;state.exportPreset=$("#quality").value;
  $("#exportModal").hidden=false;$("#exportProgress").value=0;$("#exportPct").textContent="0%";
  try{await window.scala.exportProject({...state},out);$("#exportModal").hidden=true;alert("Exportación terminada:\n"+out)}
  catch(e){$("#exportModal").hidden=true;alert("Error al exportar:\n"+e.message)}
}
function wire(){
  $("#importBtn").onclick=pickMedia;$("#importAudio").onclick=pickMedia;$("#addText").onclick=addText;$("#playBtn").onclick=play;$("#splitBtn").onclick=split;$("#deleteBtn").onclick=del;$("#undoBtn").onclick=undo;$("#redoBtn").onclick=redo;$("#exportBtn").onclick=exportNow;
  $("#aspect").onchange=e=>{state.aspect=e.target.value;persist();renderAll()};$("#quality").onchange=e=>{state.exportPreset=e.target.value;persist()};
  $("#zoomIn").onclick=()=>{state.px=Math.min(180,state.px+10);renderTimeline()};$("#zoomOut").onclick=()=>{state.px=Math.max(20,state.px-10);renderTimeline()};
  $("#scrubber").oninput=e=>{state.playhead=(Number(e.target.value)/1000)*totalDuration();renderPreview()};
  $("#prevFrame").onclick=()=>{state.playhead=Math.max(0,state.playhead-1/state.fps);renderPreview()};$("#nextFrame").onclick=()=>{state.playhead=Math.min(totalDuration(),state.playhead+1/state.fps);renderPreview()};
  $("#saveProject").onclick=async()=>{await window.scala.saveProject({...state});$("#status").textContent="Proyecto guardado"};
  $("#openProject").onclick=async()=>{const p=await window.scala.loadProject();if(p){Object.assign(state,p);renderAll()}};
  $$(".nav").forEach(b=>b.onclick=()=>{$$(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".tabpage").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.tab+"Tab").classList.add("active")});
  $(".filterPreset");
  $$(".filterPreset").forEach(b=>b.onclick=()=>{const c=selected();if(!c||!["video","image"].includes(c.type))return;snap();c.brightness=+b.dataset.b;c.contrast=+b.dataset.c;c.saturation=+b.dataset.s;renderAll()});
  const dz=$("#dropZone");dz.ondragover=e=>{e.preventDefault();dz.classList.add("drag")};dz.ondragleave=()=>dz.classList.remove("drag");dz.ondrop=async e=>{e.preventDefault();dz.classList.remove("drag");const paths=[...e.dataTransfer.files].map(f=>f.path).filter(Boolean);if(paths.length)await importPaths(paths)};
  setupLanes();
  applyProp("#propName","name",String);applyProp("#propSpeed","speed",Number);applyProp("#propVolume","volume",Number);applyProp("#propBrightness","brightness",Number);applyProp("#propContrast","contrast",Number);applyProp("#propSaturation","saturation",Number);applyProp("#propText","text",String);applyProp("#propFontSize","fontSize",Number);applyProp("#propColor","color",String);applyProp("#propX","x",Number);applyProp("#propY","y",Number);
  window.scala.onExportProgress(p=>{$("#exportProgress").value=p;$("#exportPct").textContent=Math.round(p*100)+"%"});
  addEventListener("keydown",e=>{if(e.target.matches("input,textarea"))return;if(e.code==="Space"){e.preventDefault();play()}else if(e.key==="Delete"||e.key==="Backspace")del();else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="i"){e.preventDefault();pickMedia()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="e"){e.preventDefault();exportNow()}else if(e.key.toLowerCase()==="s"&&!e.ctrlKey)split()});
}
loadPersisted();wire();renderAll();window.scala.markReady();
})();
