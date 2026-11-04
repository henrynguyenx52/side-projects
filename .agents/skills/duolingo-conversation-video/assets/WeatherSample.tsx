import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {defaultTheme, duoCardStyle, springPresets} from '../../config/design-system';

const font = '"Arial Rounded MT Bold", "Nunito", ui-rounded, system-ui, sans-serif';
const turns = [
  {speaker:'Alex', text:"It's such a sunny day!", keyword:'sunny', icon:'☀️', from:0.55, to:3.2, audio:'01-alex.wav'},
  {speaker:'Mia', text:'It is! But that wind feels cold.', keyword:'wind', icon:'🍃', from:3.2, to:6.8, audio:'02-mia.wav'},
  {speaker:'Alex', text:"Do you think it'll rain?", keyword:'rain', icon:'🌧️', from:6.8, to:9.8, audio:'03-alex.wav'},
  {speaker:'Mia', text:'Maybe. Look at those dark clouds.', keyword:'clouds', icon:'☁️', from:9.8, to:13.8, audio:'04-mia.wav'},
];

const Dialogue: React.FC<{turn: typeof turns[number]}> = ({turn}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const male = turn.speaker === 'Alex';
  const color = male ? defaultTheme.wordAColor : defaultTheme.wordBColor;
  const dark = male ? '#1899D6' : '#E68600';
  const words = turn.text.split(' ');
  return <div style={{position:'absolute',left:88,right:88,top:1170,scale:spring({frame,fps,config:springPresets.snappy}),transformOrigin:male?'25% 0':'75% 0'}}>
    <div style={{position:'absolute',top:-23,left:male?140:undefined,right:male?undefined:140,width:48,height:48,background:'white',rotate:'45deg',borderTop:`4px solid ${color}`,borderLeft:`4px solid ${color}`,zIndex:2}} />
    <div style={{...duoCardStyle,border:`4px solid ${color}`,borderBottom:`10px solid ${dark}`,borderRadius:40,padding:'40px 42px 46px',position:'relative',zIndex:3,boxShadow:'0 14px 0 rgba(60,60,60,.035)'}}>
      <div style={{display:'flex',alignItems:'center',gap:15,marginBottom:24}}>
        <div style={{width:52,height:52,borderRadius:18,background:color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:27}}>{male?'A':'M'}</div>
        <span style={{fontSize:29,color:dark,letterSpacing:2,textTransform:'uppercase'}}>{turn.speaker}</span>
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center',height:28}}>{[0,1,2,3].map(i=><div key={i} style={{width:6,borderRadius:5,background:color,height:10+16*Math.abs(Math.sin(frame/6+i))}}/>)}</div>
      </div>
      <div style={{fontSize:58,lineHeight:1.32,letterSpacing:-1.2,color:defaultTheme.textPrimary}}>
        {words.map((word,i)=><React.Fragment key={i}><span style={{color:word.toLowerCase().includes(turn.keyword)?dark:undefined,background:word.toLowerCase().includes(turn.keyword)?(male?'#DDF4FF':'#FFF0D8'):undefined,borderRadius:12,padding:word.toLowerCase().includes(turn.keyword)?'0 6px':undefined}}>{word}</span>{i<words.length-1?' ':''}</React.Fragment>)}
      </div>
    </div>
  </div>;
};

