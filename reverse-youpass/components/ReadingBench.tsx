"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXAM_MINUTES,
  EXAM_TITLE,
  type Group,
  type Section,
  type Slot,
  allSlots,
  choiceOptions,
  findSlot,
  groupRange,
  groupSlots,
  normalise,
  sectionSlots,
  sections,
  slotCorrect,
} from "@/lib/exam";

type Answers = Record<string, string>;

const STORAGE_KEY = "reading-practice-session";

export function ReadingBench() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);
  const [dark, setDark] = useState(false);
  const [fontStep, setFontStep] = useState(0);
  const [split, setSplit] = useState(50);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [seconds, setSeconds] = useState(EXAM_MINUTES * 60);
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          sectionIndex: number;
          groupIndex: number;
          answers: Answers;
          seconds: number;
          dark: boolean;
          fontStep: number;
        };
        setSectionIndex(parsed.sectionIndex ?? 0);
        setGroupIndex(parsed.groupIndex ?? 0);
        setAnswers(parsed.answers ?? {});
        setSeconds(parsed.seconds ?? EXAM_MINUTES * 60);
        setDark(Boolean(parsed.dark));
        setFontStep(parsed.fontStep ?? 0);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sectionIndex, groupIndex, answers, seconds, dark, fontStep }),
    );
  }, [ready, sectionIndex, groupIndex, answers, seconds, dark, fontStep]);

  useEffect(() => {
    if (!ready || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [ready, seconds]);

  const section = sections[sectionIndex];
  const group = section.groups[groupIndex];
  const slots = useMemo(() => allSlots(), []);
  const done = slots.filter((item) => answers[item.id]?.trim()).length;
  const score = slots.filter((item) => slotCorrect(item, answers[item.id])).length;

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setFocusId(id);
  }

  function openSlot(id: string) {
    sections.forEach((candidate, nextSection) => {
      candidate.groups.forEach((candidateGroup, nextGroup) => {
        if (groupSlots(candidateGroup).some((item) => item.id === id)) {
          setSectionIndex(nextSection);
          setGroupIndex(nextGroup);
          setFocusId(id);
        }
      });
    });
  }

  function goNext() {
    if (groupIndex < section.groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      return;
    }
    if (sectionIndex < sections.length - 1) {
      setSectionIndex(sectionIndex + 1);
      setGroupIndex(0);
    }
  }

  function resetExam() {
    if (!window.confirm("Leave this attempt and clear the answers on this device?")) return;
    setAnswers({});
    setChecked(false);
    setSectionIndex(0);
    setGroupIndex(0);
    setSeconds(EXAM_MINUTES * 60);
    setFocusId(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    const vertical = window.innerWidth <= 900;
    const ratio = vertical
      ? (event.clientY - bounds.top) / bounds.height
      : (event.clientX - bounds.left) / bounds.width;
    setSplit(Math.min(68, Math.max(32, ratio * 100)));
  }

  function toggleMulti(target: Group & { kind: "multi" }, key: string) {
    const selected = target.slots.map((item) => answers[item.id]).filter(Boolean);
    if (selected.includes(key)) {
      const owner = target.slots.find((item) => answers[item.id] === key);
      if (owner) setAnswer(owner.id, "");
      return;
    }
    if (selected.length >= target.choose) return;
    const empty = target.slots.find((item) => !answers[item.id]);
    if (empty) setAnswer(empty.id, key);
  }

  const nextLabel = nextButtonLabel(section, sectionIndex, groupIndex);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remain = String(seconds % 60).padStart(2, "0");
  const sectionDone = sectionSlots(section).filter((item) => answers[item.id]?.trim()).length;

  return (
    <div className="shell" style={{ fontSize: `${16 + fontStep * 2}px` }}>
      {seconds === 0 && <div className="banner">Time is up. You can still review what you wrote.</div>}
      <header className="header">
        <div className="brand">
          <button className="icon-btn" aria-label="Reset attempt" onClick={resetExam}>
            ×
          </button>
          <div className="titles">
            <strong>{EXAM_TITLE}</strong>
            <span>Working on {section.name.toLowerCase()}</span>
          </div>
        </div>
        <div className={`timer${seconds < 300 ? " low" : ""}`} aria-live="polite">
          <Clock />
          {minutes}:{remain}
        </div>
        <div className="tools">
          <button className={`check-btn${checked ? " checked" : ""}`} onClick={() => setChecked((value) => !value)}>
            {checked ? `${score}/${slots.length}` : "Check"}
          </button>
          <button className="icon-btn" aria-label="Font size" onClick={() => setFontStep((value) => (value + 1) % 3)}>
            Aa
          </button>
          <button className="icon-btn" aria-label="Report a problem" onClick={() => setReportOpen(true)}>
            <Flag />
          </button>
          <button className="icon-btn" aria-label="Dark mode" aria-pressed={dark} onClick={() => setDark((value) => !value)}>
            <Moon />
          </button>
        </div>
      </header>

      <div className="workspace">
        <article className="pane passage" style={{ flexBasis: `${split}%` }}>
          <h1>{section.passageTitle}</h1>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.letter}>
              {group.kind === "matching" && <span className="letter">{paragraph.letter}</span>}
              {paragraph.text}
            </p>
          ))}
        </article>
        <div
          className="seam"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = false)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize"
          aria-valuenow={Math.round(split)}
        >
          <span>Drag</span>
        </div>
        <section className="pane questions" style={{ flexBasis: `${100 - split}%` }} aria-label={groupRange(group)}>
          <div className="badge">Question {groupRange(group)}</div>
          <p className="instruction">
            {group.instruction}
            {group.emphasis && <em>{group.emphasis}</em>}
            {group.tail}
          </p>
          <GroupView
            group={group}
            answers={answers}
            checked={checked}
            focusId={focusId}
            onAnswer={setAnswer}
            onFocus={setFocusId}
            onToggleMulti={toggleMulti}
          />
          {checked && (
            <div className="score">
              {score} of {slots.length} correct · {done} answered
            </div>
          )}
        </section>
      </div>

      <footer className="bottom">
        <div className="progress">
          <div className="grid-icon" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <div>
            <strong>{section.name}</strong>
            <span>
              Answered {sectionDone} / {sectionSlots(section).length}
            </span>
          </div>
        </div>
        <div className="strip">
          <button className="passage-pill current" onClick={() => setGroupIndex(0)}>
            {section.name}
          </button>
          {section.groups.map((candidate, index) => (
            <div className={`nums${index === groupIndex ? " active" : ""}`} key={candidate.id}>
              {groupSlots(candidate).map((item) => (
                <button
                  key={item.id}
                  className={numberClass(item, answers, checked, focusId)}
                  onClick={() => {
                    setGroupIndex(index);
                    setFocusId(item.id);
                  }}
                >
                  {item.number}
                </button>
              ))}
            </div>
          ))}
          {sections.map((candidate, index) =>
            index === sectionIndex ? null : (
              <button
                key={candidate.id}
                className="passage-pill"
                onClick={() => {
                  setSectionIndex(index);
                  setGroupIndex(0);
                }}
              >
                {candidate.short} · {countDone(candidate, answers)}/{sectionSlots(candidate).length}
              </button>
            ),
          )}
        </div>
        <button className="next-btn" onClick={goNext} disabled={!nextLabel}>
          {nextLabel ?? "End"}
        </button>
      </footer>

      {reportOpen && (
        <div className="modal-back" role="presentation" onClick={() => setReportOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="report-title">Report a problem</h2>
            <p>This note stays in this browser. It is not sent anywhere.</p>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What looks wrong?" />
            <div className="modal-actions">
              <button className="text-btn" onClick={() => setReportOpen(false)}>
                Close
              </button>
              <button
                className="text-btn solid"
                onClick={() => {
                  localStorage.setItem("reading-practice-note", note);
                  setNoteSaved(true);
                  setReportOpen(false);
                }}
              >
                {noteSaved ? "Saved" : "Save note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupView({
  group,
  answers,
  checked,
  focusId,
  onAnswer,
  onFocus,
  onToggleMulti,
}: {
  group: Group;
  answers: Answers;
  checked: boolean;
  focusId: string | null;
  onAnswer: (id: string, value: string) => void;
  onFocus: (id: string) => void;
  onToggleMulti: (group: Group & { kind: "multi" }, key: string) => void;
}) {
  if (group.kind === "table") {
    return (
      <>
        <h2 className="group-title">{group.title}</h2>
        <table>
          <thead>
            <tr>
              {group.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, index) => (
              <tr key={index}>
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    <CellParts cell={cell} answers={answers} checked={checked} focusId={focusId} onAnswer={onAnswer} onFocus={onFocus} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (group.kind === "choice") {
    const options = choiceOptions(group.variant);
    return (
      <div>
        {group.items.map((item) => (
          <div className="choice" key={item.slot.id}>
            <span className="q-num">{item.slot.number}</span>
            <div>
              <p className="prompt">{item.prompt}</p>
              <div className="choice-options" role="group" aria-label={`Question ${item.slot.number}`}>
                {options.map((option) => {
                  const selected = normalise(answers[item.slot.id] ?? "") === option.key;
                  return (
                    <button
                      key={option.key}
                      className={markClass("seg", checked, selected, option.key === item.slot.answer)}
                      aria-pressed={selected}
                      onClick={() => onAnswer(item.slot.id, option.key)}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (group.kind === "matching") {
    return (
      <div>
        {group.items.map((item) => {
          const value = answers[item.slot.id] ?? "";
          const state = checked ? (slotCorrect(item.slot, value) ? "good" : value ? "bad" : "") : "";
          return (
            <div className="match-row" key={item.slot.id}>
              <span className="q-num">{item.slot.number}</span>
              <div>
                <p className="prompt">{item.text}</p>
                <label className={`match ${state}`}>
                  <span className="sr-only">Paragraph for question {item.slot.number}</span>
                  <select
                    value={value}
                    onFocus={() => onFocus(item.slot.id)}
                    onChange={(event) => onAnswer(item.slot.id, event.target.value)}
                  >
                    <option value="">Paragraph</option>
                    {group.letters.map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </select>
                  {state === "bad" && <span className="hint">Answer: {item.slot.answer}</span>}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (group.kind === "multi") {
    const selected = new Set(group.slots.map((item) => answers[item.id]).filter(Boolean));
    const correct = new Set(group.slots.map((item) => item.answer));
    return (
      <div>
        <p className="prompt">
          <strong>
            {group.slots[0].number}–{group.slots[group.slots.length - 1].number}
          </strong>{" "}
          {group.prompt}
        </p>
        <div className="options">
          {group.options.map((option) => {
            const on = selected.has(option.key);
            const right = correct.has(option.key);
            return (
              <button
                key={option.key}
                className={markClass("option", checked, on, right)}
                aria-pressed={on}
                onClick={() => onToggleMulti(group, option.key)}
              >
                <strong>{option.key}</strong>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (group.kind === "notes") {
    return (
      <div>
        <h2 className="group-title">{group.heading}</h2>
        <div className="notes">
          <CellParts cell={group.parts} answers={answers} checked={checked} focusId={focusId} onAnswer={onAnswer} onFocus={onFocus} hints={group.hints} />
        </div>
        {group.hints && (
          <div className="hint-box">
            {group.hints.map((hint) => (
              <div key={hint.key}>
                <strong>{hint.key}</strong> {hint.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {group.items.map((item) => (
        <div className="single" key={item.slot.id}>
          <span className="q-num">{item.slot.number}</span>
          <div>
            <p className="prompt">{item.prompt}</p>
            <div className="options" role="radiogroup" aria-label={`Question ${item.slot.number}`}>
              {item.options.map((option) => {
                const selected = answers[item.slot.id] === option.key;
                return (
                  <button
                    key={option.key}
                    className={markClass("option", checked, selected, option.key === item.slot.answer)}
                    aria-pressed={selected}
                    onClick={() => onAnswer(item.slot.id, option.key)}
                  >
                    <strong>{option.key}</strong>
                    <span>{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CellParts({
  cell,
  answers,
  checked,
  focusId,
  onAnswer,
  onFocus,
  hints,
}: {
  cell: string | (string | { slot: string })[];
  answers: Answers;
  checked: boolean;
  focusId: string | null;
  onAnswer: (id: string, value: string) => void;
  onFocus: (id: string) => void;
  hints?: { key: string; text: string }[];
}) {
  if (typeof cell === "string") return <>{cell}</>;
  return (
    <>
      {cell.map((part, index) => {
        if (typeof part === "string") return <span key={index}>{part}</span>;
        const item = findSlot(part.slot);
        if (!item) return null;
        const value = answers[item.id] ?? "";
        const state = checked ? (slotCorrect(item, value) ? "good" : value ? "bad" : "") : "";
        return (
          <span className={`blank ${state}`} key={item.id}>
            <span className="num">{item.number}</span>
            {hints ? (
              <select
                aria-label={`Question ${item.number}`}
                value={value}
                onFocus={() => onFocus(item.id)}
                onChange={(event) => onAnswer(item.id, event.target.value)}
              >
                <option value=""> </option>
                {hints.map((hint) => (
                  <option key={hint.key} value={hint.key}>
                    {hint.key}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Question ${item.number}`}
                value={value}
                autoComplete="off"
                onFocus={() => onFocus(item.id)}
                onChange={(event) => onAnswer(item.id, event.target.value)}
                style={{ width: `${Math.max(7, value.length + 2)}ch` }}
                data-current={focusId === item.id}
              />
            )}
            {state === "bad" && <span className="hint">{item.answer}</span>}
          </span>
        );
      })}
    </>
  );
}

function numberClass(item: Slot, answers: Answers, checked: boolean, focusId: string | null) {
  const value = answers[item.id];
  const classes = ["jump-num"];
  if (checked && value?.trim()) classes.push(slotCorrect(item, value) ? "good" : "bad");
  else if (value?.trim()) classes.push("filled");
  if (focusId === item.id) classes.push("current");
  return classes.join(" ");
}

function markClass(base: string, checked: boolean, selected: boolean, correct: boolean) {
  if (!checked) return `${base}${selected ? "" : ""}`;
  if (correct) return `${base} good`;
  if (selected) return `${base} bad`;
  return base;
}

function countDone(section: Section, answers: Answers) {
  return sectionSlots(section).filter((item) => answers[item.id]?.trim()).length;
}

function nextButtonLabel(section: Section, sectionIndex: number, groupIndex: number) {
  const nextGroup = section.groups[groupIndex + 1];
  if (nextGroup) return groupRange(nextGroup);
  const nextSection = sections[sectionIndex + 1];
  return nextSection ? nextSection.short : null;
}

function Clock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 3.5A8 8 0 1 0 20.5 14 6.5 6.5 0 0 1 15 3.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Flag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4v16M6 5h10l-1.5 3L16 11H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
