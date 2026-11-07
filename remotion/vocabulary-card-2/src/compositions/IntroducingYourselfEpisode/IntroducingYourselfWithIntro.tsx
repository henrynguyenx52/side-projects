import React from 'react';
import {Series,useVideoConfig} from 'remotion';
import manifest from '../../../../../open-montage/projects/introducing-yourself-episode-02/artifacts/kokoro-relaxed-full-v1-manifest.json';
import intro from '../../../../../open-montage/projects/introducing-yourself-episode-02/intro-config-v1.json';
import {ChannelIntro} from './ChannelIntro';
import {EpisodeTopicIntro} from './EpisodeTopicIntro';
import {IntroducingYourselfEpisode} from './IntroducingYourselfEpisode';

export const IntroducingYourselfIntroPreview:React.FC=()=>{const {fps}=useVideoConfig();return <Series><Series.Sequence durationInFrames={Math.round(intro.channelDuration*fps)} premountFor={fps}><ChannelIntro/></Series.Sequence><Series.Sequence durationInFrames={Math.round(intro.topicDuration*fps)} premountFor={fps}><EpisodeTopicIntro/></Series.Sequence></Series>};
export const IntroducingYourselfWithIntro:React.FC=()=>{const {fps}=useVideoConfig();return <Series><Series.Sequence durationInFrames={Math.round(intro.channelDuration*fps)} premountFor={fps}><ChannelIntro/></Series.Sequence><Series.Sequence durationInFrames={Math.round(intro.topicDuration*fps)} premountFor={fps}><EpisodeTopicIntro/></Series.Sequence><Series.Sequence durationInFrames={Math.round(manifest.duration*fps)} premountFor={fps}><IntroducingYourselfEpisode/></Series.Sequence></Series>};
