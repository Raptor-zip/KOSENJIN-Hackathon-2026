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

export interface DailyReport {
  date: string;
  totalWorkMs: number;
  totalDrowsy: number;
  totalSquats: number;
}

function formatMsForReport(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}分`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

/**
 * Send a daily report as a Discord Embed.
 */
export async function sendDailyReport(report: DailyReport): Promise<boolean> {
  const url = getWebhookUrl();
  if (!url || !isValidWebhookUrl(url)) return false;

  const embed = {
    title: `作業レポート — ${report.date}`,
    color: 0x00d4ff,
    fields: [
      {
        name: '作業時間',
        value: formatMsForReport(report.totalWorkMs) || '0分',
        inline: true,
      },
      {
        name: '居眠り検知',
        value: `${report.totalDrowsy}回`,
        inline: true,
      },
      {
        name: 'エクササイズ',
        value: `${report.totalSquats}回`,
        inline: true,
      },
    ],
    footer: {
      text: 'NEMUKE BUSTER',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });
    return response.ok;
  } catch (err) {
    console.warn('[Discord Webhook]', err);
    return false;
  }
}
