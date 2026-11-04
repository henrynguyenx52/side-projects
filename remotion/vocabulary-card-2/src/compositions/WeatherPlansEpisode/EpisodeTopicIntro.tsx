import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type EpisodeTopicIntroProps = {
  channelName: string;
  episode: string;
  topic: string;
  narratorText: string;
};

const font = '"Arial Rounded MT Bold","Nunito",ui-rounded,system-ui,sans-serif';
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

export const EpisodeTopicIntro: React.FC<EpisodeTopicIntroProps> = ({channelName, episode, topic, narratorText}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const panel = spring({frame: frame - 4, fps, config: {damping: 20, stiffness: 135}});
  const topicReveal = spring({frame: frame - 18, fps, config: {damping: 18, stiffness: 150}});
  const fadeOut = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], clamp);
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], clamp);

  return <AbsoluteFill style={{fontFamily: font, background: '#102633', overflow: 'hidden', opacity: fadeOut}}>
    <Audio src={staticFile('weather-plans-episode-01/intro-v1/episode-topic-intro.wav')} volume={1}/>
    <Img src={staticFile('weather-plans-episode-01/images/scene-02-park.png')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.06 + progress * 0.035})`, filter: 'brightness(.58) saturate(.9) blur(2px)'}}/>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(6,30,57,.94) 0%,rgba(6,30,57,.84) 53%,rgba(6,30,57,.42) 100%)'}}/>

    <div style={{position: 'absolute', left: 105, top: 82, display: 'flex', gap: 18, alignItems: 'center', transform: `translateY(${interpolate(panel,[0,1],[-32,0])}px)`, opacity: panel}}>
      <div style={{background: '#58CC02', color: '#FFF', borderRadius: 24, padding: '12px 24px', fontSize: 24, letterSpacing: 1.5}}>{episode.toUpperCase()}</div>
      <div style={{background: 'rgba(255,255,255,.94)', color: '#174066', borderRadius: 24, padding: '12px 24px', fontSize: 24, letterSpacing: 1.2}}>{channelName.toUpperCase()}</div>
    </div>

    <div style={{position: 'absolute', left: 105, top: 225, width: 1090, transform: `translateX(${interpolate(topicReveal,[0,1],[-80,0])}px)`, opacity: topicReveal}}>
      <div style={{color: '#7DDF39', fontSize: 30, letterSpacing: 4, marginBottom: 20}}>TODAY'S CONVERSATION</div>
      <div style={{color: '#FFF', fontSize: 86, lineHeight: 1.05, letterSpacing: -2, textShadow: '0 8px 26px rgba(0,0,0,.32)'}}>{topic}</div>
      <div style={{marginTop: 32, width: 790, color: '#EAF7FF', fontFamily: 'Arial,system-ui,sans-serif', fontWeight: 700, fontSize: 31, lineHeight: 1.32}}>Listen to Alex and Emma, then learn natural phrases you can use every day.</div>
    </div>

    <div style={{position: 'absolute', left: 106, bottom: 108, display: 'flex', alignItems: 'flex-end', gap: 7, height: 66}}>
      {Array.from({length: 42}).map((_, index) => {
        const height = 12 + Math.abs(Math.sin(frame * 0.19 + index * 0.67)) * 42 * (0.45 + 0.55 * topicReveal);
        return <div key={index} style={{width: 7, height, borderRadius: 7, background: index / 42 < progress ? '#FFE331' : 'rgba(255,255,255,.55)'}}/>;
      })}
      <div style={{marginLeft: 18, color: '#FFF', fontSize: 24, letterSpacing: 1}}>NARRATOR · ADAM</div>
    </div>

    <div style={{position: 'absolute', left: 105, right: 105, bottom: 48, height: 8, borderRadius: 8, background: 'rgba(255,255,255,.2)', overflow: 'hidden'}}><div style={{height: '100%', width: `${progress * 100}%`, borderRadius: 8, background: '#58CC02'}}/></div>
    <div aria-label={narratorText} style={{display: 'none'}}>{narratorText}</div>
  </AbsoluteFill>;
};
