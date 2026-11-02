#!/usr/bin/env python3
import time
from pathlib import Path
from vieneu import Vieneu

out_dir = Path("adam_bua_samples")
out_dir.mkdir(parents=True, exist_ok=True)

print("Initializing Vieneu v3 Turbo (precision=fp32)...")
tts = Vieneu(mode="v3turbo", precision="fp32")

samples = [
    {
        "id": "adam_bua_adjusted",
        "text": "[cười] Xin chào các con vợ! [hắng giọng] Dạo này các con vợ có khoẻ không đấy?",
        "desc": "User sentence with emotion tags and expressive punctuation"
    },
    {
        "id": "adam_bua_hf_web_default",
        "text": "Xin chào mọi người! [hắng giọng] Như bạn đang nghe thấy đấy, tốc độ xử lý của mình cực kỳ nhanh và mượt mà. Tiện lợi quá đúng không ạ? [cười] Hi vọng phiên bản nâng cấp v3 này sẽ mang lại trải nghiệm tuyệt vời cho bạn!",
        "desc": "Exact default demo text from the Hugging Face website"
    },
    {
        "id": "adam_bua_tiktok_review",
        "text": "Xin chào các con vợ nhé! Hôm nay tôi sẽ dẫn các con vợ đi thẩm một quả kèo cực kỳ uy tín luôn, không xem hơi phí đấy!",
        "desc": "Classic punchy Adam Bựa TikTok/review style"
    }
]

print(f"\nGenerating {len(samples)} Adam bựa samples with HF Space matched parameters (temp=0.8, top_k=25, top_p=0.95)...")

for item in samples:
    filename = f"{item['id']}.wav"
    filepath = out_dir / filename
    print(f"\n-> Synthesizing [{item['id']}]: '{item['text']}'")
    t0 = time.time()
    audio = tts.infer(
        text=item["text"],
        voice="Adam bựa",
        temperature=0.8,
        top_k=25,
        top_p=0.95,
        repetition_penalty=1.2,
    )
    tts.save(audio, str(filepath))
    elapsed = time.time() - t0
    print(f"   Done in {elapsed:.2f}s -> Saved to {filepath}")

print(f"\nAll samples generated successfully in {out_dir.resolve()}/")

