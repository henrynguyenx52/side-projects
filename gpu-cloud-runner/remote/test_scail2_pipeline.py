import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("scail2_pipeline.py")
SPEC = importlib.util.spec_from_file_location("scail2_pipeline", SCRIPT)
PIPELINE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PIPELINE)
WORKFLOW = SCRIPT.parents[2] / "22_v4.6_full_15s_fast_low_memory.json"


class Scail2PipelineTest(unittest.TestCase):
    @patch.object(PIPELINE, "server_ready", return_value=True)
    @patch.object(PIPELINE, "get_history", return_value={"status": {"completed": True, "status_str": "success"}})
    def test_recovers_completed_job_after_websocket_disconnect(self, _history, _ready):
        self.assertTrue(PIPELINE.recover_disconnected_job(8189, "prompt-1", timeout=1))

    @patch.object(PIPELINE, "server_ready", return_value=False)
    def test_reports_unrecoverable_disconnect_when_server_died(self, _ready):
        self.assertFalse(PIPELINE.recover_disconnected_job(8189, "prompt-1", timeout=1))

    def test_ffmpeg_preserves_source_audio(self):
        command = PIPELINE.build_ffmpeg_command(Path("in.mp4"), Path("out.mp4"), True)
        self.assertIn("0:a:0", command)
        self.assertIn("apad", command)
        self.assertNotIn("anullsrc=channel_layout=stereo:sample_rate=48000", command)

    def test_ffmpeg_adds_silent_audio_when_source_has_none(self):
        command = PIPELINE.build_ffmpeg_command(Path("in.mp4"), Path("out.mp4"), False)
        self.assertIn("anullsrc=channel_layout=stereo:sample_rate=48000", command)
        self.assertIn("1:a:0", command)
        self.assertIn("aac", command)

    def test_patches_known_input_and_output_nodes(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "run.json"
            PIPELINE.patch_workflow(
                WORKFLOW,
                destination,
                "gpu-cloud-runner/job/reference.png",
                "gpu-cloud-runner/job/driving.mp4",
                "gpu-cloud-runner/job/result",
                "sageattn_qk_int8_pv_fp16_cuda",
            )
            workflow = json.loads(destination.read_text(encoding="utf-8"))
            nodes = {node["id"]: node for node in workflow["nodes"]}
            self.assertEqual(nodes[42]["widgets_values"][0], "gpu-cloud-runner/job/reference.png")
            self.assertEqual(nodes[41]["widgets_values"]["video"], "gpu-cloud-runner/job/driving.mp4")
            self.assertEqual(nodes[41]["widgets_values"]["force_rate"], 30.0)
            self.assertEqual(nodes[41]["widgets_values"]["frame_load_cap"], 450)
            force_rate = next(item for item in nodes[41]["inputs"] if item["name"] == "force_rate")
            self.assertIsNone(force_rate["link"])
            self.assertNotIn(52, [link[0] for link in workflow["links"]])
            self.assertEqual(nodes[44]["widgets_values"]["filename_prefix"], "gpu-cloud-runner/job/result")
            self.assertTrue(nodes[44]["widgets_values"]["no_preview"])
            self.assertEqual(nodes[44]["inputs"][0]["link"], 63)
            self.assertEqual(next(link for link in workflow["links"] if link[0] == 63)[1:5], [48, 0, 44, 0])
            self.assertNotIn(64, [link[0] for link in workflow["links"]])
            self.assertEqual(nodes[16]["widgets_values"][0], PIPELINE.LOW_MEMORY_MODEL)
            self.assertEqual(nodes[16]["widgets_values"][4], "sageattn_qk_int8_pv_fp16_cuda")
            self.assertEqual(nodes[21]["widgets_values"][6], 453)
            self.assertEqual(nodes[48]["widgets_values"], [0, 450])
            self.assertEqual(nodes[50]["widgets_values"], [449, 1])
            self.assertEqual(next(item for item in nodes[1]["inputs"] if item["name"] == "video")["link"], 71)
            self.assertEqual(next(link for link in workflow["links"] if link[0] == 71), [71, 54, 0, 1, 0, "IMAGE"])

    def test_upscale_runs_after_comfyui_at_fixed_output_size(self):
        command = PIPELINE.build_upscale_command(Path("native.mp4"), Path("final.mp4"))
        video_filter = command[command.index("-vf") + 1]
        self.assertIn("scale=1080:1920", video_filter)
        self.assertIn("crop=1080:1920", video_filter)
        self.assertIn("0:a?", command)

    def test_can_patch_an_already_low_memory_workflow(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.json"
            second = Path(directory) / "second.json"
            PIPELINE.patch_workflow(WORKFLOW, first, "a.png", "b.mp4", "first", "sage-mode")
            PIPELINE.patch_workflow(first, second, "c.png", "d.mp4", "second", "sage-mode")
            nodes = {node["id"]: node for node in json.loads(second.read_text())["nodes"]}
            self.assertEqual(nodes[44]["inputs"][0]["link"], 63)
            self.assertIsNone(nodes[49]["inputs"][0]["link"])
            self.assertEqual(nodes[21]["widgets_values"][6], 453)
            self.assertEqual(next(item for item in nodes[1]["inputs"] if item["name"] == "video")["link"], 71)

    def test_normalization_caps_video_at_15_seconds(self):
        command = PIPELINE.build_ffmpeg_command(Path("in.mp4"), Path("out.mp4"), True)
        self.assertEqual(command[command.index("-frames:v") + 1], "450")
        self.assertIn("tpad=stop_mode=clone:stop_duration=15", command[command.index("-vf") + 1])

    def test_20_second_preset_retains_its_frame_cap_and_native_bound(self):
        source = WORKFLOW.with_name("22_v4.6_full_20s_fast_low_memory.json")
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "run.json"
            cap = PIPELINE.patch_workflow(source, destination, "a.png", "b.mp4", "result", "sage-mode")
            graph = json.loads(destination.read_text())
            nodes = {node["id"]: node for node in graph["nodes"]}
            self.assertEqual(cap, 600)
            self.assertEqual(nodes[36]["widgets_values"][0], 704)
            self.assertEqual(nodes[21]["widgets_values"][6], 601)
            self.assertEqual(nodes[50]["widgets_values"], [599, 1])
            self.assertEqual(nodes[48]["widgets_values"], [0, 600])
            self.assertIn([67, 51, 0, 1, 0, "IMAGE"], graph["links"])
            self.assertIn([63, 48, 0, 44, 0, "IMAGE"], graph["links"])
            command = PIPELINE.build_ffmpeg_command(Path("in.mp4"), Path("out.mp4"), True, cap)
            self.assertEqual(command[command.index("-frames:v") + 1], "600")

    def test_rejects_wrong_node_type(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "bad.json"
            destination = Path(directory) / "run.json"
            workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
            next(node for node in workflow["nodes"] if node["id"] == 42)["type"] = "WrongNode"
            source.write_text(json.dumps(workflow), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "Node 42 phải là LoadImage"):
                PIPELINE.patch_workflow(source, destination, "a.png", "b.mp4", "result", "sageattn_qk_int8_pv_fp16_cuda")


if __name__ == "__main__":
    unittest.main()
