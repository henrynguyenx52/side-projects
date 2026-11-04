import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

const rounded='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';

export const YouTubeThumbnail:React.FC=()=>{
  return <AbsoluteFill style={{fontFamily:rounded,background:'#F7F7F7',overflow:'hidden'}}>
    <Img
      src={staticFile('weather-plans-episode-01/images/scene-02-park.png')}
      style={{width:'100%',height:'100%',objectFit:'cover'}}
    />
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(20,33,15,.12) 62%,rgba(20,33,15,.55) 100%)'}}/>
    <div style={{position:'absolute',top:54,left:64,display:'flex',alignItems:'center',gap:18}}>
      <div style={{background:'#58CC02',color:'white',borderBottom:'8px solid #46A302',borderRadius:999,padding:'15px 30px 13px',fontSize:28,letterSpacing:2.2}}>EPISODE 01</div>
      <div style={{background:'rgba(255,255,255,.94)',color:'#3C3C3C',borderBottom:'8px solid #DCDCDC',borderRadius:999,padding:'15px 30px 13px',fontSize:27,letterSpacing:1.3}}>ENGLISH IN REAL LIFE</div>
    </div>
    <div style={{position:'absolute',left:72,right:72,bottom:52,background:'rgba(255,255,255,.97)',border:'7px solid #1CB0F6',borderBottom:'18px solid #1598D1',borderRadius:42,padding:'28px 48px 34px',boxShadow:'0 18px 36px rgba(20,33,15,.28)',display:'flex',alignItems:'center',gap:42}}>
      <div style={{flex:1}}>
        <div style={{fontSize:43,color:'#58A700',letterSpacing:2.4,marginBottom:4}}>REAL ENGLISH CONVERSATION</div>
        <div style={{fontSize:92,lineHeight:1.0,color:'#242424',letterSpacing:-2.5}}>WEATHER &amp; PLANS</div>
      </div>
      <div style={{minWidth:330,background:'#FFF4CC',border:'5px solid #FFC800',borderBottom:'13px solid #E5A500',borderRadius:34,padding:'22px 28px 25px',textAlign:'center',color:'#684F00'}}>
        <div style={{fontSize:54,lineHeight:1}}>35</div>
        <div style={{fontSize:29,lineHeight:1.08,letterSpacing:.8}}>USEFUL<br/>EXPRESSIONS</div>
      </div>
    </div>
  </AbsoluteFill>;
};
