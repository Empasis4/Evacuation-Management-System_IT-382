// ============================================================
// Infrastructure Layer – SMS Service
// Wraps IPROG SMS HTTP API for bulk emergency messaging.
// All outbound calls are logged to Supabase sms_logs.
// ============================================================

import { SmsLog } from './types';

const IPROGSMS_BASE = 'https://sms.iprogtech.com/api/v1/sms_messages';

interface SmsResult {
  number:  string;
  status:  'sent' | 'failed';
  response: Record<string, unknown>;
}

/**
 * Formats a message as a "Siren Alert" for high urgency.
 */
export function formatSirenMessage(originalMessage: string): string {
  const sirenHeader = "[!!! FLASH ALERT !!!]\n🚨🚨🚨 EMERGENCY SIREN 🚨🚨🚨\n\n";
  const sirenLink = "\n\nACTIVATE HARDWARE SIREN: http://localhost:3000/siren";
  const sirenFooter = "\n\nEVACUATE IMMEDIATELY!";
  return `${sirenHeader}${originalMessage.toUpperCase()}${sirenLink}${sirenFooter}`;
}

/**
 * Send a single SMS via IPROG SMS API.
 */
export async function sendSingleSms(
  to: string,
  message: string,
  apiKey: string = process.env.IPROGSMS_API_KEY!
): Promise<SmsResult> {
  try {
    // IPROG prefers 09XXXXXXXXX or 639XXXXXXXXX format
    const number = to.replace(/\D/g, '').replace(/^63/, '0').replace(/^9/, '09');

    // Official docs show POST to /sms_messages with these keys
    const res = await fetch(IPROGSMS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        api_token:    apiKey, 
        phone_number: number, 
        message:      message 
      }),
    });

    const data = await res.json().catch(() => ({ raw: res.status }));

    // IPROG returns { status: 200, message: "..." } on success
    const success = res.ok && (data?.status === 200 || data?.status === 'success');

    return { number: to, status: success ? 'sent' : 'failed', response: data };
  } catch (err) {
    return { number: to, status: 'failed', response: { error: String(err) } };
  }
}

/**
 * Bulk-send SMS to multiple recipients.
 * For Siren Alerts, it can send multiple times (Triple Blast) to force phone vibration.
 */
export async function sendBulkSms(
  recipients: { number: string; barangayId?: string }[],
  message: string,
  apiKey?: string,
  blastCount: number = 1
): Promise<SmsResult[]> {
  const allResults: SmsResult[] = [];

  for (let i = 0; i < blastCount; i++) {
    const results = await Promise.allSettled(
      recipients.map(r => sendSingleSms(r.number, message, apiKey))
    );

    const mapped = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { number: recipients[i].number, status: 'failed' as const, response: { error: r.reason } }
    );
    
    allResults.push(...mapped);

    // If we have more blasts to go, wait 3 seconds to let the phone "recover" for the next vibration
    if (i < blastCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  return allResults;
}
