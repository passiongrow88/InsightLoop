import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

// ✅ 统一使用 APP_URL（有就用 APP_URL，没有就用 VITE_APP_URL）
const APP_URL = (process.env.APP_URL || process.env.VITE_APP_URL || '').replace(/\/$/, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!APP_URL) {
      return res.status(500).json({ error: 'Missing APP_URL / VITE_APP_URL env var' });
    }

    // 🔧 修复：处理 string body（Vercel 有时会传 string）
    let body: any = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    }

    const priceId = body?.priceId;
    const userId = body?.userId;
    const email = body?.email;

    // 详细日志（方便你在 Vercel Functions Logs 追）
    console.log('📋 Received request:', {
      priceId,
      userId,
      email,
      bodyType: typeof req.body,
    });

    if (!priceId || !userId || !email) {
      console.error('❌ Missing params:', {
        hasPriceId: !!priceId,
        hasUserId: !!userId,
        hasEmail: !!email,
      });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const session = await stripe.checkout.sessions.create({
      // ✅ 订阅模式
      mode: 'subscription',

      // ✅ 关键修复：只允许卡（彻底杜绝 GrabPay / PayNow 导致订阅报错）
      payment_method_types: ['card'],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${APP_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/?canceled=true`,

      client_reference_id: userId,
      customer_email: email,

      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    console.log('✅ Session created:', session.id);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: any) {
    console.error('💥 Stripe checkout error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
