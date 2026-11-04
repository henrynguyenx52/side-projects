import React from 'react';
import {AbsoluteFill,Audio,Sequence,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import content from '../../../../../open-montage/projects/weather-plans-episode-01/artifacts/lesson-decks-v3.json';
import timings from '../../../../../open-montage/projects/weather-plans-episode-01/lesson-deck-timings-v3.json';

const rounded='"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
type Lesson=(typeof content.lessons)[number];
type CardData=Lesson['cards'][number];

const PaintedWords:React.FC<{text:string;active:number;completed:boolean;color:string;dark:string}>=({text,active,completed,color,dark})=>{
  const words=text.split(/\s+/);
  return <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'center',columnGap:14,rowGap:11}}>{words.map((word,index)=>{
    const current=index===active;const past=completed||index<active;
    return <span key={`${word}-${index}`} style={{display:'inline-block',padding:current?'3px 10px 5px':'3px 4px 5px',margin:current?'0 -6px':0,borderRadius:12,background:current?color:past?`${color}20`:'transparent',color:current?'white':past?dark:undefined,boxShadow:current?`0 5px 0 ${dark}`:undefined}}>{word}</span>;
  })}</div>;
};

const Header:React.FC<{lesson:Lesson;index?:number}>=({lesson,index})=><div style={{display:'flex',alignItems:'center',gap:24}}>
  <div style={{fontSize:25,letterSpacing:2.5,color:'#58A700',textTransform:'uppercase'}}>{lesson.title}</div>
  <div style={{flex:1,height:18,background:'#E5E5E5',borderRadius:20,padding:3}}><div style={{height:'100%',width:index===undefined?'8%':`${((index+1)/lesson.cards.length)*100}%`,background:'#58CC02',borderRadius:20}}/></div>
  <div style={{fontSize:26,color:'#777'}}>{index===undefined?'INTRO':`${index+1} / ${lesson.cards.length}`}</div>
</div>;

const Intro:React.FC<{lesson:Lesson}>=({lesson})=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();return <AbsoluteFill style={{background:'#F7F7F7',padding:'54px 100px 62px',fontFamily:rounded,color:'#333'}}>
  <Header lesson={lesson}/>
  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',transform:`scale(${spring({frame,fps,config:{damping:18,stiffness:150}})})`}}>
    <div style={{display:'flex',gap:18,marginBottom:36}}>{lesson.cards.slice(0,Math.min(6,lesson.cards.length)).map(card=><div key={card.expression} style={{width:82,height:82,borderRadius:26,background:`${card.color}22`,border:`4px solid ${card.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:44}}>{card.icon}</div>)}</div>
    <div style={{fontSize:76,lineHeight:1.08,letterSpacing:-2,textAlign:'center',marginBottom:26}}>{lesson.title}</div>
    <div style={{fontFamily:'Arial,system-ui,sans-serif',fontWeight:700,fontSize:39,color:'#666',textAlign:'center',maxWidth:1350,lineHeight:1.3}}>{lesson.intro}</div>
  </div>
</AbsoluteFill>};

const Card:React.FC<{lesson:Lesson;card:CardData;index:number;audioDuration:number}>=({lesson,card,index,audioDuration})=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const seconds=Math.min(audioDuration,frame/fps);const pause=.3;const spoken=Math.max(.1,audioDuration-pause);const phraseWeight=card.expression.replace(/\s/g,'').length;const meaningWeight=card.meaning.replace(/\s/g,'').length;const phraseDuration=spoken*phraseWeight/(phraseWeight+meaningWeight);const meaningStart=phraseDuration+pause;const words=card.expression.split(/\s+/);const active=seconds<phraseDuration?Math.min(words.length-1,Math.floor(seconds/phraseDuration*words.length)):-1;const completed=seconds>=meaningStart;
  return <AbsoluteFill style={{background:'#F7F7F7',padding:'54px 100px 62px',fontFamily:rounded,color:'#333'}}>
    <Header lesson={lesson} index={index}/>
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:1510,background:'white',border:`6px solid ${card.color}`,borderBottom:`16px solid ${card.dark}`,borderRadius:48,padding:'50px 78px 58px',boxShadow:'0 18px 35px rgba(60,60,60,.10)',transform:`scale(${spring({frame,fps,config:{damping:18,stiffness:160,mass:.8}})})`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:28,marginBottom:32}}><div style={{width:90,height:90,borderRadius:28,background:`${card.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:50}}>{card.icon}</div><div style={{fontSize:29,color:card.dark,letterSpacing:2}}>EXPRESSION {index+1}</div></div>
      <div style={{fontSize:62,lineHeight:1.16,letterSpacing:-1.6,textAlign:'center',color:'#242424',marginBottom:34,display:'flex',justifyContent:'center',alignItems:'center',gap:8}}><span>“</span><PaintedWords text={card.expression} active={active} completed={completed} color={card.color} dark={card.dark}/><span>”</span></div>
      <div style={{height:5,background:'#E5E5E5',borderRadius:10,margin:'0 auto 34px',width:950}}/>
      <div style={{fontFamily:'Arial,system-ui,sans-serif',fontWeight:700,fontSize:38,lineHeight:1.34,textAlign:'center',color:'#555',maxWidth:1280,margin:'0 auto'}}>{card.meaning}</div>
    </div></div>
    <div style={{display:'flex',justifyContent:'center',gap:10}}>{lesson.cards.map((_,i)=><div key={i} style={{height:13,width:i===index?46:13,borderRadius:10,background:i===index?card.color:'#DCDCDC'}}/>)}</div>
  </AbsoluteFill>;
};

export const LessonDeckV3:React.FC<{scene:number}>=({scene})=>{const {fps}=useVideoConfig();const lesson=content.lessons.find(x=>x.scene===scene)!;const timing=timings.lessons.find(x=>x.scene===scene)!;return <AbsoluteFill>
  <Sequence from={0} durationInFrames={Math.round(timing.intro.end*fps)}><Intro lesson={lesson}/><Audio src={staticFile(`weather-plans-episode-01/lesson-decks-v3/scene-${scene}/intro.wav`)}/></Sequence>
  {timing.cards.map((item,index)=><Sequence key={item.id} from={Math.round(item.start*fps)} durationInFrames={Math.round((item.end-item.start)*fps)}><Card lesson={lesson} card={lesson.cards[index]} index={index} audioDuration={item.audioDuration}/><Audio src={staticFile(`weather-plans-episode-01/lesson-decks-v3/scene-${scene}/${item.id}.wav`)}/></Sequence>)}
</AbsoluteFill>};
