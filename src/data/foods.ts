import type { Allergen, Cuisine, FoodGroup, MealType, Nutrients } from '@/engine/types';

/**
 * NutriTrack Indian food database.
 *
 * Values are per 100 g (or 100 ml for drinks) for typical home-style
 * preparation, compiled from IFCT 2017 (NIN), USDA FoodData Central and common
 * recipe analyses. Home cooking varies a lot (oil, ghee, portion size), so the
 * UI lets people adjust oil level and edit any value.
 */

export type FoodCategory =
  | 'breads'
  | 'rice'
  | 'dal'
  | 'curry'
  | 'sabzi'
  | 'breakfast'
  | 'dairy'
  | 'eggs'
  | 'meat'
  | 'fish'
  | 'fruit'
  | 'nuts'
  | 'snacks'
  | 'sweets'
  | 'beverages'
  | 'salad'
  | 'indo_chinese'
  | 'extras';

/** vegan ⊂ veg (lacto-vegetarian) ⊂ egg ⊂ nonveg */
export type FoodDiet = 'vegan' | 'veg' | 'egg' | 'nonveg';

export interface Portion {
  id: string;
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  aliases: string[];
  category: FoodCategory;
  diet: FoodDiet;
  /** Typically contains onion, garlic, potato or other root vegetables (not Jain-friendly). */
  rootVeg: boolean;
  allergens: Allergen[];
  groups: FoodGroup[];
  /** Share of the dish weight that counts toward vegetable servings (80 g = 1 serving). */
  vegFraction: number;
  /** Share of the dish weight that counts toward fruit servings (80 g = 1 serving). */
  fruitFraction: number;
  per100: Nutrients;
  portions: Portion[];
  defaultPortionId: string;
  unit: 'g' | 'ml';
  /** Home-cooked dish: show the "estimates may vary" note. */
  homemade: boolean;
  /** Offer the less / normal / more oil adjustment. */
  oilAdjustable: boolean;
  meals: MealType[];
  cuisines: Cuisine[];
  /** 1 = everyday budget staple, 3 = occasional / pricier. */
  cost: 1 | 2 | 3;
  custom?: boolean;
}

type N = [kcal: number, protein: number, carbs: number, fat: number, fiber: number];
type P = [label: string, grams: number];

interface Opts {
  aliases?: string[];
  diet?: FoodDiet;
  rootVeg?: boolean;
  allergens?: Allergen[];
  groups?: FoodGroup[];
  veg?: number;
  fruit?: number;
  unit?: 'g' | 'ml';
  homemade?: boolean;
  oil?: boolean;
  meals?: MealType[];
  cuisines?: Cuisine[];
  cost?: 1 | 2 | 3;
  defaultIndex?: number;
}

const ALL_INDIAN: Cuisine[] = ['north_indian', 'south_indian', 'west_indian', 'east_indian'];
const MAIN: MealType[] = ['lunch', 'dinner'];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function food(id: string, name: string, category: FoodCategory, n: N, portions: P[], o: Opts = {}): Food {
  const ps = portions.map(([label, grams]) => ({ id: slug(label), label, grams }));
  return {
    id,
    name,
    aliases: o.aliases ?? [],
    category,
    diet: o.diet ?? 'veg',
    rootVeg: o.rootVeg ?? false,
    allergens: o.allergens ?? [],
    groups: o.groups ?? [],
    vegFraction: o.veg ?? 0,
    fruitFraction: o.fruit ?? 0,
    per100: { kcal: n[0], protein: n[1], carbs: n[2], fat: n[3], fiber: n[4] },
    portions: ps,
    defaultPortionId: ps[o.defaultIndex ?? 0].id,
    unit: o.unit ?? 'g',
    homemade: o.homemade ?? false,
    oilAdjustable: o.oil ?? false,
    meals: o.meals ?? MAIN,
    cuisines: o.cuisines ?? ALL_INDIAN,
    cost: o.cost ?? 1,
  };
}

const G100: P = ['100 g', 100];

