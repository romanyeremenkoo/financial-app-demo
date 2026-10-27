// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Selectors that encode this project's hard conventions:
 * arrow functions only, Observables instead of promises.
 */
const BANNED_SYNTAX = [
  {
    selector: 'FunctionDeclaration',
    message: 'Use an arrow function assigned to a const instead of a function declaration.',
  },
  {
    selector: ':function[async=true]',
    message: 'Async functions are not used here: model asynchrony with an Observable.',
  },
  {
    selector: 'AwaitExpression',
    message: 'Await is not used here: subscribe to the Observable instead.',
  },
  {
    selector: 'NewExpression[callee.name="Promise"]',
    message: 'Promises are not used here: return an Observable instead.',
  },
];

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'e2e/cypress/artifacts/**',
      'docs/media/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'fin', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'fin', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],

      // --- Angular architecture conventions --------------------------------
      // Component styles live in a sibling .scss file, never in the decorator.
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { styles: 0, template: Number.MAX_SAFE_INTEGER, animations: 0 },
      ],
      '@angular-eslint/consistent-component-styles': ['error', 'string'],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/use-injectable-provided-in': 'error',
      '@angular-eslint/use-component-view-encapsulation': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/no-forward-ref': 'error',
      '@angular-eslint/inject-at-top': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'error',

      // --- General code quality ---------------------------------------------
      curly: ['error', 'all'],
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-param-reassign': 'error',
      'no-nested-ternary': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'prefer-arrow-callback': 'error',
      complexity: ['error', { max: 12 }],
    },
  },
  {
    // Type-aware linting, enabled only for application sources so the rest of
    // the repo (configs, Playwright specs) stays fast to lint.
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/reactive-context-must-read-signal': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
  {
    // Application code only. Specs and Playwright may use whatever their
    // runners expose; Playwright's API is promise-based by design.
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-restricted-syntax': ['error', ...BANNED_SYNTAX],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'rxjs',
              importNames: ['BehaviorSubject'],
              message: 'Application state lives in signals, not in a BehaviorSubject store.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/no-inline-styles': [
        'error',
        { allowNgStyle: false, allowBindToStyle: true },
      ],
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/prefer-template-literal': 'error',
    },
  },
);
