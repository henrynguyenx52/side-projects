# Audio Keeper Cut

A private, browser-only video editor that switches from video 1 to video 2 while preserving video 1's audio for the full duration.

## Pages

- **Cut Video** (`/`): Switch picture from video 1 to video 2 at a chosen cut point while keeping video 1 audio.
- **Video Song Song (Blend)** (`/blend.html`): Play 2 videos side-by-side with a soft vertical feathered gradient transition, pan controls, optional vertical center subtitles, and video 1 audio.

## Workflow

1. Paste one public TikTok URL for video 1 and another public TikTok URL for video 2. Local file upload remains available as a fallback.
2. Video 1 defines the final duration and supplies the continuous audio. Video 2's audio is ignored.
3. Move the cut slider to choose when the picture switches.
4. Preview, then export. Rendering happens in real time on the device.

## Run locally

No installation or external packages are required. From this directory, run:

```sh
npm start
```

Open `http://localhost:4173`.

TikTok importing uses the locally installed `yt-dlp` Python module. It fetches public videos only and does not bypass login, private-video, CAPTCHA, or platform restrictions.

To use a different port:

```sh
PORT=8080 npm start
```

## Browser support

The app uses Canvas, Web Audio, and MediaRecorder. Chrome and Edge generally export WebM; Safari may export MP4 when supported by the browser.
