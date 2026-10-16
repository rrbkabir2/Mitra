import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone, message, entryId } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message body' }, { status: 400 });
    }

    const apiKey = process.env.FAST2SMS_API_KEY;

    if (apiKey && apiKey !== 'your_fast2sms_api_key_here') {
      // Real Fast2SMS API call
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone,
        }),
      });

      const data = await response.json();
      if (response.ok && data.return) {
        return NextResponse.json({
          success: true,
          provider: 'fast2sms',
          messageId: data.request_id || 'fast2sms-ok',
          message: 'SMS successfully dispatched via Fast2SMS',
        });
      } else {
        return NextResponse.json({
          success: false,
          provider: 'fast2sms',
          error: data.message?.[0] || 'Fast2SMS dispatch error',
        }, { status: 502 });
      }
    }

    // Simulated Fallback for local testing when no paid key configured
    return NextResponse.json({
      success: true,
      provider: 'fast2sms_simulator',
      messageId: `sim-sms-${Date.now()}`,
      message: 'Simulated Fast2SMS dispatch (Add FAST2SMS_API_KEY in .env.local for live gateway)',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fast2SMS server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
