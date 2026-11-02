import type { ContrastWordDetail, ComparisonInsight, CommonMistakeDetail, QuizDetail } from "../../types.ts";

export interface ContrastPreset {
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
  comparison: ComparisonInsight;
  commonMistake?: CommonMistakeDetail;
  quiz: QuizDetail;
  narrationScripts: {
    hook: { spoken: string; caption: string };
    wordA: { spoken: string; caption: string };
    wordB: { spoken: string; caption: string };
    comparison: { spoken: string; caption: string };
    mistake?: { spoken: string; caption: string };
    quiz: { spoken: string; caption: string };
    cta: { spoken: string; caption: string };
  };
}

export const CONTRAST_PRESETS: Record<string, ContrastPreset> = {
  "borrow-lend": {
    wordA: {
      word: "Borrow",
      pronunciation: "/ˈbɒr.oʊ/",
      partOfSpeech: "verb",
      definition: "To take and use something belonging to someone else, returning it later.",
      vietnameseMeaning: "Mượn / Vay (Nhận về mình)",
      direction: "incoming",
      directionLabel: "Take IN (Receive)",
      directionIcon: "arrow-down-left",
      examples: [
        "Can I borrow your pen for a minute?",
        "She borrowed 50 dollars from her friend.",
      ],
      explanation: "Borrow là hành động nhận đồ hoặc tiền từ người khác về phía mình để dùng tạm.",
      keyCollocations: ["borrow FROM someone", "borrow books", "borrow money"],
      colorAccent: "#38BDF8",
    },
    wordB: {
      word: "Lend",
      pronunciation: "/lɛnd/",
      partOfSpeech: "verb",
      definition: "To give something to someone for a short period, expecting it back.",
      vietnameseMeaning: "Cho mượn / Cho vay (Đưa ra ngoài)",
      direction: "outgoing",
      directionLabel: "Give OUT (Provide)",
      directionIcon: "arrow-up-right",
      examples: [
        "I can lend you my pen.",
        "The bank agreed to lend him the money.",
      ],
      explanation: "Lend là hành động đưa đồ hoặc tiền của mình cho người khác mượn tạm.",
      keyCollocations: ["lend something TO someone", "lend a hand", "lend support"],
      colorAccent: "#34D399",
    },
    comparison: {
      headline: "Quy Tắc Hướng Đi (Movement)",
      summary: "Borrow là nhận vào. Lend là đưa ra.",
      ruleA: "Borrow = IN (Nhận đồ từ ai đó)",
      ruleB: "Lend = OUT (Đưa đồ cho ai đó)",
      memoryTrick: "Borrow: nhận về phía mình. Lend: để nó đi ra ngoài!",
    },
    commonMistake: {
      incorrect: "Can you borrow me your car?",
      correct: "Can you lend me your car?",
      explanation: "Không nói 'borrow me'. Phải dùng 'lend to someone' hoặc 'borrow from someone'.",
    },
    quiz: {
      question: "Could you please _____ me twenty dollars?",
      options: ["A. borrow", "B. lend"],
      answer: "B",
      answerWord: "lend",
      explanation: "Bạn đang nhờ đối phương đưa tiền ra cho bạn mượn, nên phải dùng lend!",
    },
    narrationScripts: {
      hook: {
        spoken: "Bạn có hay bị nhầm lẫn giữa Borrow và Lend không? Xem hết video này để nhớ mãi mãi quy tắc vàng cực dễ nhé!",
        caption: "Đừng nhầm lẫn giữa Borrow và Lend!",
      },
      wordA: {
        spoken: "Đầu tiên là Borrow, phát âm là /ˈbɒr.oʊ/. Từ này có nghĩa là mượn hoặc vay, tức là bạn nhận đồ từ người khác về phía mình. Ví dụ: Can I borrow your pen? Chiếc bút đang đi về phía bạn!",
        caption: "Borrow = Mượn / Vay (Nhận về mình)",
      },
      wordB: {
        spoken: "Tiếp theo là Lend, phát âm là /lɛnd/. Từ này có nghĩa là cho mượn hoặc cho vay, tức là bạn đưa đồ của mình ra cho người khác. Ví dụ: I can lend you my pen. Bạn đang đưa chiếc bút ra ngoài!",
        caption: "Lend = Cho mượn / Cho vay (Đưa ra ngoài)",
      },
      comparison: {
        spoken: "Quy tắc vàng nằm ở hướng chuyển động! Borrow là đi vào, nhận về phía bạn. Còn Lend là đi ra, đưa cho người khác. Nhớ mẹo này: Borrow nhận về, Lend cho đi!",
        caption: "Borrow nhận về • Lend cho đi",
      },
      mistake: {
        spoken: "Lỗi sai cực kỳ phổ biến mà nhiều bạn mắc phải là nói: Can you borrow me your car? Câu này sai hoàn toàn nhé! Phải nói là: Can you lend me your car? hoặc Can I borrow your car?",
        caption: "Lỗi phổ biến: Đừng nói 'borrow me'!",
      },
      quiz: {
        spoken: "Thử tài nhanh nhé! Trong câu: Could you please blank me twenty dollars? Bạn chọn A: borrow hay B: lend? Đáp án chính xác là B: lend, vì bạn đang nhờ người khác đưa tiền ra cho mình!",
        caption: "Thử tài: Chọn Borrow hay Lend?",
      },
      cta: {
        spoken: "Hãy thả tim, lưu lại video này và follow kênh để mỗi ngày học thêm một mẹo tiếng Anh cực chất nhé!",
        caption: "Follow kênh để học tiếng Anh mỗi ngày!",
      },
    },
  },

  "say-tell": {
    wordA: {
      word: "Say",
      pronunciation: "/seɪ/",
      partOfSpeech: "verb",
      definition: "To utter words, state something, or express a thought directly.",
      vietnameseMeaning: "Nói (Tập trung vào lời nói)",
      direction: "neutral",
      directionLabel: "Express Words Directly",
      directionIcon: "message-square",
      examples: [
        "What did she say to you?",
        "He said that he was tired.",
      ],
      explanation: "Say tập trung vào lời nói hoặc nội dung phát ra, không cần người nghe ngay sau.",
      keyCollocations: ["say hello", "say something TO someone", "say that..."],
      colorAccent: "#818CF8",
    },
    wordB: {
      word: "Tell",
      pronunciation: "/tɛl/",
      partOfSpeech: "verb",
      definition: "To give information, instruct, or narrate a story to a specific person.",
      vietnameseMeaning: "Kể / Bảo (Tập trung vào người nhận)",
      direction: "outgoing",
      directionLabel: "Deliver Info To Someone",
      directionIcon: "user-check",
      examples: [
        "Can you tell me the time?",
        "She told him a secret.",
      ],
      explanation: "Tell bắt buộc phải có người nhận thông tin ngay phía sau (tell someone something).",
      keyCollocations: ["tell someone", "tell a story", "tell the truth"],
      colorAccent: "#F59E0B",
    },
    comparison: {
      headline: "Quy Tắc Người Nhận (Receiver)",
      summary: "Say nội dung. Tell ai đó.",
      ruleA: "Say + (that) nội dung [Không có người trực tiếp]",
      ruleB: "Tell + AI ĐÓ + nội dung [Bắt buộc gọi tên người nghe]",
      memoryTrick: "Say lời muốn nói. Tell người cần nghe!",
    },
    commonMistake: {
      incorrect: "He said me that he was busy.",
      correct: "He told me that he was busy.",
      explanation: "Nói 'say something TO me' hoặc 'tell me', chứ không nói 'said me'.",
    },
    quiz: {
      question: "Did she _____ you what happened yesterday?",
      options: ["A. say", "B. tell"],
      answer: "B",
      answerWord: "tell",
      explanation: "Vì có 'you' là người nhận thông tin ngay phía sau động từ, nên phải dùng tell!",
    },
    narrationScripts: {
      hook: {
        spoken: "Say hay Tell? Rất nhiều bạn học tiếng Anh đang dùng sai hai từ này mỗi ngày. Cùng phân biệt ngay trong 30 giây nhé!",
        caption: "Say vs Tell: Đừng nhầm lẫn nữa!",
      },
      wordA: {
        spoken: "Say phát âm là /seɪ/. Từ này tập trung vào nội dung lời nói, và không cần chỉ định người nghe ngay phía sau. Ví dụ: He said that he was tired.",
        caption: "Say = Tập trung vào lời nói",
      },
      wordB: {
        spoken: "Còn Tell phát âm là /tɛl/. Từ này bắt buộc phải có một người nhận thông tin ngay phía sau theo cấu trúc tell someone something. Ví dụ: Can you tell me the time?",
        caption: "Tell = Phải có người nhận thông tin",
      },
      comparison: {
        spoken: "Quy tắc cực kỳ dễ nhớ: Bạn Say nội dung, nhưng Tell một ai đó. Nhớ nhé: Say that, tell me!",
        caption: "Quy tắc: Say nội dung • Tell ai đó",
      },
      mistake: {
        spoken: "Đừng bao giờ nói: He said me that he was busy! Sai ngữ pháp nhé! Hãy nói là: He told me that he was busy.",
        caption: "Lỗi phổ biến: Đừng nói 'said me'!",
      },
      quiz: {
        spoken: "Thử tài nhanh: Did she blank you what happened yesterday? Chọn A: say hay B: tell? Đáp án là B: tell, vì có you là người nghe ngay phía sau!",
        caption: "Thử tài: Điền Say hay Tell?",
      },
      cta: {
        spoken: "Lưu lại video này và follow kênh để nâng trình tiếng Anh mỗi ngày bạn nhé!",
        caption: "Follow kênh để học tiếng Anh mỗi ngày!",
      },
    },
  },
};
