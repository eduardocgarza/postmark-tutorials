import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      "webhooks/**",
      ".dev-services.local.json",
      ".postmark-webhooks.local.json",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        clearInterval: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      curly: ["warn", "all"],
      eqeqeq: ["warn", "always"],
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
