import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'public/**', 'data/cache/**'],
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Use an arrow function assigned to a const.',
        },
        {
          selector: 'FunctionExpression',
          message: 'Use an arrow function.',
        },
      ],
    },
  },
)
