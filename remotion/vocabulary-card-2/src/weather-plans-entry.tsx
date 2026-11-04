import {Composition,registerRoot} from 'remotion';
import {WeatherPlansEpisode} from './compositions/WeatherPlansEpisode/WeatherPlansEpisode';
import {WeatherLessonApproval} from './compositions/WeatherPlansEpisode/WeatherLessonApproval';
import {YouTubeThumbnail} from './compositions/WeatherPlansEpisode/YouTubeThumbnail';
import {ChannelIntro} from './compositions/WeatherPlansEpisode/ChannelIntro';
import {WeatherPlansEpisodeWithIntro, WeatherPlansIntroPreview} from './compositions/WeatherPlansEpisode/WeatherPlansWithIntro';
import lessonApproval from '../../../open-montage/projects/weather-plans-episode-01/weather-lesson-approval-timings.json';
import episodePlan from '../../../open-montage/projects/weather-plans-episode-01/episode-plan.json';
import intro from '../../../open-montage/projects/weather-plans-episode-01/intro-config-v1.json';

const Root=()=> <>
  <Composition id="EnglishInRealLifeChannelIntro" component={ChannelIntro} width={1920} height={1080} fps={30} durationInFrames={Math.round(intro.channelDuration*30)}/>
  <Composition id="WeatherPlansIntroPreview" component={WeatherPlansIntroPreview} width={1920} height={1080} fps={30} durationInFrames={Math.round(intro.totalDuration*30)}/>
  <Composition id="WeatherPlansEpisode01WithIntro" component={WeatherPlansEpisodeWithIntro} width={1920} height={1080} fps={30} durationInFrames={Math.round((episodePlan.duration+intro.totalDuration)*30)}/>
  <Composition id="WeatherPlansEpisode01" component={WeatherPlansEpisode} width={1920} height={1080} fps={30} durationInFrames={Math.ceil(episodePlan.duration*30)}/>
  <Composition id="WeatherLessonApproval" component={WeatherLessonApproval} width={1920} height={1080} fps={30} durationInFrames={Math.ceil(lessonApproval.duration*30)}/>
  <Composition id="WeatherPlansYouTubeThumbnail" component={YouTubeThumbnail} width={1920} height={1080} fps={30} durationInFrames={1}/>
</>;
registerRoot(Root);
