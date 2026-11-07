import React from 'react';
import {Composition,registerRoot} from 'remotion';
import manifest from '../../../open-montage/projects/introducing-yourself-episode-02/artifacts/kokoro-relaxed-full-v1-manifest.json';
import intro from '../../../open-montage/projects/introducing-yourself-episode-02/intro-config-v1.json';
import {ChannelIntro} from './compositions/IntroducingYourselfEpisode/ChannelIntro';
import {EpisodeTopicIntro} from './compositions/IntroducingYourselfEpisode/EpisodeTopicIntro';
import {IntroducingYourselfEpisode} from './compositions/IntroducingYourselfEpisode/IntroducingYourselfEpisode';
import {IntroducingYourselfIntroPreview,IntroducingYourselfWithIntro} from './compositions/IntroducingYourselfEpisode/IntroducingYourselfWithIntro';

const Root:React.FC=()=> <>
  <Composition id="IntroducingYourselfChannelIntro" component={ChannelIntro} width={1920} height={1080} fps={30} durationInFrames={Math.round(intro.channelDuration*30)}/>
  <Composition id="IntroducingYourselfTopicIntro" component={EpisodeTopicIntro} width={1920} height={1080} fps={30} durationInFrames={Math.round(intro.topicDuration*30)}/>
  <Composition id="IntroducingYourselfIntroPreview" component={IntroducingYourselfIntroPreview} width={1920} height={1080} fps={30} durationInFrames={Math.round((intro.channelDuration+intro.topicDuration)*30)}/>
  <Composition id="IntroducingYourselfEpisode02" component={IntroducingYourselfEpisode} width={1920} height={1080} fps={30} durationInFrames={Math.round(manifest.duration*30)}/>
  <Composition id="IntroducingYourselfEpisode02WithIntro" component={IntroducingYourselfWithIntro} width={1920} height={1080} fps={30} durationInFrames={Math.round((intro.channelDuration+intro.topicDuration+manifest.duration)*30)}/>
</>;

registerRoot(Root);
