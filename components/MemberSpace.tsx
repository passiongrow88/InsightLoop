import React, { useState, useEffect } from 'react';
import { Language, ViewType, Resource } from '../types';
import { supabase } from '../supabaseClient';
import { getMyEntitlement } from '../services/entitlements';
import { 
  BookOpen, 
  Video, 
  Link as LinkIcon, 
  Download, 
  Eye, 
  Lock, 
  Crown,
  Sparkles,
  FileText,
  Play,
  ExternalLink,
  Search,
  RefreshCw,
  X
} from 'lucide-react';

interface MemberSpaceProps {
  language: Language;
  setCurrentView: (view: ViewType) => void;
}

const MemberSpace: React.FC<MemberSpaceProps> = ({ language, setCurrentView }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'founder'>('free');
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // upgrade: 升级 Pro；purchase: 购买单课（paid）
  const [upgradeType, setUpgradeType] = useState<'upgrade' | 'purchase'>('upgrade');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const t = {
    zh: {
      title: '会员专属空间',
      subtitle: '独家资源、课程和工具，助力你的成长之旅',
      searchPlaceholder: '搜索资源...',
      categories: {
        all: '全部',
        ebook: '电子书',
        video: '视频',
        course: '课程',
        link: '工具链接',
      },
      accessLevels: {
        free: '免费',
        pro: 'Pro 专享',
        paid: '付费',
      },
      unlock: '升级解锁',
      purchaseUnlock: '购买解锁',
      purchased: '已购买',
      download: '下载',
      view: '查看',
      play: '播放',
      views: '次浏览',
      downloads: '次下载',
      minutes: '分钟',
      noResources: '暂无资源，敬请期待',
      noSearchResults: '没有找到匹配的资源',
      yourPlan: '当前计划',
      freePlan: '免费版',
      proPlan: 'Pro 会员',
      upgradeTitle: '🌟 解锁 Pro 专属内容',
      upgradeDesc: '升级 Pro 会员，即可访问所有独家资源、课程和工具',
      upgradeButton: '立即升级',
      purchaseTitle: '🔒 付费课程需要单独购买',
      purchaseDesc: '该内容为付费课程。购买后即可在会员空间内解锁访问。',
      purchaseButton: '去购买',
      later: '稍后再说',
      new: '新',
      popular: '热门',
      clearSearch: '清除搜索',
      resourceCount: '个资源',
    },
    en: {
      title: 'Member Space',
      subtitle: 'Exclusive resources, courses and tools for your growth journey',
      searchPlaceholder: 'Search resources...',
      categories: {
        all: 'All',
        ebook: 'eBooks',
        video: 'Videos',
        course: 'Courses',
        link: 'Tools',
      },
      accessLevels: {
        free: 'Free',
        pro: 'Pro Only',
        paid: 'Paid',
      },
      unlock: 'Unlock',
      purchaseUnlock: 'Purchase',
      purchased: 'Purchased',
      download: 'Download',
      view: 'View',
      play: 'Play',
      views: 'views',
      downloads: 'downloads',
      minutes: 'min',
      noResources: 'No resources yet, stay tuned',
      noSearchResults: 'No matching resources found',
      yourPlan: 'Your Plan',
      freePlan: 'Free',
      proPlan: 'Pro Member',
      upgradeTitle: '🌟 Unlock Pro Content',
      upgradeDesc: 'Upgrade to Pro to access all exclusive resources, courses and tools',
      upgradeButton: 'Upgrade Now',
      purchaseTitle: '🔒 Paid course requires purchase',
      purchaseDesc: 'This is a paid course. Purchase once to unlock inside Member Space.',
      purchaseButton: 'Purchase',
      later: 'Maybe Later',
      new: 'New',
      popular: 'Popular',
      clearSearch: 'Clear search',
      resourceCount: 'resources',
    },
  };

  const text = t[language];

  // 加载资源和用户计划
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 获取用户计划
      try {
        const ent = await getMyEntitlement();
        setUserPlan(ent.plan);
      } catch (err) {
        console.error('Failed to get entitlement:', err);
        setUserPlan('free');
      }

      // 获取已购买的付费课程（paid 资源单独购买解锁）
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (user?.id) {
          const { data: purchases, error: purchaseErr } = await supabase
            .from('resource_purchases')
            .select('resource_id, status')
            .eq('user_id', user.id)
            .in('status', ['completed', 'paid']);

          if (purchaseErr) throw purchaseErr;
          setPurchasedResourceIds(new Set((purchases || []).map((p: any) => p.resource_id)));
        } else {
          setPurchasedResourceIds(new Set());
        }
      } catch (err) {
        // 购买信息读取失败不阻塞页面，默认为未购买
        console.error('Failed to load purchases:', err);
        setPurchasedResourceIds(new Set());
      }

      // 加载资源
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // 检查用户是否可以访问资源
  const canAccess = (resource: Resource): boolean => {
    if (resource.access_level === 'free') return true;
    if (resource.access_level === 'pro') return userPlan === 'pro' || userPlan === 'founder';
    if (resource.access_level === 'paid') return purchasedResourceIds.has(resource.id);
    return false;
  };

  // 处理资源点击
  const handleResourceClick = async (resource: Resource) => {
    if (!canAccess(resource)) {
      setSelectedResource(resource);
      setUpgradeType(resource.access_level === 'paid' ? 'purchase' : 'upgrade');
      setShowUpgradeModal(true);
      return;
    }
    await handleAccess(resource);
  };

  // 处理下载/查看
  const handleAccess = async (resource: Resource) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 记录下载/查看
      await supabase.from('resource_downloads').insert({
        user_id: user.id,
        resource_id: resource.id,
      });

      // ✅ 计数由数据库 trigger 自动 bump（避免重复 +1）

      // 打开资源
      if (resource.file_url) {
        window.open(resource.file_url, '_blank');
      }

      // 更新本地状态
      setResources(prev => prev.map(r => 
        r.id === resource.id 
          ? { ...r, download_count: (r.download_count || 0) + 1 }
          : r
      ));
    } catch (err) {
      console.error('Access error:', err);
    }
  };

  // 处理升级
  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    setCurrentView('billing');
  };

  // 过滤资源
  const filteredResources = resources.filter((r) => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 图标映射
  const categoryIcons = {
    ebook: BookOpen,
    video: Video,
    course: FileText,
    link: LinkIcon,
  };

  // 获取操作按钮
  const getActionButton = (resource: Resource) => {
    if (!canAccess(resource)) {
      if (resource.access_level === 'paid') {
        return { icon: Lock, text: text.purchaseUnlock };
      }
      return { icon: Crown, text: text.unlock };
    }
    switch (resource.category) {
      case 'video':
        return { icon: Play, text: text.play };
      case 'link':
        return { icon: ExternalLink, text: text.view };
      default:
        return { icon: Download, text: text.download };
    }
  };

  // 判断是否为新资源（7天内）
  const isNew = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // 判断是否为热门资源
  const isPopular = (resource: Resource) => {
    return (resource.download_count || 0) >= 10;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 rounded-3xl p-8 text-white relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h1 className="font-serif text-3xl font-bold">{text.title}</h1>
          </div>
          <p className="text-brand-100 mb-4 max-w-lg">{text.subtitle}</p>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* 当前计划标签 */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
              {userPlan === 'pro' || userPlan === 'founder' ? (
                <>
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span className="font-medium">{text.proPlan}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>{text.freePlan}</span>
                </>
              )}
            </div>
            
            {/* 资源统计 */}
            <div className="text-brand-100 text-sm">
              {resources.length} {text.resourceCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={text.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all text-stone-700"
          />
        </div>
        
        <button
          onClick={loadData}
          className="px-4 py-3 bg-white border border-brand-100 rounded-xl hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'ebook', 'video', 'course', 'link'].map((cat) => {
          const count = cat === 'all' 
            ? resources.length 
            : resources.filter(r => r.category === cat).length;
          
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white text-stone-600 hover:bg-brand-50 border border-brand-100'
              }`}
            >
              <span>{text.categories[cat as keyof typeof text.categories]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedCategory === cat ? 'bg-white/20' : 'bg-brand-50'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-brand-300" />
          </div>
          <p className="text-stone-500 text-lg">
            {searchQuery ? text.noSearchResults : text.noResources}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-brand-600 hover:underline"
            >
              {text.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const Icon = categoryIcons[resource.category];
            const accessible = canAccess(resource);
            const actionButton = getActionButton(resource);

            return (
              <div
                key={resource.id}
                className={`group bg-white rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-lg ${
                  accessible 
                    ? 'border-brand-100 hover:border-brand-200' 
                    : 'border-brand-100'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center overflow-hidden">
                  {resource.thumbnail_url ? (
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Icon className="w-16 h-16 text-brand-300" />
                      <span className="text-sm text-brand-400 font-medium">
                        {text.categories[resource.category]}
                      </span>
                    </div>
                  )}
                  
                  {/* 锁定遮罩 */}
                  {!accessible && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 rounded-full p-4">
                        <Lock className="w-8 h-8 text-brand-600" />
                      </div>
                    </div>
                  )}
                  
                  {/* 标签组 */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isNew(resource.created_at) && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg">
                        {text.new}
                      </span>
                    )}
                    {isPopular(resource) && (
                      <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg">
                        🔥 {text.popular}
                      </span>
                    )}
                  </div>
                  
                  {/* 访问级别 Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                        resource.access_level === 'free'
                          ? 'bg-green-500 text-white'
                          : resource.access_level === 'pro'
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
                          : 'bg-yellow-500 text-white'
                      }`}
                    >
                      {resource.access_level === 'pro' && <Crown className="w-3 h-3 inline mr-1" />}
                      {text.accessLevels[resource.access_level]}
                    </span>

                    {resource.access_level === 'paid' && purchasedResourceIds.has(resource.id) && (
                      <div className="mt-2">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-green-600 text-white">
                          {text.purchased}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-serif font-bold text-lg text-stone-800 mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-stone-500 mb-3 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  {/* Meta 信息 */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mb-4">
                    {resource.author && (
                      <span className="flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-full">
                        ✍️ {resource.author}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {resource.view_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {resource.download_count || 0}
                    </span>
                    {resource.duration_minutes && (
                      <span className="flex items-center gap-1">
                        🕐 {resource.duration_minutes} {text.minutes}
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleResourceClick(resource)}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      accessible
                        ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-200'
                        : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:opacity-90'
                    }`}
                  >
                    <actionButton.icon className="w-4 h-4" />
                    {actionButton.text}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-brand-100 animate-in fade-in zoom-in-95 duration-300">
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
            >
              <X size={20} />
            </button>

            {/* 图标 */}
            <div className="w-20 h-20 bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {upgradeType === 'purchase' ? (
                <Lock className="w-10 h-10 text-white" />
              ) : (
                <Crown className="w-10 h-10 text-white" />
              )}
            </div>
            
            {/* 标题 */}
            <h3 className="font-serif text-2xl font-bold text-center text-stone-800 mb-3">
              {upgradeType === 'purchase' ? text.purchaseTitle : text.upgradeTitle}
            </h3>
            
            {/* 描述 */}
            <p className="text-stone-500 text-center mb-6">
              {upgradeType === 'purchase' ? text.purchaseDesc : text.upgradeDesc}
            </p>
            
            {/* 选中的资源预览 */}
            {selectedResource && (
              <div className="bg-brand-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-brand-600 font-medium">
                  {language === 'zh' ? '想要访问：' : 'Want to access: '}{selectedResource.title}
                </p>
              </div>
            )}
            
            {/* 按钮组 */}
            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200"
              >
                {upgradeType === 'purchase' ? text.purchaseButton : text.upgradeButton}
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-4 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
              >
                {text.later}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberSpace;
