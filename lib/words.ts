// Word bank for Impostor. Everyone except the impostors sees the word;
// impostors only see the category (if the host allows it).
export const WORDS: Record<string, string[]> = {
  Christmas: [
    "Mistletoe", "Snowman", "Advent calendar", "Stocking", "Mince pie", "Christmas cracker",
    "Brussels sprouts", "Panto", "Boxing Day", "Reindeer", "Christmas jumper", "Mulled wine",
    "Tinsel", "Elf", "Chimney", "Carol singers", "Wrapping paper", "Christmas tree",
  ],
  Food: [
    "Jollof rice", "Sushi", "Pizza", "Suya", "Pancakes", "Curry", "Tacos", "Fish and chips",
    "Roast dinner", "Doughnut", "Ramen", "Burger", "Plantain", "Cheesecake", "Kebab",
  ],
  Places: [
    "Airport", "Hospital", "Gym", "Beach", "Cinema", "Nightclub", "Library", "Supermarket",
    "Wedding", "Dentist", "Zoo", "Theme park", "Church", "Barbershop", "Football stadium",
  ],
  Animals: [
    "Penguin", "Giraffe", "Octopus", "Kangaroo", "Hamster", "Shark", "Peacock", "Camel",
    "Sloth", "Flamingo", "Crocodile", "Owl",
  ],
  Activities: [
    "Karaoke", "Bowling", "Skiing", "Camping", "Go-karting", "Paint and sip", "Escape room",
    "Yoga", "Fishing", "Speed dating", "Job interview", "Moving house",
  ],
  Things: [
    "Umbrella", "Toothbrush", "Selfie stick", "Microwave", "Passport", "Air fryer",
    "Headphones", "Hot water bottle", "Remote control", "Lipstick", "Suitcase", "Candle",
  ],
};

export const CATEGORIES = Object.keys(WORDS);
