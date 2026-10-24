export type Slot = {
  id: string;
  number: number;
  answer: string;
};

export type Choice = { key: string; text: string };

type GroupBase = {
  id: string;
  instruction: string;
  emphasis?: string;
  tail?: string;
};

export type Group =
  | (GroupBase & {
      kind: "table";
      title: string;
      columns: string[];
      rows: { cells: (string | (string | { slot: string })[])[] }[];
      slots: Slot[];
    })
  | (GroupBase & {
      kind: "choice";
      variant: "tfn" | "ynn";
      items: { slot: Slot; prompt: string }[];
    })
  | (GroupBase & {
      kind: "matching";
      letters: string[];
      items: { slot: Slot; text: string }[];
    })
  | (GroupBase & {
      kind: "multi";
      prompt: string;
      choose: number;
      options: Choice[];
      slots: Slot[];
    })
  | (GroupBase & {
      kind: "notes";
      heading: string;
      hints?: Choice[];
      parts: (string | { slot: string })[];
      slots: Slot[];
    })
  | (GroupBase & {
      kind: "single";
      items: { slot: Slot; prompt: string; options: Choice[] }[];
    });

export type Section = {
  id: string;
  name: string;
  short: string;
  passageTitle: string;
  paragraphs: { letter: string; text: string }[];
  groups: Group[];
};

export const EXAM_TITLE = "Street climate, night markets, and a library robot";
export const EXAM_MINUTES = 60;

const slot = (number: number, answer: string): Slot => ({
  id: `q${number}`,
  number,
  answer,
});

