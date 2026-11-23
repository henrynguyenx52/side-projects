'use strict';

const STANDARD_WORKFLOW_ID = '2120921661394825218';
const SOURCE_WORKFLOW_ID = '2110538440155934721';
const STANDARD_APP_ID = '2113512034955812865';
const TOKI_21_APP_ID = '2122161294304813058';
const DEFAULT_MODEL_ID = 'runninghub-wan21-60fps-standard';

const MODEL_PRESETS = Object.freeze({
  'runninghub-wan21-30fps-front-back-standard': Object.freeze({
    id: 'runninghub-wan21-30fps-front-back-standard',
    label: 'Motion Toki VIP Front + Back Standard',
    shortLabel: 'VIP Front + Back Standard',
    workflowId: '2112427207607308290',
    appId: null,
    instanceType: 'default',
    fps: 30,
    requiresBackImage: true,
  }),
  'runninghub-wan21-30fps-front-back-aiplus': Object.freeze({
    id: 'runninghub-wan21-30fps-front-back-aiplus',
    label: 'Motion Toki VIP Front + Back AI Plus',
    shortLabel: 'VIP Front + Back AI Plus',
    workflowId: '2112427207607308290',
    appId: null,
    instanceType: 'plus',
    fps: 30,
    requiresBackImage: true,
  }),
  'runninghub-standard': Object.freeze({
    id: 'runninghub-standard',
    label: 'Toki 2.1 Standard',
    shortLabel: 'Toki 2.1 Standard',
    workflowId: null,
    appId: TOKI_21_APP_ID,
    instanceType: 'default',
    fps: null,
    requiresBackImage: false,
  }),
  'runninghub-aiplus': Object.freeze({
    id: 'runninghub-aiplus',
    label: 'Toki 2.1 AI Plus',
    shortLabel: 'Toki 2.1 AI Plus',
    workflowId: null,
    appId: TOKI_21_APP_ID,
    instanceType: 'plus',
    fps: null,
    requiresBackImage: false,
  }),
  'runninghub-wan21-30fps-standard': Object.freeze({
    id: 'runninghub-wan21-30fps-standard',
    label: 'Toki 2.1 Standard (30 FPS)',
    shortLabel: 'Standard 30 FPS',
    workflowId: null,
    appId: '2103740581160030210',
    instanceType: 'default',
    fps: 30,
    requiresBackImage: false,
  }),
  'runninghub-wan21-30fps-aiplus': Object.freeze({
    id: 'runninghub-wan21-30fps-aiplus',
    label: 'Toki 2.1 AI Plus (30 FPS)',
    shortLabel: 'AI Plus 30 FPS',
    workflowId: null,
    appId: '2103740581160030210',
    instanceType: 'plus',
    fps: 30,
    requiresBackImage: false,
  }),
  'runninghub-wan21-60fps-standard': Object.freeze({
    id: 'runninghub-wan21-60fps-standard',
    label: 'Toki 2.1 Standard (60 FPS)',
    shortLabel: 'Standard 60 FPS',
    workflowId: null,
    appId: STANDARD_APP_ID,
    instanceType: 'default',
    fps: 60,
    requiresBackImage: false,
  }),
  'runninghub-wan21-60fps-pro': Object.freeze({
    id: 'runninghub-wan21-60fps-pro',
    label: 'Toki 2.1 AI Plus (60 FPS)',
    shortLabel: 'AI Plus 60 FPS',
    workflowId: null,
    appId: STANDARD_APP_ID,
    instanceType: 'plus',
    fps: 60,
    requiresBackImage: false,
  }),
});

function getModelPreset(modelId) {
  return MODEL_PRESETS[modelId] || null;
}

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
  TOKI_21_APP_ID,
  DEFAULT_MODEL_ID,
  MODEL_PRESETS,
  getModelPreset,
  DEFAULT_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
};
