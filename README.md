# Sous Chef

An Obsidian plugin for clipping recipes, organizing your meal plan, and generating a categorized grocery shopping list — all without leaving your vault.

---

> **Warning**
>
> This plugin is entirely vibe-coded and has not been reviewed or vetted by Obsidian. It is not listed in the Community Plugins directory. Use at your own risk, and always back up your vault.

---

## Features

- **Recipe template** — consistent YAML frontmatter for every clipped recipe: title, source URL, cover image, serves, cook time, meal plan toggle, and tags
- **Clean up recipe** — run one command to auto-fill `cook-time` and `serves` from body text, apply suggested tags, and convert the ingredient list into a checklist
- **Auto-tag** — scans the recipe title and ingredients to suggest cuisine and meal-type tags (`#asian`, `#latin`, `#italian`, `#mediterranean`, `#breakfast`, `#dessert`, `#quick`, `#dinner`, `#lunch`, `#side`, `#soup`, `#salad`, `#vegetarian`, `#baking`)
- **Meal plan toggle** — flip `meal-plan: true` in any recipe's properties to add it to your weekly plan
- **Generate shopping list** — select from all meal-planned recipes, aggregate and deduplicate ingredients, and write a categorized `Recipes/Shopping List.md` that opens in a new tab
- **Categorized sections** — ingredients are automatically sorted into: 🥦 Produce, 🥩 Meat & Seafood, 🧀 Refrigerated & Deli, 🥛 Dairy & Eggs, 🫒 Oils & Condiments, 🌾 Pantry & Dry Goods, 🍞 Bakery & Bread, 🫙 Canned & Jarred, 🧂 Spices & Seasonings, 🍵 Beverages, 🛒 Other
- **Smart aggregation** — combines duplicate ingredients across recipes (`2 tbsp flour` + `1 cup flour` → `2 tbsp + 1 cup flour`); strips checked-off items and common staples (water, salt, pepper, neutral oil)
- **Preserve unchecked items** — regenerating the shopping list carries forward any items not yet checked off

---

## Installation

This plugin is not available in the Obsidian Community Plugins directory. To install manually:

1. Download `main.js` and `manifest.json` from this repository
2. Create a folder at `<your-vault>/.obsidian/plugins/sous-chef/`
3. Place both files inside that folder
4. Open Obsidian → **Settings → Community plugins** → disable Restricted Mode if prompted
5. Find **Sous Chef** in the list and enable it

---

## Setup

### Web Clipper template

Install the [Obsidian Web Clipper](https://obsidian.md/clipper) browser extension and create a new template with the following settings:

**Properties:**
```
title: {{title}}
source: {{url}}
cover_image: {{image}}
created: {{date}}
serves:
cook-time:
meal-plan: false
tags:
```

**Note content:**
```
# {{title}}

![cover]({{image}})

Source: [{{domain}}]({{url}})

{{content}}
```

**Path:** `Recipes/{{title}}`

### Recipe template

A template file is included at `_templates/_recipe.md` for use with Obsidian's core Templates plugin.

---

## Commands

All commands are available via the Command Palette (`Cmd+P`).

| Command | Description |
|---|---|
| **Clean up recipe** | Fills `cook-time` and `serves` from body text, applies auto-tags, converts ingredient list to checklist |
| **Auto-tag current recipe** | Suggests tags based on title and ingredients; opens a confirmation modal before applying |
| **Generate shopping list from meal plan** | Shows a picker of all `meal-plan: true` recipes; writes a categorized `Recipes/Shopping List.md` and opens it in a new tab |
| **Add current recipe to shopping list** | Merges the open recipe's ingredients into the existing shopping list |
| **Clear shopping list** | Resets the shopping list to blank |

---

## How it works

### Meal planning

Open any recipe note and toggle `meal-plan` to `true` in the Properties panel. Run **Generate shopping list from meal plan** to pull all meal-planned recipes into one list.

### Ingredient processing

- Parenthetical modifiers are stripped: `garlic (thinly sliced)` → `garlic`
- Preparation adjectives are stripped: `minced garlic` → `garlic`
- Range quantities are normalized: `½–¾ cup` → `½ cup`
- Markdown links in ingredients are unwrapped: `[salt](url)` → `salt`
- Common staples are silently skipped: water, salt, pepper, neutral oil, canola oil, vegetable oil

### Cook time

The **Clean up recipe** command scans for patterns like `Total Time: 45 minutes`, `Total\n11 mins`, or `Cook Time20` and writes the result to `cook-time` as total minutes (e.g. `1 hour 30 minutes` → `90`).

---

## Notes

- The shopping list is always written to `Recipes/Shopping List.md`
- Unchecked items in an existing shopping list are carried forward when regenerating
- Checked-off items (`- [x]`) in recipe notes are never imported into the shopping list
- The `cook-time` field expects a Number property type in Obsidian's Properties panel
- The `serves` field expects a Number property type
- The `meal-plan` field expects a Checkbox property type

---

## Author

Made by [Kailee Kodama Muscente](https://github.com/kails-ko)
