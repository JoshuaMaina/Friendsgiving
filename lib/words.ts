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

// Undercover mode, "similar word": the crowd gets one, impostors get the other
// (which side is which is picked at random each round).
export const PAIRS: [string, string][] = [
  ["Chimpanzee", "Gorilla"], ["Penguin", "Polar bear"], ["Shark", "Dolphin"], ["Owl", "Eagle"],
  ["Camel", "Horse"], ["Crocodile", "Lizard"], ["Hamster", "Guinea pig"], ["Flamingo", "Peacock"],
  ["Snowman", "Gingerbread man"], ["Mince pie", "Christmas pudding"], ["Reindeer", "Sleigh"],
  ["Christmas tree", "Wreath"], ["Stocking", "Advent calendar"], ["Elf", "Santa"], ["Mulled wine", "Eggnog"],
  ["Tinsel", "Fairy lights"], ["Carol singers", "Choir"], ["Boxing Day", "New Year’s Eve"],
  ["Jollof rice", "Fried rice"], ["Sushi", "Ramen"], ["Pizza", "Burger"], ["Pancakes", "Waffles"],
  ["Curry", "Stew"], ["Tacos", "Burritos"], ["Doughnut", "Cupcake"], ["Fish and chips", "Kebab"],
  ["Suya", "Barbecue"], ["Plantain", "Banana"], ["Roast dinner", "Sunday lunch"],
  ["Airport", "Train station"], ["Hospital", "Dentist"], ["Gym", "Swimming pool"], ["Beach", "Desert"],
  ["Cinema", "Theatre"], ["Nightclub", "House party"], ["Library", "Bookshop"], ["Zoo", "Safari"],
  ["Wedding", "Birthday party"], ["Church", "Wedding venue"], ["Barbershop", "Nail salon"],
  ["Karaoke", "Rap battle"], ["Bowling", "Mini golf"], ["Skiing", "Snowboarding"], ["Camping", "Glamping"],
  ["Escape room", "Murder mystery"], ["Yoga", "Pilates"], ["Speed dating", "Blind date"],
  ["Job interview", "First date"], ["Moving house", "Spring cleaning"],
  ["Umbrella", "Raincoat"], ["Toothbrush", "Floss"], ["Selfie stick", "Tripod"], ["Microwave", "Air fryer"],
  ["Passport", "Driving licence"], ["Headphones", "Speaker"], ["Hot water bottle", "Electric blanket"],
  ["Lipstick", "Lip gloss"], ["Suitcase", "Backpack"], ["Candle", "Torch"], ["Remote control", "Game controller"],
];

/** Wildly different words for "totally random" undercover rounds. */
export const WILD = [
  "The universe", "Volcano", "Toilet roll", "Spaceship", "Grandma", "Black hole", "Tax return", "Unicorn",
  "Dinosaur", "Lighthouse", "Submarine", "Pyramid", "Robot", "Tornado", "Mermaid", "Wi-Fi password",
];
