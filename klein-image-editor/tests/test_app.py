import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.main as main
from app.flux import (
    MAX_REFERENCE_IMAGES,
    MODEL_FILE,
    EditCancelled,
    ProgressEvent,
    build_command,
    crop_to_original,
    edit_image,
    model_canvas,
    parse_progress,
    prepare_image,
)
from app.jobs import Job, JobManager, Timings, estimate_remaining, record_progress

FAKE_CLI = """#!/usr/bin/env python3
import sys, time
args = sys.argv
out = args[args.index("--output") + 1]
delay = float({delay!r})
for line in ["Backend: local", "\\x1b[1A\\x1b[KStarting... [ ] 0  %"]:
    print(line, flush=True)
for step in range(1, 5):
    print(f"\\x1b[1A\\x1b[KSampling... {{step}} / 4 [ ] {{step * 20}} %", flush=True)
    time.sleep(delay)
print("\\x1b[1A\\x1b[KFinishing... [█] 100%", flush=True)
width = int(args[args.index("--width") + 1])
height = int(args[args.index("--height") + 1])
import struct, zlib
def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
raw = b"".join(b"\\x00" + bytes([20, 40, 60]) * width for _ in range(height))
png = b"\\x89PNG\\r\\n\\x1a\\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
open(out, "wb").write(png)
print("Wrote: " + out, flush=True)
"""


@pytest.fixture
def fake_cli(tmp_path, monkeypatch):
    def install(delay=0.0):
        script = tmp_path / "draw-things-cli"
        script.write_text(FAKE_CLI.format(delay=delay))
        script.chmod(0o755)
        models = tmp_path / "models"
        models.mkdir(exist_ok=True)
        (models / MODEL_FILE).write_bytes(b"model")
        monkeypatch.setenv("DRAWTHINGS_CLI", str(script))
        monkeypatch.setenv("DRAWTHINGS_MODELS_DIR", str(models))
        return script

    return install


