const js = require('@eslint/js');
const globals = require('globals');

module.exports = [{
    files: ['fastapi_app/static/js/**/*.js'],
    languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {
        ...globals.browser, katex: 'readonly', renderMathInElement: 'readonly',
        DOMPurify: 'readonly', marked: 'readonly',
    }},
    rules: {...js.configs.recommended.rules,
        'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_'}],
        'no-empty': ['error', {allowEmptyCatch: true}],
        'no-eval': 'error', 'no-new-func': 'error',
        'no-restricted-syntax': ['error', {
            selector: "AssignmentExpression[left.object.object.name='AppState'][left.object.property.name='currentNote']",
            message: 'Use NoteStore commands through AppState.updateNote/updateBlock.',
        }],
    },
}];
