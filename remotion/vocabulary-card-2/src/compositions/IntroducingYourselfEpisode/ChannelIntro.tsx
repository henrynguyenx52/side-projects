import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const font='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};

export const ChannelIntro:React.FC=()=>{
  const frame=useCurrentFrame();
  const {fps,durationInFrames}=useVideoConfig();
  const reveal=spring({frame,fps,config:{damping:16,stiffness:145,mass:.8}});
  const title=spring({frame:frame-12,fps,config:{damping:18,stiffness:170}});
  const exit=interpolate(frame,[durationInFrames-12,durationInFrames],[1,0],clamp);
  const wipe=interpolate(frame,[0,18],[-30,115],clamp);
  return <AbsoluteFill style={{fontFamily:font,overflow:'hidden',background:'linear-gradient(135deg,#0FAAF1 0%,#1CB0F6 58%,#7BDAFF 100%)',opacity:exit}}>
    <Audio src={staticFile('introducing-yourself-episode-02/intro-v1/channel-chime.wav')} volume={.9}/>
    <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 18% 12%,rgba(255,255,255,.42),transparent 30%),radial-gradient(circle at 82% 88%,rgba(255,224,48,.3),transparent 34%)'}}/>
    {Array.from({length:12}).map((_,i)=><div key={i} style={{position:'absolute',width:18,height:86,borderRadius:20,background:'#FFE331',left:'82%',top:'19%',transformOrigin:'9px 245px',transform:`rotate(${i*30}deg) translateY(-215px) scaleY(${.7+.3*reveal})`,opacity:.82*reveal}}/>)}
    <div style={{position:'absolute',left:105,top:110,width:740,height:740,borderRadius:'50%',border:'18px solid white',boxShadow:'0 24px 54px rgba(0,53,112,.25)',overflow:'hidden',transform:`scale(${.72+.28*reveal}) rotate(${interpolate(reveal,[0,1],[-4,0])}deg)`}}>
      <Img src={staticFile('introducing-yourself-episode-02/images/scene-01-conversation-club-exterior.png')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 48%',transform:'scale(1.18)'}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 55%,rgba(10,93,155,.2))'}}/>
    </div>
    <div style={{position:'absolute',left:1240,right:30,top:208,textAlign:'center',transform:`translateY(${interpolate(title,[0,1],[70,0])}px) scale(${.88+title*.12})`,transformOrigin:'center',opacity:title}}>
      <div style={{display:'inline-block',background:'#FFF',color:'#0B2790',borderRadius:32,padding:'10px 28px',fontSize:34,letterSpacing:2,boxShadow:'0 9px 0 rgba(7,73,139,.18)'}}>LET&apos;S SPEAK ENGLISH!</div>
      <div style={{fontSize:104,lineHeight:.95,color:'#FFF',textShadow:'0 8px 0 #0B2790,0 16px 28px rgba(0,0,0,.2)',marginTop:38}}>English</div>
      <div style={{fontSize:88,lineHeight:1,color:'#FFE331',textShadow:'0 7px 0 #D77B00,0 14px 26px rgba(0,0,0,.18)'}}>in Real Life</div>
      <div style={{display:'inline-block',marginTop:34,background:'#FF9600',color:'#FFF',padding:'15px 32px 17px',borderRadius:18,fontSize:31,letterSpacing:1.5,boxShadow:'0 8px 0 #C96700'}}>ENGLISH THROUGH STORIES</div>
    </div>
    <div style={{position:'absolute',top:0,bottom:0,left:`${wipe}%`,width:220,transform:'skewX(-12deg)',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent)'}}/>
  </AbsoluteFill>;
};
