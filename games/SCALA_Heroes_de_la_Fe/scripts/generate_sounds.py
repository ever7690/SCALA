from pathlib import Path
import array,math,wave,hashlib,json

r=Path(__file__).resolve().parent.parent
dest=r/'public/audio'
dest.mkdir(parents=True,exist_ok=True)
rate=44100
cues=json.loads((r/'src/data/sound-design.json').read_text())
records=[]
for cue,design in cues.items():
 notes=design['notes']
 length=int((max(delay+duration for _,delay,duration,_,_ in notes)+0.05)*rate)
 left=[0.0]*length
 right=[0.0]*length
 for hz,delay,duration,amplitude,pan in notes:
  first=int(delay*rate)
  for frame in range(int(duration*rate)):
   t=frame/rate
   attack=math.sin(min(1.0,t/0.012)*math.pi/2)**2
   release=math.sin(min(1.0,(duration-t)/0.07)*math.pi/2)**2
   envelope=attack*release*math.exp(-5.1*t/duration)
   sample=sum(partial*math.sin(2*math.pi*hz*harmonic*t)*math.exp(-harmonic*t*0.6) for harmonic,partial in [(1,1.0),(2,0.18),(3,0.065),(4,0.020)])
   sample*=envelope*amplitude
   left[first+frame]+=sample*(1-pan)
   right[first+frame]+=sample*(1+pan)
 peak=max(max(map(abs,left)),max(map(abs,right)))
 scale=0.62/peak
 pcm=array.array('h')
 totalSquare=0.0
 for l,rr in zip(left,right):
  l*=scale;rr*=scale;totalSquare+=l*l+rr*rr
  pcm.extend([round(l*32767),round(rr*32767)])
 file=dest/('heroes-'+cue+'.wav')
 with wave.open(str(file),'wb') as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm.tobytes())
 records.append({'cue':cue,'purpose':design['purpose'],'path':'public/audio/'+file.name,'durationSeconds':round(length/rate,4),'sampleRate':rate,'channels':2,'playbackGain':design['gain'],'peakDbFS':round(20*math.log10(0.62),2),'rmsDbFS':round(20*math.log10(math.sqrt(totalSquare/(length*2))),2),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'roundedAttackMilliseconds':12,'releaseMilliseconds':70})
(r/'docs/efectos-propios.json').write_text(json.dumps({'synthesis':'SCALA original warm wooden piano, harmonic partials, gentle envelopes','effects':records},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'originalSoftEffects':len(records),'clipping':False,'totalBytes':sum((r/rec['path']).stat().st_size for rec in records)}))