def wait_for(client, job_id, statuses=("succeeded", "failed", "cancelled"), timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        body = client.get(f"/api/jobs/{job_id}").json()
        if body["status"] in statuses:
            return body
        time.sleep(0.05)
    raise AssertionError(f"job stayed {body['status']}")


def png_upload(tmp_path, size=(128, 128)):
    image = tmp_path / "photo.png"
    Image.new("RGB", size, (10, 20, 30)).save(image)
    return image


def test_model_canvas_rounds_up_without_shrinking():
    assert model_canvas(1000, 500) == (1024, 512)
    assert model_canvas(3000, 2000) == (3008, 2048)
    assert model_canvas(128, 128) == (128, 128)


def test_prepare_image_keeps_original_pixels(tmp_path: Path):
    source = tmp_path / "source.png"
    original = Image.new("RGB", (130, 70), (20, 40, 60))
    original.putpixel((0, 0), (1, 2, 3))
    original.putpixel((129, 69), (4, 5, 6))
    original.save(source)
    destination = tmp_path / "prepared.png"
    prepared = prepare_image(source, destination)
    assert (prepared.original_width, prepared.original_height) == (130, 70)
    assert (prepared.canvas_width, prepared.canvas_height) == (192, 128)
    with Image.open(destination) as image:
        left = (192 - 130) // 2
        top = (128 - 70) // 2
        assert image.getpixel((left, top)) == (1, 2, 3)
        assert image.getpixel((left + 129, top + 69)) == (4, 5, 6)


def test_crop_restores_uploaded_dimensions(tmp_path: Path):
    generated = tmp_path / "generated.png"
    Image.new("RGB", (192, 128), (9, 9, 9)).save(generated)
    crop_to_original(generated, 130, 70)
    with Image.open(generated) as image:
        assert image.size == (130, 70)


def test_command_targets_local_klein_model(tmp_path: Path):
    command = build_command(
        cli="draw-things-cli",
        models_dir=tmp_path,
        source=tmp_path / "in.png",
        destination=tmp_path / "out.png",
        prompt="add a red coat",
        strength=0.65,
        width=768,
        height=512,
        seed=11,
    )
    assert command[0:4] == ["draw-things-cli", "generate", "--model", MODEL_FILE]
    assert MODEL_FILE == "flux_2_klein_4b_q6p.ckpt"
    assert "--local" in command
    assert "--offline" in command
    assert "--no-download-missing" in command
    assert command[command.index("--prompt") + 1] == "add a red coat"
    assert command[command.index("--strength") + 1] == "0.65"
    assert command.count("--image") == 1


def test_command_appends_reference_images(tmp_path: Path):
    ref_a = tmp_path / "outfit.png"
    ref_b = tmp_path / "style.png"
    command = build_command(
        cli="draw-things-cli",
        models_dir=tmp_path,
        source=tmp_path / "person.png",
        destination=tmp_path / "out.png",
        prompt="The person from image 1 wearing the outfit from image 2",
        strength=1.0,
        width=512,
        height=512,
        seed=7,
        references=[ref_a, ref_b],
    )
    image_flags = [command[i + 1] for i, part in enumerate(command) if part == "--image"]
    assert image_flags == [str(tmp_path / "person.png"), str(ref_a), str(ref_b)]
    assert "--strength" not in command


def test_command_keeps_strength_without_references(tmp_path: Path):
    command = build_command(
        cli="draw-things-cli",
        models_dir=tmp_path,
        source=tmp_path / "in.png",
        destination=tmp_path / "out.png",
        prompt="add snow",
        strength=0.8,
        width=512,
        height=512,
        seed=2,
    )
    assert command[command.index("--strength") + 1] == "0.80"
    assert command.count("--image") == 1


def test_command_rejects_too_many_references(tmp_path: Path):
    refs = [tmp_path / f"ref-{index}.png" for index in range(MAX_REFERENCE_IMAGES + 1)]
    with pytest.raises(ValueError, match="reference images"):
        build_command(
            cli="draw-things-cli",
            models_dir=tmp_path,
            source=tmp_path / "person.png",
            destination=tmp_path / "out.png",
            prompt="wear outfit",
            strength=1.0,
            width=512,
            height=512,
            seed=1,
            references=refs,
        )


def test_parse_progress_reads_cli_lines():
    assert parse_progress("\x1b[1A\x1b[KSampling... 2 / 4 [ ] 24 %") == ProgressEvent("Sampling", 24, 2, 4)
    assert parse_progress("Finishing... [█] 100%") == ProgressEvent("Finishing", 100)
    assert parse_progress("Wrote: /tmp/out.png") is None


def test_estimate_uses_measured_step_speed():
    timings = Timings(load_seconds=6, step_seconds=4.5, finish_seconds=1)
    job = Job(total_steps=4, started_at=0)
    assert estimate_remaining(job, timings, now=2) == pytest.approx(4 + 4 * 4.5 + 1)
    record_progress(job, ProgressEvent("Sampling", 5, 1, 4), now=6)
    record_progress(job, ProgressEvent("Sampling", 24, 2, 4), now=9)
    assert estimate_remaining(job, timings, now=10) == pytest.approx(2 + 2 * 3 + 1)
    record_progress(job, ProgressEvent("Finishing", 82), now=18)
    assert estimate_remaining(job, timings, now=18.2) == pytest.approx(0.8)


def test_edit_image_streams_progress_from_cli(fake_cli, tmp_path):
    fake_cli()
    events = []
    result = edit_image(
        png_upload(tmp_path), "add snow", tmp_path / "out.png", 1.0, 128, 128,
        seed=3, on_progress=events.append,
    )
    assert result["seed"] == 3
    with Image.open(tmp_path / "out.png") as image:
        assert image.size == (128, 128)
    assert [e.step for e in events if e.phase == "Sampling"] == [1, 2, 3, 4]
    assert events[-1].phase == "Finishing"


def test_edit_image_abort_kills_cli(fake_cli, tmp_path):
    fake_cli(delay=30)
    flag = threading.Event()
    started = threading.Event()
    holder = {}

    def on_start(process):
        holder["process"] = process
        started.set()

    def abort_soon():
        started.wait(5)
        time.sleep(0.3)
        flag.set()
        from app.flux import stop_process
        stop_process(holder["process"])

    threading.Thread(target=abort_soon).start()
    began = time.monotonic()
    with pytest.raises(EditCancelled):
        edit_image(
            png_upload(tmp_path), "add snow", tmp_path / "out.png", 1.0, 128, 128,
            on_start=on_start, cancelled=flag.is_set,
        )
    assert time.monotonic() - began < 10
    assert holder["process"].poll() is not None
    assert not (tmp_path / "out.png").exists()


def test_homepage_has_instruction_upload_and_abort():
    page = TestClient(main.app).get("/")
    assert page.status_code == 200
    assert 'id="prompt"' in page.text
    assert 'id="image"' in page.text
    assert 'id="reference"' in page.text
    assert 'id="pick-images"' in page.text
    assert 'id="pick-references"' in page.text
    assert "Upload reference images" in page.text
    assert 'name="reference"' in page.text
    assert "multiple" in page.text
    assert 'id="abort"' in page.text
    assert 'id="time-left"' in page.text
    assert "FLUX.2 Klein 4B" in page.text


def test_edit_job_reports_progress_and_result(fake_cli, tmp_path, monkeypatch):
    fake_cli()
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    with png_upload(tmp_path).open("rb") as handle:
        response = client.post(
            "/api/edit",
            data={"prompt": "make it snow", "strength": "1"},
            files={"image": ("photo.png", handle, "image/png")},
        )
    assert response.status_code == 202
    started = response.json()
    assert started["status"] == "running"
    assert started["remaining_seconds"] > 0
    done = wait_for(client, started["id"])
    assert done["status"] == "succeeded"
    assert done["image_url"].startswith(f"/outputs/{done['folder']}/")
    assert done["folder"].isdigit()
    assert len(done["folder"]) >= 13
    assert done["image_count"] == 1
    assert done["progress"] == 1.0
    assert done["width"] == 128
    assert done["height"] == 128
    assert (main.OUTPUT_DIR / done["folder"] / "photo.png").is_file()


def test_edit_keeps_uploaded_dimensions(fake_cli, tmp_path, monkeypatch):
    fake_cli()
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    with png_upload(tmp_path, (130, 70)).open("rb") as handle:
        response = client.post(
            "/api/edit",
            data={"prompt": "add a red coat"},
            files={"image": ("photo.png", handle, "image/png")},
        )
    done = wait_for(client, response.json()["id"])
    assert done["status"] == "succeeded"
    assert (done["width"], done["height"]) == (130, 70)
    relative = done["image_url"].split("/outputs/", 1)[1]
    with Image.open(main.OUTPUT_DIR / relative) as image:
        assert image.size == (130, 70)


def test_abort_endpoint_stops_running_edit(fake_cli, tmp_path, monkeypatch):
    fake_cli(delay=30)
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    with png_upload(tmp_path).open("rb") as handle:
        job = client.post(
            "/api/edit",
            data={"prompt": "make it snow"},
            files={"image": ("photo.png", handle, "image/png")},
        ).json()
    wait_for(client, job["id"], statuses=("running",))
    time.sleep(0.3)

    with png_upload(tmp_path).open("rb") as handle:
        busy = client.post(
            "/api/edit",
            data={"prompt": "second"},
            files={"image": ("photo.png", handle, "image/png")},
        )
    assert busy.status_code == 409

    began = time.monotonic()
    assert client.post(f"/api/jobs/{job['id']}/cancel").status_code == 202
    done = wait_for(client, job["id"])
    assert done["status"] == "cancelled"
    assert done["remaining_seconds"] is None
    assert time.monotonic() - began < 10


def test_unknown_job_is_404():
    client = TestClient(main.app)
    assert client.get("/api/jobs/missing").status_code == 404
    assert client.post("/api/jobs/missing/cancel").status_code == 404


def test_edit_endpoint_rejects_blank_instruction(tmp_path: Path):
    client = TestClient(main.app)
    with png_upload(tmp_path, (64, 64)).open("rb") as handle:
        response = client.post(
            "/api/edit",
            data={"prompt": "   "},
            files={"image": ("photo.png", handle, "image/png")},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "Enter an edit instruction."


def test_output_filename_keeps_readable_unique_names():
    used = set()
    assert main.output_filename("Red Coat.PNG", used) == "Red-Coat.png"
    assert main.output_filename("Red Coat.PNG", used) == "Red-Coat-2.png"
    assert main.output_filename("../secret.png", used) == "secret.png"
    assert main.output_filename("", used) == "image.png"


def test_scale_progress_offsets_later_images():
    first, steps = main.scale_progress(ProgressEvent("Sampling", 25, 1, 4), 1, 3, 4)
    assert steps == 4
    assert first == ProgressEvent("Sampling", 25, 5, 12)
    held, _ = main.scale_progress(ProgressEvent("Finishing", 100), 0, 2, 4)
    assert held == ProgressEvent("Sampling", 100, 4, 8)
    last, _ = main.scale_progress(ProgressEvent("Finishing", 100), 1, 2, 4)
    assert last.phase == "Finishing"
    assert last.step is None


def test_cancelled_job_keeps_partial_batch_result():
    manager = JobManager()

    def work(**_callbacks):
        error = EditCancelled()
        error.result = {"folder": "123", "images": [{"filename": "a.png"}]}
        raise error

    job = manager.submit(4, work, lambda: None, image_count=2)
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        body = manager.snapshot(job)
        if body["status"] != "running":
            assert body["status"] == "cancelled"
            assert body["folder"] == "123"
            assert body["images"][0]["filename"] == "a.png"
            assert body["error"] == "Edit aborted."
            assert body["image_count"] == 2
            return
        time.sleep(0.02)
    raise AssertionError(body["status"])


def test_batch_saves_every_image_in_one_timestamp_folder(fake_cli, tmp_path, monkeypatch):
    fake_cli()
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    first = png_upload(tmp_path, (128, 128))
    second = tmp_path / "second.png"
    Image.new("RGB", (64, 96), (1, 2, 3)).save(second)
    with first.open("rb") as left, second.open("rb") as right:
        response = client.post(
            "/api/edit",
            data={"prompt": "make it snow", "strength": "1"},
            files=[
                ("image", ("photo.png", left, "image/png")),
                ("image", ("photo.png", right, "image/png")),
            ],
        )
    assert response.status_code == 202
    started = response.json()
    assert started["image_count"] == 2
    assert started["status"] == "running"
    done = wait_for(client, started["id"])
    assert done["status"] == "succeeded"
    assert done["folder"].isdigit()
    assert len(done["images"]) == 2
    by_name = {item["filename"]: item for item in done["images"]}
    assert set(by_name) == {"photo.png", "photo-2.png"}
    assert (by_name["photo.png"]["width"], by_name["photo.png"]["height"]) == (128, 128)
    assert (by_name["photo-2.png"]["width"], by_name["photo-2.png"]["height"]) == (64, 96)
    folder = main.OUTPUT_DIR / done["folder"]
    assert sorted(path.name for path in folder.iterdir()) == ["photo-2.png", "photo.png"]
    for item in done["images"]:
        assert item["image_url"] == f"/outputs/{done['folder']}/{item['filename']}"
        with Image.open(folder / item["filename"]) as image:
            assert image.size == (item["width"], item["height"])
    assert done["image_url"] == f"/outputs/{done['folder']}/photo.png"


def test_batch_rejects_a_non_image_before_starting(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    with png_upload(tmp_path).open("rb") as handle:
        response = client.post(
            "/api/edit",
            data={"prompt": "add rain"},
            files=[
                ("image", ("photo.png", handle, "image/png")),
                ("image", ("notes.txt", b"not an image", "text/plain")),
            ],
        )
    assert response.status_code == 400
    assert "notes.txt" in response.json()["detail"]
    assert "PNG, JPEG, or WebP" in response.json()["detail"]
    assert main.jobs.active() is None


def test_batch_rejects_too_many_images(monkeypatch):
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    payload = b"unused"
    response = client.post(
        "/api/edit",
        data={"prompt": "add rain"},
        files=[("image", (f"{index}.png", payload, "image/png")) for index in range(main.MAX_BATCH + 1)],
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Upload at most 30 images at a time."


def test_edit_rejects_too_many_references(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    files = [("image", ("photo.png", png_upload(tmp_path).read_bytes(), "image/png"))]
    for index in range(MAX_REFERENCE_IMAGES + 1):
        files.append(("reference", (f"ref-{index}.png", png_upload(tmp_path).read_bytes(), "image/png")))
    response = client.post(
        "/api/edit",
        data={"prompt": "wear the outfit from image 2"},
        files=files,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == f"Upload at most {MAX_REFERENCE_IMAGES} reference images."


def test_edit_passes_reference_images_to_cli(fake_cli, tmp_path, monkeypatch):
    script = fake_cli()
    script.write_text(
        FAKE_CLI.format(delay=0.0)
        + "\nopen(out + '.args', 'w').write('\\n'.join(args))\n"
    )
    monkeypatch.setattr(main, "jobs", JobManager())
    client = TestClient(main.app)
    person = png_upload(tmp_path, (128, 128))
    outfit = tmp_path / "outfit.png"
    Image.new("RGB", (96, 96), (200, 40, 40)).save(outfit)
    with person.open("rb") as left, outfit.open("rb") as right:
        response = client.post(
            "/api/edit",
            data={"prompt": "The person from image 1 wearing the outfit from image 2", "strength": "1"},
            files=[
                ("image", ("person.png", left, "image/png")),
                ("reference", ("outfit.png", right, "image/png")),
            ],
        )
    assert response.status_code == 202
    done = wait_for(client, response.json()["id"])
    assert done["status"] == "succeeded"
    args_path = main.OUTPUT_DIR / done["folder"] / "person.png.args"
    assert args_path.is_file()
    args = args_path.read_text().splitlines()
    image_args = [args[i + 1] for i, part in enumerate(args) if part == "--image"]
    assert len(image_args) == 2
    assert Path(image_args[0]).name.endswith(".png")
    assert Path(image_args[1]).name.endswith(".png")
    assert image_args[0] != image_args[1]


def test_edit_endpoint_rejects_non_image():
    client = TestClient(main.app)
    response = client.post(
        "/api/edit",
        data={"prompt": "add rain"},
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400
    assert "PNG, JPEG, or WebP" in response.json()["detail"]
