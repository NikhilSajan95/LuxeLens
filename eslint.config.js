const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node  
      },
    },
    rules: {
      quotes: ['error', 'single'],
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: 'req|res|next' }],
      'consistent-return': 'off',
      'no-underscore-dangle': 'off',
    },
  },
];