# 🎬 Reusable English Vocabulary Contrast Video Generator

An automated, data-driven video production system built with **Remotion**, **React 19**, **TypeScript**, and **macOS TTS / ZeroTTS**. 

Generate high-retention, mobile-first (9:16 vertical) educational videos comparing confusing English word pairs (e.g., *Borrow vs. Lend*, *Say vs. Tell*) with synchronized voiceovers, kinetic captions, directional motion graphics, and interactive quiz reveals.

---

## 🌟 Key Capabilities

- **Zero-Hardcoding Architecture**: Complete separation of pedagogical content, visual design, audio synthesis, and video rendering.
- **Dynamic Timing Synchronization**: Never guess word counts or scene durations. The pipeline synthesizes voiceovers per scene, measures audio durations with `ffprobe`, and computes exact scene frame budgets dynamically.
- **Animated Subtitles & Keyword Highlights**: Captions automatically highlight target contrast words with spring bounce animations and glowing accents.
- **Interactive Educational Structure**:
  1. **Hook**: High-energy warning badge & versus card.
  2. **Word A**: Pronunciation, Vietnamese meaning, directional motion graphic, definition, and natural context example.
  3. **Word B**: Contrasting color palette and directional indicator.
  4. **Side-by-Side Comparison**: Dual cards showing directional arrows (IN vs. OUT) and memory trick.
  5. **Common Mistake**: Red cross-out ❌ vs. green replacement ✅ with grammar explanation.
  6. **Interactive Quiz**: Real-time suspense question with dynamic countdown and answer reveal.
  7. **Call to Action**: Mastery recap card + animated follow/like/save prompts.
- **Batch Production Ready**: Run a single command to generate multiple contrast videos back-to-back.

---

## 📐 Project Architecture

```
remotion/vocabulary-card/
├── src/
│   ├── types.ts                          # Unified TypeScript data models & schemas
│   ├── Root.tsx                          # Remotion composition registry (9:16, 16:9, 1:1)
│   ├── config/
│   │   ├── design-system.ts              # Palettes, glassmorphism, spring curves
│   │   └── video-config.ts               # Resolution presets, FPS, defaults
│   ├── components/contrast/
│   │   ├── AnimatedArrow.tsx             # Directional indicator (IN vs OUT)
│   │   ├── VocabularyTitle.tsx           # Kinetic title, phonetics, Vietnamese tag
│   │   ├── DefinitionCard.tsx            # Glassmorphism definition & collocations
│   │   ├── ExampleSentence.tsx           # Sentence with highlighted target word
│   │   ├── ComparisonLayout.tsx          # Dual side-by-side cards & memory hack
│   │   ├── QuizCard.tsx                  # Interactive question & answer reveal
│   │   └── SubtitleBar.tsx               # Kinetic subtitle pill
│   ├── scenes/
│   │   ├── HookScene.tsx                 # Scene 1: Hook
│   │   ├── WordScene.tsx                 # Scenes 2 & 3: Word A & Word B
│   │   ├── ComparisonScene.tsx           # Scene 4: Side-by-side comparison
│   │   ├── MistakeScene.tsx              # Scene 5: Common mistake (optional)
│   │   ├── QuizScene.tsx                 # Scene 6: Quick quiz (optional)
│   │   └── CTAScene.tsx                  # Scene 7: Call to action
│   ├── compositions/
│   │   └── VocabularyComparison/         # Master composition
│   ├── services/
│   │   ├── content-generator/            # Contrast database & content generator
│   │   ├── tts/                          # TTS synthesis & exact duration calculation
│   │   └── subtitle-generator/           # Subtitle timing & keyword detection
│   └── data/
│       ├── default-comparison.ts         # Default props for Remotion Studio
│       └── generated/                    # Persisted contrast JSON models
├── scripts/
│   └── pipeline.ts                       # Automated production pipeline CLI
├── examples/
│   └── batch-input.json                  # Sample batch generation configuration
└── out/
    ├── borrow-lend.mp4                   # Sample rendered video 1 (41.2s)
    ├── say-tell.mp4                      # Sample rendered video 2 (43.7s)
    └── stills/                           # Verified still frames for all scenes
```

---

## 🚀 Quick Start & CLI Usage

### 1. Generate a Single Video

Run the production pipeline for any pair:

