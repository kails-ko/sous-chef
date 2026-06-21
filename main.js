'use strict';

const { Plugin, Notice, TFile, Modal, Setting } = require('obsidian');

const SHOPPING_LIST_PATH = 'Recipes/Shopping List.md';
const MEALPLAN_TAG = 'mealplan';

// ── auto-tag rules ────────────────────────────────────────────────────────────

const TAG_RULES = [
  // Asian: require cuisine names or unambiguously Asian ingredients/dishes
  { tag: 'asian', keywords: ['soy sauce','miso','ramen','sushi','teriyaki','hoisin',
      'fish sauce','thai','chinese','japanese','korean','vietnamese','asian',
      'bok choy','sriracha','ponzu','mirin','sake','stir fry','stir-fry',
      'dashi','kimchi','bibimbap','pho','pad thai','banh mi','dim sum','gyoza','tempura',
      'shaoxing','rice wine','scallion pancake','spring roll','dumpling','gochujang',
      'sesame oil','toasted sesame','rice noodle','glass noodle','udon','soba'] },
  { tag: 'latin', keywords: ['tortilla','salsa','taco','burrito','enchilada','tamale',
      'quesadilla','chorizo','chipotle','tomatillo','mexican','latin','peruvian','cuban',
      'colombian','sofrito','adobo','plantain','yuca','empanada','ceviche','mole',
      'pozole','arroz con','frijoles'] },
  { tag: 'italian', keywords: ['pasta','marinara','pesto','risotto','pizza','italian',
      'prosciutto','pancetta','gnocchi','lasagna','fettuccine','spaghetti','linguine',
      'penne','rigatoni','carbonara','bolognese','arrabbiata','osso buco','bruschetta',
      'antipasto','polenta','cacciatore','saltimbocca'] },
  { tag: 'mediterranean', keywords: ["tahini","hummus","za'atar","sumac","greek",
      'mediterranean','turkish','lebanese','moroccan','harissa','shawarma','falafel',
      'tabbouleh','baba ganoush','dolma','spanakopita','moussaka','tzatziki'] },
  { tag: 'breakfast', keywords: ['pancake','waffle','oatmeal','french toast','hash brown',
      'crepe','breakfast','brunch','frittata','quiche','granola','overnight oats',
      'smoothie bowl','eggs benedict','hollandaise','scone','breakfast burrito'] },
  { tag: 'dessert', keywords: ['chocolate cake','layer cake','birthday cake','carrot cake',
      'cookie dough','brownie','pie crust','pie filling','tart shell','pudding','ice cream',
      'dessert','frosting','icing','buttercream','caramel sauce','pastry cream','custard',
      'mousse','ganache','truffle','tiramisu','cheesecake','macaron','éclair','profiterole',
      'crème brûlée','panna cotta','baklava','churro','donut','cobbler','fruit crisp',
      'crumble topping','confection','candy','fudge','brittle','toffee','meringue',
      'pavlova','shortbread','biscotti','madeleine','financier','clafoutis'] },
  { tag: 'quick', keywords: ['15 min','20 min','25 min','30 min','quick','easy','fast',
      'simple','weeknight','one pan','one pot','sheet pan','15-minute','20-minute',
      '30-minute','under 30','under an hour','no-cook'] },
  { tag: 'dinner', keywords: ['dinner','entrée','main course','main dish','supper','roast',
      'braise','casserole','pot roast','sunday roast'] },
  // lunch: no 'wrap' (cooking verb) or 'bowl' (too generic)
  { tag: 'lunch', keywords: ['lunch','sandwich','grain bowl','buddha bowl','sub','panini',
      'tartine','croque'] },
  { tag: 'side', keywords: ['side dish','side salad','accompaniment','pilaf','roasted veg',
      'roasted vegetable','coleslaw','slaw','garnish'] },
  { tag: 'soup', keywords: ['soup','stew','chili','chowder','bisque','consommé','ramen',
      'pho','minestrone','gazpacho','gumbo','bouillabaisse','broth-based'] },
  { tag: 'salad', keywords: ['salad','slaw','vinaigrette','caesar','cobb','nicoise',
      'caprese','waldorf','greek salad'] },
  { tag: 'vegetarian', keywords: ['vegetarian','vegan','plant-based','meatless','meat-free',
      'dairy-free','egg-free'] },
  { tag: 'baking', keywords: ['bake','baked','baking','bread dough','sourdough starter',
      'yeast dough','laminated dough','pie dough','tart shell','puff pastry','choux',
      'shortcrust','crumble','streusel','proof','proofing','knead','kneading',
      'fold dough','shape loaf','bench rest','oven spring','baking powder','baking soda',
      'active dry yeast','instant yeast','bread flour','cake flour','pastry flour',
      'all-purpose flour','room temperature butter','creaming','folding batter',
      'baking sheet','loaf pan','bundt','springform','muffin tin','biscuit','scone',
      'shortbread','croissant','danish','brioche','focaccia','sourdough','cinnamon roll',
      'sticky bun','pull-apart','coffee cake','pound cake','angel food','chiffon cake',
      'sponge cake','genoise','financier','madeleine','biscotti','brownie','blondie',
      'bar cookie','cookie','drop cookie','rolled cookie','sandwich cookie'] },
];

