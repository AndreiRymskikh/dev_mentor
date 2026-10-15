export const integrationConfig = {
  postgresImage: "postgres:18-alpine",
  startupTimeoutMs: 60_000,
  installerStartupTimeoutMs: 240_000,
  containerStartupTimeoutMs: 120_000,
  browserCommandTimeoutMs: 30_000,
  readinessIntervalMs: 250,
  artifacts: "test-results/integration",
};