export const sections: Section[] = [
  {
    id: "p1",
    name: "Passage 1",
    short: "P1",
    passageTitle: "How a town cooled its square",
    paragraphs: [
      {
        letter: "A",
        text: "The market square in Greyhaven used to hold the afternoon heat. In 2019 the council replaced the dark stone with pale concrete, planted two rows of plane trees, and opened a thin channel of water along the west edge.",
      },
      {
        letter: "B",
        text: "Researchers measured the square on three July afternoons. Under the trees the air was about four degrees cooler than on the open stone. The channel itself changed the air temperature very little, but people standing beside it said they felt cooler because of the breeze off the water.",
      },
      {
        letter: "C",
        text: "Pale paving mattered most at noon, when the sun was overhead and the trees cast almost no shade. After four o'clock the shade from the trees covered most of the benches, and the colour of the stone made a smaller difference.",
      },
      {
        letter: "D",
        text: "Not every change helped. A glass cafe awning on the south side reflected light onto a bus stop, and the stop became hotter than before. The council removed the awning the following spring.",
      },
      {
        letter: "E",
        text: "The project did not measure how shopkeepers felt about the trees blocking their signs. A later survey of visitors found that most of them came to the square more often in summer than they had five years earlier.",
      },
    ],
    groups: [
      {
        id: "p1-table",
        kind: "table",
        instruction: "Complete the table below. Choose ",
        emphasis: "ONE WORD ONLY",
        tail: " from the passage for each answer.",
        title: "Cooling the market square",
        columns: ["Subject", "Findings", "Comment"],
        rows: [
          {
            cells: [
              "Trees",
              ["The air underneath was ", { slot: "q1" }, " than on the open stone."],
              "Shade covered most benches after four o'clock.",
            ],
          },
          {
            cells: [
              "Pale paving",
              "Biggest effect when the sun was overhead.",
              ["That time of day is ", { slot: "q2" }, "."],
            ],
          },
          {
            cells: [
              "Water channel",
              "Little change to the air temperature.",
              ["People felt cooler because of a ", { slot: "q3" }, "."],
            ],
          },
          {
            cells: [
              "Glass awning",
              ["The bus stop became ", { slot: "q4" }, " than before."],
              ["Removed the following ", { slot: "q5" }, "."],
            ],
          },
        ],
        slots: [
          slot(1, "cooler"),
          slot(2, "noon"),
          slot(3, "breeze"),
          slot(4, "hotter"),
          slot(5, "spring"),
        ],
      },
      {
        id: "p1-tfn",
        kind: "choice",
        variant: "tfn",
        instruction: "Do the following statements agree with the information in the passage? Choose ",
        emphasis: "TRUE, FALSE or NOT GIVEN",
        tail: ".",
        items: [
          {
            slot: slot(6, "false"),
            prompt: "The water channel lowered the air temperature by several degrees.",
          },
          {
            slot: slot(7, "true"),
            prompt: "Tree shade covered most of the benches late in the afternoon.",
          },
          {
            slot: slot(8, "true"),
            prompt: "The pale stone made its greatest difference at midday.",
          },
          {
            slot: slot(9, "false"),
            prompt: "The glass awning was left in place for three years.",
          },
          {
            slot: slot(10, "false"),
            prompt: "Shopkeepers were asked whether the trees hid their signs.",
          },
          {
            slot: slot(11, "true"),
            prompt: "After the changes, more visitors used the square in summer.",
          },
          {
            slot: slot(12, "not given"),
            prompt: "The council planted oak trees along the east edge.",
          },
          {
            slot: slot(13, "not given"),
            prompt: "Greyhaven is the largest town in its region.",
          },
        ],
      },
    ],
  },
  {
    id: "p2",
    name: "Passage 2",
    short: "P2",
    passageTitle: "The night market at Lantern Quay",
    paragraphs: [
      {
        letter: "A",
        text: "Lantern Quay has held a night market since 1978. It began as six fish stalls on a wooden pier.",
      },
      {
        letter: "B",
        text: "By the 1990s the pier could not carry the crowds, so the market moved onto a brick street behind the harbour office. Traders paid a weekly fee for a marked pitch.",
      },
      {
        letter: "C",
        text: "A fire in 2004 destroyed the canvas roofs. The town rebuilt them in metal and added hydrants at each corner.",
      },
      {
        letter: "D",
        text: "Cooks from inland villages arrived after a new bus route opened in 2011. They sold noodles and grilled corn, which the harbour families had not offered.",
      },
      {
        letter: "E",
        text: "The harbour master still rings a bell at 11 p.m. to close the stalls. A few noodle cooks have asked for a later close, and the council has not agreed.",
      },
      {
        letter: "F",
        text: "Waste was the market's worst problem in the last decade. In 2018 the council gave every stall a locked bin and fined traders who left oil in the gutter.",
      },
      {
        letter: "G",
        text: "Visitor counts are published each January. The market passed one million visits in 2022, the first year it did so.",
      },
    ],
    groups: [
      {
        id: "p2-match",
        kind: "matching",
        instruction: "Which paragraph contains the following information?",
        letters: ["A", "B", "C", "D", "E", "F", "G"],
        items: [
          { slot: slot(14, "G"), text: "the year the market first drew a million visits" },
          { slot: slot(15, "B"), text: "a reason the market left the pier" },
          { slot: slot(16, "D"), text: "food that harbour families had not sold before" },
          { slot: slot(17, "E"), text: "a request the council turned down" },
          { slot: slot(18, "C"), text: "how the roofs were replaced after a fire" },
          { slot: slot(19, "F"), text: "a penalty for traders who polluted the street" },
        ],
      },
      {
        id: "p2-multi",
        kind: "multi",
        instruction: "Choose ",
        emphasis: "TWO",
        tail: " letters, A–E.",
        prompt: "Which TWO changes happened after 2010?",
        choose: 2,
        options: [
          { key: "A", text: "The market left the wooden pier." },
          { key: "B", text: "Inland cooks began selling noodles." },
          { key: "C", text: "Canvas roofs were destroyed by fire." },
          { key: "D", text: "Locked bins were given to every stall." },
          { key: "E", text: "A closing bell was rung for the first time." },
        ],
        slots: [slot(20, "B"), slot(21, "D")],
      },
      {
        id: "p2-notes",
        kind: "notes",
        instruction: "Complete the notes. Choose ",
        emphasis: "ONE WORD ONLY",
        tail: " from the passage for each answer.",
        heading: "Lantern Quay night market",
        parts: [
          "The market started in 1978 as fish stalls on a wooden ",
          { slot: "q22" },
          ". After a fire, the roofs were rebuilt in ",
          { slot: "q23" },
          ". A bus route in 2011 brought cooks who sold ",
          { slot: "q24" },
          " and grilled corn. Stalls close when a ",
          { slot: "q25" },
          " is rung at 11 p.m. Traders who leave oil in the gutter may be ",
          { slot: "q26" },
          ".",
        ],
        slots: [
          slot(22, "pier"),
          slot(23, "metal"),
          slot(24, "noodles"),
          slot(25, "bell"),
          slot(26, "fined"),
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "Passage 3",
    short: "P3",
    passageTitle: "The shelf robot at North Ferry library",
    paragraphs: [
      {
        letter: "A",
        text: "The public library in North Ferry bought a shelf robot, Moth, in 2023. It rolls between the stacks after closing time and checks that books are in the right order. Staff hoped it would finish a job that used to take two assistants a whole morning.",
      },
      {
        letter: "B",
        text: "Moth does not speak to visitors. During the day it stays in a cupboard. The library was clear that the robot would not replace the people who help children find stories. That caution seems right: a library is one of the few public rooms where people expect not to be watched.",
      },
      {
        letter: "C",
        text: "In a six-month trial, Moth found misplaced books faster than the morning team, but it missed thin pamphlets that had slipped behind a shelf. Those still needed a person with a torch.",
      },
      {
        letter: "D",
        text: "The company that built Moth offered a night-time mode that would move among readers. North Ferry refused it. The head librarian said a machine passing people's chairs would feel like surveillance, even if it only looked at spines.",
      },
      {
        letter: "E",
        text: "Power has been a smaller issue than expected. Moth charges from an ordinary wall socket and uses about as much electricity as a desktop computer left on overnight. The library did not have to rewire the building.",
      },
      {
        letter: "F",
        text: "Some readers worried the robot would record their faces. The library published a one-page note: the camera looks only at shelf labels, and the pictures are deleted each morning. Nobody has shown that this promise was broken.",
      },
      {
        letter: "G",
        text: "The trial did not prove that Moth saves money. The purchase was paid for by a grant, and the library has not yet compared wages with the cost of repairs. Until that sum is done, any claim of savings is guesswork.",
      },
    ],
    groups: [
      {
        id: "p3-single-a",
        kind: "single",
        instruction: "Choose the correct letter, ",
        emphasis: "A, B, C or D",
        tail: ".",
        items: [
          {
            slot: slot(27, "B"),
            prompt: "What is the writer doing in the first paragraph?",
            options: [
              { key: "A", text: "Comparing Moth with robots in other libraries." },
              { key: "B", text: "Explaining why the library bought a shelf robot." },
              { key: "C", text: "Arguing that assistants should lose their jobs." },
              { key: "D", text: "Describing a robot that talks to children." },
            ],
          },
          {
            slot: slot(28, "C"),
            prompt: "North Ferry refused the night-time mode because",
            options: [
              { key: "A", text: "the robot used too much electricity." },
              { key: "B", text: "staff could not find space in the cupboard." },
              { key: "C", text: "a machine moving among readers would feel intrusive." },
              { key: "D", text: "pamphlets were still being missed." },
            ],
          },
          {
            slot: slot(29, "C"),
            prompt: "The library's note about the camera says that the pictures",
            options: [
              { key: "A", text: "are stored for a year." },
              { key: "B", text: "are sent to the company each week." },
              { key: "C", text: "are deleted every morning." },
              { key: "D", text: "include visitors' faces on purpose." },
            ],
          },
        ],
      },
      {
        id: "p3-hints",
        kind: "notes",
        instruction: "Complete the summary using the list of words, ",
        emphasis: "A–I",
        tail: ", below.",
        heading: "Moth at work",
        hints: [
          { key: "A", text: "closed" },
          { key: "B", text: "labels" },
          { key: "C", text: "morning" },
          { key: "D", text: "order" },
          { key: "E", text: "pamphlets" },
          { key: "F", text: "readers" },
          { key: "G", text: "salaries" },
          { key: "H", text: "sockets" },
          { key: "I", text: "visitors" },
        ],
        parts: [
          "Moth works after the library has ",
          { slot: "q30" },
          ". It is quicker than staff at finding books in the wrong ",
          { slot: "q31" },
          ", but a person is still needed when thin ",
          { slot: "q32" },
          " fall behind a shelf. North Ferry would not let the robot move among ",
          { slot: "q33" },
          " at night. Its camera is aimed at shelf ",
          { slot: "q34" },
          ", and the pictures are deleted each ",
          { slot: "q35" },
          ".",
        ],
        slots: [
          slot(30, "A"),
          slot(31, "D"),
          slot(32, "E"),
          slot(33, "F"),
          slot(34, "B"),
          slot(35, "C"),
        ],
      },
      {
        id: "p3-ynn",
        kind: "choice",
        variant: "ynn",
        instruction: "Do the following statements agree with the views of the writer? Choose ",
        emphasis: "YES, NO or NOT GIVEN",
        tail: ".",
        items: [
          {
            slot: slot(36, "yes"),
            prompt: "Keeping the robot out of sight during opening hours is the right decision.",
          },
          {
            slot: slot(37, "no"),
            prompt: "The trial has already shown that Moth reduces the library's costs.",
          },
          {
            slot: slot(38, "not given"),
            prompt: "Every public library ought to buy a similar robot.",
          },
          {
            slot: slot(39, "not given"),
            prompt: "Deleting the pictures each morning fully settles the privacy worry.",
          },
        ],
      },
      {
        id: "p3-single-b",
        kind: "single",
        instruction: "Choose the correct letter, ",
        emphasis: "A, B, C or D",
        tail: ".",
        items: [
          {
            slot: slot(40, "B"),
            prompt: "Which idea would the writer agree with?",
            options: [
              { key: "A", text: "Rewiring the building was the hardest part of the project." },
              { key: "B", text: "Because a grant paid for Moth, the question of savings is still open." },
              { key: "C", text: "Pamphlets behind the shelves are no longer a problem." },
              { key: "D", text: "The robot should greet children when they arrive." },
            ],
          },
        ],
      },
    ],
  },
];

export function groupSlots(group: Group): Slot[] {
  switch (group.kind) {
    case "table":
    case "notes":
    case "multi":
      return group.slots;
    case "choice":
    case "matching":
    case "single":
      return group.items.map((item) => item.slot);
  }
}

export function sectionSlots(section: Section): Slot[] {
  return section.groups.flatMap(groupSlots);
}

export function allSlots(): Slot[] {
  return sections.flatMap(sectionSlots);
}

export function groupRange(group: Group): string {
  const numbers = groupSlots(group).map((item) => item.number);
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  return first === last ? String(first) : `${first}–${last}`;
}

export function findSlot(id: string): Slot | undefined {
  return allSlots().find((item) => item.id === id);
}

const CHOICE_LABELS = {
  tfn: [
    { key: "true", text: "True" },
    { key: "false", text: "False" },
    { key: "not given", text: "Not given" },
  ],
  ynn: [
    { key: "yes", text: "Yes" },
    { key: "no", text: "No" },
    { key: "not given", text: "Not given" },
  ],
} as const;

export function choiceOptions(variant: "tfn" | "ynn") {
  return CHOICE_LABELS[variant];
}

export function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slotCorrect(slot: Slot, value: string | undefined): boolean {
  if (!value) return false;
  return normalise(value) === normalise(slot.answer);
}