// Only scan title + headings + ingredient list to avoid false positives from
// related recipe links, comments, and other surrounding page content.
function suggestTags(title, content) {
  const lines = content.split('\n');

  // Collect headings (H1–H3) and ingredient checklist lines
  const relevant = [];
  let inIngredients = false;
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      relevant.push(line);
      inIngredients = /^#{1,4}\s+ingredients?/i.test(line);
      continue;
    }
    if (/^#{1,4}\s+/.test(line) && inIngredients) inIngredients = false;
    if (inIngredients && /^- /.test(line)) relevant.push(line);
  }

  const haystack = (title + ' ' + relevant.join(' ')).toLowerCase();
  return TAG_RULES
    .filter(({ keywords }) => keywords.some(kw => haystack.includes(kw)))
    .map(({ tag }) => tag);
}

// ── categories ────────────────────────────────────────────────────────────────
// Keywords are matched longest-first across all categories so compound terms like
// "oyster sauce" or "chicken stock" beat shorter substrings like "oyster" or "chicken".

const CATEGORIES = [
  {
    name: 'Produce', emoji: '🥦',
    keywords: ['granny smith apple','fuji apple','apple','banana','navel orange','orange',
      'lemon','lime','avocado','cherry tomato','grape tomato','roma tomato','tomato',
      'russet potato','yukon gold potato','sweet potato','potato','yellow onion',
      'red onion','white onion','onion','garlic clove','garlic','fresh ginger','ginger',
      'carrot','celery stalk','celery','baby spinach','spinach','romaine','butter lettuce',
      'iceberg lettuce','lettuce','kale','arugula','broccoli floret','broccoli',
      'cauliflower','zucchini','cucumber','red bell pepper','green bell pepper',
      'yellow bell pepper','bell pepper','jalapeño','serrano','habanero','fresh cilantro',
      'cilantro','fresh parsley','parsley','fresh basil','basil','fresh dill','dill',
      'fresh thyme','thyme','fresh rosemary','rosemary','fresh mint','mint','fresh chive',
      'chive','scallion','green onion','shallot','leek','cremini mushroom','shiitake',
      'portobello','mushroom','eggplant','butternut squash','acorn squash','pumpkin',
      'beet','radish','asparagus','artichoke','corn on the cob','corn','string bean',
      'green bean','snap pea','snow pea','wax bean','bean sprout','yam','tomatillo',
      'plantain','mango','pineapple','watermelon','cantaloupe','honeydew','fig',
      'cherry','pear','peach','plum','apricot','nectarine','pomegranate','papaya',
      'guava','persimmon','quince','strawberry','blueberry','raspberry','blackberry',
      'grape','bok choy','napa cabbage','green cabbage','red cabbage','cabbage',
      'brussels sprout','turnip','parsnip','fennel bulb','fennel','endive','radicchio',
      'watercress','fresh herb'],
  },
  {
    name: 'Meat & Seafood', emoji: '🥩',
    keywords: ['chicken thigh','chicken breast','chicken wing','chicken leg','ground chicken',
      'whole chicken','rotisserie chicken','chicken','beef chuck','ground beef','beef brisket',
      'beef short rib','beef tenderloin','sirloin','ribeye','flank steak','skirt steak',
      'beef','pork belly','pork shoulder','pork chop','pork tenderloin','ground pork',
      'pork','lamb chop','lamb shoulder','ground lamb','rack of lamb','lamb','turkey breast',
      'ground turkey','turkey','duck breast','duck leg','duck','veal','bacon','sausage',
      'ham','pepperoni','prosciutto','pancetta','chorizo','salami','lardons','hot dog',
      'chuck roast','pot roast','meatball','brisket','venison','bison','rabbit','quail',
      'shrimp','salmon fillet','salmon','tuna steak','tuna','cod','tilapia','halibut',
      'crab','lobster','scallop','clam','mussel','fresh oyster','raw oyster','oyster',
      'anchovy','sardine','squid','octopus','mackerel','trout','catfish','snapper',
      'mahi','swordfish','ahi','lox','smoked salmon','gravlax','fish fillet','fish'],
  },
  {
    name: 'Refrigerated & Deli', emoji: '🧀',
    keywords: ['kimchi','tofu','tempeh','seitan','rice cake','rice cakes','tteok','fresh pasta',
      'fresh tortilla','fresh ravioli','fresh gnocchi','fresh mozzarella','burrata',
      'labneh','deli turkey','deli ham','lunch meat','deli meat','pastrami','bologna',
      'fresh kimchi','refrigerated biscuit','refrigerated dough','cured fish'],
  },
  {
    name: 'Dairy & Eggs', emoji: '🥛',
    keywords: ['whole milk','skim milk','2% milk','oat milk','almond milk','soy milk',
      'coconut milk beverage','milk','heavy whipping cream','heavy cream','whipping cream',
      'half-and-half','sour cream','cream cheese','cream','unsalted butter','salted butter',
      'butter','parmesan','mozzarella','cheddar','ricotta','feta','brie','gouda','gruyere',
      'buttermilk','ghee','condensed milk','evaporated milk','kefir','cottage cheese',
      'mascarpone','goat cheese','provolone','colby','monterey jack','queso','crème fraîche',
      'beurre blanc','cheese','egg yolk','egg white','whole egg','large egg','egg','yogurt'],
  },
  {
    name: 'Oils & Condiments', emoji: '🫒',
    keywords: ['extra virgin olive oil','olive oil','vegetable oil','canola oil',
      'refined coconut oil','coconut oil','toasted sesame oil','sesame oil','avocado oil',
      'grapeseed oil','peanut oil','truffle oil','chili oil','cooking spray',
      'apple cider vinegar','balsamic vinegar','rice wine vinegar','rice vinegar',
      'red wine vinegar','white wine vinegar','sherry vinegar','distilled vinegar','vinegar',
      'soy sauce','tamari','dark soy sauce','light soy sauce','fish sauce','oyster sauce',
      'hoisin sauce','teriyaki sauce','worcestershire sauce','worcestershire',
      'hot sauce','sriracha','sambal','chili garlic sauce','gochujang',
      'ketchup','dijon mustard','whole grain mustard','yellow mustard','mustard',
      'mayonnaise','aioli','ranch dressing','caesar dressing','salad dressing',
      'miso paste','miso','ponzu','liquid smoke','shaoxing wine','rice wine',
      'cooking wine','neutral oil','oil'],
  },
  {
    name: 'Pantry & Dry Goods', emoji: '🌾',
    keywords: ['chicken stock','chicken broth','beef stock','beef broth','vegetable stock',
      'vegetable broth','fish stock','fish broth','bone broth','stock','broth','bouillon',
      'cornmeal','corn starch','cornstarch','corn flour','all-purpose flour','bread flour',
      'cake flour','whole wheat flour','almond flour','oat flour','potato starch',
      'arrowroot starch','arrowroot','baking powder','baking soda','active dry yeast',
      'instant yeast','yeast','flour','granulated sugar','brown sugar','powdered sugar',
      'confectioners sugar','sugar','white rice','brown rice','jasmine rice','basmati rice',
      'arborio rice','rice','pasta','egg noodle','rice noodle','glass noodle','soba noodle',
      'udon noodle','noodle','rolled oat','steel-cut oat','oatmeal','oat','quinoa',
      'couscous','barley','farro','bulgur','vital wheat gluten','vanilla extract',
      'vanilla bean','vanilla','cocoa powder','dark chocolate','bittersweet chocolate',
      'semisweet chocolate','white chocolate','chocolate chip','chocolate','honey',
      'maple syrup','molasses','agave','almond','walnut','pecan','cashew','pistachio',
      'pine nut','pumpkin seed','sunflower seed','flaxseed','chia seed','sesame seed',
      'hemp seed','seed','raisin','dried cranberry','dried apricot','dried fig',
      'shredded coconut','coconut flakes','desiccated coconut','panko','breadcrumb',
      'bread crumb','gelatin','tapioca','dried lentil','dried chickpea','dried bean',
      'dried black bean','dried kidney bean'],
  },
  {
    name: 'Bakery & Bread', emoji: '🍞',
    keywords: ['sourdough bread','rye bread','whole wheat bread','white bread',
      'sandwich bread','dinner roll','hamburger bun','hot dog bun','bun','baguette',
      'flour tortilla','corn tortilla','tortilla','pita bread','naan bread','naan',
      'bagel','english muffin','focaccia','pumpernickel','ciabatta','brioche',
      'croissant','graham cracker','saltine','cracker','flatbread','lavash',
      'injera','challah','pretzel','breadstick','pita','bread'],
  },
  {
    name: 'Canned & Jarred', emoji: '🫙',
    keywords: ['canned tomato','tomato paste','tomato sauce','diced tomato','crushed tomato',
      'whole peeled tomato','canned coconut milk','coconut cream','canned chickpea',
      'canned black bean','canned kidney bean','canned lentil','canned tuna','canned salmon',
      'canned corn','canned pumpkin','jarred olive','jarred caper','jarred roasted pepper',
      'jarred artichoke','sun-dried tomato','olive','caper','jam','jelly','preserve',
      'peanut butter','almond butter','sunflower butter','tahini','salsa','tapenade',
      'chutney','applesauce','pickle','gherkin'],
  },
  {
    name: 'Spices & Seasonings', emoji: '🧂',
    keywords: ['kosher salt','sea salt','fleur de sel','black pepper','white pepper',
      'red pepper flake','chili flake','cayenne pepper','chili powder','smoked paprika',
      'sweet paprika','paprika','ground cumin','cumin seed','cumin','ground coriander',
      'coriander seed','coriander','ground turmeric','turmeric','ground cinnamon',
      'cinnamon stick','cinnamon','ground nutmeg','nutmeg','ground cardamom','cardamom',
      'ground cloves','ground clove','whole cloves','whole clove','clove','allspice',
      'bay leaves','bay leaf','dried oregano','oregano',
      'dried thyme','dried rosemary','dried basil','dried dill','dried marjoram','marjoram',
      'dried sage','sage','caraway seed','mustard seed','curry powder','garam masala',
      "za'atar",'sumac','saffron','star anise','five spice','onion powder','garlic powder',
      'celery seed','fennel seed','poppy seed','italian seasoning','old bay',
      'cajun seasoning','everything bagel seasoning','seasoning blend','salt'],
  },
  {
    name: 'Beverages', emoji: '🍵',
    keywords: ['dry white wine','white wine','dry red wine','red wine','rosé wine','wine',
      'lager','ale','beer','orange juice','apple juice','lemon juice','lime juice','juice',
      'sparkling water','club soda','soda water','soda','brewed coffee','espresso','coffee',
      'green tea','black tea','herbal tea','tea','kombucha','hard cider','apple cider',
      'sake','mirin','dry vermouth','sweet vermouth','vermouth','bourbon','rye whiskey',
      'whiskey','dark rum','white rum','rum','vodka','gin','tequila','triple sec','liqueur',
      'coconut water'],
  },
  { name: 'Other', emoji: '🛒', keywords: [] },
];

