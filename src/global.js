let loaded = false;

// This should only ever be called ONCE
// at the start of the server
const loadGlobalConstants = () => {
  if (loaded) return false;
  loaded = true;

  global.NAMES = ['sesame', 'kiwi', 'paprika', 'oatmeal', 'pumpkin',
    'pie', 'apple', 'cake', 'plum', 'almond', 'juice',
    'bean', 'potato', 'tomato', 'sugar', 'spice', 'sweets',
    'gnocci', 'mint', 'teacup', 'crouton', 'nibble',
    'simmer', 'jello', 'pudding', 'jam', 'berry'];

  return true;
};

module.exports = loadGlobalConstants;
