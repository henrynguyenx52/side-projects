import sys
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import aigc_cleaner


class AigcCleanerTests(unittest.TestCase):
    def test_work_size_and_chunk_selection(self) -> None:
        self.assertEqual(aigc_cleaner.compute_work_size(1080, 1920, 1280), (720, 1280))
        self.assertEqual(aigc_cleaner.compute_chunk_frames(720, 1280), 193)
        self.assertEqual(aigc_cleaner.compute_work_size(1080, 1920, 0), (1088, 1920))
        self.assertEqual(aigc_cleaner.compute_chunk_frames(1088, 1920), 81)

    def test_defaults_to_optimized_wan_8_steps(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp) / "outputs"
            out_dir.mkdir()
            video = out_dir / "clip.mp4"
            video.write_bytes(b"mp4")

            fake_pipe = object()
            fake_embeds = object()
            with (
                mock.patch.object(sys, "argv", ["aigc_cleaner.py", "--output-dir", str(out_dir)]),
                mock.patch.object(aigc_cleaner, "ensure_wan_dependencies") as dep_mock,
                mock.patch.object(
                    aigc_cleaner,
                    "estimate_video_chunks",
                    return_value=(1080, 1920, Fraction(30, 1), True, 720, 1280, 193, 4),
                ),
                mock.patch.object(aigc_cleaner, "load_wan_pipeline", return_value=(fake_pipe, fake_embeds)) as load_mock,
                mock.patch.object(aigc_cleaner, "clean_video_wan") as clean_mock,
            ):
                exit_code = aigc_cleaner.main()

            self.assertEqual(exit_code, 0)
            dep_mock.assert_called_once()
            load_mock.assert_called_once_with(vae_bf16=True)
            clean_mock.assert_called_once()
            _, kwargs = clean_mock.call_args
            self.assertEqual(kwargs["wan_steps"], 8)
            self.assertEqual(kwargs["max_side"], 1280)
            self.assertEqual(kwargs["strength"], 0.38)
            self.assertEqual(kwargs["progress_state"]["total_chunks"], 4)

    def test_synthid_reinstalls_pinned_075_when_076_present(self) -> None:
        calls = []

        def fake_run(cmd, **_kwargs):
            calls.append(cmd)
            if len(cmd) >= 2 and cmd[1] == "--version":
                return mock.Mock(returncode=0, stdout="remove-ai-watermarks, version 0.76.0\n")
            return mock.Mock(returncode=0, stdout="")

        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp) / "outputs"
            out_dir.mkdir()
            video = Path(tmp) / "clip.mp4"
            video.write_bytes(b"mp4")

            with (
                mock.patch.object(
                    sys,
                    "argv",
                    ["aigc_cleaner.py", "--output-dir", str(out_dir), "--profile", "synthid", "--inputs", str(video)],
                ),
                mock.patch.object(aigc_cleaner.shutil, "which", side_effect=lambda name: f"/usr/bin/{name}"),
                mock.patch.object(aigc_cleaner, "probe_video", return_value=(1080, 1920, Fraction(30, 1), True)),
                mock.patch.object(aigc_cleaner.subprocess, "run", side_effect=fake_run),
            ):
                exit_code = aigc_cleaner.main()

            self.assertEqual(exit_code, 0)
            install_cmds = [cmd for cmd in calls if cmd[:3] == ["uv", "tool", "install"]]
            self.assertEqual(len(install_cmds), 1)
            self.assertIn("remove-ai-watermarks[video,diffusion]==0.75.0", install_cmds[0])
            run_cmds = [cmd for cmd in calls if "video" in cmd and "invisible" in cmd]
            self.assertEqual(len(run_cmds), 1)
            self.assertIn("--long-side", run_cmds[0])


if __name__ == "__main__":
    unittest.main()
