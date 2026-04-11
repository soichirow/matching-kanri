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
        window:       'readonly',
        MouseEvent:   'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
  {
    // 単体テストファイル
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        localStorage: 'readonly',
        document:     'readonly',
        MouseEvent:   'readonly',
        describe:     'readonly',
        it:           'readonly',
        expect:       'readonly',
        beforeEach:   'readonly',
        afterEach:    'readonly',
        vi:           'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
  {
    // E2Eテストファイル
    files: ['e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        localStorage: 'readonly',
        URL:           'readonly',
        getComputedStyle: 'readonly',
      },
    },
  },
]
