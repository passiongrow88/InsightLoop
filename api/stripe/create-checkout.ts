import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId, email } = req.body;

    // 验证必需参数
    if (!priceId || !userId || !email) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'paynow', 'grabpay'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_APP_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL}/?canceled=true`,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });

    return res.status(200).json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}