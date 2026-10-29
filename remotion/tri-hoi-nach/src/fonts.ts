import {loadFont as loadSans} from "@remotion/google-fonts/BeVietnamPro";
import {loadFont as loadDisplay} from "@remotion/google-fonts/Newsreader";

/** Akkurat substitute. Covers Vietnamese. */
export const {fontFamily} = loadSans("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

/** Editorial New substitute. Thin serif for display lines only. */
export const {fontFamily: displayFamily} = loadDisplay("normal", {
  weights: ["300", "400"],
  subsets: ["latin", "vietnamese"],
});