```bash
# Generate Borrow vs Lend
npm run generate -- --wordA Borrow --wordB Lend

# Generate Say vs Tell
npm run generate -- --wordA Say --wordB Tell

# Customize voice or aspect ratio
npm run generate -- --wordA Borrow --wordB Lend --voice Samantha --aspectRatio 9:16
```

### 2. Batch Generation

Provide a JSON file with multiple word pairs:

```json
[
  { "wordA": "Borrow", "wordB": "Lend", "voice": "Samantha" },
  { "wordA": "Say", "wordB": "Tell", "voice": "Samantha" }
]
```

Run batch generation:

```bash
npm run generate:batch -- --batch examples/batch-input.json
```

### 3. Preview in Remotion Studio

Launch interactive preview with live hot-reloading:

```bash
npm run dev
```
Navigate to `http://localhost:3000` and select the **VocabularyContrast** composition.

---

## 🛠️ How to Add New Vocabulary Contrast Pairs

### Method A: Add Curated Presets (Recommended for Best Quality)

Open `src/services/content-generator/vocabulary-database.ts` and add a new entry to `CONTRAST_PRESETS`:

```typescript
"bring-take": {
  wordA: {
    word: "Bring",
    pronunciation: "/brɪŋ/",
    partOfSpeech: "verb",
    definition: "To carry or take someone or something with you to the place where you are.",
    vietnameseMeaning: "Mang lại / Đem đến (về phía người nói)",
    direction: "incoming",
    directionLabel: "Toward Speaker (HERE)",
    examples: ["Bring your notebook when you come over."],
    explanation: "Bring implies motion TOWARD the speaker or current location.",
    colorAccent: "#38BDF8",
  },
  wordB: {
    word: "Take",
    pronunciation: "/teɪk/",
    partOfSpeech: "verb",
    definition: "To carry someone or something from one place to another place.",
    vietnameseMeaning: "Cầm đi / Mang đi (rời xa người nói)",
    direction: "outgoing",
    directionLabel: "Away from Speaker (THERE)",
    examples: ["Take an umbrella with you when you leave."],
    explanation: "Take implies motion AWAY from the speaker or current location.",
    colorAccent: "#34D399",
  },
  comparison: {
    headline: "The Perspective Rule",
    summary: "Bring is coming HERE. Take is going THERE.",
    ruleA: "Bring = Come with something (Toward)",
    ruleB: "Take = Go with something (Away)",
    memoryTrick: "Bring it HERE. Take it THERE!",
  },
  commonMistake: {
    incorrect: "Don't forget to take your homework to my house.",
    correct: "Don't forget to bring your homework to my house.",
    explanation: "Since 'my house' is where the speaker is waiting, use 'bring'.",
  },
  quiz: {
    question: "Can you _____ me a glass of water from the kitchen?",
    options: ["A. bring", "B. take"],
    answer: "A",
    answerWord: "bring",
    explanation: "The water is moving toward the speaker, so use bring!",
  },
  narrationScripts: {
    // Spoken scripts per scene
  }
}
```

### Method B: Ad-Hoc Generation

You can pass any arbitrary two words to `npm run generate -- --wordA Hear --wordB Listen`. The built-in generator will automatically scaffold definitions, directional cues, quiz questions, and narration scripts.

---

## 📊 Sample Rendered Outputs

Both sample videos were rendered, synchronized with voiceovers, and verified across all scenes:

| Video | Resolution | Frames | Duration | File Size | Output Path |
|---|---|---|---|---|---|
| **Borrow vs. Lend** | 1080x1920 (9:16) | 1,235 | 41.17s | 4.8 MB | `out/borrow-lend.mp4` |
| **Say vs. Tell** | 1080x1920 (9:16) | 1,312 | 43.73s | 5.1 MB | `out/say-tell.mp4` |

Verified still captures for each scene are stored in:
- `out/stills/borrow-lend/` (`scene-hook.png`, `scene-wordA.png`, `scene-wordB.png`, `scene-comparison.png`, `scene-mistake.png`, `scene-quiz.png`, `scene-cta.png`)
- `out/stills/say-tell/` (`scene-hook.png`, `scene-wordA.png`, `scene-wordB.png`, `scene-comparison.png`, `scene-mistake.png`, `scene-quiz.png`, `scene-cta.png`)