export const WeatherSample: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const active = turns.find(t=>frame>=t.from*fps && frame<t.to*fps) ?? turns[0];
  const index = turns.indexOf(active);
  return <AbsoluteFill style={{background:defaultTheme.bgColor,fontFamily:font,color:defaultTheme.textPrimary,overflow:'hidden'}}>
    <div style={{position:'absolute',width:800,height:800,borderRadius:'50%',background:'#EDF6E4',top:340,left:360,opacity:.55}}/>
    <div style={{position:'absolute',left:88,right:88,top:110,display:'flex',alignItems:'center',gap:22}}>
      <div style={{fontSize:26,letterSpacing:2.7,color:'#58A700'}}>DAILY ENGLISH</div>
      <div style={{flex:1,height:20,background:'#E5E5E5',borderRadius:20,padding:3}}><div style={{width:`${Math.max(5,frame/(30*fps)*100)}%`,height:'100%',borderRadius:20,background:'#58CC02'}}/></div>
      <div style={{fontSize:25,color:'#777'}}>01</div>
    </div>
    <div style={{position:'absolute',left:88,top:190,fontSize:86,lineHeight:1.07,letterSpacing:-3}}>A little<br/><span style={{color:'#58A700'}}>weather chat.</span></div>
    <div style={{position:'absolute',left:90,top:400,fontSize:27,color:'#777',letterSpacing:.4}}>Two friends. One changing forecast.</div>
    <div style={{position:'absolute',left:64,right:64,top:480,height:650,borderRadius:44,overflow:'hidden',border:'5px solid white',boxShadow:'0 10px 0 #DCDCDC'}}>
      <Img src={staticFile('weather-duo/sample/park-sunny-v1.png')} style={{width:'100%',height:'100%',objectFit:'cover',scale:interpolate(frame,[0,13.8*fps],[1.015,1.065]),objectPosition:`${index%2===0?'48':'52'}% 50%`}}/>
      <div style={{position:'absolute',inset:0,background:'#304C67',opacity:interpolate(frame,[9.8*fps,12*fps],[0,.12],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>
      <svg width="420" height="160" viewBox="0 0 420 160" style={{position:'absolute',top:15,right:interpolate(frame,[9.8*fps,12*fps],[-450,28],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}><path d="M55 135C2 135 1 65 56 62C64 8 141 3 164 51C198 19 259 38 261 76C307 50 351 78 347 112C389 112 399 135 376 143H55Z" fill="#8495A3"/><path d="M55 135C2 135 1 65 56 62C64 8 141 3 164 51C198 19 259 38 261 76" fill="none" stroke="#A6B5BF" strokeWidth="10" strokeLinecap="round"/></svg>
      {index===1 && <svg width="160" height="80" viewBox="0 0 160 80" style={{position:'absolute',top:82,left:interpolate(frame,[3.2*fps,6.8*fps],[40,130]),opacity:.8}}><path d="M0 25H100Q130 25 125 8M25 50H150M5 70H80" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/></svg>}
      <div style={{position:'absolute',top:25,left:25,borderRadius:30,background:'white',padding:'12px 20px',fontSize:23,color:'#58A700'}}>AT THE PARK</div>
      <div style={{position:'absolute',bottom:25,left:25,right:25,display:'flex',justifyContent:'space-between'}}>
        <span style={{background:'#1CB0F6',borderBottom:'5px solid #1899D6',color:'white',padding:'10px 24px',borderRadius:20,fontSize:26}}>Alex</span>
        <span style={{background:'#FF9600',borderBottom:'5px solid #E68600',color:'white',padding:'10px 24px',borderRadius:20,fontSize:26}}>Mia</span>
      </div>
    </div>
    {turns.map(turn=><Sequence key={turn.audio} from={Math.round(turn.from*fps)} durationInFrames={Math.round((turn.to-turn.from)*fps)} name={`${turn.speaker}: ${turn.text}`}><Audio src={staticFile(`weather-duo/sample/${turn.audio}`)}/><Dialogue turn={turn}/></Sequence>)}
    <Audio src={staticFile('weather-duo/sample/park-breeze.wav')} volume={0.4}/>
    <div style={{position:'absolute',left:88,right:88,bottom:132,display:'flex',alignItems:'center',gap:18}}>
      <div style={{width:62,height:62,borderRadius:22,background:'#EAF5DD',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>{active.icon}</div>
      <div style={{fontSize:25,color:'#777',letterSpacing:.4}}>Listen to the conversation</div>
      <div style={{marginLeft:'auto',display:'flex',gap:10}}>{turns.map((_,i)=><div key={i} style={{height:12,width:i===index?34:12,borderRadius:8,background:i===index?'#58CC02':'#DCDCDC'}}/>)}</div>
    </div>
  </AbsoluteFill>;
};
