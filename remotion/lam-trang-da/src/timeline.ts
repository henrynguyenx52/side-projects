/** Measured from public/narration.wav. Do not edit by hand. */

export const fps = 30;
export const audioFile = "narration.wav";
export const voice = "maichi";
export const sampleRate = 48000;
export const audioDurationSeconds = 33.0099;
export const durationInFrames = 991;

export type SceneId = "hook" | "bridge" | "aloe" | "bean" | "cta";

export type Cue = {
  id: string;
  scene: SceneId;
  caption: string;
  speech: string;
  normalized: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
  displayEndFrame: number;
};

export type SceneWindow = {
  id: SceneId;
  label: string;
  startFrame: number;
  durationInFrames: number;
};

export const cues: Cue[] = [
  {
    id: "01",
    scene: "hook",
    caption: "Dùng bao nhiêu mỹ phẩm đắt tiền, da vẫn sạm?",
    speech: "Dùng bao nhiêu mỹ phẩm đắt tiền, da vẫn sạm?",
    normalized: "Dùng bao nhiêu mỹ phẩm đắt tiền, da vẫn sạm?",
    start: 0.2000,
    end: 3.0633,
    startFrame: 6,
    endFrame: 92,
    displayEndFrame: 95,
  },
  {
    id: "02",
    scene: "hook",
    caption: "Khoan mua thêm, nếu bạn chưa biết điều này.",
    speech: "Khoan mua thêm, nếu bạn chưa biết điều này.",
    normalized: "Khoan mua thêm, nếu bạn chưa biết điều này.",
    start: 3.1833,
    end: 5.3016,
    startFrame: 95,
    endFrame: 159,
    displayEndFrame: 163,
  },
  {
    id: "03",
    scene: "bridge",
    caption: "Da sạm vì tế bào chết tích tụ, và vì tia cực tím.",
    speech: "Da sạm vì tế bào chết tích tụ, và vì tia cực tím.",
    normalized: "Da sạm vì tế bào chết tích tụ, và vì tia cực tím.",
    start: 5.5816,
    end: 8.5665,
    startFrame: 167,
    endFrame: 257,
    displayEndFrame: 261,
  },
  {
    id: "04",
    scene: "bridge",
    caption: "Thử hai công thức lành tính, có sẵn trong nhà bạn.",
    speech: "Thử hai công thức lành tính, có sẵn trong nhà bạn.",
    normalized: "Thử hai công thức lành tính, có sẵn trong nhà bạn.",
    start: 8.6865,
    end: 11.3387,
    startFrame: 261,
    endFrame: 340,
    displayEndFrame: 344,
  },
  {
    id: "05",
    scene: "aloe",
    caption: "Đầu tiên: gel nha đam tươi.",
    speech: "Đầu tiên: gel nha đam tươi.",
    normalized: "Đầu tiên: gel nha đam tươi.",
    start: 11.6187,
    end: 13.4337,
    startFrame: 349,
    endFrame: 403,
    displayEndFrame: 407,
  },
  {
    id: "06",
    scene: "aloe",
    caption: "Gọt vỏ, lấy lớp gel trong.",
    speech: "Gọt vỏ, lấy lớp gel trong.",
    normalized: "Gọt vỏ, lấy lớp gel trong.",
    start: 13.5537,
    end: 15.3381,
    startFrame: 407,
    endFrame: 460,
    displayEndFrame: 464,
  },
  {
    id: "07",
    scene: "aloe",
    caption: "Thoa đều mặt và cổ, massage 10 phút, rồi rửa sạch.",
    speech: "Thoa đều mặt và cổ, massage 10 phút, rồi rửa sạch.",
    normalized: "Thoa đều mặt và cổ, massage mười phút, rồi rửa sạch.",
    start: 15.4581,
    end: 18.1997,
    startFrame: 464,
    endFrame: 546,
    displayEndFrame: 550,
  },
  {
    id: "08",
    scene: "bean",
    caption: "Thứ hai: bột đậu đỏ, trộn sữa chua không đường.",
    speech: "Thứ hai: bột đậu đỏ, trộn sữa chua không đường.",
    normalized: "Thứ hai: bột đậu đỏ, trộn sữa chua không đường.",
    start: 18.4797,
    end: 21.5063,
    startFrame: 554,
    endFrame: 645,
    displayEndFrame: 649,
  },
  {
    id: "09",
    scene: "bean",
    caption: "Thoa đều hỗn hợp lên mặt và tay.",
    speech: "Thoa đều hỗn hợp lên mặt và tay.",
    normalized: "Thoa đều hỗn hợp lên mặt và tay.",
    start: 21.6263,
    end: 23.3824,
    startFrame: 649,
    endFrame: 701,
    displayEndFrame: 705,
  },
  {
    id: "10",
    scene: "bean",
    caption: "Đắp 15 phút, rồi rửa lại.",
    speech: "Đắp 15 phút, rồi rửa lại.",
    normalized: "Đắp mười lăm phút, rồi rửa lại.",
    start: 23.5024,
    end: 25.3666,
    startFrame: 705,
    endFrame: 761,
    displayEndFrame: 765,
  },
  {
    id: "11",
    scene: "cta",
    caption: "An toàn, lành tính, và rất tiết kiệm.",
    speech: "An toàn, lành tính, và rất tiết kiệm.",
    normalized: "An toàn, lành tính, và rất tiết kiệm.",
    start: 25.6466,
    end: 27.8092,
    startFrame: 769,
    endFrame: 834,
    displayEndFrame: 838,
  },
  {
    id: "12",
    scene: "cta",
    caption: "Da dễ kích ứng thì thử một vùng nhỏ trước.",
    speech: "Da dễ kích ứng thì thử một vùng nhỏ trước.",
    normalized: "Da dễ kích ứng thì thử một vùng nhỏ trước.",
    start: 27.9292,
    end: 30.1563,
    startFrame: 838,
    endFrame: 905,
    displayEndFrame: 908,
  },
  {
    id: "13",
    scene: "cta",
    caption: "Lưu video này, áp dụng mỗi tuần nhé.",
    speech: "Lưu video này, áp dụng mỗi tuần nhé.",
    normalized: "Lưu video này, áp dụng mỗi tuần nhé.",
    start: 30.2763,
    end: 32.3599,
    startFrame: 908,
    endFrame: 971,
    displayEndFrame: 976,
  }
];

export const scenes: SceneWindow[] = [
  {
    id: "hook",
    label: "Da sạm",
    startFrame: 0,
    durationInFrames: 163,
  },
  {
    id: "bridge",
    label: "Cầu nối",
    startFrame: 163,
    durationInFrames: 181,
  },
  {
    id: "aloe",
    label: "Nha đam",
    startFrame: 344,
    durationInFrames: 206,
  },
  {
    id: "bean",
    label: "Đậu đỏ",
    startFrame: 550,
    durationInFrames: 215,
  },
  {
    id: "cta",
    label: "Kết",
    startFrame: 765,
    durationInFrames: 226,
  }
];