// Pre-sort all keywords longest-first so compound phrases beat shorter substrings
const SORTED_KEYWORDS = [];
for (const cat of CATEGORIES) {
  for (const kw of cat.keywords) SORTED_KEYWORDS.push({ kw, category: cat.name });
}
SORTED_KEYWORDS.sort((a, b) => b.kw.length - a.kw.length);

function wordMatch(str, kw) {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Require a word-start boundary before the keyword, but allow plurals/suffixes after.
  // Longest-first sorting ensures "cornmeal" beats "corn" before this looseness matters.
  return new RegExp(`(?<![a-z])${escaped}`, 'i').test(str);
}

function categorize(ingredientStr) {
  const lower = ingredientStr.toLowerCase();
  for (const { kw, category } of SORTED_KEYWORDS) {
    if (wordMatch(lower, kw)) return category;
  }
  return 'Other';
}

// ── unit normalization ────────────────────────────────────────────────────────

const UNIT_CANONICAL = {
  'cup':'cup','cups':'cup','tbsp':'tbsp','tablespoon':'tbsp','tablespoons':'tbsp',
  'tsp':'tsp','teaspoon':'tsp','teaspoons':'tsp','oz':'oz','ounce':'oz','ounces':'oz',
  'lb':'lb','lbs':'lb','pound':'lb','pounds':'lb','g':'g','gram':'g','grams':'g',
  'kg':'kg','kilogram':'kg','kilograms':'kg','ml':'ml','milliliter':'ml','milliliters':'ml',
  'l':'l','liter':'l','liters':'l','clove':'clove','cloves':'clove','slice':'slice',
  'slices':'slice','can':'can','cans':'can','bunch':'bunch','bunches':'bunch',
  'pinch':'pinch','pinches':'pinch','dash':'dash','dashes':'dash','handful':'handful',
  'handfuls':'handful','stick':'stick','sticks':'stick','sprig':'sprig','sprigs':'sprig',
  'head':'head','heads':'head','package':'package','packages':'package','pkg':'package',
};

