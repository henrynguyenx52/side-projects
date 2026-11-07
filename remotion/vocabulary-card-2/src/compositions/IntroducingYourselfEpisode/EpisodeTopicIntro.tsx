import React from 'react';
import {AbsoluteFill,Audio,Img,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import intro from '../../../../../open-montage/projects/introducing-yourself-episode-02/intro-config-v1.json';

const font='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};

export const EpisodeTopicIntro:React.FC=()=>{
  const frame=useCurrentFrame();
  const {fps,durationInFrames}=useVideoConfig();
  const panel=spring({frame:frame-4,fps,config:{damping:20,stiffness:135}});
  const topic=spring({frame:frame-18,fps,config:{damping:18,stiffness:150}});
  const fadeOut=interpolate(frame,[durationInFrames-14,durationInFrames],[1,0],clamp);
  const progress=interpolate(frame,[0,durationInFrames],[0,1],clamp);
  return <AbsoluteFill style={{fontFamily:font,background:'#102633',overflow:'hidden',opacity:fadeOut}}>
    <Audio src={staticFile(intro.narratorAudio)}/>
    <Img src={staticFile('introducing-yourself-episode-02/images/scene-02-emma-maya-first-meet.png')} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1.06+progress*.035})`,filter:'brightness(.52) saturate(.88) blur(2px)'}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(6,30,57,.95) 0%,rgba(6,30,57,.88) 55%,rgba(6,30,57,.42) 100%)'}}/>
    <div style={{position:'absolute',left:105,top:82,display:'flex',gap:18,alignItems:'center',transform:`translateY(${interpolate(panel,[0,1],[-32,0])}px)`,opacity:panel}}>
      <div style={{background:'#58CC02',color:'#FFF',borderRadius:24,padding:'12px 24px',fontSize:24,letterSpacing:1.5}}>{intro.episode.toUpperCase()}</div>
      <div style={{background:'rgba(255,255,255,.94)',color:'#174066',borderRadius:24,padding:'12px 24px',fontSize:24,letterSpacing:1.2}}>{intro.channelName.toUpperCase()}</div>
    </div>
    <div style={{position:'absolute',left:105,top:225,width:1150,transform:`translateX(${interpolate(topic,[0,1],[-80,0])}px)`,opacity:topic}}>
      <div style={{color:'#7DDF39',fontSize:30,letterSpacing:4,marginBottom:20}}>TODAY&apos;S CONVERSATION</div>
      <div style={{color:'#FFF',fontSize:86,lineHeight:1.05,letterSpacing:-2,textShadow:'0 8px 26px rgba(0,0,0,.32)'}}>{intro.topic}</div>
      <div style={{marginTop:32,width:880,color:'#EAF7FF',fontFamily:'Arial,system-ui,sans-serif',fontWeight:700,fontSize:31,lineHeight:1.32}}>{intro.promise}</div>
    </div>
    <div style={{position:'absolute',left:106,bottom:108,display:'flex',alignItems:'flex-end',gap:7,height:66}}>
      {Array.from({length:42}).map((_,i)=>{const h=12+Math.abs(Math.sin(frame*.19+i*.67))*42*(.45+.55*topic);return <div key={i} style={{width:7,height:h,borderRadius:7,background:i/42<progress?'#FFE331':'rgba(255,255,255,.55)'}}/>})}
      <div style={{marginLeft:18,color:'#FFF',fontSize:24,letterSpacing:1}}>NARRATOR · ADAM</div>
    </div>
    <div style={{position:'absolute',left:105,right:105,bottom:48,height:8,borderRadius:8,background:'rgba(255,255,255,.2)',overflow:'hidden'}}><div style={{height:'100%',width:`${progress*100}%`,borderRadius:8,background:'#58CC02'}}/></div>
  </AbsoluteFill>;
};
