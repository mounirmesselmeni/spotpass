import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['fr', 'en'],
  extract: {
    input: ['src/**/*.{js,jsx,ts,tsx}'],
    output: 'src/i18n/locales/{{language}}/{{namespace}}.json',
    mergeNamespaces: false,
    defaultNS: 'translation',
    primaryLanguage: 'fr',
    secondaryLanguages: ['en'],
    defaultValue: (key, namespace, language, value) => {
      if (language === 'fr') return value; // Keep French values
      return 'NEEDS_TRANSLATIONS'; // Mark English translations as needed
    },
  },
  lint: {
    // Default lint options should detect hardcoded strings and missing/unused keys
  },
});
