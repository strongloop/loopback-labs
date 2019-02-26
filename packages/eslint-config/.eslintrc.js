// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/eslint-config
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['eslint-plugin', '@typescript-eslint'],
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'no-mixed-operators': 'error',
    'no-console': 'off',
    'no-undef': 'off',
    'no-inner-declarations': 'off',
    // TypeScript allows method overloading
    'no-dupe-class-members': 'off',
    'no-useless-escape': 'off',
    // TypeScript allows the same name for namespace and function
    'no-redeclare': 'off',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-object-literal-type-assertion': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    '@typescript-eslint/prefer-interface': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/no-triple-slash-reference': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
  },
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false,
    },
  },
};
