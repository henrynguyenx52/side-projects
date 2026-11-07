import React from 'react';
import {AbsoluteFill,Audio,Img,Sequence,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import manifest from '../../../../../open-montage/projects/introducing-yourself-episode-02/artifacts/kokoro-relaxed-full-v1-manifest.json';

const font='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const bodyFont='Arial,system-ui,sans-serif';
const episodeLabel='EPISODE 02 · INTRODUCING YOURSELF NATURALLY';
type Cue=(typeof manifest.cues)[number];

const wrap=(text:string,max=34)=>{const words=text.split(/\s+/);const lines:string[]=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>max&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines};

const visualFor=(time:number)=>{
  if(time<61.04)return {file:'scene-01-conversation-club-exterior.png',start:0,end:61.04};
  if(time<124.82)return {file:'scene-02-emma-maya-first-meet.png',start:61.04,end:124.82};
  if(time<199.245)return {file:'scene-03-emma-maya-hometowns.png',start:124.82,end:199.245};
  if(time<248.635)return {file:'scene-03-emma-maya-hometowns.png',start:199.245,end:248.635};
  if(time<304.415)return {file:'scene-04-emma-maya-art-cat.png',start:248.635,end:304.415};
  if(time<364.565)return {file:'scene-05-alex-joins.png',start:304.415,end:364.565};
  if(time<427.94)return {file:null,start:364.565,end:427.94};
  return {file:'scene-01-conversation-club-exterior.png',start:427.94,end:manifest.duration};
};

const pointerX=(speaker:string,time:number)=>{
  if(time>=304.415&&time<364.565)return speaker==='alex'?260:speaker==='maya'?760:1510;
  return speaker==='alex'||speaker==='maya'?360:1510;
};

const Bubble:React.FC<{cue:Cue;time:number}>=({cue,time})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  const lines=wrap(cue.text,cue.text.length>110?42:34);const size=lines.length>=4?42:lines.length===3?49:56;const lineHeight=Math.round(size*1.18);const h=lines.length*lineHeight+62;
  const x=pointerX(cue.speaker,time);const left=cue.speaker==='alex'||cue.speaker==='maya'?72:648;const scale=spring({frame,fps,config:{damping:18,stiffness:170,mass:.8}});
  const tailStart=Math.max(90,Math.min(930,x-left));
  return <div style={{position:'absolute',bottom:54,left,width:1200,transform:`scale(${scale})`,transformOrigin:`${tailStart}px 0`}}>
    <svg width="1200" height={h+85} viewBox={`0 0 1200 ${h+85}`} style={{position:'absolute',left:0,top:-85,overflow:'visible',filter:'drop-shadow(0 7px 0 rgba(0,0,0,.16))'}}>
      <path d={`M40 85 H${tailStart-52} C${tailStart-24} 85 ${tailStart-16} 37 ${tailStart} 8 C${tailStart+7} 43 ${tailStart+29} 85 ${tailStart+68} 85 H1160 Q1200 85 1200 125 V${h+45} Q1200 ${h+85} 1160 ${h+85} H40 Q0 ${h+85} 0 ${h+45} V125 Q0 85 40 85 Z`} fill="white" stroke="#222" strokeWidth="7" strokeLinejoin="round"/>
    </svg>
    <div style={{height:h,boxSizing:'border-box',position:'relative',display:'flex',flexDirection:'column',justifyContent:'center',padding:'26px 52px 34px',fontSize:size,lineHeight:`${lineHeight}px`,letterSpacing:-1,textAlign:'center',color:'#171717'}}>{lines.map((l,i)=><div key={i}>{l}</div>)}</div>
  </div>;
};

const NarratorCard:React.FC<{cue:Cue}>=({cue})=>{const lines=wrap(cue.text,58);return <div style={{position:'absolute',left:230,right:230,bottom:66,background:'rgba(255,255,255,.97)',border:'6px solid #58CC02',borderBottom:'13px solid #46A302',borderRadius:42,padding:'24px 46px 32px',boxShadow:'0 12px 24px rgba(0,0,0,.18)'}}><div style={{fontSize:22,letterSpacing:3,color:'#46A302',marginBottom:12}}>ADAM&apos;S ENGLISH TIP</div><div style={{fontFamily:bodyFont,fontWeight:700,fontSize:lines.length>4?34:40,lineHeight:1.22,color:'#2D2D2D',textAlign:'center'}}>{lines.map((l,i)=><div key={i}>{l}</div>)}</div></div>};

const TeachingScreen:React.FC<{cue:Cue;cueIndex:number}>=({cue,cueIndex})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  const expressionCue=cue.kind==='teaching-expression'?cue:manifest.cues[cueIndex-1];
  const meaningCue=cue.kind==='teaching-meaning'?cue:manifest.cues[cueIndex+1];
  const words=expressionCue.text.split(/\s+/);const activeCount=cue.kind==='teaching-expression'?Math.ceil(interpolate(frame,[0,Math.max(1,(expressionCue.audioDuration-.15)*fps)],[0,words.length],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})):0;
  return <AbsoluteFill style={{background:'#F7F7F7',fontFamily:font,alignItems:'center',justifyContent:'center'}}>
    <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 18% 18%,rgba(28,176,246,.11),transparent 24%),radial-gradient(circle at 82% 80%,rgba(88,204,2,.12),transparent 25%)'}}/>
    <div style={{position:'absolute',top:65,fontSize:24,letterSpacing:4,color:'#58A700'}}>USEFUL EVERYDAY ENGLISH</div>
    <div style={{width:1460,background:'#FFF',border:'5px solid #E5E5E5',borderBottom:'14px solid #D3D3D3',borderRadius:48,padding:'66px 76px',boxShadow:'0 24px 48px rgba(20,50,70,.12)'}}>
      <div style={{fontSize:60,lineHeight:1.25,textAlign:'center',letterSpacing:-1}}>{words.map((word,i)=><span key={`${word}-${i}`} style={{color:i<activeCount?'#46A302':'#222',background:i<activeCount?'#E7FFD5':'transparent',borderRadius:10,padding:'3px 5px',marginRight:9}}>{word}</span>)}</div>
      <div style={{height:4,background:'#ECECEC',margin:'46px 0 38px'}}/>
      <div style={{fontFamily:bodyFont,fontWeight:700,fontSize:36,lineHeight:1.35,color:'#666',textAlign:'center'}}>{meaningCue.text}</div>
    </div>
    <div style={{position:'absolute',bottom:70,color:'#888',fontFamily:bodyFont,fontWeight:700,fontSize:22}}>Listen first. Then use it in your own conversation.</div>
  </AbsoluteFill>;
};

