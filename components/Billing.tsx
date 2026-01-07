import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../i18n';
import { getMyEntitlement } from '../services/entitlements';
import { supabase } from '../supabaseClient';
import { Sparkles, BookOpen, Target, Brain, Gift, Clock, Check, CreditCard, X } from 'lucide-react';

interface BillingProps {
  language: Language;
}

type Entitlement = {
  plan: "free" | "pro";
  trialEndsAt?: string;
  subscriptionStatus?: string | null;
};

const Billing: React.FC<BillingProps> = ({ language }) => {
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load entitlement on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const ent = await getMyEntitlement();
        setEntitlement(ent);
      } catch (err: any) {
        console.error('Failed to load entitlement:', err);
        setError(err.message || 'Failed to load subscription status');
        setEntitlement({ plan: 'free' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (entitlement?.plan === 'pro') {
    return <ProUserView language={language} entitlement={entitlement} />;
  }

  return <PurchaseView language={language} />;
};

// Pro 用户管理界面
const ProUserView: React.FC<{ language: Language; entitlement: Entitlement }> = ({ language, entitlement }) => {
  const t = (translations as any)?.[language] ?? {};
  const tx = (k: string, fb: string) => t?.[k] ?? fb;

  const status = entitlement.subscriptionStatus || 'active';
  const trialEnds = entitlement.trialEndsAt 
    ? new Date(entitlement.trialEndsAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')
    : null;

  return (
    <div className="space-y-8 py-4">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <CreditCard size={140} className="text-brand-300 rotate-12 transform translate-x-8 -translate-y-8" />
        </div>

        <div className="relative z-10 space-y-3">
          <h2 className="font-serif text-3xl font-bold text-stone-800 flex items-center gap-3">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-brand-50 items-center justify-center text-brand-600">
              <Sparkles size={22} />
            </span>
            {tx("billing_title", "Billing")}
          </h2>
          <p className="text-stone-500 leading-relaxed">
            {tx("billing_desc", "Manage your subscription and billing details.")}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 shadow-sm border border-purple-100">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Sparkles size={16} />
              {tx("billing_pro_badge", "Pro Member")}
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                  {tx("billing_current_plan", "Current Plan")}
                </div>
                <div className="font-serif text-2xl text-stone-800">
                  {tx("billing_plan_pro", "Long-term Companion")}
                </div>
              </div>

              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                  {tx("billing_status", "Status")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium text-stone-700 capitalize">
                    {status === 'active' ? tx("billing_status_active", "Active") : status}
                  </span>
                </div>
              </div>

              {trialEnds && (
                <div>
                  <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                    {tx("billing_next_billing", "Next Billing Date")}
                  </div>
                  <div className="font-medium text-stone-700">{trialEnds}</div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-purple-100 items-center justify-center text-purple-600 shadow-inner">
            <Sparkles size={28} />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-purple-200">
          <button
            className="w-full sm:w-auto bg-white border border-purple-200 text-purple-700 px-6 py-3 rounded-xl font-medium hover:border-purple-300 hover:bg-purple-50 transition-colors"
            onClick={() => alert(
              language === 'zh' 
                ? "即将跳转到 Stripe 客户门户\n\nPhase B 将接入真实的 Stripe Customer Portal URL" 
                : "Redirecting to Stripe Customer Portal\n\nPhase B will integrate real Stripe Customer Portal URL"
            )}
          >
            {tx("billing_btn_manage", "Manage Subscription")}
          </button>
          
          <p className="text-xs text-stone-400 mt-3">
            {tx("billing_manage_hint", "You can update payment method, view invoices, or cancel subscription.")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100/50">
        <h3 className="font-semibold text-lg text-stone-800 mb-4">
          {tx("billing_features_title", "Your Pro Features")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: BookOpen, text: tx("billing_feature_journal", "Unlimited Journal Entries") },
            { icon: Target, text: tx("billing_feature_manifest", "Unlimited Manifestations") },
            { icon: Brain, text: tx("billing_feature_ai", "AI Deep Guidance") },
            { icon: Gift, text: tx("billing_feature_resources", "Free Resource Library") },
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-stone-700">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Free 用户购买界面（动态计算天数）
const PurchaseView: React.FC<{ language: Language }> = ({ language }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [trialDays, setTrialDays] = useState({ used: 0, remaining: 90, total: 90 });
  const [journalCount, setJournalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🆕 动态计算使用天数
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        console.log('🔍 Current user:', user);

        // 获取 trial 信息
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('trial_started_at, trial_ends_at')
          .eq('id', user.id)
          .single();

        console.log('🔍 Profile data:', profile);
        console.log('🔍 Profile error:', profileError);

        if (profile?.trial_started_at) {
          const startDate = new Date(profile.trial_started_at);
          const endDate = new Date(profile.trial_ends_at || new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000));
          const now = new Date();

          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const daysUsed = Math.min(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 90);

          const remainingTime = Math.max(endDate.getTime() - now.getTime(), 0);
          const daysRemaining = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

          console.log('📊 Calculated days:', { daysUsed, daysRemaining });

          setTrialDays({ used: daysUsed, remaining: daysRemaining, total: 90 });
        } else {
          const createdAt = new Date(user.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdAt.getTime());
          const daysUsed = Math.min(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 90);
          const daysRemaining = Math.max(90 - daysUsed, 0);

          console.log('📊 Fallback days (from auth.users):', { daysUsed, daysRemaining });

          setTrialDays({ used: daysUsed, remaining: daysRemaining, total: 90 });
        }

        // 获取日记数量
        const { count } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setJournalCount(count || 0);
      } catch (err) {
        console.error('Failed to load trial info:', err);
        setTrialDays({ used: 0, remaining: 90, total: 90 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { used: daysUsed, remaining: daysRemaining, total: totalDays } = trialDays;

  const t = {
    zh: {
      pageTitle: '你的成长旅程',
      subtitle: '每一天的记录，都是认识自己的开始',
      explorePlan: '探索版',
      trialPeriod: '90天成长体验期',
      daysRemaining: '天剩余',
      day: '第',
      currentFeatures: '你正在使用的功能',
      journalRecording: '每日日记记录',
      journalCount: '已记录',
      entries: '篇',
      manifestation: '显化目标设定',
      inProgress: '进行中',
      aiGuidance: 'InsightLoop AI 指引',
      alwaysWithYou: '随时陪伴',
      message: '这90天，足以让改变悄然发生。接下来的路，我们随时准备陪你继续走——如果你需要的话。',
      longTermPlan: '长期陪伴版',
      continueJourney: '继续你的成长之旅',
      includedFeatures: '包含功能：',
      unlimitedJournal: '无限日记记录',
      unlimitedManifestation: '无限显化目标',
      aiDeepGuidance: 'AI 深度指引',
      freeResources: '免费资源库',
      allUpdates: '所有功能持续更新',
      startCompanionship: '开始长期陪伴',
      moneyBackGuarantee: '30天不满意全额退款',
      cancelAnytime: '随时可取消，无违约金',
      securePayment: '安全加密支付',
      completePayment: '完成支付',
      choosePaymentMethod: '选择支付方式',
      orderSummary: '订单摘要',
      yearlySubscription: '年度订阅',
      monthlySubscription: '月度订阅',
      discount: '优惠折扣',
      totalToday: '今日支付',
      perMonth: '/ 月',
      yearlyBilling: '年付',
      monthlyBilling: '按月付费',
      autoBilling: '每年自动续费',
      autoMonthly: '每月自动续费',
      mostPopular: '最受欢迎 🔥',
      save: '省',
      selectPayment: '选择支付方式',
      creditCard: '信用卡/借记卡',
      creditCardDesc: 'Visa, Mastercard, Amex',
      payNow: 'PayNow',
      payNowDesc: '新加坡银行转账',
      grabPay: 'GrabPay',
      grabPayDesc: '新马地区钱包',
      confirmPayment: '确认支付',
      securityNotice: '你的支付信息通过 SSL 加密保护',
    },
    en: {
      pageTitle: 'Your Growth Journey',
      subtitle: 'Every record is a beginning of knowing yourself',
      explorePlan: 'Explorer Plan',
      trialPeriod: '90-Day Growth Experience',
      daysRemaining: 'days left',
      day: 'Day',
      currentFeatures: 'Current Features',
      journalRecording: 'Daily Journal',
      journalCount: 'Recorded',
      entries: 'entries',
      manifestation: 'Manifestation Goals',
      inProgress: 'In Progress',
      aiGuidance: 'InsightLoop AI Guidance',
      alwaysWithYou: 'Always with you',
      message: 'These 90 days are enough for change to happen quietly. We\'re ready to continue walking with you—if you need us.',
      longTermPlan: 'Long-term Companion',
      continueJourney: 'Continue your growth journey',
      includedFeatures: 'Included Features:',
      unlimitedJournal: 'Unlimited Journal Entries',
      unlimitedManifestation: 'Unlimited Manifestations',
      aiDeepGuidance: 'AI Deep Guidance',
      freeResources: 'Free Resource Library',
      allUpdates: 'All Feature Updates',
      startCompanionship: 'Start Long-term',
      moneyBackGuarantee: '30-day money-back guarantee',
      cancelAnytime: 'Cancel anytime, no penalties',
      securePayment: 'Secure encrypted payment',
      completePayment: 'Complete Payment',
      choosePaymentMethod: 'Choose payment method',
      orderSummary: 'Order Summary',
      yearlySubscription: 'Annual Subscription',
      monthlySubscription: 'Monthly Subscription',
      discount: 'Discount',
      totalToday: 'Total Today',
      perMonth: '/ month',
      yearlyBilling: 'Yearly',
      monthlyBilling: 'Monthly',
      autoBilling: 'Auto-renew yearly',
      autoMonthly: 'Auto-renew monthly',
      mostPopular: 'Most Popular 🔥',
      save: 'Save',
      selectPayment: 'Select Payment Method',
      creditCard: 'Credit/Debit Card',
      creditCardDesc: 'Visa, Mastercard, Amex',
      payNow: 'PayNow',
      payNowDesc: 'Singapore Bank Transfer',
      grabPay: 'GrabPay',
      grabPayDesc: 'SE Asia Wallet',
      confirmPayment: 'Confirm Payment',
      securityNotice: 'Your payment info is protected by SSL encryption',
    }
  };

  const text = t[language];

  const pricing = {
    monthly: {
      price: 9.90,
      period: text.perMonth,
      total: 9.90,
      billingCycle: text.autoMonthly,
      savings: null
    },
    yearly: {
      price: 6.90,
      period: text.perMonth,
      total: 82.80,
      originalTotal: 118.80,
      billingCycle: text.autoBilling,
      savings: 30,
      popular: true
    }
  };

  const features = {
    current: [
      { icon: BookOpen, text: text.journalRecording, count: `${text.journalCount}${journalCount}${text.entries}` },
      { icon: Target, text: text.manifestation, count: text.inProgress },
      { icon: Brain, text: text.aiGuidance, count: text.alwaysWithYou }
    ],
    premium: [
      { icon: BookOpen, text: text.unlimitedJournal },
      { icon: Target, text: text.unlimitedManifestation },
      { icon: Brain, text: text.aiDeepGuidance },
      { icon: Gift, text: text.freeResources },
      { icon: Sparkles, text: text.allUpdates }
    ]
  };

  // ✅ 关键：不改 UI 结构，只删选项：只保留 Card
  const paymentMethods = [
    { id: 'card', name: text.creditCard, icon: CreditCard, description: text.creditCardDesc },
  ];

  const handlePayment = async () => {
    try {
      setShowPaymentModal(false);
      
      // 显示加载状态
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';
      loadingDiv.innerHTML = `
        <div class="bg-white rounded-3xl p-8 text-center">
          <div class="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-700">${language === 'zh' ? '正在跳转到支付页面...' : 'Redirecting to checkout...'}</p>
        </div>
      `;
      document.body.appendChild(loadingDiv);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const priceId = selectedPlan === 'yearly'
        ? import.meta.env.VITE_STRIPE_PRICE_YEARLY
        : import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

      // 🆕 添加调试日志
      console.log('💳 Payment details:', {
        plan: selectedPlan,
        priceId,
        userId: user.id,
        email: user.email,
        envCheck: {
          hasYearlyPrice: !!import.meta.env.VITE_STRIPE_PRICE_YEARLY,
          hasMonthlyPrice: !!import.meta.env.VITE_STRIPE_PRICE_MONTHLY,
        }
      });

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
          plan: selectedPlan, // ✅ 可选：带上方便 webhook 记录
        }),
      });

      // 🆕 改进错误处理
      const text = await response.text();
      console.log('📡 API Response:', response.status, text);

      if (!response.ok) {
        console.error('❌ Checkout failed:', text);
        throw new Error(text || 'Failed to create checkout session');
      }

      const data = JSON.parse(text);
      
      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      console.log('✅ Redirecting to:', data.url);
      window.location.href = data.url;
    } catch (err: any) {
      console.error('💥 Payment error:', err);
      
      // 移除加载状态
      const loadingDiv = document.querySelector('.fixed.inset-0');
      if (loadingDiv) (loadingDiv as HTMLElement).remove();
      
      alert(
        language === 'zh'
          ? `支付失败: ${err.message}\n\n请检查浏览器控制台查看详细错误。`
          : `Payment failed: ${err.message}\n\nCheck browser console for details.`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-stone-700 bg-gradient-to-br from-purple-50 via-white to-blue-50 -mt-8 -mx-4 sm:-mx-6 p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{text.pageTitle}</h1>
          </div>
          <p className="text-gray-600 ml-15">{text.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">{text.explorePlan}</h2>
                    <p className="text-purple-100">{text.trialPeriod}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{daysRemaining}</div>
                    <div className="text-sm text-purple-100">{text.daysRemaining}</div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${(daysUsed / totalDays) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-purple-100">
                    <span>{text.day} {daysUsed}</span>
                    <span>{text.day} {totalDays}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{text.currentFeatures}</h3>
                <div className="space-y-3">
                  {features.current.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{feature.text}</div>
                        <div className="text-sm text-gray-500">{feature.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 md:px-8 pb-6 md:pb-8">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-5 md:p-6">
                  <div className="flex gap-3">
                    <Clock className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {text.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden sticky top-8">
              <div className="p-6 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                <h2 className="text-xl font-bold mb-1">{text.longTermPlan}</h2>
                <p className="text-purple-100 text-sm">{text.continueJourney}</p>
              </div>

              <div className="p-6 space-y-4">
                <div 
                  onClick={() => setSelectedPlan('yearly')}
                  className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                    selectedPlan === 'yearly' 
                      ? 'border-purple-600 bg-purple-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {pricing.yearly.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {text.mostPopular}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-2xl font-bold text-gray-900">S${pricing.yearly.price}</span>
                        <span className="text-sm text-gray-500">{pricing.yearly.period}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">{text.yearlyBilling} S${pricing.yearly.total}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedPlan === 'yearly' 
                        ? 'border-purple-600 bg-purple-600' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'yearly' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-gray-400">S${pricing.yearly.originalTotal}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      {text.save} {pricing.yearly.savings}%
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedPlan('monthly')}
                  className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                    selectedPlan === 'monthly' 
                      ? 'border-purple-600 bg-purple-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-2xl font-bold text-gray-900">S${pricing.monthly.price}</span>
                        <span className="text-sm text-gray-500">{pricing.monthly.period}</span>
                      </div>
                      <div className="text-xs text-gray-600">{text.monthlyBilling}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedPlan === 'monthly' 
                        ? 'border-purple-600 bg-purple-600' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'monthly' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-3">{text.includedFeatures}</div>
                  <div className="space-y-2">
                    {features.premium.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  {text.startCompanionship}
                </button>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-green-600" />
                    <span>{text.moneyBackGuarantee}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-green-600" />
                    <span>{text.cancelAnytime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-green-600" />
                    <span>{text.securePayment}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{text.completePayment}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{text.choosePaymentMethod}</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-5">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{text.orderSummary}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {selectedPlan === 'yearly' ? text.yearlySubscription : text.monthlySubscription}
                      </span>
                      <span className="font-semibold text-gray-900">
                        S${pricing[selectedPlan].total.toFixed(2)}
                      </span>
                    </div>
                    {selectedPlan === 'yearly' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">{text.discount}</span>
                        <span className="font-semibold text-green-600">
                          -S${(pricing.yearly.originalTotal - pricing.yearly.total).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-purple-200 flex justify-between">
                      <span className="font-bold text-gray-900">{text.totalToday}</span>
                      <span className="font-bold text-2xl text-purple-600">
                        S${pricing[selectedPlan].total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {pricing[selectedPlan].billingCycle}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-3">{text.selectPayment}</div>
                  <div className="space-y-2">
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`border-2 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                          selectedPayment === method.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedPayment === method.id ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <method.icon className={`w-5 h-5 ${
                            selectedPayment === method.id ? 'text-purple-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{method.name}</div>
                          <div className="text-xs text-gray-500">{method.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPayment === method.id 
                            ? 'border-purple-600 bg-purple-600' 
                            : 'border-gray-300'
                        }`}>
                          {selectedPayment === method.id && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {text.confirmPayment} S${pricing[selectedPlan].total.toFixed(2)}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    🔒 {text.securityNotice}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
