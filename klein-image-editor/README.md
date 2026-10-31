# Klein Edit

A small local image editor. It sends an uploaded image and an edit instruction to the FLUX.2 Klein 4B 6-bit model already downloaded by Draw Things (`flux_2_klein_4b_q6p.ckpt`).

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
brew install draw-things-cli
uvicorn app.main:app --port 8001
```

Open http://127.0.0.1:8001.

The model directory defaults to `~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models`. Override it with `DRAWTHINGS_MODELS_DIR` or point at another CLI binary with `DRAWTHINGS_CLI`.

Each edit runs as a background job. You can upload up to 30 images in one batch; they are edited one after another with the same instruction and strength. Optionally add up to 3 shared reference images (outfit, style, scene). In the prompt, the edit target is image 1 and references are image 2, 3, and 4 — for example: `The person from image 1, keeping their face and pose, wearing the outfit from image 2`. When references are present, the editor omits img2img strength so Klein treats every upload as a reference instead of tracing the original photo. While a batch runs, the page shows which image is current, the sampling step, an estimate of the time left, and an Abort button that stops the model process. One batch runs at a time.

Finished images from a batch are saved together in a new folder under `outputs`, named with the time the batch started in milliseconds, for example `outputs/1792770180217`.

The saved image keeps the uploaded width and height. The model itself needs dimensions that are multiples of 64, so the editor pads the working canvas and crops the result back. Edits use 4 steps and CFG 1.0. Change those with `FLUX_STEPS` and `FLUX_CFG`. The strength slider starts at 1, the recommended value for this model. Lower it to preserve more of the uploaded image. Large photos take longer because they are no longer reduced to 1024 pixels.
