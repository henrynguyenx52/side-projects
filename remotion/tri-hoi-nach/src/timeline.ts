/** Measured from public/narration.wav. Do not edit by hand. */

export const fps = 30;
export const audioFile = "narration.wav";
export const voice = "maichi";
export const sampleRate = 48000;
export const audioDurationSeconds = 32.9243;
export const durationInFrames = 988;

export type SceneId = "hook" | "bridge" | "alum" | "citrus" | "cta";

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
    caption: "Có một sự thật sẽ làm bạn bật ngửa!",
    speech: "Có một sự thật sẽ làm bạn bật ngửa!",
    normalized: "Có một sự thật sẽ làm bạn bật ngửa!",
    start: 0.2000,
    end: 2.1790,
    startFrame: 6,
    endFrame: 65,
    displayEndFrame: 69,
  },
  {
    id: "02",
    scene: "hook",
    caption: "Bản thân mồ hôi vốn không có mùi!",
    speech: "Bản thân mồ hôi vốn không có mùi!",
    normalized: "Bản thân mồ hôi vốn không có mùi!",
    start: 2.2990,
    end: 4.0520,
    startFrame: 69,
    endFrame: 122,
    displayEndFrame: 126,
  },
  {
    id: "03",
    scene: "bridge",
    caption: "Mùi khó chịu là do vi khuẩn phân hủy mồ hôi.",
    speech: "Mùi khó chịu là do vi khuẩn phân hủy mồ hôi.",
    normalized: "Mùi khó chịu là do vi khuẩn phân hủy mồ hôi.",
    start: 4.3320,
    end: 6.8360,
    startFrame: 130,
    endFrame: 205,
    displayEndFrame: 209,
  },
  {
    id: "04",
    scene: "bridge",
    caption: "Không cần tốn tiền đắt đỏ, dùng ngay 2 nguyên liệu tự nhiên có sẵn trong nhà bạn.",
    speech: "Không cần tốn tiền đắt đỏ, dùng ngay 2 nguyên liệu tự nhiên có sẵn trong nhà bạn.",
    normalized: "Không cần tốn tiền đắt đỏ, dùng ngay hai nguyên liệu tự nhiên có sẵn trong nhà bạn.",
    start: 6.9560,
    end: 11.4413,
    startFrame: 209,
    endFrame: 343,
    displayEndFrame: 347,
  },
  {
    id: "05",
    scene: "alum",
    caption: "Đầu tiên: Phèn chua sẵn trong gian bếp.",
    speech: "Đầu tiên: Phèn chua sẵn trong gian bếp.",
    normalized: "Đầu tiên: Phèn chua sẵn trong gian bếp.",
    start: 11.7213,
    end: 13.8176,
    startFrame: 352,
    endFrame: 415,
    displayEndFrame: 418,
  },
  {
    id: "06",
    scene: "alum",
    caption: "Rang chín, rồi giã mịn.",
    speech: "Rang chín, rồi giã mịn.",
    normalized: "Rang chín, rồi giã mịn.",
    start: 13.9376,
    end: 15.4521,
    startFrame: 418,
    endFrame: 464,
    displayEndFrame: 467,
  },
  {
    id: "07",
    scene: "alum",
    caption: "Sau khi tắm sạch, lau khô, thoa một lớp bột mỏng trực tiếp lên nách để diệt khuẩn.",
    speech: "Sau khi tắm sạch, lau khô, thoa một lớp bột mỏng trực tiếp lên nách để diệt khuẩn.",
    normalized: "Sau khi tắm sạch, lau khô, thoa một lớp bột mỏng trực tiếp lên nách để diệt khuẩn.",
    start: 15.5721,
    end: 20.0247,
    startFrame: 467,
    endFrame: 601,
    displayEndFrame: 605,
  },
  {
    id: "08",
    scene: "citrus",
    caption: "Thứ hai: Chanh hoặc Gừng tươi có ngay trong tủ lạnh.",
    speech: "Thứ hai: Chanh hoặc Gừng tươi có ngay trong tủ lạnh.",
    normalized: "Thứ hai: Chanh hoặc Gừng tươi có ngay trong tủ lạnh.",
    start: 20.3047,
    end: 23.0108,
    startFrame: 609,
    endFrame: 690,
    displayEndFrame: 694,
  },
  {
    id: "09",
    scene: "citrus",
    caption: "Cắt nửa quả chanh chà nhẹ lên nách, axit tự nhiên sẽ diệt sạch vi khuẩn gây mùi.",
    speech: "Cắt nửa quả chanh chà nhẹ lên nách, axit tự nhiên sẽ diệt sạch vi khuẩn gây mùi.",
    normalized: "Cắt nửa quả chanh chà nhẹ lên nách, axit tự nhiên sẽ diệt sạch vi khuẩn gây mùi.",
    start: 23.1308,
    end: 27.1325,
    startFrame: 694,
    endFrame: 814,
    displayEndFrame: 818,
  },
  {
    id: "10",
    scene: "cta",
    caption: "Vừa an toàn, lành tính lại cực kỳ tiết kiệm!",
    speech: "Vừa an toàn, lành tính lại cực kỳ tiết kiệm!",
    normalized: "Vừa an toàn, lành tính lại cực kỳ tiết kiệm!",
    start: 27.4125,
    end: 29.7273,
    startFrame: 822,
    endFrame: 892,
    displayEndFrame: 895,
  },
  {
    id: "11",
    scene: "cta",
    caption: "Lưu ngay video này lại để áp dụng hằng ngày nhé!",
    speech: "Lưu ngay video này lại để áp dụng hằng ngày nhé!",
    normalized: "Lưu ngay video này lại để áp dụng hằng ngày nhé!",
    start: 29.8473,
    end: 32.2743,
    startFrame: 895,
    endFrame: 968,
    displayEndFrame: 973,
  }
];

export const scenes: SceneWindow[] = [
  {
    id: "hook",
    label: "Sự thật",
    startFrame: 0,
    durationInFrames: 126,
  },
  {
    id: "bridge",
    label: "Cầu nối",
    startFrame: 126,
    durationInFrames: 221,
  },
  {
    id: "alum",
    label: "Phèn chua",
    startFrame: 347,
    durationInFrames: 258,
  },
  {
    id: "citrus",
    label: "Chanh và gừng",
    startFrame: 605,
    durationInFrames: 213,
  },
  {
    id: "cta",
    label: "Kết",
    startFrame: 818,
    durationInFrames: 170,
  }
];
