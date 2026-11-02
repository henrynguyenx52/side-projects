---
name: vietnamese-moneyprinter-short
description: >-
  Build a Vietnamese vertical short with MoneyPrinterTurbo, Pexels footage
  filmed in Vietnam, and the local ZeroTTS voice quangminh. Use only when the
  user asks for a Vietnamese short, video tiếng Việt, ghép video, or a short
  whose spoken lines and captions are Vietnamese. Do not use this skill for
  an English video. Do not use Remotion, orbital-short, Edge TTS, or
  character reference photos. HyperFrames is only for an opening hook and a
  few emphasis words on the finished picture.
---

# Vietnamese MoneyPrinter short

This skill is Vietnamese only. Speech, captions, and on-screen words are Vietnamese. The voice is **quangminh**. A shot that shows a place is filmed in Vietnam.

Do not use this skill for an English video. An English short is a separate skill, without the `vietnamese-` prefix, with English captions and a ZeroTTS voice other than quangminh. The engine is still ZeroTTS. Never use Edge TTS for either language.

Vertical 1080×1920. MoneyPrinterTurbo cuts and joins real clips. One spoken line is one clip. The line describes what that clip shows.

Do not use Remotion, the orbital-short skill, a whiteboard, Edge TTS, or photos from `reference-image/`. HyperFrames may add an opening hook and a few emphasis words. It does not replace the MoneyPrinter cut.

## Layout

| Piece | Path |
| --- | --- |
| App | `money-printer/` |
| Python | `money-printer/.venv` (3.12). If missing: `python3.12 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt` |
| FFmpeg | `/opt/homebrew/bin/ffmpeg` on `PATH` |
| Clips | `money-printer/storage/footage-<slug>/` |
| Voice and captions | `money-printer/storage/voiceover-<slug>/` |
| Render | `money-printer/storage/tasks/<task-id>/final-captioned.mp4` |
| ZeroTTS | `text-to-voice/models/ZeroTTS`, voice id `quangminh` |
| ZeroTTS Python | `PYTHONPATH=text-to-voice/src text-to-voice/.venv/bin/python` |
| Subtitle font | `money-printer/resource/fonts/BeVietnamPro-Bold.ttf` |

Run every MoneyPrinter command from `money-printer/`.

## Steps

