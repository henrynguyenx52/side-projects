import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {NewCityBus} from './compositions/NewCityBus/NewCityBus';

const NewCityBusRoot: React.FC = () => (
  <Composition
    id="NewCityBusPOC"
    component={NewCityBus}
    durationInFrames={1800}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(NewCityBusRoot);
