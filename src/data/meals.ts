import type { MealType } from '@/engine/types';

/**
 * Simple, affordable Indian household meal combinations used by the assistant
 * and recommendations. Items reference food ids and a quantity of the food's
 * default portion.
 */
export interface MealCombo {
  id: string;
  name: string;
  meal: MealType[];
  items: { foodId: string; qty: number; portionId?: string }[];
  note?: string;
}

export const MEAL_COMBOS: MealCombo[] = [
  // Breakfast
  { id: 'b-idli', name: 'Idli with sambar & chutney', meal: ['breakfast'], items: [{ foodId: 'idli', qty: 1, portionId: '4-idlis' }, { foodId: 'sambar', qty: 1 }, { foodId: 'coconut-chutney', qty: 1 }] },
  { id: 'b-poha', name: 'Poha with a bowl of curd', meal: ['breakfast'], items: [{ foodId: 'poha', qty: 1 }, { foodId: 'curd', qty: 1 }], note: 'Add peas and peanuts to the poha for extra protein.' },
  { id: 'b-moong-chilla', name: 'Moong dal chillas with curd', meal: ['breakfast', 'dinner'], items: [{ foodId: 'moong-chilla', qty: 2 }, { foodId: 'green-chutney', qty: 1 }, { foodId: 'curd', qty: 1 }] },
  { id: 'b-moong-chilla-v', name: 'Moong dal chillas with chutney', meal: ['breakfast', 'dinner'], items: [{ foodId: 'moong-chilla', qty: 2 }, { foodId: 'green-chutney', qty: 1 }] },
  { id: 'b-besan-chilla', name: 'Besan chilla with tomato-onion & curd', meal: ['breakfast'], items: [{ foodId: 'besan-chilla', qty: 2 }, { foodId: 'curd', qty: 1 }] },
  { id: 'b-upma-egg', name: 'Vegetable upma with a boiled egg', meal: ['breakfast'], items: [{ foodId: 'upma', qty: 1 }, { foodId: 'boiled-egg', qty: 1 }] },
  { id: 'b-oats', name: 'Oats porridge with banana', meal: ['breakfast'], items: [{ foodId: 'oats-milk', qty: 1 }, { foodId: 'banana', qty: 1 }] },
  { id: 'b-daliya', name: 'Vegetable daliya with buttermilk', meal: ['breakfast', 'dinner'], items: [{ foodId: 'daliya', qty: 1 }, { foodId: 'buttermilk', qty: 1 }] },
  { id: 'b-paratha', name: 'Paneer paratha with curd', meal: ['breakfast'], items: [{ foodId: 'paneer-paratha', qty: 1 }, { foodId: 'curd', qty: 1 }] },
  { id: 'b-thepla', name: 'Thepla with curd', meal: ['breakfast'], items: [{ foodId: 'thepla', qty: 3 }, { foodId: 'curd', qty: 1 }] },
  { id: 'b-omelette', name: 'Masala omelette with toast & fruit', meal: ['breakfast'], items: [{ foodId: 'omelette', qty: 1 }, { foodId: 'bread-brown', qty: 2 }, { foodId: 'orange', qty: 1 }] },
  { id: 'b-dosa', name: 'Dosa with sambar', meal: ['breakfast', 'dinner'], items: [{ foodId: 'plain-dosa', qty: 2 }, { foodId: 'sambar', qty: 1 }] },
  { id: 'b-sprouts', name: 'Sprouts salad with a glass of milk', meal: ['breakfast'], items: [{ foodId: 'sprouts-salad', qty: 1 }, { foodId: 'milk-toned', qty: 1 }] },
  { id: 'b-ragi', name: 'Ragi malt with a banana', meal: ['breakfast'], items: [{ foodId: 'ragi-malt', qty: 1 }, { foodId: 'banana', qty: 1 }] },
  { id: 'b-tofu', name: 'Tofu bhurji with roti', meal: ['breakfast', 'dinner'], items: [{ foodId: 'tofu', qty: 1 }, { foodId: 'roti', qty: 2 }] },

  // Lunch & dinner
  { id: 'm-dal-roti', name: 'Roti, dal, sabzi & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'roti', qty: 2 }, { foodId: 'dal-tadka', qty: 1 }, { foodId: 'mixed-veg', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-dal-rice', name: 'Dal, rice, sabzi & curd', meal: ['lunch', 'dinner'], items: [{ foodId: 'rice', qty: 1 }, { foodId: 'dal-tadka', qty: 1 }, { foodId: 'cabbage-sabzi', qty: 1 }, { foodId: 'curd', qty: 1 }] },
  { id: 'm-rajma', name: 'Rajma chawal with salad', meal: ['lunch'], items: [{ foodId: 'rice', qty: 1 }, { foodId: 'rajma', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-chole', name: 'Chole with roti & kachumber', meal: ['lunch', 'dinner'], items: [{ foodId: 'roti', qty: 2 }, { foodId: 'chole', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-sambar', name: 'Rice, sambar, poriyal & buttermilk', meal: ['lunch', 'dinner'], items: [{ foodId: 'rice', qty: 1 }, { foodId: 'sambar', qty: 1 }, { foodId: 'beans-poriyal', qty: 1 }, { foodId: 'buttermilk', qty: 1 }] },
  { id: 'm-khichdi', name: 'Moong dal khichdi with curd & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'khichdi', qty: 1 }, { foodId: 'curd', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-khichdi-v', name: 'Moong dal khichdi with sabzi', meal: ['lunch', 'dinner'], items: [{ foodId: 'khichdi', qty: 1 }, { foodId: 'lauki', qty: 1 }] },
  { id: 'm-palak-paneer', name: 'Roti with palak paneer & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'roti', qty: 2 }, { foodId: 'palak-paneer', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-bhakri', name: 'Jowar bhakri, dal & bhindi', meal: ['lunch', 'dinner'], items: [{ foodId: 'jowar-bhakri', qty: 2 }, { foodId: 'dal-tadka', qty: 1 }, { foodId: 'bhindi', qty: 1 }] },
  { id: 'm-curd-rice', name: 'Curd rice with poriyal', meal: ['lunch', 'dinner'], items: [{ foodId: 'curd-rice', qty: 1 }, { foodId: 'beans-poriyal', qty: 1 }] },
  { id: 'm-egg-curry', name: 'Egg curry, rice & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'egg-curry', qty: 1 }, { foodId: 'rice', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-chicken', name: 'Chicken curry, roti & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'chicken-curry', qty: 1 }, { foodId: 'roti', qty: 2 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-fish', name: 'Fish curry, rice & cabbage sabzi', meal: ['lunch', 'dinner'], items: [{ foodId: 'fish-curry', qty: 1 }, { foodId: 'rice', qty: 1 }, { foodId: 'cabbage-sabzi', qty: 1 }] },
  { id: 'm-soya', name: 'Soya chunk curry with roti & salad', meal: ['lunch', 'dinner'], items: [{ foodId: 'soya-curry', qty: 1 }, { foodId: 'roti', qty: 2 }, { foodId: 'green-salad', qty: 1 }] },
  { id: 'm-lobia', name: 'Lobia, bajra roti & lauki sabzi', meal: ['lunch', 'dinner'], items: [{ foodId: 'lobia', qty: 1 }, { foodId: 'bajra-roti', qty: 2 }, { foodId: 'lauki', qty: 1 }] },
  { id: 'm-moong-lauki', name: 'Moong dal, roti & lauki sabzi', meal: ['lunch', 'dinner'], items: [{ foodId: 'moong-dal', qty: 1 }, { foodId: 'roti', qty: 2 }, { foodId: 'lauki', qty: 1 }] },

  // Snacks
  { id: 's-chana-fruit', name: 'Roasted chana & a guava', meal: ['snack'], items: [{ foodId: 'roasted-chana', qty: 1 }, { foodId: 'guava', qty: 1 }] },
  { id: 's-curd-fruit', name: 'Curd with fruit', meal: ['snack'], items: [{ foodId: 'curd', qty: 1 }, { foodId: 'papaya', qty: 1 }] },
  { id: 's-sprouts', name: 'Sprouts salad', meal: ['snack'], items: [{ foodId: 'sprouts-salad', qty: 1 }] },
  { id: 's-makhana', name: 'Roasted makhana with buttermilk', meal: ['snack'], items: [{ foodId: 'makhana', qty: 1 }, { foodId: 'buttermilk', qty: 1 }] },
  { id: 's-egg-banana', name: 'Boiled egg & a banana', meal: ['snack'], items: [{ foodId: 'boiled-egg', qty: 1 }, { foodId: 'banana', qty: 1 }] },
  { id: 's-peanut-fruit', name: 'Peanuts & an orange', meal: ['snack'], items: [{ foodId: 'peanuts', qty: 1 }, { foodId: 'orange', qty: 1 }] },
  { id: 's-dhokla', name: 'Dhokla with green chutney', meal: ['snack'], items: [{ foodId: 'dhokla', qty: 1 }, { foodId: 'green-chutney', qty: 1 }] },
  { id: 's-sattu', name: 'Sattu drink & a banana', meal: ['snack'], items: [{ foodId: 'sattu-drink', qty: 1 }, { foodId: 'banana', qty: 1 }] },
  { id: 's-sundal', name: 'Chana sundal', meal: ['snack'], items: [{ foodId: 'sundal', qty: 1 }] },
  { id: 's-corn', name: 'Corn chaat & buttermilk', meal: ['snack'], items: [{ foodId: 'sweet-corn', qty: 1 }, { foodId: 'buttermilk', qty: 1 }] },
  { id: 's-milk-nuts', name: 'Milk with a few almonds', meal: ['snack'], items: [{ foodId: 'milk-toned', qty: 1 }, { foodId: 'almonds', qty: 1 }] },
  { id: 's-soymilk', name: 'Soy milk with a banana', meal: ['snack'], items: [{ foodId: 'soy-milk', qty: 1 }, { foodId: 'banana', qty: 1 }] },
];

/** Recipes the assistant can suggest from ingredients someone has at home. */
export interface PantryRecipe {
  id: string;
  name: string;
  foodId: string;
  needs: string[];
  optional: string[];
  meal: MealType[];
  minutes: number;
  steps: string[];
}

/** Ingredient keywords → canonical ingredient key. */
export const INGREDIENT_WORDS: Record<string, string[]> = {
  rice: ['rice', 'chawal', 'chaawal'],
  dal: ['dal', 'daal', 'lentil', 'lentils', 'toor', 'arhar', 'masoor', 'moong', 'mung'],
  atta: ['atta', 'wheat flour', 'flour', 'roti', 'chapati'],
  besan: ['besan', 'gram flour', 'chickpea flour'],
  poha: ['poha', 'flattened rice', 'aval'],
  sooji: ['sooji', 'suji', 'rava', 'semolina'],
  oats: ['oats'],
  daliya: ['daliya', 'dalia', 'broken wheat'],
  egg: ['egg', 'eggs', 'anda'],
  paneer: ['paneer'],
  curd: ['curd', 'dahi', 'yogurt', 'yoghurt'],
  milk: ['milk', 'doodh'],
  potato: ['potato', 'potatoes', 'aloo', 'batata'],
  onion: ['onion', 'onions', 'pyaz', 'kanda'],
  tomato: ['tomato', 'tomatoes', 'tamatar'],
  spinach: ['spinach', 'palak', 'methi', 'greens', 'saag'],
  cabbage: ['cabbage', 'patta gobi'],
  cauliflower: ['cauliflower', 'gobi'],
  peas: ['peas', 'matar'],
  vegetables: ['vegetable', 'vegetables', 'veggies', 'sabzi', 'carrot', 'beans', 'capsicum', 'lauki', 'bhindi', 'okra', 'brinjal', 'baingan'],
  chana: ['chana', 'chickpea', 'chickpeas', 'chole'],
  rajma: ['rajma', 'kidney beans'],
  sprouts: ['sprouts', 'sprouted'],
  bread: ['bread', 'pav'],
  chicken: ['chicken'],
  fish: ['fish'],
  soya: ['soya', 'soy chunks', 'nutrela', 'meal maker'],
  peanuts: ['peanut', 'peanuts', 'groundnut', 'moongphali'],
  banana: ['banana', 'bananas', 'kela'],
  fruit: ['fruit', 'fruits', 'apple', 'papaya', 'guava', 'orange'],
  tofu: ['tofu'],
};

export const PANTRY_RECIPES: PantryRecipe[] = [
  { id: 'r-dal-rice', name: 'Dal tadka with rice', foodId: 'dal-tadka', needs: ['dal', 'rice'], optional: ['onion', 'tomato', 'spinach'], meal: ['lunch', 'dinner'], minutes: 30, steps: ['Pressure-cook dal with turmeric and salt (3 whistles).', 'Temper cumin, garlic, onion and tomato in a spoon of oil.', 'Mix into the dal, simmer 5 minutes and serve with rice.'] },
  { id: 'r-khichdi', name: 'Moong dal khichdi', foodId: 'khichdi', needs: ['dal', 'rice'], optional: ['vegetables', 'peas', 'curd'], meal: ['lunch', 'dinner'], minutes: 25, steps: ['Rinse ½ cup rice and ½ cup moong dal together.', 'Pressure-cook with 3 cups water, turmeric, salt and any chopped vegetables.', 'Finish with a small cumin tadka; serve with curd.'] },
  { id: 'r-poha', name: 'Kanda poha with peanuts', foodId: 'poha', needs: ['poha'], optional: ['onion', 'peanuts', 'peas', 'potato'], meal: ['breakfast', 'snack'], minutes: 15, steps: ['Rinse poha and let it soften.', 'Sauté mustard seeds, curry leaves, onion, peanuts and peas.', 'Add poha, turmeric, salt and lemon; mix gently.'] },
  { id: 'r-upma', name: 'Vegetable upma', foodId: 'upma', needs: ['sooji'], optional: ['onion', 'vegetables', 'peas'], meal: ['breakfast', 'snack'], minutes: 20, steps: ['Dry-roast sooji until fragrant.', 'Sauté mustard seeds, onion and vegetables; add 2½ cups water per cup sooji.', 'Stir in sooji slowly, cover and cook 3 minutes.'] },
  { id: 'r-besan-chilla', name: 'Besan chilla', foodId: 'besan-chilla', needs: ['besan'], optional: ['onion', 'tomato', 'spinach', 'curd'], meal: ['breakfast', 'dinner', 'snack'], minutes: 15, steps: ['Whisk besan with water, salt, ajwain and chopped onion, tomato or greens.', 'Spread thin on a hot tawa with a few drops of oil.', 'Cook both sides; serve with curd or chutney.'] },
  { id: 'r-moong-chilla', name: 'Moong dal chilla', foodId: 'moong-chilla', needs: ['dal'], optional: ['onion', 'curd', 'paneer'], meal: ['breakfast', 'dinner'], minutes: 25, steps: ['Soak moong dal for 2–4 hours and grind with ginger and green chilli.', 'Spread on a hot tawa and cook both sides.', 'Fill with grated paneer for extra protein.'] },
  { id: 'r-egg-bhurji', name: 'Egg bhurji with roti', foodId: 'egg-bhurji', needs: ['egg'], optional: ['onion', 'tomato', 'atta', 'bread'], meal: ['breakfast', 'dinner'], minutes: 10, steps: ['Sauté onion, tomato and green chilli in a little oil.', 'Add beaten eggs, turmeric and salt; scramble until just set.', 'Serve with roti or toast.'] },
  { id: 'r-omelette', name: 'Masala omelette', foodId: 'omelette', needs: ['egg'], optional: ['onion', 'tomato', 'spinach', 'bread'], meal: ['breakfast', 'snack'], minutes: 10, steps: ['Beat 2 eggs with chopped onion, tomato, coriander and salt.', 'Cook on a lightly oiled pan, fold and serve.'] },
  { id: 'r-egg-curry', name: 'Egg curry', foodId: 'egg-curry', needs: ['egg', 'onion', 'tomato'], optional: ['rice', 'atta'], meal: ['lunch', 'dinner'], minutes: 25, steps: ['Boil eggs and peel.', 'Make a masala with onion, tomato, ginger-garlic and spices.', 'Simmer the eggs in the gravy for 5 minutes.'] },
  { id: 'r-paneer-bhurji', name: 'Paneer bhurji', foodId: 'paneer-bhurji', needs: ['paneer'], optional: ['onion', 'tomato', 'peas', 'atta'], meal: ['breakfast', 'lunch', 'dinner'], minutes: 15, steps: ['Sauté onion, tomato and spices.', 'Add crumbled paneer and peas; cook 3–4 minutes.', 'Serve with roti.'] },
  { id: 'r-palak-paneer', name: 'Palak paneer', foodId: 'palak-paneer', needs: ['paneer', 'spinach'], optional: ['onion', 'tomato', 'atta'], meal: ['lunch', 'dinner'], minutes: 30, steps: ['Blanch spinach and blend smooth.', 'Cook onion-tomato masala, add the spinach purée.', 'Add paneer cubes and simmer 5 minutes.'] },
  { id: 'r-aloo-sabzi', name: 'Aloo matar sabzi with roti', foodId: 'aloo-sabzi', needs: ['potato'], optional: ['peas', 'tomato', 'onion', 'atta'], meal: ['lunch', 'dinner', 'breakfast'], minutes: 25, steps: ['Cube potatoes; sauté cumin and onion.', 'Add tomato, spices, potatoes and peas with a little water.', 'Cover and cook until tender; pair with dal or curd for protein.'] },
  { id: 'r-mixed-veg', name: 'Mixed vegetable sabzi', foodId: 'mixed-veg', needs: ['vegetables'], optional: ['onion', 'tomato', 'potato', 'peas'], meal: ['lunch', 'dinner'], minutes: 20, steps: ['Chop whatever vegetables you have into similar sizes.', 'Sauté with cumin, turmeric and a little oil.', 'Cover and cook until just tender.'] },
  { id: 'r-cabbage', name: 'Cabbage-peas sabzi', foodId: 'cabbage-sabzi', needs: ['cabbage'], optional: ['peas', 'onion'], meal: ['lunch', 'dinner'], minutes: 15, steps: ['Shred cabbage; temper mustard seeds and curry leaves.', 'Add cabbage, peas, turmeric and salt; cook uncovered 8–10 minutes.'] },
  { id: 'r-aloo-gobi', name: 'Aloo gobi', foodId: 'aloo-gobi', needs: ['cauliflower'], optional: ['potato', 'onion', 'tomato'], meal: ['lunch', 'dinner'], minutes: 25, steps: ['Cut cauliflower and potato into florets and cubes.', 'Sauté with cumin, ginger and spices.', 'Cover and cook on low until tender.'] },
  { id: 'r-chole', name: 'Chana masala', foodId: 'chole', needs: ['chana'], optional: ['onion', 'tomato', 'rice', 'atta'], meal: ['lunch', 'dinner'], minutes: 40, steps: ['Soak chana overnight and pressure-cook until soft.', 'Make an onion-tomato masala with chole masala.', 'Simmer chana in the masala for 10 minutes.'] },
  { id: 'r-rajma', name: 'Rajma chawal', foodId: 'rajma', needs: ['rajma'], optional: ['onion', 'tomato', 'rice'], meal: ['lunch'], minutes: 45, steps: ['Soak rajma overnight; pressure-cook until very soft.', 'Cook in an onion-tomato-ginger masala until thick.', 'Serve with rice and salad.'] },
  { id: 'r-sprouts', name: 'Sprouts chaat', foodId: 'sprouts-salad', needs: ['sprouts'], optional: ['onion', 'tomato'], meal: ['breakfast', 'snack'], minutes: 10, steps: ['Steam sprouts for 5 minutes (optional).', 'Mix with onion, tomato, lemon, chaat masala and coriander.'] },
  { id: 'r-chana-sundal', name: 'Chana sundal', foodId: 'sundal', needs: ['chana'], optional: [], meal: ['snack'], minutes: 15, steps: ['Use boiled chana.', 'Temper mustard seeds, curry leaves and a little coconut.', 'Toss the chana through and add lemon.'] },
  { id: 'r-curd-rice', name: 'Curd rice', foodId: 'curd-rice', needs: ['curd', 'rice'], optional: ['vegetables'], meal: ['lunch', 'dinner'], minutes: 10, steps: ['Mash cooked rice with curd and a little milk.', 'Temper mustard seeds, curry leaves and ginger; mix in.', 'Add grated carrot or cucumber.'] },
  { id: 'r-oats', name: 'Oats porridge', foodId: 'oats-milk', needs: ['oats', 'milk'], optional: ['banana', 'fruit', 'peanuts'], meal: ['breakfast'], minutes: 10, steps: ['Simmer ½ cup oats in 1 cup milk for 5 minutes.', 'Top with sliced banana or fruit and a few nuts.'] },
  { id: 'r-masala-oats', name: 'Masala oats', foodId: 'masala-oats', needs: ['oats'], optional: ['onion', 'tomato', 'vegetables', 'peas'], meal: ['breakfast', 'dinner'], minutes: 12, steps: ['Sauté onion, tomato and vegetables.', 'Add oats, water and spices; cook 4–5 minutes until creamy.'] },
  { id: 'r-daliya', name: 'Vegetable daliya', foodId: 'daliya', needs: ['daliya'], optional: ['vegetables', 'peas', 'onion'], meal: ['breakfast', 'dinner'], minutes: 25, steps: ['Roast daliya lightly in a little ghee or oil.', 'Add vegetables, water (1:3) and salt; pressure-cook 2 whistles.'] },
  { id: 'r-chicken-curry', name: 'Simple chicken curry', foodId: 'chicken-curry', needs: ['chicken', 'onion', 'tomato'], optional: ['curd', 'rice', 'atta'], meal: ['lunch', 'dinner'], minutes: 40, steps: ['Marinate chicken with curd, turmeric and salt.', 'Cook onion-tomato-ginger-garlic masala.', 'Add chicken and simmer covered until cooked through.'] },
  { id: 'r-fish-curry', name: 'Home-style fish curry', foodId: 'fish-curry', needs: ['fish'], optional: ['onion', 'tomato', 'rice'], meal: ['lunch', 'dinner'], minutes: 30, steps: ['Rub fish with turmeric and salt.', 'Make a light onion-tomato gravy with your usual spices.', 'Simmer fish 8–10 minutes until cooked.'] },
  { id: 'r-soya', name: 'Soya chunk curry', foodId: 'soya-curry', needs: ['soya'], optional: ['onion', 'tomato', 'potato', 'atta'], meal: ['lunch', 'dinner'], minutes: 30, steps: ['Boil soya chunks 5 minutes and squeeze out the water.', 'Cook in an onion-tomato masala until the gravy thickens.'] },
  { id: 'r-tofu-bhurji', name: 'Tofu bhurji', foodId: 'tofu', needs: ['tofu'], optional: ['onion', 'tomato', 'atta', 'bread'], meal: ['breakfast', 'dinner'], minutes: 15, steps: ['Crumble tofu.', 'Sauté onion, tomato, turmeric and spices; add tofu and cook 4 minutes.'] },
  { id: 'r-paratha', name: 'Aloo paratha with curd', foodId: 'aloo-paratha', needs: ['atta', 'potato'], optional: ['curd', 'onion'], meal: ['breakfast', 'lunch'], minutes: 35, steps: ['Mash boiled potato with spices.', 'Stuff into atta dough, roll and cook on a tawa with a little oil.', 'Serve with curd for protein.'] },
  { id: 'r-sandwich', name: 'Vegetable sandwich', foodId: 'sandwich-veg', needs: ['bread'], optional: ['tomato', 'onion', 'vegetables', 'paneer'], meal: ['breakfast', 'snack'], minutes: 10, steps: ['Layer sliced vegetables (and paneer if you have it) with green chutney.', 'Toast on a tawa or eat as is.'] },
];