const UNIT_PLURAL = {
  'cup':'cups','tbsp':'tbsp','tsp':'tsp','oz':'oz','lb':'lb','g':'g','kg':'kg',
  'ml':'ml','l':'l','clove':'cloves','slice':'slices','can':'cans','bunch':'bunches',
  'pinch':'pinches','dash':'dashes','handful':'handfuls','stick':'sticks',
  'sprig':'sprigs','head':'heads','package':'packages',
};

const UNITS_PATTERN = Object.keys(UNIT_CANONICAL).join('|');

// ── fraction parsing ──────────────────────────────────────────────────────────

const UNICODE_FRACTIONS = {
  '½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3',
  '⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8',
};

function parseFraction(str) {
  str = str.trim().replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, m => UNICODE_FRACTIONS[m] || m);
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function formatQuantity(qty) {
  if (qty === null || qty === undefined) return '';
  const whole = Math.floor(qty);
  const remainder = qty - whole;
  const FRAC_SYMS = [
    [1/8,'⅛'],[1/4,'¼'],[1/3,'⅓'],[3/8,'⅜'],[1/2,'½'],
    [5/8,'⅝'],[2/3,'⅔'],[3/4,'¾'],[7/8,'⅞'],
  ];
  if (remainder < 0.01) return String(whole || '');
  for (const [val, sym] of FRAC_SYMS) {
    if (Math.abs(remainder - val) < 0.02) return whole > 0 ? `${whole} ${sym}` : sym;
  }
  return qty.toFixed(2).replace(/\.?0+$/, '');
}

// ── ingredient parsing ────────────────────────────────────────────────────────

const QTY_TOKEN = `(?:(?:\\d+\\s+)?(?:\\d+\\/\\d+|[½¼¾⅓⅔⅛⅜⅝⅞]|\\d+(?:\\.\\d+)?))`;
const INGREDIENT_RE = new RegExp(
  `^(${QTY_TOKEN})?\\s*(?:(${UNITS_PATTERN})\\.?\\s+)?(.+)$`, 'i'
);