export const FOODS: Food[] = [
  // ------------------------------------------------------------------ Breads
  food('roti', 'Roti / Phulka (whole wheat)', 'breads', [290, 10, 52, 4.5, 7], [['1 medium roti', 40], ['1 small roti', 30], ['1 large roti', 55]], {
    aliases: ['chapati plain', 'phulka', 'fulka', 'rotli'], diet: 'vegan', allergens: ['gluten'], groups: ['whole_grain'], homemade: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian', 'west_indian', 'east_indian'],
  }),
  food('chapati-ghee', 'Chapati with ghee', 'breads', [320, 9.5, 50, 9, 6.5], [['1 medium chapati', 45], ['1 large chapati', 60]], {
    aliases: ['ghee roti', 'chapathi'], allergens: ['gluten', 'dairy'], groups: ['whole_grain'], homemade: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian', 'west_indian', 'east_indian'],
  }),
  food('plain-paratha', 'Plain paratha', 'breads', [326, 8, 45, 13, 5], [['1 medium paratha', 60], ['1 large paratha', 80]], {
    aliases: ['lachha paratha', 'tawa paratha'], allergens: ['gluten', 'dairy'], groups: ['whole_grain'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian'],
  }),
  food('aloo-paratha', 'Aloo paratha', 'breads', [275, 6, 38, 11, 4], [['1 medium paratha', 100], ['1 large paratha', 140]], {
    aliases: ['potato paratha'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['whole_grain'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian'], cost: 1,
  }),
  food('paneer-paratha', 'Paneer paratha', 'breads', [301, 11, 35, 13, 3.5], [['1 medium paratha', 110]], {
    allergens: ['gluten', 'dairy'], groups: ['whole_grain', 'dairy'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian'], cost: 2,
  }),
  food('gobi-paratha', 'Gobi / mooli paratha', 'breads', [260, 6.5, 36, 10, 4.5], [['1 medium paratha', 100]], {
    aliases: ['cauliflower paratha', 'mooli paratha', 'radish paratha'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['whole_grain'], veg: 0.25, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian'],
  }),
  food('thepla', 'Methi thepla', 'breads', [299, 8, 42, 11, 6], [['1 thepla', 40], ['3 theplas', 120]], {
    aliases: ['methi paratha', 'thepla'], allergens: ['gluten', 'dairy'], groups: ['whole_grain'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner', 'snack'], cuisines: ['west_indian'],
  }),
  food('puri', 'Puri', 'breads', [374, 7, 46, 18, 3], [['1 puri', 25], ['4 puris', 100]], {
    aliases: ['poori'], diet: 'vegan', allergens: ['gluten'], groups: ['refined_grain', 'fried'], homemade: true, meals: ['breakfast', 'lunch', 'dinner'],
  }),
  food('naan', 'Naan', 'breads', [290, 9, 50, 6, 2], [['1 naan', 90], ['1 butter naan', 100]], {
    aliases: ['butter naan', 'tandoori naan'], allergens: ['gluten', 'dairy'], groups: ['refined_grain'], cuisines: ['north_indian'], cost: 2,
  }),
  food('jowar-bhakri', 'Jowar bhakri / roti', 'breads', [295, 10, 58, 2.5, 8], [['1 bhakri', 50], ['1 large bhakri', 70]], {
    aliases: ['jolada rotti', 'jowar roti', 'sorghum roti', 'bhakri'], diet: 'vegan', groups: ['whole_grain'], homemade: true, cuisines: ['west_indian', 'south_indian'],
  }),
  food('bajra-roti', 'Bajra roti', 'breads', [305, 10, 55, 5, 9], [['1 roti', 50]], {
    aliases: ['bajra rotla', 'pearl millet roti'], diet: 'vegan', groups: ['whole_grain'], homemade: true, cuisines: ['north_indian', 'west_indian'],
  }),
  food('ragi-roti', 'Ragi roti / mudde', 'breads', [280, 7, 58, 2.5, 9], [['1 ragi roti', 60], ['1 ragi mudde ball', 150]], {
    aliases: ['nachni bhakri', 'finger millet', 'ragi ball'], diet: 'vegan', groups: ['whole_grain'], homemade: true, cuisines: ['south_indian', 'west_indian'],
  }),
  food('makki-roti', 'Makki di roti', 'breads', [303, 7, 53, 7, 7], [['1 roti', 60]], {
    aliases: ['maize roti', 'corn roti'], diet: 'vegan', groups: ['whole_grain'], homemade: true, cuisines: ['north_indian'],
  }),
  food('bread-white', 'White bread', 'breads', [265, 9, 49, 3.2, 2.5], [['1 slice', 25], ['2 slices', 50]], {
    allergens: ['gluten'], groups: ['refined_grain'], meals: ['breakfast', 'snack'], cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('bread-brown', 'Whole wheat / brown bread', 'breads', [247, 12, 41, 3.4, 7], [['1 slice', 28], ['2 slices', 56]], {
    aliases: ['atta bread', 'multigrain bread'], diet: 'vegan', allergens: ['gluten'], groups: ['whole_grain'], meals: ['breakfast', 'snack'], cuisines: ['continental', ...ALL_INDIAN],
  }),

  // -------------------------------------------------------------------- Rice
  food('rice', 'Steamed white rice', 'rice', [130, 2.7, 28, 0.3, 0.4], [['1 cup cooked', 160], ['1 small bowl', 100], ['1 plate', 250]], {
    aliases: ['chawal', 'bhaat', 'plain rice', 'annam', 'sadam'], diet: 'vegan', groups: ['refined_grain'],
  }),
  food('brown-rice', 'Brown rice', 'rice', [118, 2.6, 25, 0.9, 1.6], [['1 cup cooked', 160], ['1 small bowl', 100]], {
    diet: 'vegan', groups: ['whole_grain'], cost: 2,
  }),
  food('jeera-rice', 'Jeera rice', 'rice', [151, 2.8, 27, 3.5, 0.6], [['1 cup', 160], ['1 plate', 250]], {
    allergens: ['dairy'], groups: ['refined_grain'], homemade: true, oil: true, cuisines: ['north_indian'],
  }),
  food('veg-pulao', 'Veg pulao', 'rice', [149, 3, 24, 4.5, 1.5], [['1 cup', 180], ['1 plate', 280]], {
    aliases: ['pulav', 'vegetable pulao'], rootVeg: true, groups: ['refined_grain'], veg: 0.2, homemade: true, oil: true,
  }),
  food('veg-biryani', 'Veg biryani', 'rice', [164, 3.5, 25, 5.5, 1.5], [['1 plate', 250], ['1 cup', 160]], {
    rootVeg: true, allergens: ['dairy'], groups: ['refined_grain'], veg: 0.15, homemade: true, oil: true, cost: 2,
  }),
  food('chicken-biryani', 'Chicken biryani', 'rice', [187, 9, 22, 7, 1], [['1 plate', 300], ['1 cup', 160]], {
    diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['refined_grain', 'meat_fish'], homemade: true, oil: true, cost: 3,
  }),
  food('curd-rice', 'Curd rice', 'rice', [112, 3.2, 18, 3, 0.4], [['1 bowl', 200], ['1 plate', 300]], {
    aliases: ['thayir sadam', 'dahi chawal', 'mosaru anna', 'hyderabadi chicken biryani', 'dum chicken biryani', 'ambur biryani', 'thalassery biryani', 'malabar biryani'], allergens: ['dairy'], groups: ['refined_grain', 'dairy'], homemade: true, cuisines: ['south_indian'],
  }),
  food('lemon-rice', 'Lemon rice', 'rice', [160, 2.8, 26, 5, 1], [['1 cup', 160], ['1 plate', 250]], {
    aliases: ['chitranna', 'nimmakaya pulihora'], diet: 'vegan', allergens: ['peanut'], groups: ['refined_grain'], homemade: true, oil: true, cuisines: ['south_indian'],
  }),
  food('khichdi', 'Moong dal khichdi', 'rice', [123, 4.5, 20, 2.8, 2.5], [['1 bowl', 250], ['1 small bowl', 150]], {
    aliases: ['khichri', 'kichdi'], groups: ['refined_grain', 'pulse'], veg: 0.05, homemade: true, oil: true, meals: ['lunch', 'dinner'],
  }),
  food('bisi-bele-bath', 'Bisi bele bath / sambar rice', 'rice', [132, 4, 20, 4, 2.5], [['1 bowl', 250]], {
    aliases: ['sambar sadam', 'sambar rice'], groups: ['refined_grain', 'pulse'], veg: 0.15, homemade: true, oil: true, cuisines: ['south_indian'],
  }),
  food('pongal', 'Ven pongal', 'breakfast', [141, 4, 20, 5, 1.5], [['1 bowl', 200]], {
    aliases: ['khara pongal'], allergens: ['dairy'], groups: ['refined_grain', 'pulse'], homemade: true, oil: true, meals: ['breakfast', 'lunch'], cuisines: ['south_indian'],
  }),

  // ------------------------------------------------------------- Dal & pulses
  food('dal-tadka', 'Dal (toor / arhar, tadka)', 'dal', [99, 5.5, 13, 2.8, 3], [['1 bowl dal', 160], ['1 small bowl', 100], ['1 large bowl', 250]], {
    aliases: ['toor dal', 'arhar dal', 'dal fry', 'pappu', 'varan', 'paruppu', 'dal'], diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true,
  }),
  food('moong-dal', 'Moong dal', 'dal', [95, 6, 12, 2.5, 3], [['1 bowl dal', 160], ['1 small bowl', 100]], {
    aliases: ['yellow moong', 'mung dal'], diet: 'vegan', groups: ['pulse'], homemade: true, oil: true,
  }),
  food('masoor-dal', 'Masoor dal', 'dal', [99, 6, 13, 2.5, 3], [['1 bowl dal', 160], ['1 small bowl', 100]], {
    aliases: ['red lentil dal'], diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true, cuisines: ['north_indian', 'east_indian'],
  }),
  food('chana-dal', 'Chana dal', 'dal', [113, 6.5, 15, 3, 4], [['1 bowl dal', 160]], {
    diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true,
  }),
  food('dal-makhani', 'Dal makhani', 'dal', [146, 5.5, 13, 8, 4], [['1 bowl', 160], ['1 small bowl', 100]], {
    rootVeg: true, allergens: ['dairy'], groups: ['pulse', 'dairy'], homemade: true, oil: true, cuisines: ['north_indian'], cost: 2,
  }),
  food('rajma', 'Rajma (kidney bean curry)', 'dal', [116, 6, 15, 3.5, 5], [['1 bowl', 160], ['1 small bowl', 100]], {
    aliases: ['rajma masala', 'kidney beans'], diet: 'vegan', rootVeg: true, groups: ['pulse'], veg: 0.1, homemade: true, oil: true, cuisines: ['north_indian'],
  }),
  food('chole', 'Chole (chickpea curry)', 'dal', [145, 7, 18, 5, 6], [['1 bowl', 160], ['1 small bowl', 100]], {
    aliases: ['chana masala', 'chickpea curry', 'kabuli chana'], diet: 'vegan', rootVeg: true, groups: ['pulse'], veg: 0.1, homemade: true, oil: true, cuisines: ['north_indian'],
  }),
  food('sambar', 'Sambar', 'dal', [62, 3, 8, 2, 2.5], [['1 bowl', 180], ['1 small bowl', 100]], {
    aliases: ['sambhar', 'kuzhambu'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'vegetable'], veg: 0.3, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['south_indian'],
  }),
  food('rasam', 'Rasam', 'dal', [34, 1, 4, 1.5, 0.6], [['1 bowl', 150]], {
    aliases: ['saaru', 'chaaru'], diet: 'vegan', groups: ['pulse'], veg: 0.1, homemade: true, cuisines: ['south_indian'],
  }),
  food('kadhi', 'Kadhi', 'dal', [72, 3, 6, 4, 0.5], [['1 bowl', 180]], {
    aliases: ['kadhi pakora', 'gujarati kadhi'], allergens: ['dairy'], groups: ['dairy'], homemade: true, oil: true, cuisines: ['north_indian', 'west_indian'],
  }),
  food('sprouts-salad', 'Moong sprouts salad', 'salad', [97, 7, 15, 1, 4], [['1 bowl', 100], ['1 large bowl', 150]], {
    aliases: ['sprouts', 'ankurit moong', 'usal'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'vegetable'], veg: 0.3, meals: ['breakfast', 'snack', 'lunch', 'dinner'],
  }),
  food('boiled-chana', 'Boiled chana / chickpeas', 'dal', [164, 8.9, 27, 2.6, 7.6], [['½ cup', 80], ['1 cup', 160]], {
    aliases: ['chana', 'kala chana', 'chickpeas'], diet: 'vegan', groups: ['pulse'], meals: ['breakfast', 'snack', 'lunch', 'dinner'],
  }),
  food('sundal', 'Chana sundal', 'snacks', [156, 8, 22, 4, 6], [['1 bowl', 100]], {
    diet: 'vegan', groups: ['pulse'], homemade: true, meals: ['snack'], cuisines: ['south_indian'],
  }),
  food('lobia', 'Lobia / chawli curry', 'dal', [118, 7, 16, 3, 5], [['1 bowl', 160]], {
    aliases: ['black eyed peas', 'chawli', 'karamani'], diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true,
  }),
  food('misal', 'Misal (with pav)', 'breakfast', [165, 6.5, 20, 7, 4.5], [['1 plate (with 2 pav)', 280]], {
    aliases: ['misal pav', 'usal'], rootVeg: true, allergens: ['gluten'], groups: ['pulse', 'refined_grain', 'fried'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'snack'], cuisines: ['west_indian'],
  }),
  food('soya-chunks', 'Soya chunks (boiled)', 'dal', [110, 16, 10, 0.3, 4], [['½ cup', 50], ['1 cup', 100]], {
    aliases: ['soya badi', 'nutrela', 'meal maker'], diet: 'vegan', allergens: ['soy'], groups: ['soy'], meals: ['lunch', 'dinner', 'snack'],
  }),
  food('soya-curry', 'Soya chunk curry', 'curry', [129, 12, 9, 5, 3.5], [['1 bowl', 150]], {
    aliases: ['meal maker curry', 'nutrela sabzi'], diet: 'vegan', rootVeg: true, allergens: ['soy'], groups: ['soy'], veg: 0.1, homemade: true, oil: true,
  }),
  food('tofu', 'Tofu', 'curry', [76, 8, 1.9, 4.8, 0.3], [G100, ['½ block', 150]], {
    diet: 'vegan', allergens: ['soy'], groups: ['soy'], cost: 2, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('moong-chilla', 'Moong dal chilla', 'breakfast', [170, 9, 20, 6, 3], [['1 chilla', 70], ['2 chillas', 140]], {
    aliases: ['pesarattu', 'moong cheela'], diet: 'vegan', groups: ['pulse'], homemade: true, oil: true, meals: ['breakfast', 'snack', 'dinner'],
  }),
  food('besan-chilla', 'Besan chilla', 'breakfast', [171, 9, 18, 7, 3], [['1 chilla', 70], ['2 chillas', 140]], {
    aliases: ['besan cheela', 'gram flour pancake', 'pudla'], diet: 'vegan', rootVeg: true, groups: ['pulse'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'snack', 'dinner'],
  }),

  // ------------------------------------------------------- Paneer & curries
  food('paneer', 'Paneer (plain)', 'dairy', [265, 18.3, 1.2, 20.8, 0], [G100, ['50 g', 50], ['4 cubes', 40]], {
    aliases: ['cottage cheese', 'chhena'], allergens: ['dairy'], groups: ['dairy'], cost: 2, meals: ['breakfast', 'lunch', 'dinner', 'snack'],
  }),
  food('palak-paneer', 'Palak paneer', 'curry', [151, 7, 6, 11, 2], [['1 bowl', 160], ['1 small bowl', 100]], {
    aliases: ['saag paneer'], rootVeg: true, allergens: ['dairy'], groups: ['dairy', 'vegetable'], veg: 0.5, homemade: true, oil: true, cuisines: ['north_indian'], cost: 2,
  }),
  food('matar-paneer', 'Matar paneer', 'curry', [154, 7, 9, 10, 2.5], [['1 bowl', 160], ['1 small bowl', 100]], {
    aliases: ['mutter paneer'], rootVeg: true, allergens: ['dairy'], groups: ['dairy', 'vegetable'], veg: 0.3, homemade: true, oil: true, cuisines: ['north_indian'], cost: 2,
  }),
  food('paneer-butter-masala', 'Paneer butter masala', 'curry', [208, 8, 8, 16, 1.5], [['1 bowl', 160], ['1 small bowl', 100]], {
    aliases: ['shahi paneer', 'paneer makhani'], rootVeg: true, allergens: ['dairy', 'tree_nut'], groups: ['dairy'], veg: 0.15, homemade: true, oil: true, cuisines: ['north_indian'], cost: 3,
  }),
  food('paneer-bhurji', 'Paneer bhurji', 'curry', [207, 13, 5, 15, 1], [['1 bowl', 120]], {
    rootVeg: true, allergens: ['dairy'], groups: ['dairy'], veg: 0.15, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cost: 2,
  }),
  food('paneer-tikka', 'Paneer tikka', 'curry', [210, 15, 6, 14, 1.5], [['6 pieces', 150], ['3 pieces', 75]], {
    rootVeg: true, allergens: ['dairy'], groups: ['dairy'], veg: 0.15, oil: true, meals: ['lunch', 'dinner', 'snack'], cuisines: ['north_indian'], cost: 3,
  }),
  food('kadai-veg', 'Kadai vegetable / veg kurma', 'curry', [120, 3, 9, 8, 3], [['1 bowl', 160]], {
    aliases: ['veg korma', 'navratan korma', 'veg kurma'], rootVeg: true, allergens: ['dairy', 'tree_nut'], groups: ['vegetable'], veg: 0.6, homemade: true, oil: true, cost: 2,
  }),

  // -------------------------------------------------------------- Sabzi
  food('mixed-veg', 'Mixed vegetable sabzi', 'sabzi', [91, 2.5, 9, 5, 3], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['mix veg', 'sabji', 'sabzi', 'subzi', 'palya', 'poriyal'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.85, homemade: true, oil: true,
  }),
  food('bhindi', 'Bhindi (okra) sabzi', 'sabzi', [109, 2.5, 9, 7, 3.5], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['bhindi masala', 'okra', 'lady finger', 'vendakkai'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.85, homemade: true, oil: true,
  }),
  food('aloo-gobi', 'Aloo gobi', 'sabzi', [108, 2.5, 11, 6, 3], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['potato cauliflower'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.45, homemade: true, oil: true, cuisines: ['north_indian'],
  }),
  food('aloo-sabzi', 'Aloo sabzi (potato)', 'sabzi', [130, 2, 17, 6, 2], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['batata bhaji', 'aloo bhaji', 'potato curry', 'jeera aloo'], diet: 'vegan', rootVeg: true, groups: [], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'],
  }),
  food('palak-sabzi', 'Palak / saag (spinach)', 'sabzi', [81, 3, 6, 5, 3], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['sarson ka saag', 'spinach', 'keerai', 'methi sabzi'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.85, homemade: true, oil: true,
  }),
  food('baingan-bharta', 'Baingan bharta', 'sabzi', [98, 2, 9, 6, 3.5], [['1 bowl', 150]], {
    aliases: ['brinjal', 'eggplant', 'vangi'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.85, homemade: true, oil: true,
  }),
  food('lauki', 'Lauki / tori sabzi', 'sabzi', [51, 1, 5, 3, 2], [['1 bowl', 150]], {
    aliases: ['bottle gourd', 'dudhi', 'ghiya', 'turai', 'ridge gourd', 'sorakaya'], diet: 'vegan', groups: ['vegetable'], veg: 0.9, homemade: true, oil: true,
  }),
  food('cabbage-sabzi', 'Cabbage sabzi / poriyal', 'sabzi', [72, 2, 7, 4, 3], [['1 bowl', 150]], {
    aliases: ['patta gobi', 'cabbage thoran', 'kobi'], diet: 'vegan', groups: ['vegetable'], veg: 0.9, homemade: true, oil: true,
  }),
  food('beans-poriyal', 'Beans / carrot poriyal', 'sabzi', [78, 2.5, 8, 4, 3.5], [['1 bowl', 150]], {
    aliases: ['beans thoran', 'french beans', 'gajar beans'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.9, homemade: true, oil: true, cuisines: ['south_indian', 'north_indian', 'west_indian'],
  }),
  food('mushroom-masala', 'Mushroom masala', 'sabzi', [92, 3.5, 6, 6, 2], [['1 bowl', 150]], {
    diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.7, homemade: true, oil: true, cost: 2,
  }),
  food('avial', 'Avial', 'sabzi', [103, 2, 8, 7, 3], [['1 bowl', 150]], {
    allergens: ['dairy'], rootVeg: true, groups: ['vegetable'], veg: 0.8, homemade: true, oil: true, cuisines: ['south_indian'],
  }),
  food('pav-bhaji', 'Pav bhaji', 'snacks', [192, 5, 25, 8, 3.5], [['1 plate (2 pav + bhaji)', 300], ['bhaji only (1 bowl)', 160]], {
    rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['refined_grain', 'vegetable'], veg: 0.3, homemade: true, oil: true, meals: ['lunch', 'dinner', 'snack'], cuisines: ['west_indian'], cost: 2,
  }),
  food('green-salad', 'Green salad (kachumber)', 'salad', [26, 1, 5, 0.2, 1.8], [['1 plate', 150], ['1 small bowl', 80]], {
    aliases: ['salad', 'kachumber', 'cucumber tomato salad', 'koshimbir'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 1, meals: ['lunch', 'dinner', 'snack'],
  }),
  food('cucumber', 'Cucumber', 'salad', [15, 0.7, 3.6, 0.1, 0.5], [['1 medium', 200], ['½ cucumber', 100]], {
    aliases: ['kheera', 'kakdi'], diet: 'vegan', groups: ['vegetable'], veg: 1, meals: ['lunch', 'dinner', 'snack'],
  }),
  food('carrot', 'Carrot (raw)', 'salad', [41, 0.9, 9.6, 0.2, 2.8], [['1 medium', 60], ['1 cup sticks', 120]], {
    aliases: ['gajar'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 1, meals: ['snack', 'lunch', 'dinner'],
  }),
  food('sweet-corn', 'Boiled sweet corn', 'snacks', [111, 3.4, 21, 1.5, 2.4], [['1 cup', 150], ['1 cob', 100]], {
    aliases: ['bhutta', 'corn chaat', 'makka'], diet: 'vegan', groups: ['whole_grain', 'vegetable'], veg: 0.5, meals: ['snack'],
  }),

  // ------------------------------------------------- Breakfast & tiffin
  food('poha', 'Poha', 'breakfast', [152, 2.8, 25, 4.5, 1.5], [['1 plate', 160], ['1 small bowl', 100]], {
    aliases: ['kanda poha', 'aval', 'avalakki', 'chivda poha'], diet: 'vegan', rootVeg: true, allergens: ['peanut'], groups: ['refined_grain'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'snack'], cuisines: ['west_indian', 'north_indian', 'east_indian'],
  }),
  food('upma', 'Upma', 'breakfast', [139, 3.5, 20, 5, 1.5], [['1 bowl', 180], ['1 small bowl', 120]], {
    aliases: ['rava upma', 'uppittu', 'sooji upma'], diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['refined_grain'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'snack'], cuisines: ['south_indian', 'west_indian'],
  }),
  food('idli', 'Idli', 'breakfast', [130, 4, 27, 0.5, 1.2], [['1 idli', 40], ['2 idlis', 80], ['4 idlis', 160]], {
    aliases: ['idly', 'rava idli'], diet: 'vegan', groups: ['refined_grain', 'pulse'], meals: ['breakfast', 'dinner', 'snack'], cuisines: ['south_indian'], defaultIndex: 1,
  }),
  food('plain-dosa', 'Plain dosa', 'breakfast', [181, 3.9, 29, 5.5, 1.2], [['1 dosa', 80], ['2 dosas', 160]], {
    aliases: ['dosai', 'sada dosa', 'dose'], diet: 'vegan', groups: ['refined_grain', 'pulse'], homemade: true, oil: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('masala-dosa', 'Masala dosa', 'breakfast', [191, 4, 28, 7, 2], [['1 masala dosa', 160]], {
    diet: 'vegan', rootVeg: true, groups: ['refined_grain', 'pulse'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['south_indian'], cost: 2,
  }),
  food('uttapam', 'Uttapam', 'breakfast', [157, 4, 25, 4.5, 2], [['1 uttapam', 120]], {
    aliases: ['uthappam', 'onion uttapam', 'mysore masala dosa'], diet: 'vegan', rootVeg: true, groups: ['refined_grain', 'pulse'], veg: 0.15, homemade: true, oil: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('medu-vada', 'Medu vada', 'breakfast', [263, 7, 25, 15, 4], [['1 vada', 45], ['2 vadas', 90]], {
    aliases: ['uddina vade', 'ulundu vadai', 'vada'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'fried'], meals: ['breakfast', 'snack'], cuisines: ['south_indian'],
  }),
  food('dhokla', 'Dhokla', 'breakfast', [153, 6, 22, 4.5, 2], [['2 pieces', 60], ['4 pieces', 120]], {
    aliases: ['khaman', 'khaman dhokla', 'khatta dhokla'], diet: 'vegan', groups: ['pulse'], homemade: true, meals: ['breakfast', 'snack'], cuisines: ['west_indian'], defaultIndex: 1,
  }),
  food('oats-milk', 'Oats porridge with milk', 'breakfast', [97, 4.5, 13, 3, 1.8], [['1 bowl', 200]], {
    aliases: ['oatmeal', 'dalia with milk'], allergens: ['dairy', 'gluten'], groups: ['whole_grain', 'dairy'], meals: ['breakfast'], cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('masala-oats', 'Masala oats', 'breakfast', [93, 3.5, 14, 2.5, 2.5], [['1 bowl', 200]], {
    diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['whole_grain'], veg: 0.15, homemade: true, meals: ['breakfast', 'snack', 'dinner'],
  }),
  food('daliya', 'Daliya (broken wheat)', 'breakfast', [109, 3.5, 18, 2.5, 3], [['1 bowl', 200]], {
    aliases: ['dalia', 'lapsi', 'godhuma rava'], diet: 'vegan', allergens: ['gluten'], groups: ['whole_grain'], veg: 0.1, homemade: true, meals: ['breakfast', 'dinner'], cuisines: ['north_indian', 'west_indian'],
  }),
  food('sabudana-khichdi', 'Sabudana khichdi', 'breakfast', [226, 1.5, 37, 8, 1], [['1 bowl', 150]], {
    aliases: ['sago'], rootVeg: true, allergens: ['peanut'], groups: ['refined_grain'], homemade: true, oil: true, meals: ['breakfast', 'snack'], cuisines: ['west_indian'],
  }),
  food('appam', 'Appam', 'breakfast', [126, 2, 25, 2, 0.8], [['1 appam', 60], ['2 appams', 120]], {
    aliases: ['palappam'], diet: 'vegan', groups: ['refined_grain'], meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('cornflakes-milk', 'Cornflakes with milk', 'breakfast', [100, 3.5, 17, 2, 0.5], [['1 bowl', 200]], {
    aliases: ['cereal'], allergens: ['dairy'], groups: ['refined_grain', 'dairy'], meals: ['breakfast'], cuisines: ['continental'], cost: 2,
  }),
  food('muesli-curd', 'Muesli with curd / milk', 'breakfast', [140, 5, 20, 4, 2.5], [['1 bowl', 200]], {
    allergens: ['dairy', 'gluten', 'tree_nut'], groups: ['whole_grain', 'dairy', 'nut_seed'], fruit: 0.05, meals: ['breakfast'], cuisines: ['continental'], cost: 3,
  }),
  food('pb-toast', 'Peanut butter toast', 'breakfast', [345, 13, 34, 18, 5], [['1 slice', 45], ['2 slices', 90]], {
    diet: 'vegan', allergens: ['peanut', 'gluten'], groups: ['whole_grain', 'nut_seed'], meals: ['breakfast', 'snack'], cuisines: ['continental'], cost: 2,
  }),

  // ------------------------------------------------------------- Dairy
  food('curd', 'Curd / dahi', 'dairy', [62, 3.5, 4.7, 3.3, 0], [['1 bowl', 150], ['1 cup', 200], ['½ cup', 100]], {
    aliases: ['dahi', 'yogurt', 'thayir', 'mosaru'], allergens: ['dairy'], groups: ['dairy'], meals: ['breakfast', 'lunch', 'dinner', 'snack'],
  }),
  food('hung-curd', 'Greek yogurt / hung curd', 'dairy', [88, 9, 4, 4, 0], [['1 cup', 150], ['½ cup', 100]], {
    aliases: ['greek yogurt', 'chakka'], allergens: ['dairy'], groups: ['dairy'], meals: ['breakfast', 'snack'], cost: 2,
  }),
  food('raita', 'Raita', 'dairy', [63, 3, 6, 3, 0.6], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['boondi raita', 'cucumber raita', 'pachadi'], allergens: ['dairy'], groups: ['dairy'], veg: 0.2, meals: ['lunch', 'dinner'],
  }),
  food('milk-toned', 'Milk (toned)', 'beverages', [58, 3.1, 4.7, 3, 0], [['1 glass (250 ml)', 250], ['1 cup (150 ml)', 150]], {
    aliases: ['doodh', 'milk', 'paal'], allergens: ['dairy'], groups: ['dairy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage', 'dinner'],
  }),
  food('milk-full', 'Milk (full cream)', 'beverages', [86, 3.2, 4.8, 6, 0], [['1 glass (250 ml)', 250], ['1 cup (150 ml)', 150]], {
    aliases: ['whole milk', 'buffalo milk'], allergens: ['dairy'], groups: ['dairy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage', 'dinner'],
  }),
  food('milk-double-toned', 'Milk (double toned / skimmed)', 'beverages', [45, 3, 4.8, 1.5, 0], [['1 glass (250 ml)', 250], ['1 cup (150 ml)', 150]], {
    aliases: ['low fat milk', 'skim milk'], allergens: ['dairy'], groups: ['dairy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage', 'dinner'],
  }),
  food('soy-milk', 'Soy milk (unsweetened)', 'beverages', [33, 2.9, 1.8, 1.6, 0.4], [['1 glass (250 ml)', 250]], {
    diet: 'vegan', allergens: ['soy'], groups: ['soy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'], cost: 2,
  }),
  food('buttermilk', 'Buttermilk / chaas', 'beverages', [21, 1.5, 2, 0.8, 0], [['1 glass (250 ml)', 250]], {
    aliases: ['chaas', 'chhachh', 'majjige', 'moru', 'mattha'], allergens: ['dairy'], groups: ['dairy'], unit: 'ml', meals: ['lunch', 'snack', 'beverage'],
  }),
  food('lassi', 'Sweet lassi', 'beverages', [95, 3, 14, 3, 0], [['1 glass (250 ml)', 250]], {
    aliases: ['mango lassi'], allergens: ['dairy'], groups: ['dairy', 'sweet'], unit: 'ml', meals: ['snack', 'beverage'], cuisines: ['north_indian'],
  }),
  food('cheese-slice', 'Cheese slice', 'dairy', [300, 18, 6, 23, 0], [['1 slice', 20]], {
    aliases: ['processed cheese'], allergens: ['dairy'], groups: ['dairy'], meals: ['breakfast', 'snack'], cuisines: ['continental'], cost: 2,
  }),
  food('ghee', 'Ghee', 'extras', [900, 0, 0, 100, 0], [['1 tsp', 5], ['1 tbsp', 14]], {
    aliases: ['clarified butter', 'neyyi'], allergens: ['dairy'], meals: ['breakfast', 'lunch', 'dinner'],
  }),
  food('butter', 'Butter', 'extras', [717, 0.9, 0.1, 81, 0], [['1 tsp', 5], ['1 tbsp', 14]], {
    aliases: ['makhan'], allergens: ['dairy'], meals: ['breakfast', 'lunch', 'dinner', 'snack'],
  }),

  // --------------------------------------------------------------- Eggs
  food('boiled-egg', 'Boiled egg', 'eggs', [155, 12.6, 1.1, 10.6, 0], [['1 large egg', 50], ['2 eggs', 100]], {
    aliases: ['egg', 'anda', 'boiled anda'], diet: 'egg', allergens: ['egg'], groups: ['egg'], meals: ['breakfast', 'snack', 'lunch', 'dinner'],
  }),
  food('egg-white', 'Egg white (boiled)', 'eggs', [52, 11, 0.7, 0.2, 0], [['1 egg white', 33], ['3 egg whites', 100]], {
    diet: 'egg', allergens: ['egg'], groups: ['egg'], meals: ['breakfast', 'snack'],
  }),
  food('omelette', 'Masala omelette (2 eggs)', 'eggs', [169, 10.5, 2.5, 13, 0.5], [['1 omelette (2 eggs)', 120]], {
    aliases: ['omlet', 'anda omelette', 'egg omelette'], diet: 'egg', rootVeg: true, allergens: ['egg'], groups: ['egg'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'snack', 'dinner'],
  }),
  food('egg-bhurji', 'Egg bhurji', 'eggs', [173, 11, 3, 13, 0.5], [['1 bowl (2 eggs)', 120]], {
    aliases: ['scrambled eggs', 'anda bhurji'], diet: 'egg', rootVeg: true, allergens: ['egg'], groups: ['egg'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'dinner'],
  }),
  food('egg-curry', 'Egg curry', 'eggs', [142, 8, 5, 10, 1], [['1 bowl (2 eggs)', 180]], {
    aliases: ['anda curry', 'egg masala', 'egg gravy', 'dim curry', 'dimer dalna', 'muttai kuzhambu'], diet: 'egg', rootVeg: true, allergens: ['egg'], groups: ['egg'], veg: 0.1, homemade: true, oil: true,
  }),

  // ------------------------------------------------------- Chicken & meat
  food('chicken-curry', 'Chicken curry (home-style)', 'meat', [145, 12, 4, 9, 0.8], [['1 bowl', 180], ['1 small bowl', 120]], {
    aliases: ['murgh curry', 'chicken masala', 'kozhi curry', 'chicken gravy', 'desi chicken', 'country chicken curry', 'chicken salan', 'chicken kosha', 'kori gassi'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cost: 2,
  }),
  food('chicken-breast', 'Grilled chicken breast', 'meat', [165, 31, 0, 3.6, 0], [G100, ['150 g', 150]], {
    aliases: ['chicken', 'boiled chicken'], diet: 'nonveg', groups: ['meat_fish'], oil: true, cost: 2, cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('tandoori-chicken', 'Tandoori chicken', 'meat', [184, 25, 3, 8, 0.5], [['2 pieces', 150], ['1 leg piece', 120]], {
    diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['meat_fish'], cost: 3, cuisines: ['north_indian'],
  }),
  food('butter-chicken', 'Butter chicken', 'meat', [198, 12, 6, 14, 1], [['1 bowl', 180]], {
    aliases: ['murgh makhani', 'tangdi kebab', 'chicken tangdi', 'afghani chicken'], diet: 'nonveg', rootVeg: true, allergens: ['dairy', 'tree_nut'], groups: ['meat_fish'], homemade: true, oil: true, cost: 3, cuisines: ['north_indian'],
  }),
  food('chicken-tikka', 'Chicken tikka', 'meat', [193, 24, 4, 9, 0.5], [['6 pieces', 150]], {
    diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['meat_fish'], meals: ['lunch', 'dinner', 'snack'], cost: 3,
  }),
  food('mutton-curry', 'Mutton curry', 'meat', [185, 13, 4, 13, 0.8], [['1 bowl', 180]], {
    aliases: ['goat curry', 'gosht', 'rogan josh', 'mutton gravy', 'laal maas', 'mutton rogan josh', 'mutton salan', 'kosha mangsho', 'mutton kosha'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cost: 3,
  }),
  food('keema', 'Keema', 'meat', [206, 15, 5, 14, 1.5], [['1 bowl', 150]], {
    aliases: ['kheema', 'mince', 'chicken keema', 'mutton keema', 'keema matar'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], veg: 0.1, homemade: true, oil: true, cost: 3,
  }),

  // ------------------------------------------------------------------ Fish
  food('fish-curry', 'Fish curry (home-style)', 'fish', [131, 13, 4, 7, 0.5], [['1 bowl', 180], ['1 small bowl', 120]], {
    aliases: ['machli', 'meen curry', 'macher jhol', 'fish gravy', 'rohu curry', 'surmai curry', 'bangda curry', 'mackerel curry', 'machli jhol', 'fish kalia', 'doi maach'], diet: 'nonveg', rootVeg: true, allergens: ['fish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['east_indian', 'south_indian', 'west_indian'], cost: 2,
  }),
  food('fish-fry', 'Fish fry (tawa)', 'fish', [194, 20, 6, 10, 0.3], [['1 piece', 100], ['2 pieces', 200]], {
    aliases: ['rava fish fry', 'bangda fry', 'pomfret fry', 'rohu fry', 'katla fry', 'tawa fish', 'surmai fry', 'king fish fry', 'meen varuval', 'mackerel fry'], diet: 'nonveg', allergens: ['fish'], groups: ['meat_fish'], oil: true, cuisines: ['east_indian', 'south_indian', 'west_indian'], cost: 2,
  }),
  food('grilled-fish', 'Grilled / steamed fish', 'fish', [116, 20, 0, 4, 0], [G100, ['150 g', 150]], {
    aliases: ['rohu', 'surmai', 'basa', 'tandoori pomfret', 'pomfret', 'steamed fish', 'paturi', 'fish in banana leaf'], diet: 'nonveg', allergens: ['fish'], groups: ['meat_fish'], cost: 2,
  }),
  food('prawn-curry', 'Prawn curry', 'fish', [135, 13, 5, 7, 0.5], [['1 bowl', 180]], {
    aliases: ['jhinga', 'shrimp curry', 'chingri', 'prawn malai curry', 'chingri malaikari', 'kolambi curry', 'chemmeen curry'], diet: 'nonveg', rootVeg: true, allergens: ['shellfish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['east_indian', 'south_indian', 'west_indian'], cost: 3,
  }),

  // ------------------------------------------------------------- Fruit
  food('banana', 'Banana', 'fruit', [89, 1.1, 23, 0.3, 2.6], [['1 medium', 118], ['1 small', 90]], {
    aliases: ['kela', 'vazhaipazham'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'],
  }),
  food('apple', 'Apple', 'fruit', [52, 0.3, 14, 0.2, 2.4], [['1 medium', 180]], {
    aliases: ['seb'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'], cost: 2,
  }),
  food('orange', 'Orange / mosambi', 'fruit', [47, 0.9, 12, 0.1, 2.4], [['1 medium', 130]], {
    aliases: ['santra', 'mosambi', 'sweet lime', 'kinnow'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'],
  }),
  food('mango', 'Mango', 'fruit', [60, 0.8, 15, 0.4, 1.6], [['1 cup sliced', 165], ['1 medium', 200]], {
    aliases: ['aam', 'alphonso'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'], cost: 2,
  }),
  food('papaya', 'Papaya', 'fruit', [43, 0.5, 11, 0.3, 1.7], [['1 bowl', 150]], {
    aliases: ['papita'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'],
  }),
  food('guava', 'Guava', 'fruit', [68, 2.6, 14, 1, 5.4], [['1 medium', 100]], {
    aliases: ['amrood', 'peru', 'koyya'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'],
  }),
  food('pomegranate', 'Pomegranate', 'fruit', [83, 1.7, 19, 1.2, 4], [['1 bowl arils', 100]], {
    aliases: ['anar'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'], cost: 2,
  }),
  food('watermelon', 'Watermelon', 'fruit', [30, 0.6, 7.6, 0.2, 0.4], [['1 bowl', 150], ['1 slice', 280]], {
    aliases: ['tarbooj'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'],
  }),
  food('grapes', 'Grapes', 'fruit', [69, 0.7, 18, 0.2, 0.9], [['1 cup', 150]], {
    aliases: ['angoor'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'], cost: 2,
  }),
  food('chikoo', 'Chikoo (sapota)', 'fruit', [83, 0.4, 20, 1.1, 5.3], [['1 medium', 100]], {
    aliases: ['sapota', 'chiku'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'],
  }),
  food('pineapple', 'Pineapple', 'fruit', [50, 0.5, 13, 0.1, 1.4], [['1 bowl', 150]], {
    aliases: ['ananas'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'],
  }),
  food('pear', 'Pear', 'fruit', [57, 0.4, 15, 0.1, 3.1], [['1 medium', 170]], {
    aliases: ['nashpati'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'], cost: 2,
  }),
  food('amla', 'Amla', 'fruit', [44, 0.9, 10, 0.6, 4.3], [['2 amla', 60]], {
    aliases: ['indian gooseberry', 'nellikai'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['snack'],
  }),
  food('fruit-chaat', 'Fruit chaat / fruit bowl', 'fruit', [67, 1, 15, 0.3, 2.2], [['1 bowl', 150]], {
    aliases: ['fruit salad', 'mixed fruit'], diet: 'vegan', groups: ['fruit'], fruit: 1, meals: ['breakfast', 'snack'],
  }),
  food('dates', 'Dates (khajur)', 'fruit', [282, 2.5, 75, 0.4, 8], [['2 dates', 16], ['4 dates', 32]], {
    aliases: ['khajoor', 'kharek'], diet: 'vegan', groups: ['fruit', 'sweet'], fruit: 0.5, meals: ['snack', 'breakfast'], cost: 2,
  }),
  food('raisins', 'Raisins (kishmish)', 'fruit', [299, 3.1, 79, 0.5, 3.7], [['1 tbsp', 10], ['small handful', 20]], {
    aliases: ['kishmish', 'manuka'], diet: 'vegan', groups: ['fruit'], fruit: 0.5, meals: ['snack', 'breakfast'],
  }),

  // ------------------------------------------------------- Nuts & seeds
  food('almonds', 'Almonds', 'nuts', [579, 21, 22, 50, 12.5], [['10 almonds', 12], ['small handful', 25]], {
    aliases: ['badam'], diet: 'vegan', allergens: ['tree_nut'], groups: ['nut_seed'], meals: ['breakfast', 'snack'], cost: 3,
  }),
  food('walnuts', 'Walnuts', 'nuts', [654, 15, 14, 65, 6.7], [['4 halves', 8], ['small handful', 20]], {
    aliases: ['akhrot'], diet: 'vegan', allergens: ['tree_nut'], groups: ['nut_seed'], meals: ['breakfast', 'snack'], cost: 3,
  }),
  food('cashews', 'Cashews', 'nuts', [553, 18, 30, 44, 3.3], [['10 cashews', 15], ['small handful', 25]], {
    aliases: ['kaju'], diet: 'vegan', allergens: ['tree_nut'], groups: ['nut_seed'], meals: ['snack'], cost: 3,
  }),
  food('pistachios', 'Pistachios', 'nuts', [562, 20, 28, 45, 10], [['20 pistachios', 15]], {
    aliases: ['pista'], diet: 'vegan', allergens: ['tree_nut'], groups: ['nut_seed'], meals: ['snack'], cost: 3,
  }),
  food('peanuts', 'Roasted peanuts', 'nuts', [585, 26, 16, 49, 8], [['small handful', 30], ['1 tbsp', 10]], {
    aliases: ['moongphali', 'groundnut', 'shengdana', 'kadalai'], diet: 'vegan', allergens: ['peanut'], groups: ['nut_seed'], meals: ['snack'],
  }),
  food('peanut-butter', 'Peanut butter', 'nuts', [588, 25, 20, 50, 6], [['1 tbsp', 16]], {
    diet: 'vegan', allergens: ['peanut'], groups: ['nut_seed'], meals: ['breakfast', 'snack'], cuisines: ['continental'], cost: 2,
  }),
  food('roasted-chana', 'Roasted chana', 'snacks', [362, 19, 58, 6, 17], [['small handful', 30], ['1 cup', 60]], {
    aliases: ['bhuna chana', 'phutana', 'pottukadalai', 'dalia chana'], diet: 'vegan', groups: ['pulse'], meals: ['snack'],
  }),
  food('makhana', 'Roasted makhana', 'snacks', [350, 9.7, 77, 0.5, 14], [['1 bowl', 30]], {
    aliases: ['fox nuts', 'lotus seeds', 'phool makhana'], diet: 'vegan', groups: ['nut_seed'], meals: ['snack'], cost: 2,
  }),
  food('flax-seeds', 'Flax seeds (alsi)', 'nuts', [534, 18, 29, 42, 27], [['1 tbsp', 10]], {
    aliases: ['alsi', 'linseed'], diet: 'vegan', groups: ['nut_seed'], meals: ['breakfast', 'snack'],
  }),
  food('chia-seeds', 'Chia seeds', 'nuts', [486, 17, 42, 31, 34], [['1 tbsp', 12]], {
    diet: 'vegan', groups: ['nut_seed'], meals: ['breakfast', 'snack'], cost: 2,
  }),
  food('sesame-chikki', 'Til / peanut chikki', 'sweets', [497, 13, 55, 25, 4], [['1 piece', 25]], {
    aliases: ['chikki', 'gajak', 'til ladoo'], diet: 'vegan', allergens: ['peanut', 'sesame'], groups: ['nut_seed', 'sweet'], meals: ['snack'],
  }),

  // ------------------------------------------------------------ Snacks
  food('samosa', 'Samosa', 'snacks', [291, 4.5, 30, 17, 2.5], [['1 samosa', 80], ['1 small samosa', 50]], {
    rootVeg: true, allergens: ['gluten'], diet: 'vegan', groups: ['refined_grain', 'fried'], meals: ['snack'], cost: 1,
  }),
  food('kachori', 'Kachori', 'snacks', [374, 6, 38, 22, 3], [['1 kachori', 60]], {
    allergens: ['gluten'], diet: 'vegan', groups: ['refined_grain', 'fried'], meals: ['snack', 'breakfast'], cuisines: ['north_indian', 'west_indian'],
  }),
  food('pakora', 'Pakora / bhajji', 'snacks', [286, 6, 25, 18, 3], [['4 pieces', 80], ['1 plate', 150]], {
    aliases: ['pakoda', 'bhajiya', 'onion bhaji', 'bajji'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'fried'], veg: 0.2, meals: ['snack'],
  }),
  food('bhel-puri', 'Bhel puri', 'snacks', [190, 4, 30, 6, 2.5], [['1 plate', 120]], {
    aliases: ['bhel', 'jhal muri', 'churmuri'], diet: 'vegan', rootVeg: true, allergens: ['peanut'], groups: ['refined_grain'], veg: 0.15, meals: ['snack'], cuisines: ['west_indian', 'east_indian'],
  }),
  food('pani-puri', 'Pani puri', 'snacks', [188, 3.5, 30, 6, 2.5], [['6 pieces', 100]], {
    aliases: ['golgappa', 'puchka', 'gupchup'], diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['refined_grain', 'fried'], meals: ['snack'],
  }),
  food('sev-puri', 'Sev puri / dahi puri', 'snacks', [245, 4.5, 32, 11, 2.5], [['1 plate', 120]], {
    rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['refined_grain', 'fried'], meals: ['snack'], cuisines: ['west_indian'],
  }),
  food('vada-pav', 'Vada pav', 'snacks', [261, 5.5, 35, 11, 2.5], [['1 vada pav', 130]], {
    rootVeg: true, allergens: ['gluten'], diet: 'vegan', groups: ['refined_grain', 'fried'], meals: ['snack', 'breakfast'], cuisines: ['west_indian'],
  }),
  food('namkeen', 'Namkeen / mixture', 'snacks', [498, 12, 45, 30, 5], [['1 small bowl', 30]], {
    aliases: ['chivda', 'bhujia', 'mixture', 'farsan'], diet: 'vegan', allergens: ['peanut'], groups: ['fried'], meals: ['snack'],
  }),
  food('murukku', 'Murukku / chakli', 'snacks', [522, 8, 55, 30, 4], [['2 pieces', 30]], {
    aliases: ['chakli', 'chakri'], diet: 'vegan', allergens: ['sesame'], groups: ['fried'], meals: ['snack'], cuisines: ['south_indian', 'west_indian'],
  }),
  food('khakhra', 'Khakhra', 'snacks', [377, 11, 63, 9, 7], [['1 khakhra', 20], ['2 khakhras', 40]], {
    diet: 'vegan', allergens: ['gluten'], groups: ['whole_grain'], meals: ['snack', 'breakfast'], cuisines: ['west_indian'],
  }),
  food('marie-biscuit', 'Biscuits (Marie / glucose)', 'snacks', [431, 7, 76, 11, 2], [['4 biscuits', 28], ['2 biscuits', 14]], {
    aliases: ['biscuit', 'cookies'], allergens: ['gluten', 'dairy'], groups: ['refined_grain', 'sweet'], meals: ['snack', 'breakfast'],
  }),
  food('chips', 'Potato chips', 'snacks', [544, 6.5, 53, 34, 4], [['1 small pack', 30], ['1 large pack', 60]], {
    aliases: ['wafers', 'crisps'], diet: 'vegan', rootVeg: true, groups: ['fried'], meals: ['snack'], cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('instant-noodles', 'Instant noodles (prepared)', 'snacks', [152, 3.5, 20, 6.5, 1], [['1 pack', 210]], {
    aliases: ['maggi', 'noodles'], allergens: ['gluten'], groups: ['refined_grain'], meals: ['snack', 'dinner', 'breakfast'], cuisines: ['continental'],
  }),
  food('sandwich-veg', 'Veg sandwich', 'snacks', [210, 6, 30, 7, 3], [['1 sandwich', 130]], {
    aliases: ['bombay sandwich', 'grilled sandwich'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['refined_grain', 'vegetable'], veg: 0.25, meals: ['breakfast', 'snack', 'lunch'], cuisines: ['west_indian', 'continental'],
  }),

  // ------------------------------------------------------ Homemade sweets
  food('gulab-jamun', 'Gulab jamun', 'sweets', [342, 4, 50, 14, 0.5], [['1 piece', 40], ['2 pieces', 80]], {
    allergens: ['dairy', 'gluten'], groups: ['sweet', 'fried'], meals: ['snack', 'dinner', 'lunch'],
  }),
  food('rasgulla', 'Rasgulla', 'sweets', [175, 4, 34, 2.5, 0], [['1 piece', 50], ['2 pieces', 100]], {
    aliases: ['rosogolla', 'rasagola'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['snack', 'dinner', 'lunch'], cuisines: ['east_indian', ...ALL_INDIAN],
  }),
  food('kheer', 'Kheer / payasam', 'sweets', [137, 4, 20, 4.5, 0.3], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['payasam', 'phirni', 'rice pudding', 'semiya payasam'], allergens: ['dairy', 'tree_nut'], groups: ['sweet', 'dairy'], homemade: true, meals: ['snack', 'dinner', 'lunch'],
  }),
  food('besan-ladoo', 'Besan ladoo', 'sweets', [466, 8, 50, 26, 3], [['1 ladoo', 40]], {
    aliases: ['ladoo', 'laddu', 'motichoor'], allergens: ['dairy'], groups: ['sweet'], homemade: true, meals: ['snack'],
  }),
  food('kaju-katli', 'Kaju katli', 'sweets', [454, 9, 55, 22, 1.5], [['1 piece', 15], ['3 pieces', 45]], {
    aliases: ['kaju barfi'], diet: 'vegan', allergens: ['tree_nut'], groups: ['sweet'], meals: ['snack'], cost: 3,
  }),
  food('jalebi', 'Jalebi', 'sweets', [383, 2, 60, 15, 0.5], [['2 pieces', 50]], {
    aliases: ['imarti'], allergens: ['gluten'], diet: 'vegan', groups: ['sweet', 'fried'], meals: ['snack', 'breakfast'],
  }),
  food('sooji-halwa', 'Sooji halwa / sheera', 'sweets', [302, 4, 40, 14, 1], [['1 small bowl', 100]], {
    aliases: ['sheera', 'kesari', 'rava kesari', 'halwa'], allergens: ['dairy', 'gluten', 'tree_nut'], groups: ['sweet'], homemade: true, meals: ['snack', 'breakfast'],
  }),
  food('gajar-halwa', 'Gajar halwa', 'sweets', [240, 5, 28, 12, 2], [['1 bowl', 120]], {
    aliases: ['carrot halwa'], rootVeg: true, allergens: ['dairy', 'tree_nut'], groups: ['sweet', 'dairy'], veg: 0.3, homemade: true, meals: ['snack', 'dinner'],
  }),
  food('barfi', 'Milk barfi / peda', 'sweets', [371, 9, 50, 15, 0.5], [['1 piece', 30]], {
    aliases: ['peda', 'kalakand', 'burfi'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['snack'],
  }),
  food('shrikhand', 'Shrikhand', 'sweets', [240, 7, 35, 8, 0], [['1 small bowl', 100]], {
    aliases: ['amrakhand'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['lunch', 'dinner', 'snack'], cuisines: ['west_indian'],
  }),
  food('ice-cream', 'Ice cream (vanilla)', 'sweets', [209, 3.5, 24, 11, 0.5], [['1 scoop', 65], ['1 cup', 100]], {
    aliases: ['kulfi'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['snack'], cuisines: ['continental', ...ALL_INDIAN], cost: 2,
  }),

  // --------------------------------------------------------- Beverages
  food('chai', 'Masala chai (milk + sugar)', 'beverages', [42, 1.2, 6.5, 1.2, 0], [['1 cup (150 ml)', 150], ['1 small cup (100 ml)', 100]], {
    aliases: ['tea', 'cutting chai', 'chaha'], allergens: ['dairy'], groups: ['sugary_drink'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('chai-no-sugar', 'Tea with milk, no sugar', 'beverages', [20, 1.2, 1.5, 1.1, 0], [['1 cup (150 ml)', 150]], {
    aliases: ['sugar free chai'], allergens: ['dairy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('coffee', 'Filter coffee (milk + sugar)', 'beverages', [48, 1.5, 7, 1.5, 0], [['1 cup (150 ml)', 150]], {
    aliases: ['kaapi', 'coffee'], allergens: ['dairy'], groups: ['sugary_drink'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'], cuisines: ['south_indian', ...ALL_INDIAN],
  }),
  food('black-coffee', 'Black coffee / green tea', 'beverages', [2, 0.1, 0.3, 0, 0], [['1 cup (200 ml)', 200]], {
    aliases: ['green tea', 'black tea'], diet: 'vegan', unit: 'ml', meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('coconut-water', 'Coconut water', 'beverages', [19, 0.7, 3.7, 0.2, 1.1], [['1 glass (250 ml)', 250], ['1 coconut', 300]], {
    aliases: ['nariyal pani', 'tender coconut', 'elaneer'], diet: 'vegan', unit: 'ml', meals: ['snack', 'beverage'],
  }),
  food('nimbu-pani', 'Nimbu pani (with sugar)', 'beverages', [25, 0.1, 6.5, 0, 0], [['1 glass (250 ml)', 250]], {
    aliases: ['lemonade', 'shikanji', 'lime juice'], diet: 'vegan', groups: ['sugary_drink'], unit: 'ml', meals: ['snack', 'beverage'],
  }),
  food('orange-juice', 'Fresh fruit juice', 'beverages', [45, 0.7, 10.4, 0.2, 0.2], [['1 glass (250 ml)', 250]], {
    aliases: ['mosambi juice', 'orange juice', 'juice'], diet: 'vegan', groups: ['sugary_drink'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('sugarcane-juice', 'Sugarcane juice', 'beverages', [73, 0.2, 18, 0, 0], [['1 glass (250 ml)', 250]], {
    aliases: ['ganne ka ras', 'ganna juice'], diet: 'vegan', groups: ['sugary_drink'], unit: 'ml', meals: ['snack', 'beverage'],
  }),
  food('soft-drink', 'Soft drink (cola)', 'beverages', [42, 0, 10.6, 0, 0], [['1 can (330 ml)', 330], ['1 glass (250 ml)', 250]], {
    aliases: ['cola', 'soda', 'cold drink'], diet: 'vegan', groups: ['sugary_drink'], unit: 'ml', meals: ['snack', 'beverage'], cuisines: ['continental', ...ALL_INDIAN],
  }),
  food('banana-shake', 'Banana milkshake', 'beverages', [90, 3, 14, 2.5, 0.6], [['1 glass (250 ml)', 250]], {
    aliases: ['milkshake', 'mango shake'], allergens: ['dairy'], groups: ['dairy'], fruit: 0.3, unit: 'ml', meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('haldi-doodh', 'Haldi doodh (turmeric milk)', 'beverages', [67, 3, 7, 3, 0], [['1 cup (200 ml)', 200]], {
    aliases: ['turmeric latte', 'golden milk'], allergens: ['dairy'], groups: ['dairy'], unit: 'ml', meals: ['dinner', 'beverage'],
  }),
  food('sattu-drink', 'Sattu drink', 'beverages', [50, 2.4, 7.8, 0.8, 2.2], [['1 glass (250 ml)', 250]], {
    aliases: ['sattu sharbat', 'sattu'], diet: 'vegan', groups: ['pulse'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('ragi-malt', 'Ragi malt / ambli', 'beverages', [70, 2.5, 11, 1.6, 1.2], [['1 glass (250 ml)', 250]], {
    aliases: ['ragi java', 'ragi porridge', 'nachni satva'], allergens: ['dairy'], groups: ['whole_grain', 'dairy'], unit: 'ml', meals: ['breakfast', 'snack', 'beverage'], cuisines: ['south_indian', 'west_indian'],
  }),

  // ------------------------------------------------------------ Extras
  food('pickle', 'Pickle (achar)', 'extras', [198, 1, 8, 18, 2], [['1 tsp', 10], ['1 tbsp', 15]], {
    aliases: ['achaar', 'oorugai', 'lonche'], diet: 'vegan', allergens: ['sesame'], meals: ['lunch', 'dinner', 'breakfast'],
  }),
  food('papad', 'Papad (roasted)', 'extras', [371, 25, 60, 3, 10], [['1 papad', 12]], {
    aliases: ['papadum', 'appalam'], diet: 'vegan', groups: ['pulse'], meals: ['lunch', 'dinner'],
  }),
  food('coconut-chutney', 'Coconut chutney', 'extras', [224, 3, 8, 20, 5], [['2 tbsp', 30], ['1 small bowl', 60]], {
    aliases: ['chutney', 'thengai chutney'], diet: 'vegan', allergens: ['peanut'], groups: ['nut_seed'], meals: ['breakfast', 'dinner', 'snack'], cuisines: ['south_indian'],
  }),
  food('green-chutney', 'Green / mint chutney', 'extras', [60, 2, 8, 2, 3], [['1 tbsp', 15], ['2 tbsp', 30]], {
    aliases: ['pudina chutney', 'hari chutney', 'dhaniya chutney'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.5, meals: ['breakfast', 'lunch', 'dinner', 'snack'],
  }),
  food('sugar', 'Sugar', 'extras', [387, 0, 100, 0, 0], [['1 tsp', 4], ['1 tbsp', 12]], {
    aliases: ['cheeni', 'shakkar'], diet: 'vegan', groups: ['sweet'], meals: ['breakfast', 'snack', 'beverage'],
  }),
  food('jaggery', 'Jaggery (gur)', 'extras', [383, 0.4, 98, 0.1, 0], [['1 small piece', 10], ['1 tbsp', 15]], {
    aliases: ['gur', 'gud', 'bellam', 'vellam'], diet: 'vegan', groups: ['sweet'], meals: ['lunch', 'dinner', 'snack'],
  }),
  food('honey', 'Honey', 'extras', [304, 0.3, 82, 0, 0.2], [['1 tsp', 7], ['1 tbsp', 21]], {
    aliases: ['shahad'], meals: ['breakfast', 'snack', 'beverage'],
  }),
  // ===================================================== Local & regional additions
  // ------------------------------------------------------------ Chicken
  food('chicken-65', 'Chicken 65', 'meat', [240, 20, 9, 14, 0.5], [['4 pieces', 75], ['1 plate (8 pieces)', 150]], {
    aliases: ['chicken 65 dry'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish', 'fried'], meals: ['lunch', 'dinner', 'snack'], cuisines: ['south_indian'], cost: 2,
  }),
  food('chicken-fry', 'Chicken fry / sukka', 'meat', [215, 22, 5, 12, 1], [['1 bowl', 150], ['1 small bowl', 100]], {
    aliases: ['chicken sukka', 'pepper chicken', 'chicken roast', 'chicken varuval', 'dry chicken', 'chicken chukka'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian', 'west_indian'], cost: 2,
  }),
  food('chicken-korma', 'Chicken korma', 'meat', [190, 12, 6, 13, 1], [['1 bowl', 180]], {
    aliases: ['murgh korma', 'chicken kurma', 'white chicken'], diet: 'nonveg', rootVeg: true, allergens: ['dairy', 'tree_nut'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['north_indian'], cost: 3,
  }),
  food('chicken-chettinad', 'Chicken Chettinad', 'meat', [165, 13, 5, 10, 1.5], [['1 bowl', 180]], {
    aliases: ['chettinad chicken', 'kozhi kuzhambu', 'kozhi curry'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian'], cost: 2,
  }),
  food('chicken-ghee-roast', 'Chicken ghee roast', 'meat', [235, 18, 5, 16, 1], [['1 bowl', 150]], {
    aliases: ['mangalorean ghee roast', 'ghee roast'], diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian'], cost: 3,
  }),
  food('kadai-chicken', 'Kadai chicken', 'meat', [175, 14, 5, 11, 1.2], [['1 bowl', 180]], {
    aliases: ['karahi chicken', 'chicken kadai', 'chicken do pyaza'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], veg: 0.15, homemade: true, oil: true, cuisines: ['north_indian'], cost: 2,
  }),
  food('chicken-tikka-masala', 'Chicken tikka masala', 'meat', [175, 13, 6, 11, 1], [['1 bowl', 180]], {
    diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['north_indian'], cost: 3,
  }),
  food('chicken-stew', 'Kerala chicken stew', 'meat', [130, 9, 5, 8, 1], [['1 bowl', 200]], {
    aliases: ['chicken ishtu', 'chicken stew'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish', 'vegetable'], veg: 0.2, homemade: true, oil: true, cuisines: ['south_indian'], cost: 2,
  }),
  food('chicken-seekh-kebab', 'Chicken seekh kebab', 'meat', [175, 20, 4, 9, 0.5], [['2 kebabs', 100], ['4 kebabs', 200]], {
    aliases: ['chicken kebab', 'reshmi kebab', 'chicken seekh', 'chicken kabab'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], meals: ['lunch', 'dinner', 'snack'], cuisines: ['north_indian'], cost: 2,
  }),
  food('chicken-lollipop', 'Chicken lollipop', 'meat', [245, 18, 10, 15, 0.5], [['4 pieces', 140]], {
    aliases: ['lollipop', 'drums of heaven'], diet: 'nonveg', rootVeg: true, allergens: ['soy'], groups: ['meat_fish', 'fried'], meals: ['snack', 'dinner'], cost: 2,
  }),
  food('chicken-liver', 'Chicken liver fry', 'meat', [170, 18, 4, 9, 0.5], [['1 bowl', 120]], {
    aliases: ['kaleji', 'chicken kaleji', 'liver fry'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true,
  }),
  food('chicken-soup', 'Chicken soup', 'meat', [45, 4, 4, 1.5, 0.3], [['1 bowl', 250]], {
    aliases: ['sweet corn chicken soup', 'chicken clear soup', 'chicken shorba', 'chicken manchow soup'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], meals: ['dinner', 'snack', 'lunch'], cost: 1,
  }),
  food('chicken-haleem', 'Haleem', 'meat', [170, 10, 12, 9, 2], [['1 bowl', 250]], {
    aliases: ['hyderabadi haleem', 'mutton haleem', 'chicken haleem'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish', 'pulse', 'whole_grain'], cuisines: ['south_indian', 'north_indian'], cost: 2,
  }),
  food('chicken-pulao', 'Chicken / mutton yakhni pulao', 'rice', [185, 9, 22, 7, 0.8], [['1 plate', 280], ['1 cup', 160]], {
    aliases: ['yakhni pulao', 'chicken pulao', 'mutton pulao'], diet: 'nonveg', rootVeg: true, groups: ['refined_grain', 'meat_fish'], homemade: true, oil: true, cost: 2,
  }),
  food('chicken-sandwich', 'Chicken sandwich', 'snacks', [215, 12, 24, 8, 1.5], [['1 sandwich', 150]], {
    aliases: ['chicken mayo sandwich', 'grilled chicken sandwich'], diet: 'nonveg', allergens: ['gluten', 'egg'], groups: ['refined_grain', 'meat_fish'], veg: 0.1, meals: ['breakfast', 'snack', 'lunch'], cuisines: ['continental', ...ALL_INDIAN], cost: 2,
  }),
  food('chicken-burger', 'Chicken burger', 'snacks', [255, 12, 25, 12, 1.5], [['1 burger', 180]], {
    diet: 'nonveg', allergens: ['gluten', 'egg', 'dairy'], groups: ['refined_grain', 'meat_fish', 'fried'], meals: ['snack', 'lunch', 'dinner'], cuisines: ['continental', ...ALL_INDIAN], cost: 2,
  }),

  // ------------------------------------------------------------ Rolls, momos & Indo-Chinese
  food('chicken-shawarma', 'Chicken shawarma', 'snacks', [215, 12, 22, 9, 1.5], [['1 roll', 250], ['1 plate', 300]], {
    aliases: ['shawarma', 'chicken wrap'], diet: 'nonveg', rootVeg: true, allergens: ['gluten', 'egg'], groups: ['meat_fish', 'refined_grain'], veg: 0.1, meals: ['snack', 'lunch', 'dinner'], cuisines: ['continental', ...ALL_INDIAN], cost: 2,
  }),
  food('chicken-kathi-roll', 'Chicken kathi roll', 'snacks', [235, 11, 26, 10, 1.5], [['1 roll', 200]], {
    aliases: ['chicken roll', 'kathi roll', 'chicken frankie', 'frankie'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish', 'refined_grain'], veg: 0.1, meals: ['snack', 'lunch', 'dinner'], cuisines: ['east_indian', 'north_indian', 'west_indian'], cost: 2,
  }),
  food('egg-roll', 'Egg roll', 'snacks', [250, 9, 27, 12, 1.2], [['1 roll', 180]], {
    aliases: ['anda roll', 'egg frankie'], diet: 'egg', rootVeg: true, allergens: ['gluten', 'egg'], groups: ['egg', 'refined_grain', 'fried'], meals: ['snack', 'lunch', 'dinner'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('paneer-roll', 'Paneer roll', 'snacks', [250, 11, 25, 12, 1.5], [['1 roll', 200]], {
    aliases: ['paneer kathi roll', 'paneer frankie', 'paneer tikka roll'], rootVeg: true, allergens: ['dairy', 'gluten'], groups: ['dairy', 'refined_grain'], veg: 0.1, meals: ['snack', 'lunch', 'dinner'], cost: 2,
  }),
  food('chicken-momos', 'Chicken momos', 'indo_chinese', [175, 10, 22, 5, 1], [['6 momos', 150], ['10 momos', 250]], {
    aliases: ['momo', 'momos', 'chicken dumplings', 'steamed momos'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish', 'refined_grain'], meals: ['snack', 'dinner'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('veg-momos', 'Veg momos', 'indo_chinese', [160, 5, 26, 4, 1.5], [['6 momos', 150], ['10 momos', 250]], {
    aliases: ['veg dumplings', 'paneer momos'], diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['refined_grain', 'vegetable'], veg: 0.25, meals: ['snack', 'dinner'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('chicken-thukpa', 'Chicken thukpa', 'indo_chinese', [90, 6, 11, 2.5, 1], [['1 bowl', 300]], {
    aliases: ['thukpa', 'noodle soup'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish', 'refined_grain', 'vegetable'], veg: 0.15, meals: ['lunch', 'dinner'], cuisines: ['east_indian'],
  }),
  food('veg-thukpa', 'Veg thukpa', 'indo_chinese', [80, 3, 12, 2, 1], [['1 bowl', 300]], {
    diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['refined_grain', 'vegetable'], veg: 0.25, meals: ['lunch', 'dinner'], cuisines: ['east_indian'],
  }),
  food('chilli-chicken', 'Chilli chicken', 'indo_chinese', [205, 16, 10, 11, 1], [['1 plate', 200], ['1 small bowl', 120]], {
    aliases: ['chicken chilli', 'chicken manchurian', 'dragon chicken', 'chilli chicken gravy'], diet: 'nonveg', rootVeg: true, allergens: ['soy', 'gluten'], groups: ['meat_fish', 'fried'], veg: 0.1, cost: 2,
  }),
  food('chilli-paneer', 'Chilli paneer', 'indo_chinese', [230, 11, 12, 15, 1], [['1 plate', 180]], {
    aliases: ['paneer chilli'], rootVeg: true, allergens: ['dairy', 'soy', 'gluten'], groups: ['dairy', 'fried'], veg: 0.15, cost: 2,
  }),
  food('veg-manchurian', 'Veg / gobi manchurian', 'indo_chinese', [135, 3, 13, 8, 1.5], [['1 bowl', 180]], {
    aliases: ['gobi manchurian', 'manchurian', 'veg manchurian gravy'], diet: 'vegan', rootVeg: true, allergens: ['gluten', 'soy'], groups: ['vegetable', 'fried'], veg: 0.3,
  }),
  food('chicken-fried-rice', 'Chicken fried rice', 'indo_chinese', [180, 8, 24, 6, 1], [['1 plate', 300], ['1 cup', 180]], {
    aliases: ['chicken rice', 'schezwan chicken fried rice'], diet: 'nonveg', rootVeg: true, allergens: ['egg', 'soy'], groups: ['refined_grain', 'meat_fish'], veg: 0.1, cost: 2,
  }),
  food('egg-fried-rice', 'Egg fried rice', 'indo_chinese', [175, 6, 25, 6, 1], [['1 plate', 300], ['1 cup', 180]], {
    diet: 'egg', rootVeg: true, allergens: ['egg', 'soy'], groups: ['refined_grain', 'egg'], veg: 0.1,
  }),
  food('veg-fried-rice', 'Veg fried rice', 'indo_chinese', [165, 3.5, 26, 5, 1.2], [['1 plate', 300], ['1 cup', 180]], {
    aliases: ['fried rice', 'schezwan fried rice'], diet: 'vegan', rootVeg: true, allergens: ['soy'], groups: ['refined_grain', 'vegetable'], veg: 0.15,
  }),
  food('chicken-noodles', 'Chicken hakka noodles', 'indo_chinese', [180, 8, 22, 7, 1.2], [['1 plate', 300]], {
    aliases: ['chicken chowmein', 'chicken noodles'], diet: 'nonveg', rootVeg: true, allergens: ['gluten', 'soy'], groups: ['refined_grain', 'meat_fish'], veg: 0.1, cost: 2,
  }),
  food('veg-noodles', 'Veg hakka noodles', 'indo_chinese', [170, 4, 25, 6, 1.5], [['1 plate', 300]], {
    aliases: ['chowmein', 'chow mein', 'hakka noodles', 'veg noodles', 'schezwan noodles'], diet: 'vegan', rootVeg: true, allergens: ['gluten', 'soy'], groups: ['refined_grain', 'vegetable'], veg: 0.15,
  }),

  // ------------------------------------------------------------ Mutton, beef, pork
  food('mutton-seekh-kebab', 'Mutton seekh kebab', 'meat', [245, 17, 4, 18, 0.5], [['2 kebabs', 100], ['4 kebabs', 200]], {
    aliases: ['seekh kebab', 'mutton kebab', 'galouti kebab', 'kakori kebab'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], meals: ['lunch', 'dinner', 'snack'], cuisines: ['north_indian'], cost: 3,
  }),
  food('shami-kebab', 'Shami kebab', 'meat', [210, 16, 10, 12, 2], [['2 kebabs', 80]], {
    aliases: ['shami kabab'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish', 'pulse', 'fried'], meals: ['lunch', 'dinner', 'snack'], cuisines: ['north_indian'], cost: 2,
  }),
  food('mutton-biryani', 'Mutton biryani', 'rice', [200, 9, 21, 9, 1], [['1 plate', 300], ['1 cup', 160]], {
    aliases: ['hyderabadi biryani', 'gosht biryani', 'lucknowi biryani', 'kolkata biryani', 'dum biryani'], diet: 'nonveg', rootVeg: true, allergens: ['dairy'], groups: ['refined_grain', 'meat_fish'], homemade: true, oil: true, cost: 3,
  }),
  food('nihari', 'Nihari', 'meat', [195, 12, 5, 14, 0.5], [['1 bowl', 200]], {
    aliases: ['nalli nihari', 'mutton nihari', 'beef nihari'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['north_indian'], cost: 3,
  }),
  food('mutton-paya', 'Paya (trotters soup)', 'meat', [95, 8, 2, 6, 0.3], [['1 bowl', 250]], {
    aliases: ['paya', 'paya soup', 'trotters', 'aattukal soup'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, meals: ['breakfast', 'lunch', 'dinner'], cost: 2,
  }),
  food('mutton-sukka', 'Mutton fry / sukka', 'meat', [230, 20, 4, 15, 1], [['1 bowl', 150]], {
    aliases: ['mutton fry', 'mutton chukka', 'mutton pepper fry', 'bhuna gosht', 'mutton sukha'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cost: 3,
  }),
  food('keema-pav', 'Keema pav', 'meat', [230, 11, 22, 11, 2], [['1 plate (keema + 2 pav)', 250]], {
    aliases: ['kheema pav'], diet: 'nonveg', rootVeg: true, allergens: ['gluten'], groups: ['meat_fish', 'refined_grain'], veg: 0.1, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['west_indian'], cost: 2,
  }),
  food('beef-fry', 'Beef fry (Kerala style)', 'meat', [230, 22, 4, 14, 1], [['1 bowl', 150]], {
    aliases: ['kerala beef fry', 'beef ularthiyathu', 'beef roast', 'beef dry fry'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian', 'east_indian'], cost: 2,
  }),
  food('beef-curry', 'Beef curry', 'meat', [170, 16, 4, 10, 1], [['1 bowl', 180]], {
    aliases: ['beef masala', 'beef gravy'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian', 'east_indian'], cost: 2,
  }),
  food('pork-vindaloo', 'Pork vindaloo', 'meat', [205, 14, 4, 15, 0.8], [['1 bowl', 180]], {
    aliases: ['vindaloo', 'goan pork', 'pork sorpotel'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['west_indian'], cost: 2,
  }),
  food('pork-curry', 'Pork curry / fry', 'meat', [200, 15, 3, 14, 1], [['1 bowl', 180]], {
    aliases: ['pork with bamboo shoot', 'naga pork', 'pork fry', 'smoked pork', 'pork bhuna'], diet: 'nonveg', rootVeg: true, groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['east_indian'], cost: 2,
  }),

  // ------------------------------------------------------------ Fish & seafood
  food('goan-fish-curry', 'Goan fish curry', 'fish', [140, 11, 4, 9, 1], [['1 bowl', 180]], {
    aliases: ['xitt kodi', 'goan curry', 'fish curry rice'], diet: 'nonveg', rootVeg: true, allergens: ['fish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['west_indian'], cost: 2,
  }),
  food('fish-moilee', 'Kerala fish curry / moilee', 'fish', [150, 11, 4, 10, 0.8], [['1 bowl', 180]], {
    aliases: ['meen moilee', 'kerala fish curry', 'meen curry', 'fish molee', 'meen kuzhambu', 'chepala pulusu'], diet: 'nonveg', rootVeg: true, allergens: ['fish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian'], cost: 2,
  }),
  food('hilsa-curry', 'Ilish (hilsa) curry', 'fish', [210, 16, 3, 15, 0.3], [['1 piece with gravy', 150]], {
    aliases: ['ilish', 'ilish bhapa', 'shorshe ilish', 'hilsa', 'ilish macher jhol'], diet: 'nonveg', allergens: ['fish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['east_indian'], cost: 3,
  }),
  food('fish-tikka', 'Fish tikka', 'fish', [160, 20, 4, 7, 0.5], [['6 pieces', 150]], {
    aliases: ['tandoori fish', 'fish kebab', 'amritsari fish'], diet: 'nonveg', rootVeg: true, allergens: ['fish', 'dairy'], groups: ['meat_fish'], meals: ['lunch', 'dinner', 'snack'], cost: 3,
  }),
  food('fish-cutlet', 'Fish cutlet / chop', 'fish', [200, 11, 15, 11, 1], [['2 cutlets', 120]], {
    aliases: ['fish chop', 'macher chop', 'fish fingers'], diet: 'nonveg', rootVeg: true, allergens: ['fish', 'gluten'], groups: ['meat_fish', 'fried'], meals: ['snack', 'dinner'], cuisines: ['east_indian', 'south_indian'], cost: 2,
  }),
  food('prawns-fry', 'Prawns fry / roast', 'fish', [185, 19, 5, 10, 0.5], [['1 bowl', 120]], {
    aliases: ['prawn masala', 'jhinga fry', 'chemmeen roast', 'prawns roast', 'kolambi fry', 'chingri bhaja'], diet: 'nonveg', rootVeg: true, allergens: ['shellfish'], groups: ['meat_fish'], oil: true, cuisines: ['south_indian', 'west_indian', 'east_indian'], cost: 3,
  }),
  food('crab-curry', 'Crab curry', 'fish', [125, 12, 4, 7, 0.5], [['1 bowl', 180]], {
    aliases: ['crab masala', 'njandu curry', 'kekda curry'], diet: 'nonveg', rootVeg: true, allergens: ['shellfish'], groups: ['meat_fish'], homemade: true, oil: true, cuisines: ['south_indian', 'west_indian', 'east_indian'], cost: 3,
  }),
  food('dry-fish', 'Dry fish fry', 'fish', [295, 45, 2, 12, 0], [['1 small bowl', 50]], {
    aliases: ['sukat', 'karuvadu', 'sukhi machli', 'bombil fry', 'dried fish', 'shutki'], diet: 'nonveg', allergens: ['fish'], groups: ['meat_fish'], oil: true, cuisines: ['south_indian', 'west_indian', 'east_indian'],
  }),
  food('fish-biryani', 'Fish biryani', 'rice', [175, 9, 21, 6, 1], [['1 plate', 300]], {
    aliases: ['meen biryani'], diet: 'nonveg', rootVeg: true, allergens: ['fish', 'dairy'], groups: ['refined_grain', 'meat_fish'], homemade: true, oil: true, cost: 3,
  }),
  food('prawn-biryani', 'Prawn biryani', 'rice', [180, 9, 21, 6.5, 1], [['1 plate', 300]], {
    aliases: ['chemmeen biryani', 'prawns pulao'], diet: 'nonveg', rootVeg: true, allergens: ['shellfish', 'dairy'], groups: ['refined_grain', 'meat_fish'], homemade: true, oil: true, cost: 3,
  }),

  // ------------------------------------------------------------ Eggs
  food('egg-biryani', 'Egg biryani', 'rice', [180, 6, 24, 7, 1], [['1 plate', 300], ['1 cup', 160]], {
    aliases: ['anda biryani', 'muttai biryani'], diet: 'egg', rootVeg: true, allergens: ['egg', 'dairy'], groups: ['refined_grain', 'egg'], homemade: true, oil: true,
  }),
  food('fried-egg', 'Fried egg / half fry', 'eggs', [195, 13.6, 0.8, 15, 0], [['1 egg', 46], ['2 eggs', 92]], {
    aliases: ['half fry', 'bullseye', 'sunny side up', 'egg fry'], diet: 'egg', allergens: ['egg'], groups: ['egg'], oil: true, meals: ['breakfast', 'snack', 'lunch', 'dinner'],
  }),
  food('egg-dosa', 'Egg dosa', 'eggs', [185, 7, 24, 7, 1], [['1 dosa', 120]], {
    aliases: ['muttai dosa', 'egg dose', 'anda dosa'], diet: 'egg', allergens: ['egg'], groups: ['egg', 'refined_grain', 'pulse'], oil: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('egg-paratha', 'Egg paratha', 'eggs', [265, 9, 30, 12, 2], [['1 paratha', 120]], {
    aliases: ['anda paratha'], diet: 'egg', rootVeg: true, allergens: ['egg', 'gluten'], groups: ['egg', 'whole_grain'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['north_indian'],
  }),
  food('mughlai-paratha', 'Mughlai paratha', 'eggs', [295, 10, 28, 16, 1.5], [['1 piece', 150]], {
    aliases: ['moglai porota', 'egg stuffed paratha'], diet: 'egg', rootVeg: true, allergens: ['egg', 'gluten'], groups: ['egg', 'refined_grain', 'fried'], meals: ['snack', 'dinner', 'breakfast'], cuisines: ['east_indian'],
  }),
  food('egg-sandwich', 'Egg sandwich', 'eggs', [215, 10, 24, 9, 1.5], [['1 sandwich', 150]], {
    aliases: ['egg mayo sandwich', 'bread omelette'], diet: 'egg', allergens: ['egg', 'gluten'], groups: ['egg', 'refined_grain'], meals: ['breakfast', 'snack'], cuisines: ['continental', ...ALL_INDIAN],
  }),

  // ------------------------------------------------------------ Regional vegetarian
  food('chole-bhature', 'Chole bhature', 'breakfast', [265, 7, 30, 13, 3], [['1 plate (2 bhature + chole)', 350]], {
    aliases: ['chole bhature', 'bhatura', 'chana bhatura'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['refined_grain', 'pulse', 'fried'], meals: ['breakfast', 'lunch'], cuisines: ['north_indian'],
  }),
  food('aloo-tikki', 'Aloo tikki', 'snacks', [190, 3, 25, 9, 2.5], [['2 tikkis', 120]], {
    aliases: ['tikki chaat', 'aloo tikki chaat', 'ragda tikki'], diet: 'vegan', rootVeg: true, groups: ['fried'], meals: ['snack'], cuisines: ['north_indian'],
  }),
  food('dabeli', 'Dabeli', 'snacks', [240, 5, 35, 9, 3], [['1 dabeli', 120]], {
    aliases: ['kutchi dabeli'], rootVeg: true, allergens: ['gluten', 'peanut'], groups: ['refined_grain'], meals: ['snack'], cuisines: ['west_indian'],
  }),
  food('ragda-pattice', 'Ragda pattice', 'snacks', [170, 5, 22, 7, 3.5], [['1 plate', 200]], {
    aliases: ['ragda patties'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'fried'], meals: ['snack'], cuisines: ['west_indian'],
  }),
  food('chana-chaat', 'Chana chaat', 'snacks', [135, 7, 20, 3, 5], [['1 bowl', 150]], {
    aliases: ['chole chaat', 'kala chana chaat'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'vegetable'], veg: 0.2, meals: ['snack', 'breakfast'],
  }),
  food('litti-chokha', 'Litti chokha', 'breads', [265, 8, 38, 9, 6], [['2 litti with chokha', 250]], {
    aliases: ['litti', 'baati chokha'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['whole_grain', 'pulse', 'vegetable'], veg: 0.25, homemade: true, cuisines: ['east_indian'],
  }),
  food('dal-baati', 'Dal baati', 'breads', [295, 8, 35, 14, 4], [['1 plate (2 baati + dal)', 300]], {
    aliases: ['dal bati', 'dal baati churma', 'baati'], rootVeg: true, allergens: ['gluten', 'dairy'], groups: ['whole_grain', 'pulse'], homemade: true, oil: true, cuisines: ['west_indian', 'north_indian'],
  }),
  food('sattu-paratha', 'Sattu paratha', 'breads', [290, 10, 40, 10, 6], [['1 paratha', 100]], {
    aliases: ['sattu ka paratha'], rootVeg: true, allergens: ['gluten'], groups: ['whole_grain', 'pulse'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('thalipeeth', 'Thalipeeth', 'breads', [265, 9, 40, 8, 6], [['1 thalipeeth', 100]], {
    aliases: ['thalipith', 'bhajani thalipeeth'], diet: 'vegan', rootVeg: true, groups: ['whole_grain', 'pulse'], homemade: true, oil: true, meals: ['breakfast', 'dinner'], cuisines: ['west_indian'],
  }),
  food('akki-roti', 'Akki roti', 'breads', [220, 3.5, 40, 5, 2], [['1 roti', 80]], {
    aliases: ['rice roti', 'rice bhakri'], diet: 'vegan', rootVeg: true, groups: ['refined_grain'], veg: 0.1, homemade: true, oil: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('ladi-pav', 'Pav (bread roll)', 'breads', [280, 9, 50, 4.5, 2.5], [['1 pav', 40], ['2 pav', 80]], {
    aliases: ['pav', 'ladi pav', 'bun', 'pao'], allergens: ['gluten'], groups: ['refined_grain'], meals: ['breakfast', 'snack', 'lunch', 'dinner'], cuisines: ['west_indian'],
  }),
  food('kadala-curry', 'Kadala curry', 'dal', [145, 7, 16, 6, 5], [['1 bowl', 160]], {
    aliases: ['black chana curry', 'kala chana curry', 'kadala', 'puttu kadala'], diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true, meals: ['breakfast', 'lunch', 'dinner'], cuisines: ['south_indian'],
  }),
  food('zunka', 'Zunka / pithla', 'dal', [150, 8, 14, 7, 4], [['1 bowl', 150]], {
    aliases: ['pithla', 'pitla', 'zunka bhakar', 'jhunka'], diet: 'vegan', rootVeg: true, groups: ['pulse'], homemade: true, oil: true, cuisines: ['west_indian'],
  }),
  food('undhiyu', 'Undhiyu', 'sabzi', [150, 4, 14, 9, 4], [['1 bowl', 150]], {
    aliases: ['oondhiyu'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.6, homemade: true, oil: true, cuisines: ['west_indian'],
  }),
  food('sev-tameta', 'Sev tameta nu shaak', 'sabzi', [155, 4, 12, 10, 2.5], [['1 bowl', 150]], {
    aliases: ['sev tamatar', 'sev tamatar sabzi'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.5, homemade: true, oil: true, cuisines: ['west_indian'],
  }),
  food('veg-stew', 'Vegetable stew (Kerala)', 'sabzi', [95, 2, 8, 6, 2], [['1 bowl', 180]], {
    aliases: ['kerala stew', 'vegetable ishtu', 'appam stew'], diet: 'vegan', rootVeg: true, groups: ['vegetable'], veg: 0.55, homemade: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('puttu', 'Puttu', 'breakfast', [190, 4, 40, 2, 2.5], [['1 piece', 120]], {
    aliases: ['rice puttu'], diet: 'vegan', groups: ['refined_grain'], meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('neer-dosa', 'Neer dosa', 'breakfast', [130, 2.5, 25, 2.5, 0.6], [['2 dosas', 100], ['4 dosas', 200]], {
    diet: 'vegan', groups: ['refined_grain'], meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('rava-dosa', 'Rava dosa', 'breakfast', [200, 4, 28, 8, 1], [['1 dosa', 100]], {
    aliases: ['onion rava dosa'], diet: 'vegan', rootVeg: true, allergens: ['gluten'], groups: ['refined_grain'], oil: true, meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('set-dosa', 'Set dosa', 'breakfast', [170, 4, 30, 4, 1.2], [['3 dosas', 150]], {
    aliases: ['sponge dosa'], diet: 'vegan', groups: ['refined_grain', 'pulse'], meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('idiyappam', 'Idiyappam', 'breakfast', [130, 2, 30, 0.5, 0.8], [['3 idiyappam', 120]], {
    aliases: ['string hoppers', 'sevai', 'nool puttu'], diet: 'vegan', groups: ['refined_grain'], meals: ['breakfast', 'dinner'], cuisines: ['south_indian'],
  }),
  food('vada-sambar', 'Vada sambar', 'breakfast', [155, 5, 18, 7, 2.5], [['2 vadas with sambar', 250]], {
    aliases: ['sambar vada', 'medu vada sambar'], diet: 'vegan', rootVeg: true, groups: ['pulse', 'fried', 'vegetable'], veg: 0.1, meals: ['breakfast', 'snack'], cuisines: ['south_indian'],
  }),
  food('handvo', 'Handvo', 'breakfast', [210, 7, 25, 9, 3], [['2 pieces', 120]], {
    allergens: ['dairy'], groups: ['pulse', 'refined_grain'], veg: 0.1, homemade: true, meals: ['breakfast', 'snack'], cuisines: ['west_indian'],
  }),
  food('khandvi', 'Khandvi', 'snacks', [160, 7, 15, 8, 1.5], [['6 pieces', 100]], {
    aliases: ['patuli', 'suralichi vadi'], allergens: ['dairy'], groups: ['pulse'], homemade: true, meals: ['snack', 'breakfast'], cuisines: ['west_indian'],
  }),
  food('fafda', 'Fafda', 'snacks', [500, 12, 50, 28, 5], [['50 g', 50]], {
    aliases: ['fafda jalebi'], diet: 'vegan', groups: ['pulse', 'fried'], meals: ['breakfast', 'snack'], cuisines: ['west_indian'],
  }),
  food('sol-kadhi', 'Sol kadhi', 'beverages', [75, 1, 4, 6, 0.5], [['1 glass (200 ml)', 200]], {
    aliases: ['kokum kadhi'], diet: 'vegan', unit: 'ml', meals: ['lunch', 'dinner', 'beverage'], cuisines: ['west_indian'],
  }),

  // ------------------------------------------------------------ Regional sweets
  food('modak', 'Modak / kozhukattai', 'sweets', [225, 3, 40, 6, 2], [['2 pieces', 100]], {
    aliases: ['ukadiche modak', 'kozhukattai', 'kudumu'], allergens: ['dairy'], groups: ['sweet'], homemade: true, meals: ['snack'], cuisines: ['west_indian', 'south_indian'],
  }),
  food('ras-malai', 'Ras malai', 'sweets', [195, 7, 22, 9, 0], [['2 pieces', 100]], {
    aliases: ['rasmalai'], allergens: ['dairy', 'tree_nut'], groups: ['sweet', 'dairy'], meals: ['snack', 'dinner'], cuisines: ['east_indian', 'north_indian'],
  }),
  food('mishti-doi', 'Mishti doi', 'sweets', [120, 4, 18, 3.5, 0], [['1 cup', 100]], {
    aliases: ['sweet curd', 'meetha dahi'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['snack', 'lunch', 'dinner'], cuisines: ['east_indian'],
  }),
  food('sandesh', 'Sandesh', 'sweets', [280, 10, 40, 9, 0], [['2 pieces', 50]], {
    aliases: ['sondesh'], allergens: ['dairy'], groups: ['sweet', 'dairy'], meals: ['snack'], cuisines: ['east_indian'],
  }),
  food('puran-poli', 'Puran poli', 'sweets', [300, 7, 50, 8, 4], [['1 poli', 80]], {
    aliases: ['obbattu', 'holige', 'bobbatlu'], allergens: ['gluten', 'dairy'], groups: ['sweet', 'pulse'], homemade: true, meals: ['lunch', 'snack'], cuisines: ['west_indian', 'south_indian'],
  }),
];

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  breads: 'Roti & breads',
  rice: 'Rice dishes',
  dal: 'Dal & pulses',
  curry: 'Curries',
  sabzi: 'Sabzi',
  breakfast: 'Breakfast & tiffin',
  dairy: 'Dairy',
  eggs: 'Eggs',
  meat: 'Chicken & meat',
  fish: 'Fish & seafood',
  fruit: 'Fruit',
  nuts: 'Nuts & seeds',
  snacks: 'Snacks',
  sweets: 'Sweets',
  beverages: 'Drinks',
  salad: 'Salads & raw veg',
  indo_chinese: 'Indo-Chinese & momos',
  extras: 'Sides & extras',
};
