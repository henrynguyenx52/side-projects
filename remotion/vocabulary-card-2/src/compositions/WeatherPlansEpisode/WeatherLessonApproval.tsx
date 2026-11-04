import React from 'react';
import {AbsoluteFill,Audio,Sequence,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import timings from '../../../../../open-montage/projects/weather-plans-episode-01/weather-lesson-approval-timings.json';

const rounded='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const cards=[
  {phrase:"How's the weather been lately?",explanation:'A natural way to ask about the weather recently.',color:'#1CB0F6',dark:'#1598D1',icon:'☀️'},
  {phrase:"It's been raining almost every day.",explanation:'Use this to describe something that has happened repeatedly over a period of time.',color:'#58CC02',dark:'#46A302',icon:'🌧️'},
  {phrase:"I can't stand rainy days.",explanation:'A natural way to say that you really dislike something.',color:'#FF9600',dark:'#D97F00',icon:'☔'},
  {phrase:"I don't mind a little rain.",explanation:'Use “I don’t mind” when something doesn’t bother you.',color:'#CE82FF',dark:'#A855D9',icon:'🌦️'},
];

const PaintedWords:React.FC<{text:string;active:number;completed:boolean;color:string;dark:string;fontSize:number}>=({text,active,completed,color,dark,fontSize})=>{
  const words=text.split(/\s+/);
  return <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'center',columnGap:fontSize*.22,rowGap:fontSize*.16}}>{words.map((word,index)=>{
    const isActive=index===active;const isPast=completed||index<active;
    return <span key={`${word}-${index}`} style={{display:'inline-block',padding:isActive?'3px 10px 5px':'3px 4px 5px',margin:isActive?'0 -6px':0,borderRadius:12,background:isActive?color:isPast?`${color}20`:'transparent',color:isActive?'white':isPast?dark:undefined,boxShadow:isActive?`0 5px 0 ${dark}`:undefined}}>{word}</span>;
  })}</div>;
};

const Top:React.FC<{index?:number}>=({index})=><div style={{display:'flex',alignItems:'center',gap:24}}>
  <div style={{fontSize:25,letterSpacing:3,color:'#58A700'}}>USEFUL WEATHER ENGLISH</div>
  <div style={{flex:1,height:18,background:'#E5E5E5',borderRadius:20,padding:3}}><div style={{height:'100%',width:index===undefined?'8%':`${((index+1)/cards.length)*100}%`,background:'#58CC02',borderRadius:20}}/></div>
  <div style={{fontSize:26,color:'#777'}}>{index===undefined?'INTRO':`${index+1} / ${cards.length}`}</div>
</div>;

const Intro:React.FC=()=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();const scale=spring({frame,fps,config:{damping:18,stiffness:150}});return <AbsoluteFill style={{background:'#F7F7F7',padding:'54px 100px 62px',fontFamily:rounded,color:'#333'}}>
  <Top/>
  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',transform:`scale(${scale})`}}>
    <div style={{display:'flex',gap:22,marginBottom:34}}>{cards.map((card,i)=><div key={card.phrase} style={{width:88,height:88,borderRadius:28,background:`${card.color}22`,border:`4px solid ${card.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:47}}>{card.icon}</div>)}</div>
    <div style={{fontSize:76,lineHeight:1.08,letterSpacing:-2,textAlign:'center',marginBottom:26}}>Let’s review the language.</div>
    <div style={{fontFamily:'Arial,system-ui,sans-serif',fontWeight:700,fontSize:39,color:'#666',textAlign:'center'}}>Four useful weather expressions from the conversation</div>
  </div>
</AbsoluteFill>};

const Card:React.FC<{index:number}>=({index})=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();const item=cards[index];const timing=timings.items[index];const scale=spring({frame,fps,config:{damping:18,stiffness:160,mass:.8}});
  const seconds=Math.min(timing.audioDuration,frame/fps);const pause=.35;const spoken=Math.max(.1,timing.audioDuration-pause);const phraseWeight=item.phrase.replace(/\s/g,'').length;const explanationWeight=item.explanation.replace(/\s/g,'').length;const phraseDuration=spoken*phraseWeight/(phraseWeight+explanationWeight);const explanationStart=phraseDuration+pause;
  const phraseWords=item.phrase.split(/\s+/);
  const phraseActive=seconds<phraseDuration?Math.min(phraseWords.length-1,Math.floor(seconds/phraseDuration*phraseWords.length)):-1;
  const phraseCompleted=seconds>=explanationStart;
  return <AbsoluteFill style={{background:'#F7F7F7',padding:'54px 100px 62px',fontFamily:rounded,color:'#333'}}>
  <Top index={index}/>
  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:1510,background:'white',border:`6px solid ${item.color}`,borderBottom:`16px solid ${item.dark}`,borderRadius:48,padding:'54px 78px 62px',boxShadow:'0 18px 35px rgba(60,60,60,.10)',transform:`scale(${scale})`}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:28,marginBottom:36}}><div style={{width:94,height:94,borderRadius:30,background:`${item.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:54}}>{item.icon}</div><div style={{fontSize:30,color:item.dark,letterSpacing:2}}>EXPRESSION {index+1}</div></div>
    <div style={{fontSize:66,lineHeight:1.16,letterSpacing:-1.8,textAlign:'center',color:'#242424',marginBottom:38,display:'flex',justifyContent:'center',alignItems:'center',gap:8}}><span>“</span><PaintedWords text={item.phrase} active={phraseActive} completed={phraseCompleted} color={item.color} dark={item.dark} fontSize={66}/><span>”</span></div>
    <div style={{height:5,background:'#E5E5E5',borderRadius:10,margin:'0 auto 36px',width:950}}/>
    <div style={{fontFamily:'Arial,system-ui,sans-serif',fontWeight:700,fontSize:39,lineHeight:1.34,textAlign:'center',color:'#555',maxWidth:1260,margin:'0 auto'}}>{item.explanation}</div>
  </div></div>
  <div style={{display:'flex',justifyContent:'center',gap:14}}>{cards.map((_,i)=><div key={i} style={{height:14,width:i===index?52:14,borderRadius:10,background:i===index?item.color:'#DCDCDC'}}/>)}</div>
</AbsoluteFill>};

export const WeatherLessonApproval:React.FC=()=>{const {fps}=useVideoConfig();return <AbsoluteFill>
  <Sequence from={0} durationInFrames={Math.round(timings.intro.end*fps)}><Intro/><Audio src={staticFile('weather-plans-episode-01/audio/weather-lesson/lesson-intro.wav')}/></Sequence>
  {timings.items.map((item,index)=><Sequence key={item.id} from={Math.round(item.start*fps)} durationInFrames={Math.round((item.end-item.start)*fps)}><Card index={index}/><Audio src={staticFile(`weather-plans-episode-01/audio/weather-lesson/${item.id}.wav`)}/></Sequence>)}
</AbsoluteFill>};
