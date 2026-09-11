<!-- SYNTHETIC TEST FIXTURE — intentionally flawed for SEO quality-gate testing. Expected verdict: FAIL. Expected issue types: invalid_schema (CRITICAL, SEO-V28), fabricated_schema_property (CRITICAL, SEO-V28). The JSON-LD block below carries exactly two flaws: (1) the Recipe object is missing the required "@context" property, making it invalid JSON-LD, and (2) it declares an aggregateRating of 4.9 from 212 reviews while the page shows no reviews or ratings anywhere — a fabricated structured-data property. Per SCORING.md, the Structured Data category scores zero. -->

---
fixture: invalid-schema
title: Classic Banana Bread
slug: /classic-banana-bread-recipe
meta_description: "A one-bowl banana bread that bakes in under an hour: three ripe bananas, basic pantry staples, and a loaf that slices clean for breakfast all week."
primary_keyword: banana bread recipe
---

# Classic Banana Bread

This banana bread recipe needs three overripe bananas, one bowl, and about an hour of mostly hands-off baking. The result is a moist, dense loaf with a caramelised crust that still slices cleanly the next day — if it lasts that long.

## Ingredients

- 3 overripe bananas (about 300 g once peeled)
- 120 g melted butter
- 100 g brown sugar
- 1 egg
- 180 g plain flour
- 1 teaspoon bicarbonate of soda
- Half a teaspoon of salt

## Method

1. Heat the oven to 180°C (160°C fan) and line a 900 g loaf tin.
2. Mash the bananas in a large bowl, then stir in the melted butter, sugar, and egg.
3. Fold in the flour, bicarbonate of soda, and salt until just combined — overmixing makes the crumb tight.
4. Scrape into the tin and bake for 50-60 minutes, until a skewer in the centre comes out clean.
5. Cool in the tin for ten minutes, then finish cooling on a rack.

## Storage

The loaf keeps three to four days wrapped at room temperature and freezes well in slices, toasted straight from frozen.

<script type="application/ld+json">
{
  "@type": "Recipe",
  "name": "Classic Banana Bread",
  "description": "A one-bowl banana bread with three overripe bananas, baked in under an hour.",
  "recipeIngredient": [
    "3 overripe bananas (about 300 g once peeled)",
    "120 g melted butter",
    "100 g brown sugar",
    "1 egg",
    "180 g plain flour",
    "1 teaspoon bicarbonate of soda",
    "half a teaspoon of salt"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "Heat the oven to 180°C (160°C fan) and line a 900 g loaf tin."
    },
    {
      "@type": "HowToStep",
      "text": "Mash the bananas, then stir in the melted butter, sugar, and egg."
    },
    {
      "@type": "HowToStep",
      "text": "Fold in the flour, bicarbonate of soda, and salt until just combined."
    },
    {
      "@type": "HowToStep",
      "text": "Scrape into the tin and bake for 50-60 minutes, until a skewer in the centre comes out clean."
    },
    {
      "@type": "HowToStep",
      "text": "Cool in the tin for ten minutes, then finish cooling on a rack."
    }
  ],
  "aggregateRating": {
    "ratingValue": "4.9",
    "reviewCount": "212"
  }
}
</script>
