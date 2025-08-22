module.exports = {
    root: true,
    env: {
        node: true,
        browser: true,
        es2022: true
    },
    extends: [
        'eslint:recommended',
        '@vue/eslint-config-typescript',
        '@vue/eslint-config-prettier'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        'vue/multi-word-component-names': 'off'
    }
}