import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {WeatherSample} from './compositions/WeatherConversation/WeatherSample';

const WeatherSampleRoot: React.FC = () => <>
  <Composition id="WeatherConversationSample" component={WeatherSample} durationInFrames={414} fps={30} width={1080} height={1920}/>
  <Composition id="WeatherConversationLandscape" component={WeatherSample} durationInFrames={414} fps={30} width={1920} height={1080}/>
</>;
registerRoot(WeatherSampleRoot);
