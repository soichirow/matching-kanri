import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    // テスト対象の純粋モジュールのみ lint
    files: ['src/store.js', 'src/matching.js', 'src/layout.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        localStorage: 'readonly',
        document:     'readonly',
        MouseEvent:   'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
]
