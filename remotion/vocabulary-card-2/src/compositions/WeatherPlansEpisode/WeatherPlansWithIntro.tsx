import React from 'react';
import {Series, useVideoConfig} from 'remotion';
import intro from '../../../../../open-montage/projects/weather-plans-episode-01/intro-config-v1.json';
import episodePlan from '../../../../../open-montage/projects/weather-plans-episode-01/episode-plan.json';
import {ChannelIntro} from './ChannelIntro';
import {EpisodeTopicIntro} from './EpisodeTopicIntro';
import {WeatherPlansEpisode} from './WeatherPlansEpisode';

const topicProps = {
  channelName: intro.channelName,
  episode: intro.episode,
  topic: intro.topic,
  narratorText: intro.narratorText,
};

export const WeatherPlansIntroPreview: React.FC = () => {
  const {fps} = useVideoConfig();
  return <Series>
    <Series.Sequence durationInFrames={Math.round(intro.channelDuration * fps)} premountFor={fps}><ChannelIntro/></Series.Sequence>
    <Series.Sequence durationInFrames={Math.round(intro.topicDuration * fps)} premountFor={fps}><EpisodeTopicIntro {...topicProps}/></Series.Sequence>
  </Series>;
};

export const WeatherPlansEpisodeWithIntro: React.FC = () => {
  const {fps} = useVideoConfig();
  return <Series>
    <Series.Sequence durationInFrames={Math.round(intro.channelDuration * fps)} premountFor={fps}><ChannelIntro/></Series.Sequence>
    <Series.Sequence durationInFrames={Math.round(intro.topicDuration * fps)} premountFor={fps}><EpisodeTopicIntro {...topicProps}/></Series.Sequence>
    <Series.Sequence durationInFrames={Math.round(episodePlan.duration * fps)} premountFor={fps}><WeatherPlansEpisode/></Series.Sequence>
  </Series>;
};
