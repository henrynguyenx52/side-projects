import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {defaultTheme, duoCardStyle, springPresets} from '../../config/design-system';

const font = '"Arial Rounded MT Bold", "Nunito", ui-rounded, system-ui, sans-serif';

const turns = [
  {speaker: 'Jamie', text: "Excuse me, could you help me? I'm new here.", keyword: 'help', icon: '👋', from: 0.8, to: 6.2, audio: '01-jamie.wav'},
  {speaker: 'Maya', text: 'Of course! Where are you trying to go?', keyword: 'where', icon: '📍', from: 6.4, to: 11.2, audio: '02-maya.wav'},
  {speaker: 'Jamie', text: "I'm looking for Riverside Market.", keyword: 'looking', icon: '🔎', from: 11.4, to: 15.5, audio: '03-jamie.wav'},
  {speaker: 'Maya', text: 'Take the number eight bus from the stop across the street.', keyword: 'across', icon: '🚌', from: 15.7, to: 22, audio: '04-maya.wav'},
  {speaker: 'Jamie', text: 'Does it stop right in front of the market?', keyword: 'in front', icon: '🚏', from: 22.2, to: 27.5, audio: '05-jamie.wav'},
  {speaker: 'Maya', text: 'Almost. Get off at Pine Street, then walk two blocks.', keyword: 'get off', icon: '🚶', from: 27.7, to: 33.8, audio: '06-maya.wav'},
  {speaker: 'Jamie', text: 'Can I buy a ticket on the bus?', keyword: 'ticket', icon: '🎫', from: 34, to: 38.2, audio: '07-jamie.wav'},
  {speaker: 'Maya', text: 'You can just tap your card when you get on.', keyword: 'tap', icon: '💳', from: 38.4, to: 44.1, audio: '08-maya.wav'},
  {speaker: 'Jamie', text: 'Perfect. About how long does the ride take?', keyword: 'how long', icon: '⏱️', from: 44.3, to: 49.8, audio: '09-jamie.wav'},
  {speaker: 'Maya', text: 'Around fifteen minutes. Welcome to the city, Jamie!', keyword: 'welcome', icon: '🏙️', from: 50, to: 55.5, audio: '10-maya.wav'},
] as const;

