import { getWebhookUrl, isValidWebhookUrl } from './webhookSettings';

/**
 * Send a message + optional image to a Discord webhook.
 * Returns true on success, false on failure.
 * Errors are logged so the detection loop is never blocked.
 */
export async function sendDiscordWebhook(
  message: string,
  imageBlob?: Blob | null,
): Promise<boolean> {
  const url = getWebhookUrl();
  if (!url || !isValidWebhookUrl(url)) return false;

  try {
    const form = new FormData();
    form.append(
      'payload_json',
      JSON.stringify({ content: message }),
    );

    if (imageBlob) {
      form.append('files[0]', imageBlob, 'screenshot.jpg');
    }

    const response = await fetch(url, { method: 'POST', body: form });
    return response.ok;
  } catch (err) {
    console.warn('[Discord Webhook]', err);
    return false;
  }
}