const PracticeScreen:React.FC<{cue:Cue}>=({cue})=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();const progress=interpolate(frame,[0,cue.audioDuration*fps],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const first=cue.id.includes('100');return <AbsoluteFill style={{fontFamily:font,background:'linear-gradient(135deg,#E9F9FF,#F4FFE9)',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:28,letterSpacing:5,color:'#1CB0F6',marginBottom:30}}>YOUR TURN</div><div style={{width:1400,background:'#FFF',borderRadius:52,padding:'64px 78px',boxShadow:'0 20px 50px rgba(21,85,112,.14)',textAlign:'center'}}><div style={{fontSize:48,lineHeight:1.35,color:'#252525'}}>{first?<>I&apos;m ...<br/>I&apos;m originally from ... but now ...<br/>Lately, I&apos;ve been really into ...</>:<>What about you?<br/>What brings you here?<br/>What are you into?</>}</div></div><div style={{marginTop:52,width:950,height:16,borderRadius:20,background:'#DDE9EC',overflow:'hidden'}}><div style={{height:'100%',width:`${progress*100}%`,background:'#58CC02',borderRadius:20}}/></div><div style={{fontFamily:bodyFont,fontSize:25,fontWeight:700,color:'#64747A',marginTop:22}}>Say your answer out loud.</div></AbsoluteFill>};

export const IntroducingYourselfEpisode:React.FC=()=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const time=frame/fps;const visual=visualFor(time);const activeIndex=manifest.cues.findIndex(c=>time>=c.start&&time<c.end);const active=activeIndex>=0?manifest.cues[activeIndex]:null;const teaching=active?.kind==='teaching-expression'||active?.kind==='teaching-meaning';const practice=active?.type==='silence';
  const local=(time-visual.start);const span=Math.max(.01,visual.end-visual.start);const zoom=1.015+local/span*.04;const sceneFade=Math.min(interpolate(local,[0,.35],[0,1],{extrapolateRight:'clamp'}),interpolate(local,[span-.35,span],[1,0],{extrapolateLeft:'clamp'}));
  return <AbsoluteFill style={{fontFamily:font,background:'#163040',overflow:'hidden'}}>
    {!teaching&&!practice&&visual.file&&<><Img src={staticFile(`introducing-yourself-episode-02/images/${visual.file}`)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom})`,opacity:sceneFade}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.05),transparent 58%,rgba(0,0,0,.19))'}}/></>}
    {!teaching&&!practice&&<><div style={{position:'absolute',top:34,left:44,background:'rgba(255,255,255,.94)',borderRadius:22,padding:'12px 22px',fontSize:20,color:'#46A302',letterSpacing:1.5,whiteSpace:'nowrap'}}>{episodeLabel}</div><div style={{position:'absolute',top:38,right:48,width:320,height:15,borderRadius:12,background:'rgba(255,255,255,.65)',padding:3}}><div style={{height:'100%',borderRadius:10,background:'#58CC02',width:`${frame/(manifest.duration*fps)*100}%`}}/></div></>}
    {manifest.cues.map((cue,i)=>{const from=Math.round(cue.start*fps);const duration=Math.max(1,Math.round((cue.end-cue.start)*fps));return cue.type==='speech'?<Sequence key={`audio-${cue.id}`} from={from} durationInFrames={duration} premountFor={fps}><Audio src={staticFile(`introducing-yourself-episode-02/audio-relaxed-v1/${cue.id}.wav`)}/></Sequence>:null})}
    {manifest.cues.map((cue,i)=>{const from=Math.round(cue.start*fps);const next=manifest.cues[i+1];const shortGap=next&&next.start-cue.end<=.75;const visualEnd=shortGap?next.start:cue.end;const duration=Math.max(1,Math.round((visualEnd-cue.start)*fps));return <Sequence key={`visual-${cue.id}`} from={from} durationInFrames={duration} premountFor={fps}>{cue.type==='silence'?<PracticeScreen cue={cue}/>:cue.kind==='teaching-expression'||cue.kind==='teaching-meaning'?<TeachingScreen cue={cue} cueIndex={i}/>:cue.speaker==='narrator'?<NarratorCard cue={cue}/>:<Bubble cue={cue} time={cue.start}/>}</Sequence>})}
    {!teaching&&!practice&&active?.type==='speech'&&active.speaker!=='narrator'&&<div style={{position:'absolute',bottom:18,left:active.speaker==='alex'||active.speaker==='maya'?92:undefined,right:active.speaker==='emma'?92:undefined,color:'#FFF',fontSize:20,textShadow:'0 2px 5px #000',letterSpacing:2}}>{active.speaker.toUpperCase()}</div>}
  </AbsoluteFill>;
};