1. **Write the scene table first.** One row per clip. Vietnamese. One short sentence, short enough to finish inside that clip. The sentence names the thing on screen (a cup, beans, a sidewalk table, a busy street, someone sitting). Do not put a rent figure on a bean shot, or a bean line on a street shot. Show the table and stop if the user has not approved the lines.
2. **Get one matching clip per row.** For a Vietnamese audience, a shot that shows a place must be filmed in Vietnam: an old-quarter street, motorbikes, plastic stools, a phin, a trackside cafe. Download those from Pexels (free, including commercial use, [Pexels License](https://www.pexels.com/license/)). The site blocks plain downloads, so open the clip in a browser and take the `videos.pexels.com` HD file, at least 720px on the short side. A close-up with no place in it, such as coffee beans, may come from Mixkit or Pexels. Save files in scene order as `01-….mp4`, `02-….mp4`, … . Skip character photos, selfies, and any still that does not show the spoken subject. Pexels search inside MoneyPrinter needs `pexels_api_keys` in `config.toml`. Leave that empty and use the downloaded files with `--video-source local`.
3. **Speak with ZeroTTS, voice quangminh.** Synthesize each line separately. Trim leading and trailing silence. Place line `i` at `i * SCENE_SEC` and pad with silence so every scene is the same length. `SCENE_SEC` is 4 unless a line cannot fit. The voice id is `quangminh`. Do not switch to `maichi`, `baotrang`, Edge TTS, or the macOS `say` voice.
4. **Write `captions.srt` from those same start and end times.** Caption text is the spoken line. Font is Be Vietnam Pro Bold.
5. **Join the picture in MoneyPrinterTurbo.** `--video-concat-mode sequential`, `--video-clip-duration` equal to `SCENE_SEC`, `--video-aspect 9:16`, `--video-fit-mode cover`, `--video-transition-mode fade-in`, `--custom-audio-file` the wav, `--bgm-type random`, `--bgm-volume 0.12`, `--no-subtitle-enabled`. Pass the clips in scene order to `--video-materials`.
6. **Burn the captions with MoneyPrinter's renderer**, not FFmpeg's `subtitles` or `drawtext` filters. This machine's FFmpeg build does not include them. Call `app.services.video.generate_video` on `combined-1.mp4` plus the wav and the srt. Font `BeVietnamPro-Bold.ttf`, size 60, white fill, black stroke 2.5, position `bottom`. Keep the random bed at volume 0.12.
7. **Check one frame per scene.** The caption must name what is visible, and the spoken line must still be playing. `clip_count * SCENE_SEC` must be at least 0.2s longer than the wav, or MoneyPrinter loops the first clip for its 0.1s safety margin.
8. **Opening hook and emphasis, when asked.** Add one 4s scene and one quangminh line in front, and shift the later lines by 4s. Use HyperFrames on the silent `combined-1.mp4` (not the captioned file) plus a separate mix of the wav and the bed. Emphasis is sparse: one card on the hook, then at most one card per later beat that needs a number or a noun. Captions live in that same composition so they are not burned twice. Follow the HyperFrames skill for the clip contract, lint, and render.

## Voice

```python
audio = tts.synthesize(
    line,
    voice="quangminh",
    audio_temperature=0.8,
    audio_topk=25,
    audio_topp=0.95,
    audio_repetition_penalty=1.2,
)
```

Load with `ZeroTTS.from_pretrained("<repo>/text-to-voice/models/ZeroTTS", intra_op_num_threads=8)` from `text-to-voice/.venv`. After trimming, drop the line into a silent buffer at `i * SCENE_SEC`. Write 16-bit mono wav at `tts.sample_rate`.

## Join command

```bash
export PATH="/opt/homebrew/bin:$PATH"
.venv/bin/python cli.py \
  --video-subject "<chủ đề>" \
  --video-script "<các câu, cách nhau bằng dấu cách>" \
  --video-language vi-VN \
  --video-source local \
  --video-materials "storage/footage-<slug>/01-….mp4,storage/footage-<slug>/02-….mp4" \
  --custom-audio-file storage/voiceover-<slug>/voice.wav \
  --video-aspect 9:16 \
  --video-fit-mode cover \
  --video-concat-mode sequential \
  --video-clip-duration 4 \
  --video-transition-mode fade-in \
  --bgm-type random \
  --bgm-volume 0.12 \
  --no-subtitle-enabled \
  --n-threads 4
```

`--video-script` is stored with the task. The wav is what the viewer hears. Do not let MoneyPrinter generate a second script or a second voice.

## Caption pass

```python
from app.models.schema import VideoParams
from app.services.video import generate_video

params = VideoParams(
    video_subject="<chủ đề>",
    video_aspect="9:16",
    subtitle_enabled=True,
    subtitle_position="bottom",
    font_name="BeVietnamPro-Bold.ttf",
    font_size=60,
    text_fore_color="#FFFFFF",
    stroke_color="#000000",
    stroke_width=2.5,
    voice_volume=1.0,
    bgm_type="random",
    bgm_volume=0.12,
    n_threads=4,
)
generate_video(
    video_path="storage/tasks/<task-id>/combined-1.mp4",
    audio_path="storage/voiceover-<slug>/voice.wav",
    subtitle_path="storage/voiceover-<slug>/captions.srt",
    output_file="storage/tasks/<task-id>/final-captioned.mp4",
    params=params,
)
```

## Picture rule

A finished short is a sequence of shots, not a lecture laid over leftover photos. If a sentence has no clip, cut the sentence. If a clip has no sentence, cut the clip.

Worked order for a coffee-price short: pour a cup, falling beans, roasted beans, sidewalk cafe, busy street, a guest sitting with a cup, someone working at a laptop, a cup held at the end. The street clip carries the rent line. The bean clips carry only the bean lines.
