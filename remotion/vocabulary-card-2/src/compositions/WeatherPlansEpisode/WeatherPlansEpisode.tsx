import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import plan from '../../../../../open-montage/projects/weather-plans-episode-01/episode-plan.json';
import {LessonDeckV3} from './LessonDeckV3';

const font='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const episodeLabel='EPISODE 01 · WEATHER, PLANS & EVERYDAY CONVERSATIONS';
type Cue=(typeof plan.cues)[number];
const images=['scene-01-sunny-apartment.png','scene-02-park.png','scene-03-lakeside-cafe.png','scene-04-storm.png','scene-05-rainy-memories.png','scene-06-movie-night.png','scene-07-review.png','scene-08-coffee-shop.png'];

const wrap=(text:string,max=30)=>{
  const words=text.split(/\s+/); const lines:string[]=[]; let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>max&&line){lines.push(line);line=word}else line=next}
  if(line)lines.push(line); return lines;
};

const Bubble:React.FC<{cue:Cue}>=({cue})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  const isLeft=cue.speaker==='alex'; const isBoth=cue.speaker==='both';
  const lines=wrap(cue.text,cue.text.length>105?43:34);
  const size=lines.length>=4?45:lines.length===3?52:60;
  const lineHeight=Math.round(size*1.18); const h=lines.length*lineHeight+62;
  const tail=isLeft?'H470 C515 0 515 -38 500 -78 C548 -58 568 0 620 0':'H448 C482 0 484 -54 535 -78 C520 -22 538 0 580 0';
  const scale=spring({frame,fps,config:{damping:18,stiffness:170,mass:.8}});
  return <div style={{position:'absolute',bottom:52,left:isBoth?360:isLeft?72:undefined,right:!isBoth&&!isLeft?72:undefined,width:1200,transform:`scale(${scale})`,transformOrigin:isLeft?'48% 0':'52% 0'}}>
    <svg width="1200" height={h} viewBox={`0 0 1200 ${h}`} style={{position:'absolute',inset:0,overflow:'visible',filter:'drop-shadow(0 7px 0 rgba(0,0,0,.16))'}}>
      <path d={`M40 0 ${tail} H1160 Q1200 0 1200 40 V${h-40} Q1200 ${h} 1160 ${h} H40 Q0 ${h} 0 ${h-40} V40 Q0 0 40 0 Z`} fill="white" stroke="#222" strokeWidth="7" strokeLinejoin="round"/>
    </svg>
    <div style={{height:h,boxSizing:'border-box',position:'relative',display:'flex',flexDirection:'column',justifyContent:'center',padding:'26px 52px 34px',fontSize:size,lineHeight:`${lineHeight}px`,letterSpacing:-1,textAlign:'center',color:'#171717'}}>{lines.map((l,i)=><div key={i}>{l}</div>)}</div>
  </div>;
};

const TeacherCard:React.FC<{cue:Cue}>=({cue})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const lines=wrap(cue.text,58);
  return <div style={{position:'absolute',left:250,right:250,bottom:62,background:'rgba(255,255,255,.97)',border:'6px solid #58CC02',borderBottom:'13px solid #46A302',borderRadius:42,padding:'26px 48px 34px',boxShadow:'0 12px 24px rgba(0,0,0,.18)',transform:`scale(${spring({frame,fps,config:{damping:20,stiffness:150}})})`}}>
    <div style={{fontSize:23,letterSpacing:3,color:'#46A302',marginBottom:12}}>ENGLISH TIP</div>
    <div style={{fontSize:lines.length>3?38:44,lineHeight:1.22,color:'#2D2D2D',textAlign:'center'}}>{lines.map((l,i)=><div key={i}>{l}</div>)}</div>
  </div>;
};

export const WeatherPlansEpisode:React.FC=()=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();
  const time=frame/fps;const sceneIndex=Math.min(7,plan.scenes.findIndex(s=>time>=s.start&&time<s.end)===-1?7:plan.scenes.findIndex(s=>time>=s.start&&time<s.end));
  const scene=plan.scenes[sceneIndex];const local=frame-scene.start*fps;const sceneFrames=(scene.end-scene.start)*fps;
  const active=plan.cues.find(c=>time>=c.start&&time<c.end);
  const isWeatherLesson=active?.speaker==='lesson';
  const zoom=interpolate(local,[0,sceneFrames],[1.01,1.055],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const fade=Math.min(interpolate(local,[0,12],[0,1],{extrapolateRight:'clamp'}),interpolate(local,[sceneFrames-12,sceneFrames],[1,0],{extrapolateLeft:'clamp'}));
  return <AbsoluteFill style={{fontFamily:font,background:'#172430',overflow:'hidden'}}>
    {!isWeatherLesson&&<><Img src={staticFile(`weather-plans-episode-01/images/${images[sceneIndex]}`)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom})`,opacity:fade}}/>
      <div style={{position:'absolute',top:34,left:44,background:'rgba(255,255,255,.92)',borderRadius:22,padding:'12px 22px',fontSize:20,color:'#46A302',letterSpacing:1.5,whiteSpace:'nowrap'}}>{episodeLabel}</div>
      <div style={{position:'absolute',top:38,right:48,width:320,height:15,borderRadius:12,background:'rgba(255,255,255,.65)',padding:3}}><div style={{height:'100%',borderRadius:10,background:'#58CC02',width:`${frame/(plan.duration*fps)*100}%`}}/></div>
      </>}
    {plan.cues.map(c=><Sequence key={c.id} from={Math.round(c.start*fps)} durationInFrames={Math.round(c.end*fps)-Math.round(c.start*fps)}>{c.speaker==='lesson'?<LessonDeckV3 scene={c.scene}/>:<><Audio src={staticFile(`weather-plans-episode-01/audio-v5/${c.id}.wav`)}/>{c.speaker==='narrator'?<TeacherCard cue={c}/>:<Bubble cue={c}/>}</>}</Sequence>)}
    {!isWeatherLesson&&active&&active.speaker!=='narrator'&&<div style={{position:'absolute',bottom:20,left:active.speaker==='alex'?92:undefined,right:active.speaker!=='alex'?92:undefined,color:'white',fontSize:20,textShadow:'0 2px 5px #000',letterSpacing:2}}>{active.speaker.toUpperCase()}</div>}
  </AbsoluteFill>;
};
