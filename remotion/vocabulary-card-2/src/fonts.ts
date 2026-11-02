import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadPlusJakartaSans } from "@remotion/google-fonts/PlusJakartaSans";

const vietFont = loadBeVietnamPro("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
});

const displayFont = loadPlusJakartaSans("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin", "vietnamese"],
});

export const sansFamily = vietFont.fontFamily;
export const displayFamily = displayFont.fontFamily;
export const serifFamily = displayFont.fontFamily;
