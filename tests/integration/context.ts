export interface BrowserResult {
  success: boolean;
  data?: { snapshot?: string };
  error?: string;
}
export interface IntegrationContext {
  baseUrl: string;
  artifacts: string;
  browser: (...args: string[]) => Promise<BrowserResult>;
}
