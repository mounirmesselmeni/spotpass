import { defineConfig } from 'orval';

export default defineConfig({
  spotpass: {
    input: {
      target: './openapi.yml', // New FastAPI OpenAPI spec
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      mock: false,
      override: {
        mutator: {
          path: 'src/api/mutator/custom-instance.ts',
          name: 'customInstanceWithUrl',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useInfiniteQueryParam: 'page',
        },
        // Only use success response types (200/201), ignore error types (422)
        // This matches our custom instance behavior which throws on errors
        useTypeOverInterfaces: true,
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