const Dialogue: React.FC<{turn: (typeof turns)[number]}> = ({turn}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const jamie = turn.speaker === 'Jamie';
  const color = jamie ? defaultTheme.wordAColor : defaultTheme.wordBColor;
  const dark = jamie ? '#1899D6' : '#E68600';
  const phraseStart = turn.text.toLowerCase().indexOf(turn.keyword);

  return (
    <div
      style={{
        position: 'absolute',
        left: 88,
        right: 88,
        top: 1168,
        scale: spring({frame, fps, config: springPresets.snappy}),
        transformOrigin: jamie ? '25% 0' : '75% 0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -23,
          left: jamie ? 140 : undefined,
          right: jamie ? undefined : 140,
          width: 48,
          height: 48,
          background: 'white',
          rotate: '45deg',
          borderTop: `4px solid ${color}`,
          borderLeft: `4px solid ${color}`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          ...duoCardStyle,
          border: `4px solid ${color}`,
          borderBottom: `10px solid ${dark}`,
          borderRadius: 40,
          padding: '34px 42px 40px',
          position: 'relative',
          zIndex: 3,
          boxShadow: '0 14px 0 rgba(60,60,60,.035)',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 18}}>
          <div style={{width: 52, height: 52, borderRadius: 18, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27}}>
            {jamie ? 'J' : 'M'}
          </div>
          <span style={{fontSize: 29, color: dark, letterSpacing: 2, textTransform: 'uppercase'}}>{turn.speaker}</span>
          <div style={{marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', height: 28}}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{width: 6, borderRadius: 5, background: color, height: 10 + 16 * Math.abs(Math.sin(frame / 6 + i))}} />
            ))}
          </div>
        </div>
        <div style={{fontSize: 54, lineHeight: 1.28, letterSpacing: -1.2, color: defaultTheme.textPrimary}}>
          {phraseStart < 0 ? turn.text : (
            <>
              {turn.text.slice(0, phraseStart)}
              <span style={{color: dark, background: jamie ? '#DDF4FF' : '#FFF0D8', borderRadius: 12, padding: '0 6px'}}>
                {turn.text.slice(phraseStart, phraseStart + turn.keyword.length)}
              </span>
              {turn.text.slice(phraseStart + turn.keyword.length)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const NewCityBus: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const activeIndex = Math.max(0, turns.findIndex((turn) => seconds >= turn.from && seconds < turn.to));
  const previousIndex = turns.reduce((latest, turn, index) => seconds >= turn.from ? index : latest, 0);
  const index = activeIndex === 0 && seconds >= turns[0].to ? previousIndex : activeIndex;
  const active = turns[index];
  const reviewStart = 55.5 * fps;

  return (
    <AbsoluteFill style={{background: defaultTheme.bgColor, fontFamily: font, color: defaultTheme.textPrimary, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 820, height: 820, borderRadius: '50%', background: '#EAF4FF', top: 325, left: 380, opacity: 0.7}} />

      <div style={{position: 'absolute', left: 88, right: 88, top: 105, display: 'flex', alignItems: 'center', gap: 22}}>
        <div style={{fontSize: 26, letterSpacing: 2.7, color: '#58A700'}}>ENGLISH IN A NEW CITY</div>
        <div style={{flex: 1, height: 20, background: '#E5E5E5', borderRadius: 20, padding: 3}}>
          <div style={{width: `${Math.max(4, frame / (60 * fps) * 100)}%`, height: '100%', borderRadius: 20, background: '#58CC02'}} />
        </div>
        <div style={{fontSize: 25, color: '#777'}}>01</div>
      </div>

      <div style={{position: 'absolute', left: 88, top: 185, fontSize: 82, lineHeight: 1.06, letterSpacing: -3}}>
        Finding your way<br /><span style={{color: '#58A700'}}>around the city.</span>
      </div>
      <div style={{position: 'absolute', left: 90, top: 382, fontSize: 27, color: '#777', letterSpacing: 0.4}}>Jamie asks a local for help.</div>

      <div style={{position: 'absolute', left: 64, right: 64, top: 455, height: 650, borderRadius: 44, overflow: 'hidden', border: '5px solid white', boxShadow: '0 10px 0 #DCDCDC'}}>
        <Img
          src={staticFile('new-city-bus-poc/city-bus-stop-v1.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            scale: interpolate(frame, [0, 60 * fps], [1.02, 1.09]),
            objectPosition: `${index % 2 === 0 ? '45%' : '55%'} 50%`,
          }}
        />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(25,60,90,.02), rgba(25,60,90,.14))'}} />
        <div style={{position: 'absolute', top: 25, left: 25, borderRadius: 30, background: 'white', padding: '12px 20px', fontSize: 23, color: '#58A700'}}>AT THE BUS STOP</div>
        <div style={{position: 'absolute', bottom: 25, left: 25, right: 25, display: 'flex', justifyContent: 'space-between'}}>
          <span style={{background: '#1CB0F6', borderBottom: '5px solid #1899D6', color: 'white', padding: '10px 24px', borderRadius: 20, fontSize: 26}}>Jamie</span>
          <span style={{background: '#FF9600', borderBottom: '5px solid #E68600', color: 'white', padding: '10px 24px', borderRadius: 20, fontSize: 26}}>Maya</span>
        </div>
      </div>

      {turns.map((turn) => {
        const startFrame = Math.round(turn.from * fps);
        const endFrame = Math.round(turn.to * fps);
        return (
          <Sequence key={turn.audio} from={startFrame} durationInFrames={endFrame - startFrame} name={`${turn.speaker}: ${turn.text}`}>
            <Audio src={staticFile(`new-city-bus-poc/${turn.audio}`)} />
            <Dialogue turn={turn} />
          </Sequence>
        );
      })}

      <Audio src={staticFile('new-city-bus-poc/city-ambience.wav')} volume={0.18} />

      <Sequence from={Math.round(reviewStart)} durationInFrames={Math.round(60 * fps - reviewStart)}>
        <div style={{position: 'absolute', left: 88, right: 88, top: 1170, ...duoCardStyle, border: '4px solid #58CC02', borderBottom: '10px solid #58A700', borderRadius: 40, padding: '36px 42px 42px', scale: spring({frame: useCurrentFrame(), fps, config: springPresets.snappy})}}>
          <div style={{fontSize: 25, color: '#58A700', letterSpacing: 2, marginBottom: 18}}>TRY THIS PHRASE</div>
          <div style={{fontSize: 58, lineHeight: 1.25, letterSpacing: -1.4}}>Could you help me?</div>
          <div style={{fontSize: 27, color: '#777', marginTop: 18}}>A polite way to ask for help.</div>
        </div>
      </Sequence>

      <div style={{position: 'absolute', left: 88, right: 88, bottom: 116, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 62, height: 62, borderRadius: 22, background: '#EAF5DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32}}>{seconds >= 55.5 ? '✨' : active.icon}</div>
        <div style={{fontSize: 25, color: '#777', letterSpacing: 0.4}}>{seconds >= 55.5 ? 'Save the phrase and say it aloud' : 'Listen to the conversation'}</div>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 7}}>
          {turns.map((_, i) => <div key={i} style={{height: 11, width: i === index ? 28 : 10, borderRadius: 8, background: i === index ? '#58CC02' : '#DCDCDC'}} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
