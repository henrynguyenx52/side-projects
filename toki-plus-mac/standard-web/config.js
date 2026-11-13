'use strict';

const STANDARD_WORKFLOW_ID = '2120921661394825218';
const SOURCE_WORKFLOW_ID = '2110538440155934721';
const STANDARD_APP_ID = '2120937784407310337';

const DEFAULT_PROMPT = `Follow the reference video as accurately as possible.

Strictly preserve the exact body motion, head movement, facial orientation, arm movement, hand movement, finger positions, walking rhythm, timing, motion trajectory, posture transitions, gesture sequence, and object interaction from the reference video.

Preserve the exact camera framing, composition, perspective, shot scale, and camera behavior from the reference.

If the reference camera is static, keep it perfectly stable.
If the reference camera contains subtle natural movement, reproduce only that movement without exaggeration.

Preserve facial identity, body proportions, clothing proportions, lighting consistency, and scene perspective.

Ultra realistic motion, natural motion physics, smooth movement, consistent face, highly detailed skin, sharp eyes, crisp details, cinematic realism, professional quality, high resolution, masterpiece, best quality, photorealistic.

Preserve the exact facial identity from the reference image.
Do not alter facial structure, facial proportions, eyes, nose, lips, jawline, ears, hairstyle, age, gender, or skin tone.
Maintain a perfectly consistent face across every frame.`;

const DEFAULT_NEGATIVE_PROMPT = `motion drift,
incorrect motion,
random movement,
wrong pose,
wrong gesture,
wrong timing,
incorrect hand movement,
incorrect finger position,
incorrect object interaction,
body distortion,
identity drift,
face inconsistency,
deformed face,
deformed hands,
extra fingers,
extra limbs,
duplicate body,
bad anatomy,
blurry,
motion blur,
ghosting,
frame flicker,
camera shake,
handheld jitter,
random zoom,
random pan,
random tilt,
random camera rotation,
low quality,
low resolution,
noise,
artifacts,
watermark,
text,
logo,
oversaturated,
over sharpened`;

module.exports = {
  STANDARD_WORKFLOW_ID,
  SOURCE_WORKFLOW_ID,
  STANDARD_APP_ID,
  DEFAULT_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
};
