import { fn } from "storybook/test";

// The React/Vite story harness does not run a Next router; production browser tests do.
const router = { refresh: fn() };
export function useRouter() { return router; }
