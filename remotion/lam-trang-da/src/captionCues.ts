export type CaptionPart = {
  text: string;
  hot?: boolean;
};

export type CaptionCue = {
  start: number;
  end: number;
  parts: CaptionPart[];
};

/** Karaoke lines locked to public/narration.wav. Times are seconds. */
export const captionCues: CaptionCue[] = [
  {start: 0.2, end: 1.154, parts: [{text: "Dùng bao nhiêu"}]},
  {
    start: 1.154,
    end: 2.108,
    parts: [{text: "mỹ phẩm "}, {text: "đắt tiền", hot: true}],
  },
  {
    start: 2.108,
    end: 3.063,
    parts: [{text: "da vẫn "}, {text: "sạm?", hot: true}],
  },
  {
    start: 3.183,
    end: 4.243,
    parts: [{text: "Khoan", hot: true}, {text: " mua thêm"}],
  },
  {
    start: 4.243,
    end: 5.302,
    parts: [{text: "nếu chưa biết "}, {text: "điều này", hot: true}],
  },
  {start: 5.582, end: 6.577, parts: [{text: "Da sạm vì"}]},
  {start: 6.577, end: 7.572, parts: [{text: "tế bào chết", hot: true}]},
  {
    start: 7.572,
    end: 8.567,
    parts: [{text: "và tia "}, {text: "cực tím", hot: true}],
  },
  {start: 8.687, end: 9.571, parts: [{text: "hai công thức", hot: true}]},
  {start: 9.571, end: 10.455, parts: [{text: "lành tính"}]},
  {
    start: 10.455,
    end: 11.339,
    parts: [{text: "có sẵn "}, {text: "trong nhà", hot: true}],
  },
  {start: 11.619, end: 12.526, parts: [{text: "Đầu tiên", hot: true}]},
  {
    start: 12.526,
    end: 13.434,
    parts: [{text: "gel "}, {text: "nha đam", hot: true}, {text: " tươi"}],
  },
  {start: 13.554, end: 14.446, parts: [{text: "Gọt vỏ"}]},
  {
    start: 14.446,
    end: 15.338,
    parts: [{text: "lấy "}, {text: "gel trong", hot: true}],
  },
  {start: 15.458, end: 16.372, parts: [{text: "Thoa mặt và cổ"}]},
  {
    start: 16.372,
    end: 17.286,
    parts: [{text: "massage "}, {text: "10 phút", hot: true}],
  },
  {start: 17.286, end: 18.2, parts: [{text: "rồi rửa sạch"}]},
  {start: 18.48, end: 19.489, parts: [{text: "Thứ hai", hot: true}]},
  {
    start: 19.489,
    end: 20.498,
    parts: [{text: "bột "}, {text: "đậu đỏ", hot: true}],
  },
  {start: 20.498, end: 21.506, parts: [{text: "sữa chua không đường"}]},
  {start: 21.626, end: 22.504, parts: [{text: "Thoa hỗn hợp"}]},
  {start: 22.504, end: 23.382, parts: [{text: "lên mặt và tay"}]},
  {
    start: 23.502,
    end: 24.435,
    parts: [{text: "Đắp "}, {text: "15 phút", hot: true}],
  },
  {start: 24.435, end: 25.367, parts: [{text: "rồi rửa lại"}]},
  {start: 25.647, end: 26.728, parts: [{text: "An toàn, lành tính"}]},
  {
    start: 26.728,
    end: 27.809,
    parts: [{text: "rất "}, {text: "tiết kiệm", hot: true}],
  },
  {start: 27.929, end: 29.043, parts: [{text: "Da dễ kích ứng"}]},
  {
    start: 29.043,
    end: 30.156,
    parts: [{text: "thử "}, {text: "vùng nhỏ", hot: true}, {text: " trước"}],
  },
  {
    start: 30.276,
    end: 31.318,
    parts: [{text: "Lưu", hot: true}, {text: " video này"}],
  },
  {
    start: 31.318,
    end: 32.36,
    parts: [{text: "mỗi tuần", hot: true}, {text: " nhé"}],
  },
];
