import {loadFont} from "@remotion/google-fonts/BeVietnamPro";

/** Clean Vietnamese sans for titles, sketches labels, and captions. */
export const {fontFamily} = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin", "vietnamese"],
});