function parseIngredient(text) {
  const cleaned = text.replace(/\*\*?|__?/g, '').trim();
  const m = cleaned.match(INGREDIENT_RE);
  if (!m) return { qty: null, unit: null, name: cleaned.toLowerCase(), original: text };
  const qty = m[1] ? parseFraction(m[1]) : null;
  const rawUnit = m[2] ? m[2].toLowerCase() : null;
  const unit = rawUnit ? (UNIT_CANONICAL[rawUnit] || rawUnit) : null;
  const PREP_RE = /^(?:minced|finely minced|freshly minced|chopped|finely chopped|coarsely chopped|roughly chopped|thinly sliced|thickly sliced|sliced|diced|small diced|medium diced|crushed|grated|freshly grated|finely grated|shredded|julienned|halved|quartered|peeled|trimmed|packed|lightly packed|heaping|fresh|dried|ground|whole|large|small|medium|extra large|extra-large)\s+/i;
  let name = (m[3] || cleaned).toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ') // strip parenthetical modifiers
    .replace(/,.*$/, '')             // strip trailing comma clauses
    .replace(/\s+/g, ' ')
    .trim();
  // Strip leading prep/size words (may need multiple passes for "finely minced fresh")
  let prev;
  do { prev = name; name = name.replace(PREP_RE, '').trim(); } while (name !== prev);
  return { qty, unit, name, original: text };
}

// ── aggregation ───────────────────────────────────────────────────────────────

function aggregateIngredients(allIngredients) {
  const map = new Map();

  for (const raw of allIngredients) {
    const parsed = parseIngredient(raw);
    if (shouldSkip(parsed.name)) continue;
    if (!map.has(parsed.name)) map.set(parsed.name, []);
    map.get(parsed.name).push({ qty: parsed.qty, unit: parsed.unit });
  }

  const results = [];

  for (const [name, entries] of map.entries()) {
    const byUnit = new Map();
    for (const { qty, unit } of entries) {
      const key = unit || '';
      if (!byUnit.has(key)) byUnit.set(key, { qty: 0, unit, hasQty: false });
      const bucket = byUnit.get(key);
      if (qty !== null) { bucket.qty += qty; bucket.hasQty = true; }
    }

    const parts = Array.from(byUnit.values()).map(({ qty, unit, hasQty }) => {
      const qtyStr = hasQty ? formatQuantity(qty) : '';
      const unitStr = unit ? (hasQty && qty > 1 ? (UNIT_PLURAL[unit] || unit) : unit) : '';
      return [qtyStr, unitStr].filter(Boolean).join(' ');
    }).filter(Boolean);

    const quantityExpr = parts.join(' + ');
    results.push(quantityExpr ? `${quantityExpr} ${name}` : name);
  }

  return results.sort((a, b) => a.localeCompare(b));
}

// ── skip list ─────────────────────────────────────────────────────────────────
// Ingredients too generic to be worth putting on a shopping list.
// Matched against the parsed ingredient name (after quantity/unit are stripped).

const SKIP_INGREDIENTS = new Set([
  // water
  'water','cold water','warm water','hot water','boiling water','ice water','ice cubes','ice',
  // salt
  'salt','kosher salt','table salt','sea salt','fine salt','coarse salt','flaky salt',
  // pepper
  'pepper','black pepper','ground black pepper','freshly ground black pepper',
  'freshly ground pepper','ground pepper','white pepper','ground white pepper',
  'cracked black pepper','cracked pepper',
  // salt & pepper together
  'salt and pepper','salt and black pepper','salt & pepper',
  // generic oils
  'oil','neutral oil','vegetable oil','canola oil','cooking oil','any neutral oil',
  'any cooking oil','light olive oil',
]);

function shouldSkip(parsedName) {
  return SKIP_INGREDIENTS.has(parsedName.toLowerCase().trim());
}

// ── extraction helpers ────────────────────────────────────────────────────────

function extractUncheckedItems(content) {
  return content.split('\n')
    .filter(line => /^- \[ \] /.test(line))
    .map(line => line.replace(/^- \[ \] /, '').trim())
    .filter(Boolean);
}

function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) → text
    .replace(/\*\*?|__?|`/g, '')              // bold, italic, code
    // Normalise range quantities ("½ -3/4", "1-2", "1 to 2") → keep first value only
    .replace(/([½¼¾⅓⅔⅛⅜⅝⅞\d])\s*(?:–|-|to)\s*[½¼¾⅓⅔⅛⅜⅝⅞\d\/]+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractIngredients(content) {
  return content.split('\n')
    .filter(line => /^- \[ \] /.test(line))
    .map(line => stripMarkdown(line.replace(/^- \[ \] /, '')))
    .filter(Boolean);
}

// ── recipe cleanup helpers ────────────────────────────────────────────────────

// Scan a window of text after a label match so label+value can span lines.
function windowAfter(plain, labelRe, windowSize = 120) {
  const m = plain.match(labelRe);
  if (!m) return null;
  return plain.slice(m.index + m[0].length, m.index + m[0].length + windowSize);
}

function cleanPlain(content) {
  return content
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // markdown links → text only
    .replace(/\*\*?|__?|`|\|/g, ' ')           // bold, italic, code, pipes
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ');
}

