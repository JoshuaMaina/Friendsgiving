// Team names match the spelling bee deck.
export const TEAMS = [
  { id: "tinsel", name: "Team Tinsel", emoji: "✨", color: "#E2B33C", ink: "#13261F" },
  { id: "mistletoe", name: "Team Mistletoe", emoji: "🌿", color: "#2E7D4F", ink: "#F8F3E6" },
  { id: "eggnog", name: "Team Eggnog", emoji: "🥛", color: "#F3E3B5", ink: "#13261F" },
  { id: "sprouts", name: "Team Sprouts", emoji: "🥬", color: "#8DB33A", ink: "#13261F" },
  { id: "mincepies", name: "Team Mince Pies", emoji: "🥧", color: "#B8322A", ink: "#F8F3E6" },
  { id: "snowflakes", name: "Team Snowflakes", emoji: "❄️", color: "#7FB8E0", ink: "#13261F" },
] as const;

export type TeamId = (typeof TEAMS)[number]["id"];

export const teamById = (id: string) => TEAMS.find((t) => t.id === id) ?? TEAMS[0];
