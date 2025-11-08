import { randomBytes } from "crypto";


const ADJECTIVES = [
	"Blue", "Red", "Quick", "Happy", "Clever", "Fuzzy", "Brown", "Black", "Yellow",
	"Green", "Purple", "Orange", "Pink", "Silver", "Golden", "White", "Gray", "Crimson",
	"Swift", "Bright", "Dark", "Light", "Shiny", "Smooth", "Rough", "Soft", "Hard",
	"Brave", "Bold", "Calm", "Wild", "Gentle", "Fierce", "Proud", "Shy", "Loud",
	"Silent", "Mighty", "Tiny", "Giant", "Ancient", "Modern", "Young", "Old", "Fresh",
	"Wise", "Silly", "Funny", "Serious", "Playful", "Lazy", "Active", "Sleepy", "Alert",
	"Lucky", "Magic", "Mystic", "Cosmic", "Solar", "Lunar", "Stellar", "Vibrant", "Dim",
	"Warm", "Cool", "Hot", "Cold", "Frozen", "Burning", "Icy", "Fiery", "Stormy",
	"Windy", "Rainy", "Sunny", "Cloudy", "Misty", "Foggy", "Clear", "Hazy", "Dusty",
	"Crystal", "Diamond", "Ruby", "Jade", "Pearl", "Amber", "Emerald", "Sapphire", "Topaz",
	"Noble", "Royal", "Majestic", "Elegant", "Graceful", "Charming", "Dazzling", "Radiant", "Glowing",
	"Thunder", "Lightning", "Shadow", "Phantom"
];

const NOUNS = [
	"Tiger", "Fox", "Panda", "Otter", "Lion", "Wolf", "Eagle", "Hawk", "Falcon", "Raven",
	"Dragon", "Phoenix", "Unicorn", "Griffin", "Pegasus", "Sphinx", "Hydra", "Kraken", "Serpent", "Basilisk",
	"King", "Queen", "Prince", "Princess", "Knight", "Warrior", "Wizard", "Sage", "Monk", "Paladin",
	"Hunter", "Ranger", "Scout", "Guardian", "Sentinel", "Champion", "Hero", "Legend", "Master", "Lord",
	"Sword", "Shield", "Blade", "Arrow", "Spear", "Axe", "Hammer", "Bow", "Dagger", "Staff",
	"Crown", "Throne", "Castle", "Tower", "Fortress", "Temple", "Palace", "Keep", "Citadel", "Sanctum",
	"Star", "Moon", "Sun", "Comet", "Meteor", "Nova", "Galaxy", "Nebula", "Cosmos", "Orbit",
	"Mountain", "Ocean", "River", "Forest", "Desert", "Valley", "Canyon", "Peak", "Cliff", "Ridge",
	"Storm", "Wind", "Rain", "Snow", "Frost", "Flame", "Blaze", "Ember", "Cyclone", "Typhoon",
	"Ghost", "Spirit", "Specter", "Wraith", "Demon", "Angel", "Titan", "Golem", "Vampire", "Reaper"
];

function choice(arr: string[]): string {
	const idx = Math.floor(randomBytes(2).readUInt16BE(0) / 65536 * arr.length);
	return arr[idx]!;
}

function toBase65(num: number): string {
	const CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-~";
	const BASE = CHARSET.length; // 65
	if (num === 0) return CHARSET[0]!;

	const chars: string[] = [];
	while (num > 0) {
		const remainder = num % BASE;
		chars.push(CHARSET[remainder]!);
		num = Math.floor(num / BASE);
	}
	return chars.reverse().join('');
}

/**
	Format : <Adjectif><Nom>_<TimestampBase65>
*/
export function generateUsername(timestamp: number): string {
	const tsBase65 = toBase65(timestamp);

	const adjective = choice(ADJECTIVES);
	const noun = choice(NOUNS);

	return `${adjective}${noun}_${tsBase65}`;
}