// Returns total minutes as an integer, or null if not found.
function extractCookTime(content) {
  const plain = cleanPlain(content);

  const labels = [
    /total\s+time/i,       // "Total Time" — most specific, try first
    /\btotal\b/i,          // bare "Total" label
    /cook(?:ing)?\s*time/i,
    /\bbake\b/i,           // "Bake" used on some sites instead of "Cook Time"
    /prep\s*(?:\+|and|&)\s*cook/i,
  ];

  for (const label of labels) {
    const win = windowAfter(plain, label);
    if (!win) continue;

    // "X hour(s) Y min(s)" — with unit words
    const withUnits = win.match(/(\d+)\s*(?:hours?|hrs?)\s*(\d+)\s*(?:minutes?|mins?)/i);
    if (withUnits) return parseInt(withUnits[1]) * 60 + parseInt(withUnits[2]);

    // "X hour(s)" alone
    const hoursOnly = win.match(/(\d+)\s*(?:hours?|hrs?)\b/i);
    if (hoursOnly) {
      // Check if another number follows (could be minutes without unit label: "12 40")
      const trailing = win.slice(win.search(/\d+\s*(?:hours?|hrs?)/i)).replace(/\d+\s*(?:hours?|hrs?)/i, '');
      const trailingMin = trailing.match(/^\s*(\d+)\b/);
      if (trailingMin) return parseInt(hoursOnly[1]) * 60 + parseInt(trailingMin[1]);
      return parseInt(hoursOnly[1]) * 60;
    }

    // "X min(s)" alone
    const minsOnly = win.match(/(\d+)\s*(?:minutes?|mins?)\b/i);
    if (minsOnly) return parseInt(minsOnly[1]);

    // Two bare numbers with no unit labels — treat as "H MM" (hours + minutes)
    // e.g. "12 40" → 760 minutes
    const twoNums = win.match(/^\s*[:\s]*(\d+)\s+(\d+)\b/);
    if (twoNums) return parseInt(twoNums[1]) * 60 + parseInt(twoNums[2]);

    // Single bare number — treat as minutes
    const oneNum = win.match(/^\s*[:\s]*(\d+)\b/);
    if (oneNum) return parseInt(oneNum[1]);
  }
  return null;
}

