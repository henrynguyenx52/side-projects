import React from "react";
import { QuizDetail } from "../types";
import { QuizCard } from "../components/contrast/QuizCard";

interface QuizSceneProps {
  quiz: QuizDetail;
  durationInFrames: number;
}

export const QuizScene: React.FC<QuizSceneProps> = ({
  quiz,
  durationInFrames,
}) => {
  // Trigger reveal right around frame 183 (~6.1s) when narrator says "Đáp án là TELL!"
  const revealFrame = 183;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 48px",
        boxSizing: "border-box",
      }}
    >
      <QuizCard quiz={quiz} revealFrameOffset={revealFrame} />
    </div>
  );
};
