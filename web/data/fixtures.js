export const ingredients = [
  { id: 'egg', name: 'Eggs', singular: 'egg', allowedUnits: ['piece', 'g'] },
  { id: 'tomato', name: 'Tomatoes', singular: 'tomato', allowedUnits: ['piece', 'g'] },
  { id: 'rice', name: 'Rice', singular: 'rice', allowedUnits: ['g'] },
  { id: 'milk', name: 'Milk', singular: 'milk', allowedUnits: ['ml'] },
  { id: 'spinach', name: 'Spinach', singular: 'spinach', allowedUnits: ['g'] },
];

export const samplePantry = [
  { ingredientId: 'egg', quantity: 2, unit: 'piece' },
  { ingredientId: 'tomato', quantity: 1, unit: 'piece' },
];

export const recipes = [
  {
    id: 'scrambled-eggs',
    title: 'Simple scrambled eggs',
    description: 'Soft eggs, a warm pan, and a quiet start to your day.',
    time: 8,
    image: '/images/eggs.png',
    imageAlt: 'Soft scrambled eggs on a simple ceramic plate',
    requirements: [{ ingredientId: 'egg', quantity: 2, unit: 'piece' }],
    steps: [
      'Crack the two eggs into a bowl and beat with a fork.',
      'Warm a good non-stick pan over low heat. Add the eggs.',
      'Stir gently until the eggs are set and cooked through, then serve right away.',
    ],
    note: 'A simplified demo recipe. Use a non-stick pan; seasoning is optional and not counted in matching.',
    source: 'Original simplified instructions prepared for this prototype. No external recipe text.',
  },
  {
    id: 'tomato-skillet',
    title: 'Warm tomato skillet',
    description: 'A simple pan of tender tomatoes, ready in a few easy steps.',
    time: 12,
    image: '/images/tomatoes.png',
    imageAlt: 'Warm cooked tomatoes in a small skillet',
    requirements: [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }],
    steps: [
      'Wash two tomatoes and cut them into thick wedges.',
      'Place in a non-stick skillet with a splash of water over medium-low heat.',
      'Cover and cook for 8–10 minutes, stirring occasionally, until tender. Serve warm.',
    ],
    note: 'A simplified demo recipe. Water and optional seasoning are not counted as pantry requirements.',
    source: 'Original simplified instructions prepared for this prototype. No external recipe text.',
  },
];