// Returns number of servings as an integer, or null if not found.
function extractServings(content) {
  const plain = cleanPlain(content);

  const labels = [
    /serv(?:es|ings?)/i,
    /yield/i,
    /makes/i,
    /portions?/i,
  ];

  for (const label of labels) {
    const win = windowAfter(plain, label);
    if (!win) continue;
    const dozen = win.match(/(\d+)\s*dozen/i);
    if (dozen) return parseInt(dozen[1]) * 12;
    const m = win.match(/(\d+)/);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function convertIngredientsToChecklist(content) {
  const lines = content.split('\n');
  let inIngredientSection = false;
  const result = [];

  for (const line of lines) {
    // Enter ingredient section
    if (/^#{1,4}\s+ingredients?/i.test(line)) {
      inIngredientSection = true;
      result.push(line);
      continue;
    }

    // Exit on any new top-level heading (## or higher) that isn't a sub-group
    if (/^#{1,4}\s+(?!for\s|the\s)/i.test(line) && inIngredientSection) {
      inIngredientSection = false;
    }

    if (inIngredientSection && /^- (?!\[)/.test(line)) {
      // Convert plain list item to unchecked checkbox
      result.push(line.replace(/^- /, '- [ ] '));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// ── tag helpers ───────────────────────────────────────────────────────────────

function getTagsFromCache(cache) {
  const tags = new Set();
  const fmTags = cache?.frontmatter?.tags;
  if (Array.isArray(fmTags)) fmTags.forEach(t => tags.add(String(t).replace(/^#/, '').toLowerCase()));
  else if (typeof fmTags === 'string') fmTags.split(/[\s,]+/).forEach(t => tags.add(t.replace(/^#/, '').toLowerCase()));
  if (Array.isArray(cache?.tags)) cache.tags.forEach(({ tag }) => tags.add(tag.replace(/^#/, '').toLowerCase()));
  return tags;
}

// ── shopping list renderer ────────────────────────────────────────────────────

function buildShoppingListContent(aggregated, recipeNames, date) {
  const catMap = new Map(CATEGORIES.map(c => [c.name, []]));
  for (const item of aggregated) catMap.get(categorize(item)).push(item);

  const lines = [
    '---', `created: ${date}`, 'tags: shopping-list', '---', '',
    '# 🛒 Shopping List', '',
    `*Generated ${date} from: ${recipeNames.join(', ')}*`, '',
  ];

  for (const { name, emoji } of CATEGORIES) {
    const items = catMap.get(name);
    if (!items || items.length === 0) continue;
    lines.push(`## ${emoji} ${name}`, '');
    for (const item of items) lines.push(`- [ ] ${item}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── tag suggestion modal ──────────────────────────────────────────────────────

class TagSuggestionModal extends Modal {
  constructor(app, file, suggested, onSubmit) {
    super(app);
    this.file = file;
    this.suggested = suggested;
    this.selected = new Set(suggested);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Suggested Tags' });

    if (this.suggested.length === 0) {
      contentEl.createEl('p', { text: 'No tags could be auto-detected from this recipe.' });
      new Setting(contentEl).addButton(b => b.setButtonText('Close').onClick(() => this.close()));
      return;
    }

    contentEl.createEl('p', { text: 'Select tags to add to this recipe:' });
    for (const tag of this.suggested) {
      new Setting(contentEl)
        .setName(`#${tag}`)
        .addToggle(t => t.setValue(true).onChange(val => {
          if (val) this.selected.add(tag);
          else this.selected.delete(tag);
        }));
    }

    new Setting(contentEl)
      .addButton(b => b.setButtonText('Apply Tags').setCta().onClick(() => {
        this.close();
        this.onSubmit([...this.selected]);
      }))
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
  }

  onClose() { this.contentEl.empty(); }
}

// ── recipe picker modal ───────────────────────────────────────────────────────

class RecipePickerModal extends Modal {
  constructor(app, recipes, onSubmit) {
    super(app);
    this.recipes = recipes;
    this.selected = new Set(recipes.map(r => r.file.path));
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Generate Shopping List' });
    contentEl.createEl('p', { text: 'Select meal plan recipes to include:' });

    for (const recipe of this.recipes) {
      new Setting(contentEl)
        .setName(recipe.name)
        .addToggle(t => t.setValue(true).onChange(val => {
          if (val) this.selected.add(recipe.file.path);
          else this.selected.delete(recipe.file.path);
        }));
    }

    new Setting(contentEl)
      .addButton(b => b.setButtonText('Generate').setCta().onClick(() => {
        const chosen = this.recipes.filter(r => this.selected.has(r.file.path));
        this.close();
        this.onSubmit(chosen);
      }))
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
  }

  onClose() { this.contentEl.empty(); }
}

// ── plugin ───────────────────────────────────────────────────────────────────

class RecipeShoppingListPlugin extends Plugin {

  async onload() {
    this.addCommand({
      id: 'generate-shopping-list',
      name: 'Generate shopping list from meal plan',
      callback: () => this.generateFromAllMealplan(),
    });

    this.addCommand({
      id: 'add-to-shopping-list',
      name: 'Add current recipe to shopping list',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.addCurrentRecipe(file);
        return true;
      },
    });

    this.addCommand({
      id: 'clean-up-recipe',
      name: 'Clean up recipe',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.cleanUpRecipe(file);
        return true;
      },
    });

    this.addCommand({
      id: 'auto-tag-recipe',
      name: 'Auto-tag current recipe',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.autoTagRecipe(file);
        return true;
      },
    });

    this.addCommand({
      id: 'clear-shopping-list',
      name: 'Clear shopping list',
      callback: () => this.clearShoppingList(),
    });

    console.log('Sous Chef plugin loaded.');
  }

  getMealplanFiles() {
    return this.app.vault.getMarkdownFiles().filter(file => {
      if (file.path === SHOPPING_LIST_PATH) return false;
      const cache = this.app.metadataCache.getFileCache(file);
      return cache?.frontmatter?.['meal-plan'] === true;
    });
  }

  // ── clean up recipe ───────────────────────────────────────────────────────

  async cleanUpRecipe(file) {
    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const title = cache?.frontmatter?.title || file.basename;
    const existingTags = getTagsFromCache(cache);

    const cookTime = extractCookTime(content);
    const serves = extractServings(content);
    const newTags = suggestTags(title, content).filter(t => !existingTags.has(t));

    const actions = [];

    // Update frontmatter (time, serves, tags) — only fill fields that are currently empty
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (cookTime && !fm['cook-time']) { fm['cook-time'] = cookTime; actions.push(`cook-time: ${cookTime}`); }
      if (serves && !fm.serves) { fm.serves = serves; actions.push(`serves: ${serves}`); }
      if (newTags.length > 0) {
        if (!Array.isArray(fm.tags)) fm.tags = fm.tags ? String(fm.tags).split(/[\s,]+/).filter(Boolean) : [];
        for (const tag of newTags) { if (!fm.tags.includes(tag)) fm.tags.push(tag); }
        actions.push(`tags: ${newTags.map(t => '#' + t).join(', ')}`);
      }
    });

    // Convert ingredient list to checklist (re-read after frontmatter write)
    const updated = await this.app.vault.read(file);
    const converted = convertIngredientsToChecklist(updated);
    if (converted !== updated) {
      await this.app.vault.modify(file, converted);
      actions.push('ingredients → checklist');
    }

    if (actions.length === 0) {
      new Notice('Nothing to clean up — fields already filled and ingredients already checkboxes.');
    } else {
      new Notice(`Recipe cleaned up:\n• ${actions.join('\n• ')}`);
    }
  }

  // ── auto-tag ──────────────────────────────────────────────────────────────

  async autoTagRecipe(file) {
    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const title = cache?.frontmatter?.title || file.basename;
    const existingTags = getTagsFromCache(cache);
    const suggested = suggestTags(title, content).filter(t => !existingTags.has(t));

    new TagSuggestionModal(this.app, file, suggested, async (tagsToAdd) => {
      if (tagsToAdd.length === 0) { new Notice('No tags applied.'); return; }
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!Array.isArray(fm.tags)) {
          fm.tags = fm.tags ? String(fm.tags).split(/[\s,]+/).filter(Boolean) : [];
        }
        for (const tag of tagsToAdd) {
          if (!fm.tags.includes(tag)) fm.tags.push(tag);
        }
      });
      new Notice(`Added tags: ${tagsToAdd.map(t => '#' + t).join(', ')}`);
    }).open();
  }

  // ── shopping list ─────────────────────────────────────────────────────────

  async generateFromAllMealplan() {
    const files = this.getMealplanFiles();
    if (files.length === 0) { new Notice('No notes tagged #mealplan found.'); return; }

    const recipes = files.map(f => ({
      file: f,
      name: this.app.metadataCache.getFileCache(f)?.frontmatter?.title || f.basename,
    }));

    new RecipePickerModal(this.app, recipes, async (chosen) => {
      if (chosen.length === 0) { new Notice('No recipes selected.'); return; }
      await this.writeShoppingList(chosen);
    }).open();
  }

  async addCurrentRecipe(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const name = cache?.frontmatter?.title || file.basename;
    await this.mergeIntoShoppingList([{ file, name }]);
  }

  async writeShoppingList(recipes) {
    const date = new Date().toISOString().split('T')[0];

    const existingFile = this.app.vault.getAbstractFileByPath(SHOPPING_LIST_PATH);
    const carryOver = existingFile instanceof TFile
      ? extractUncheckedItems(await this.app.vault.read(existingFile))
      : [];

    let existingNames = [];
    if (existingFile instanceof TFile) {
      const m = (await this.app.vault.read(existingFile)).match(/\*Generated .+ from: (.+)\*/);
      if (m) existingNames = m[1].split(', ').map(s => s.trim());
    }

    const newIngredients = [];
    const newNames = [];
    for (const { file, name } of recipes) {
      const ings = extractIngredients(await this.app.vault.read(file));
      newIngredients.push(...ings);
      if (ings.length > 0) newNames.push(name);
    }

    if (newIngredients.length === 0 && carryOver.length === 0) {
      new Notice('No unchecked ingredient items found.');
      return;
    }

    const aggregated = aggregateIngredients([...carryOver, ...newIngredients]);
    const allNames = [...existingNames, ...newNames.filter(n => !existingNames.includes(n))];
    const newContent = buildShoppingListContent(aggregated, allNames, date);

    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, newContent);
    } else {
      await this.app.vault.create(SHOPPING_LIST_PATH, newContent);
    }

    await this.openShoppingList();
    new Notice(`Shopping list: ${aggregated.length} items from ${allNames.length} recipe(s).`);
  }

  async mergeIntoShoppingList(newRecipes) {
    const date = new Date().toISOString().split('T')[0];

    const existingFile = this.app.vault.getAbstractFileByPath(SHOPPING_LIST_PATH);
    const carryOver = existingFile instanceof TFile
      ? extractUncheckedItems(await this.app.vault.read(existingFile))
      : [];

    let existingNames = [];
    if (existingFile instanceof TFile) {
      const m = (await this.app.vault.read(existingFile)).match(/\*Generated .+ from: (.+)\*/);
      if (m) existingNames = m[1].split(', ').map(s => s.trim());
    }

    const newIngredients = [];
    const newNames = [];
    for (const { file, name } of newRecipes) {
      const ings = extractIngredients(await this.app.vault.read(file));
      newIngredients.push(...ings);
      if (ings.length > 0) newNames.push(name);
    }

    if (newIngredients.length === 0) {
      new Notice('No unchecked ingredient items found in this recipe.');
      return;
    }

    const aggregated = aggregateIngredients([...carryOver, ...newIngredients]);
    const allNames = [...existingNames, ...newNames.filter(n => !existingNames.includes(n))];
    const newContent = buildShoppingListContent(aggregated, allNames, date);

    if (existingFile instanceof TFile) {
      await this.app.vault.modify(existingFile, newContent);
    } else {
      await this.app.vault.create(SHOPPING_LIST_PATH, newContent);
    }

    await this.openShoppingList();
    new Notice(`Shopping list updated: ${aggregated.length} total items.`);
  }

  async openShoppingList() {
    const file = this.app.vault.getAbstractFileByPath(SHOPPING_LIST_PATH);
    if (file instanceof TFile) await this.app.workspace.getLeaf('tab').openFile(file);
  }

  async clearShoppingList() {
    const existing = this.app.vault.getAbstractFileByPath(SHOPPING_LIST_PATH);
    if (!(existing instanceof TFile)) { new Notice('No shopping list found.'); return; }
    const date = new Date().toISOString().split('T')[0];
    const blank = ['---', `created: ${date}`, 'tags: shopping-list', '---', '',
      '# 🛒 Shopping List', '', '*Empty — generate from #mealplan recipes to populate.*', ''].join('\n');
    await this.app.vault.modify(existing, blank);
    new Notice('Shopping list cleared.');
  }
}

module.exports = RecipeShoppingListPlugin;
