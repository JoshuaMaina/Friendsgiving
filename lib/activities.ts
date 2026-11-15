// What the host can put up as "happening now". Phones show it at the top, live.
export const ACTIVITIES: Record<string, { label: string; emoji: string; blurb: string }> = {
  arrivals: { label: "Arrivals", emoji: "🍷", blurb: "Grab a mulled wine, find your team and say hi." },
  food: { label: "Food time", emoji: "🍗", blurb: "Food’s ready. Come and get it!" },
  spellingbee: { label: "Spelling bee", emoji: "🐝", blurb: "Sit with your team. The Great Festive Spelling Bee is starting." },
  impostor: { label: "Impostor", emoji: "🕵🏾", blurb: "Check your card below. Don’t let anyone see your screen!" },
  mafia: { label: "Mafia", emoji: "🔪", blurb: "Check your secret role below, then hide your screen." },
  shirtswap: { label: "Ugly T-shirt swap", emoji: "👕", blurb: "See whose shirt you’re getting below. Find them and swap!" },
  vote: { label: "Ugliest shirt vote", emoji: "🗳️", blurb: "Vote for the ugliest T-shirt below." },
  secretsanta: { label: "Secret Santa", emoji: "🎁", blurb: "See whose gift you’re getting below." },
  bash: { label: "It’s a bash", emoji: "🪩", blurb: "Games are done. Music up, enjoy the night!" },
};

export const activity = (id: string) => ACTIVITIES[id] ?? ACTIVITIES.arrivals;
