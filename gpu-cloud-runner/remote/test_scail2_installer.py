import importlib.util
import json
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import tempfile
from threading import Barrier
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("scail2_installer.py")
SPEC = importlib.util.spec_from_file_location("scail2_installer", SCRIPT)
INSTALLER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INSTALLER)


class Scail2InstallerTest(unittest.TestCase):
    def test_disk_plan_ignores_cached_models_and_subtracts_partial_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            models_dir = root / "ComfyUI" / "models" / "diffusion_models"
            models_dir.mkdir(parents=True)
            output = root / "output"
            output.mkdir()
            with (models_dir / "cached.safetensors").open("wb") as file:
                file.truncate(2 * 2**20)
            with (models_dir / "missing.safetensors.part").open("wb") as file:
                file.truncate(3 * 2**20)
            models = {
                "cached.safetensors": ("diffusion_models", "cached-url"),
                "missing.safetensors": ("diffusion_models", "missing-url"),
            }
            required = INSTALLER.OUTPUT_RESERVE_BYTES + 5 * 2**20
            with patch.object(INSTALLER, "model_remote_size", return_value=8 * 2**20) as size, patch.object(
                INSTALLER.shutil, "disk_usage"
            ) as disk:
                disk.return_value.free = required
                INSTALLER.check_model_disk_space(root / "ComfyUI", models, output)
                size.assert_called_once_with("missing-url")
                disk.return_value.free -= 1
                with self.assertRaisesRegex(RuntimeError, "Không đủ dung lượng"):
                    INSTALLER.check_model_disk_space(root / "ComfyUI", models, output)

    def test_reads_model_size_from_resolver_or_final_response(self):
        for headers, expected in [
            ("HTTP/1.1 302 Found\nX-Linked-Size: 5000\n\nHTTP/2 200\n", 5000),
            ("HTTP/1.1 302 Found\nContent-Length: 50\n\nHTTP/2 200\nContent-Length: 6000\n", 6000),
        ]:
            with self.subTest(expected=expected), patch.object(INSTALLER.subprocess, "run") as request:
                request.return_value.stdout = headers
                self.assertEqual(INSTALLER.model_remote_size("https://example.invalid/model"), expected)

    def test_checks_sageattention_before_installing_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            comfyui = Path(directory) / "ComfyUI"
            with patch.object(
                INSTALLER, "install_sageattention", side_effect=RuntimeError("Không tìm thấy wheel")
            ), patch.object(INSTALLER, "ensure_repository") as install_repo:
                with self.assertRaisesRegex(RuntimeError, "Không tìm thấy wheel"):
                    INSTALLER.ensure_environment(comfyui)
                install_repo.assert_not_called()
                self.assertFalse(comfyui.exists())

    def test_checks_kernel_again_after_installing_dependencies(self):
        with tempfile.TemporaryDirectory() as directory, patch.multiple(
            INSTALLER,
            install_sageattention=lambda _python: None,
            environment_files_ready=lambda _path: False,
            ensure_repository=lambda *args, **kwargs: None,
            ensure_ffmpeg=lambda: None,
            comfy_executable=lambda: "comfy",
        ), patch.object(INSTALLER, "sageattention_ready", return_value=False) as check:
            with self.assertRaisesRegex(RuntimeError, "sau khi cài dependencies"):
                INSTALLER.ensure_environment(Path(directory) / "ComfyUI")
            check.assert_called_once_with(INSTALLER.sys.executable)

    def test_downloads_three_models_concurrently(self):
        barrier = Barrier(3)

        def download(_url, destination):
            barrier.wait(timeout=5)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.touch()
            return "downloaded"

        specs = {
            "vae.safetensors": ("vae", "url"),
            "text.safetensors": ("text_encoders", "url"),
            "wan.safetensors": ("diffusion_models", "url"),
        }
        with tempfile.TemporaryDirectory() as directory, patch.object(INSTALLER, "download", side_effect=download):
            result = INSTALLER.download_models(Path(directory), specs)
        self.assertEqual(result[0]["name"], "wan.safetensors")
        self.assertEqual({item["name"] for item in result}, specs.keys())

    def test_only_retries_unfinished_repository_requirements(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            pending = repo / INSTALLER.PENDING_REQUIREMENTS
            with patch.object(INSTALLER, "install_requirements") as install, patch.object(INSTALLER, "run") as run:
                INSTALLER.ensure_repository("url", repo, missing=False)
                install.assert_not_called()
                pending.touch()
                INSTALLER.ensure_repository("url", repo, missing=False)
                install.assert_called_once_with(INSTALLER.sys.executable, repo)
                run.assert_not_called()
            self.assertFalse(pending.exists())

    def test_resolves_fp16_workflow_to_low_memory_fp8_model(self):
        workflow = {
            "nodes": [
                {"type": node_type, "widgets_values": [filename]}
                for node_type, filename in [
                    ("CheckpointLoaderSimple", "sam3.1_multiplex_fp16.safetensors"),
                    ("CLIPLoader", "umt5_xxl_fp8_e4m3fn_scaled.safetensors"),
                    ("CLIPVisionLoader", "clip_vision_vit_h.safetensors"),
                    ("DiffusionModelLoaderKJ", "wan2.1_14B_SCAIL_2_fp16.safetensors"),
                    ("LoraLoaderModelOnly", "wan2.1_SCAIL_2_DPO_lora_bf16.safetensors"),
                    ("LoraLoaderModelOnly", "lightx2v_I2V_14B_480p_cfg_step_distill_rank256_bf16.safetensors"),
                    ("VAELoader", "wan_2.1_vae.safetensors"),
                ]
            ]
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "workflow.json"
            path.write_text(json.dumps(workflow), encoding="utf-8")
            models = INSTALLER.workflow_models(path)
        self.assertIn("wan2.1_14B_SCAIL_2_fp8_scaled.safetensors", models)
        self.assertNotIn("wan2.1_14B_SCAIL_2_fp16.safetensors", models)

    def test_selects_only_exact_matching_release_asset(self):
        filename = "sageattention-2.2.0+cu130.torch2.13.0.sm86-cp312-cp312-linux_x86_64.whl"
        url = f"https://github.com/{INSTALLER.SAGE_WHEEL_REPO}/releases/download/v1/{filename}"
        digest = "ab" * 32
        assets = [{"name": filename, "browser_download_url": url, "digest": f"sha256:{digest}"}]
        payload = json.dumps([{"assets": assets}]).encode()
        with patch.object(INSTALLER, "urlopen", side_effect=lambda *a, **k: BytesIO(payload)):
            self.assertEqual(INSTALLER.find_sage_wheel(filename), (url, digest))
            with self.assertRaisesRegex(RuntimeError, "Không tìm thấy wheel"):
                INSTALLER.find_sage_wheel(filename.replace("sm86", "sm89"))

    def test_tests_wheel_before_installing_it_into_main_environment(self):
        filename = "sageattention-test.whl"
        contents = b"fixture"

        def run(command):
            if command[0] == "curl":
                Path(command[command.index("--output") + 1]).write_bytes(contents)

        for staged_ok in (True, False):
            with self.subTest(staged_ok=staged_ok), (
                patch.object(INSTALLER, "sage_wheel_name", return_value=filename)
            ), patch.object(
                INSTALLER, "find_sage_wheel", return_value=("https://example.invalid/file.whl", sha256(contents).hexdigest())
            ), patch.object(INSTALLER, "run", side_effect=run) as commands, patch.object(
                INSTALLER, "sageattention_ready", side_effect=[False, staged_ok, True]
            ) as ready:
                if staged_ok:
                    INSTALLER.install_sageattention("python3")
                    self.assertIn("--force-reinstall", commands.call_args.args[0])
                    self.assertEqual(ready.call_count, 3)
                else:
                    with self.assertRaisesRegex(RuntimeError, "chọn instance khác"):
                        INSTALLER.install_sageattention("python3")
                    self.assertEqual(commands.call_count, 2)
                    self.assertIn("--target", commands.call_args.args[0])

    @patch.object(INSTALLER, "sageattention_ready", return_value=False)
    @patch.object(INSTALLER, "sage_wheel_name", return_value="sageattention-test.whl")
    @patch.object(INSTALLER, "find_sage_wheel", side_effect=RuntimeError("Không tìm thấy wheel"))
    @patch.object(INSTALLER, "run")
    def test_missing_wheel_stops_without_building(self, run, _find, _name, _ready):
        with self.assertRaisesRegex(RuntimeError, "chọn instance khác"):
            INSTALLER.install_sageattention("python3")
        run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
