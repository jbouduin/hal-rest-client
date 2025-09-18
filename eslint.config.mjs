// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticTs from "@stylistic/eslint-plugin";

export default tseslint.config(
  {
    plugins: {

      "@stylistic/ts": stylisticTs
    }
  },
  {
    ignores: [
      "node_modules",
      "dist",
      "src/__tests__/init.ts",
      "coverage",
      "uritemplate-test"
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  // stylisticTs.configs[],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        // tsconfigRootDir: ".",
      },
    },
    rules: {
      // es-lint rules
      "no-console": "error",
      "quotes": ["error", "double"],
      // typescript es-lint rules
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/array-type": ["error", { "default": "generic" }],
      // stylistic rules
      "@stylistic/ts/indent": ["error", 2],
      "@stylistic/ts/dot-location": ["error", "property"],
      "@stylistic/ts/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/ts/semi": "error",
      "@stylistic/ts/linebreak-style": "off",
      "@stylistic/ts/lines-between-class-members": "off",
      "@stylistic/ts/no-extra-parens": [
        "error",
        "all",
        {
          "ignoreJSX": "all",
          "nestedBinaryExpressions": false,
          "ternaryOperandBinaryExpressions": false,
          "nestedConditionalExpressions": false
        }
      ],
      "@stylistic/ts/object-curly-spacing": "off",
      "@stylistic/ts/object-property-newline": ["error", { "allowAllPropertiesOnSameLine": true }],
      "@stylistic/ts/padded-blocks": ["error", "never", { "allowSingleLineBlocks": true }],
      "@stylistic/ts/quote-props": ["error", "as-needed"],
      "@stylistic/ts/space-before-function-paren": ["error", { "anonymous": "always", "named": "never", "asyncArrow": "always" }],
      "@stylistic/ts/spaced-comment": ["error", "always", { "markers": ["#region", "#endregion"] }],
      "@stylistic/tsmultiline-ternary": "off",
      // stylistic ts
      "@stylistic/ts/array-bracket-newline": ["error", "consistent"],
      "@stylistic/ts/array-element-newline": ["error", "consistent"],
      "@stylistic/ts/lines-around-comment": "off"
    }
  }
);
