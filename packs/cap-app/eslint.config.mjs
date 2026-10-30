import cds from '@sap/cds/eslint.config.mjs'

export default [
  ...cds.recommended,
  {
    rules: {
      // Hooks do BaseBO declaram a assinatura (pThis, req) sem a usar: prefixa com `_` para o lint aceitar.
      'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },
]
