import {Composition, Folder} from "remotion";
import {Booths} from "./Booths";
import {Crates} from "./Crates";
import {Opening} from "./Opening";
import {
  CinematicPortrait,
  FashionEditorial,
  FestiveGlow,
} from "./PortraitMotion";
import {RecordStorePromo} from "./RecordStorePromo";
import {Visit} from "./Visit";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RecordStorePromo"
        component={RecordStorePromo}
        durationInFrames={546}
        fps={30}
        width={1080}
        height={1920}
      />
      <Folder name="Portrait-Motion">
        <Composition
          id="CinematicPortrait"
          component={CinematicPortrait}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="FashionEditorial"
          component={FashionEditorial}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="FestiveGlow"
          component={FestiveGlow}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Scenes">
        <Composition
          id="Opening"
          component={Opening}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            style: {
              backgroundColor: "#140F0C",
            },
          }}
        />
        <Composition
          id="Crates"
          component={Crates}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            style: {
              backgroundColor: "#F4EBDD",
            },
          }}
        />
        <Composition
          id="Booths"
          component={Booths}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            style: {
              backgroundColor: "#140F0C",
            },
          }}
        />
        <Composition
          id="Visit"
          component={Visit}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            style: {
              backgroundColor: "#140F0C",
            },
          }}
        />
      </Folder>
    </>
  );
};
