const STORAGE_KEY = 'nemuke_buster_discord_webhook_url';

const WEBHOOK_URL_RE =
  /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function getWebhookUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setWebhookUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}

export function isValidWebhookUrl(url: string): boolean {
  return WEBHOOK_URL_RE.test(url.trim());
}
