import React, { useState, useEffect } from 'react';
import { Language, Resource } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff,
  Plus,
  Save,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  Shield,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ⚠️ 重要：你的管理员邮箱
const ADMIN_EMAIL = 'passiongrow88@gmail.com';

interface AdminResourceUploadProps {
  language: Language;
  onSuccess?: () => void;
}

const AdminResourceUpload: React.FC<AdminResourceUploadProps> = ({ language, onSuccess }) => {
  // 管理员验证状态
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'ebook' as 'ebook' | 'video' | 'course' | 'link',
    access_level: 'free' as 'free' | 'pro' | 'paid',
    file_url: '',
    thumbnail_url: '',
    author: '',
    price: '',
    duration_minutes: '',
    file_size_mb: '',
    tags: '',
  });

  // UI 状态
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 资源列表状态
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const t = {
    zh: {
      adminTitle: '🛡️ 资源管理后台',
      adminDesc: '管理会员空间的所有资源',
      notAdmin: '⛔ 无访问权限',
      notAdminDesc: '只有管理员才能访问此页面',
      currentEmail: '当前登录邮箱',
      adminEmail: '管理员邮箱',
      addNew: '添加新资源',
      editResource: '编辑资源',
      resourceTitle: '资源标题',
      description: '描述',
      category: '类别',
      accessLevel: '访问权限',
      fileUrl: '文件链接',
      thumbnailUrl: '缩略图链接',
      author: '作者/来源',
      price: '价格（S$）',
      duration: '时长（分钟）',
      fileSize: '文件大小（MB）',
      tags: '标签（逗号分隔）',
      uploadFile: '上传文件',
      uploadThumbnail: '上传缩略图',
      submit: '发布资源',
      update: '更新资源',
      cancel: '取消',
      success: '资源发布成功！',
      updateSuccess: '资源更新成功！',
      deleteSuccess: '资源已删除',
      error: '操作失败，请重试',
      uploading: '上传中...',
      saving: '保存中...',
      categories: {
        ebook: '📚 电子书',
        video: '🎬 视频',
        course: '📖 课程',
        link: '🔗 工具链接',
      },
      accessLevels: {
        free: '免费',
        pro: 'Pro 专享',
        paid: '付费',
      },
      resourceList: '资源列表',
      noResources: '暂无资源',
      searchPlaceholder: '搜索资源...',
      downloads: '下载',
      views: '浏览',
      active: '已发布',
      inactive: '已隐藏',
      actions: '操作',
      edit: '编辑',
      delete: '删除',
      toggleVisibility: '切换可见性',
      confirmDelete: '确定要删除这个资源吗？',
      refreshList: '刷新列表',
      total: '共',
      items: '项',
      dragDropFile: '拖拽文件到这里或点击上传',
      supportedFormats: '支持 PDF、EPUB、MP4、ZIP',
      supportedImages: '支持 JPG、PNG、WebP',
      orEnterUrl: '或手动输入链接',
      fileUploaded: '文件上传成功！',
      thumbnailUploaded: '缩略图上传成功！',
      uploadFailed: '上传失败',
    },
    en: {
      adminTitle: '🛡️ Resource Admin',
      adminDesc: 'Manage all resources in Member Space',
      notAdmin: '⛔ Access Denied',
      notAdminDesc: 'Only administrators can access this page',
      currentEmail: 'Current email',
      adminEmail: 'Admin email',
      addNew: 'Add New Resource',
      editResource: 'Edit Resource',
      resourceTitle: 'Title',
      description: 'Description',
      category: 'Category',
      accessLevel: 'Access Level',
      fileUrl: 'File URL',
      thumbnailUrl: 'Thumbnail URL',
      author: 'Author/Source',
      price: 'Price (S$)',
      duration: 'Duration (minutes)',
      fileSize: 'File Size (MB)',
      tags: 'Tags (comma-separated)',
      uploadFile: 'Upload File',
      uploadThumbnail: 'Upload Thumbnail',
      submit: 'Publish',
      update: 'Update',
      cancel: 'Cancel',
      success: 'Resource published successfully!',
      updateSuccess: 'Resource updated successfully!',
      deleteSuccess: 'Resource deleted',
      error: 'Operation failed. Please try again.',
      uploading: 'Uploading...',
      saving: 'Saving...',
      categories: {
        ebook: '📚 eBook',
        video: '🎬 Video',
        course: '📖 Course',
        link: '🔗 Tool/Link',
      },
      accessLevels: {
        free: 'Free',
        pro: 'Pro Only',
        paid: 'Paid',
      },
      resourceList: 'Resource List',
      noResources: 'No resources yet',
      searchPlaceholder: 'Search resources...',
      downloads: 'downloads',
      views: 'views',
      active: 'Published',
      inactive: 'Hidden',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      toggleVisibility: 'Toggle visibility',
      confirmDelete: 'Are you sure you want to delete this resource?',
      refreshList: 'Refresh',
      total: 'Total',
      items: 'items',
      dragDropFile: 'Drag & drop or click to upload',
      supportedFormats: 'PDF, EPUB, MP4, ZIP supported',
      supportedImages: 'JPG, PNG, WebP supported',
      orEnterUrl: 'Or enter URL manually',
      fileUploaded: 'File uploaded successfully!',
      thumbnailUploaded: 'Thumbnail uploaded successfully!',
      uploadFailed: 'Upload failed',
    },
  };

  const text = t[language];

  // 检查管理员权限
  useEffect(() => {
    checkAdminAccess();
    loadResources();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setCheckingAdmin(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        setCurrentUserEmail(user.email);
        setIsAdmin(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Admin check error:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  // 加载资源列表
  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Load resources error:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  // 处理文件上传到 Supabase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'thumbnail') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isThumb = type === 'thumbnail';
    const setLoading = isThumb ? setUploadingThumbnail : setUploadingFile;
    const bucket = isThumb ? 'thumbnails' : 'resources';

    try {
      setLoading(true);
      setMessage(null);

      // 生成唯一文件名
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 上传到 Supabase Storage
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      // 获取公开 URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (isThumb) {
        setFormData((prev) => ({ ...prev, thumbnail_url: urlData.publicUrl }));
        setMessage({ type: 'success', text: text.thumbnailUploaded });
      } else {
        // 同时设置文件大小
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setFormData((prev) => ({ 
          ...prev, 
          file_url: urlData.publicUrl,
          file_size_mb: sizeMB
        }));
        setMessage({ type: 'success', text: text.fileUploaded });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: err.message || text.uploadFailed });
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'ebook',
      access_level: 'free',
      file_url: '',
      thumbnail_url: '',
      author: '',
      price: '',
      duration_minutes: '',
      file_size_mb: '',
      tags: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // 编辑资源
  const handleEdit = (resource: Resource) => {
    setFormData({
      title: resource.title,
      description: resource.description || '',
      category: resource.category,
      access_level: resource.access_level,
      file_url: resource.file_url || '',
      thumbnail_url: resource.thumbnail_url || '',
      author: resource.author || '',
      price: resource.price?.toString() || '',
      duration_minutes: resource.duration_minutes?.toString() || '',
      file_size_mb: resource.file_size_mb?.toString() || '',
      tags: resource.tags?.join(', ') || '',
    });
    setEditingId(resource.id);
    setShowForm(true);
    setMessage(null);
  };

  // 删除资源
  const handleDelete = async (id: string) => {
    if (!confirm(text.confirmDelete)) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: text.deleteSuccess });
      loadResources();
    } catch (err: any) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: err.message || text.error });
    }
  };

  // 切换资源可见性
  const toggleVisibility = async (resource: Resource) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_active: !resource.is_active })
        .eq('id', resource.id);

      if (error) throw error;
      loadResources();
    } catch (err) {
      console.error('Toggle visibility error:', err);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    try {
      // 准备数据
      const resourceData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        access_level: formData.access_level,
        file_url: formData.file_url || null,
        thumbnail_url: formData.thumbnail_url || null,
        author: formData.author || null,
        price: formData.price ? parseFloat(formData.price) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        file_size_mb: formData.file_size_mb ? parseFloat(formData.file_size_mb) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        is_active: true,
      };

      if (editingId) {
        // 更新
        const { error } = await supabase
          .from('resources')
          .update(resourceData)
          .eq('id', editingId);

        if (error) throw error;
        setMessage({ type: 'success', text: text.updateSuccess });
      } else {
        // 新建
        const { error } = await supabase.from('resources').insert([resourceData]);

        if (error) throw error;
        setMessage({ type: 'success', text: text.success });
      }

      resetForm();
      loadResources();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Submit error:', err);
      setMessage({ type: 'error', text: err.message || text.error });
    } finally {
      setUploading(false);
    }
  };

  // 过滤资源
  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 类别图标
  const categoryIcons = {
    ebook: FileText,
    video: Video,
    course: FileText,
    link: LinkIcon,
  };

  // 加载中
  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 非管理员
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-100 max-w-lg mx-auto mt-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-800 mb-2">{text.notAdmin}</h2>
          <p className="text-stone-500 mb-6">{text.notAdminDesc}</p>
          
          <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{text.currentEmail}:</span>
              <span className="font-mono text-stone-800">{currentUserEmail || 'Not logged in'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{text.adminEmail}:</span>
              <span className="font-mono text-stone-800">{ADMIN_EMAIL}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-700 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-green-400" />
          <h1 className="font-serif text-2xl font-bold">{text.adminTitle}</h1>
        </div>
        <p className="text-stone-300">{text.adminDesc}</p>
        <p className="text-xs text-stone-400 mt-2">管理员: {currentUserEmail}</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add New Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {text.addNew}
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-bold text-stone-800">
              {editingId ? text.editResource : text.addNew}
            </h2>
            <button
              onClick={resetForm}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {text.resourceTitle} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                placeholder="例：心灵成长指南"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">{text.description}</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                placeholder="简短描述这个资源..."
              />
            </div>

            {/* Category & Access Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {text.category} *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                >
                  {Object.entries(text.categories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {text.accessLevel} *
                </label>
                <select
                  value={formData.access_level}
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value as any })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                >
                  {Object.entries(text.accessLevels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-stone-700">{text.uploadFile}</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 文件上传 */}
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-brand-200 rounded-xl hover:border-brand-400 cursor-pointer transition-colors bg-brand-50/50">
                  <Upload className="w-8 h-8 text-brand-400" />
                  <span className="text-sm text-stone-600 text-center">
                    {uploadingFile ? text.uploading : text.dragDropFile}
                  </span>
                  <span className="text-xs text-stone-400">{text.supportedFormats}</span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'file')}
                    disabled={uploadingFile}
                    className="hidden"
                    accept=".pdf,.epub,.mp4,.zip,.mov,.webm"
                  />
                </label>

                {/* 缩略图上传 */}
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-brand-200 rounded-xl hover:border-brand-400 cursor-pointer transition-colors bg-brand-50/50">
                  <ImageIcon className="w-8 h-8 text-brand-400" />
                  <span className="text-sm text-stone-600 text-center">
                    {uploadingThumbnail ? text.uploading : text.uploadThumbnail}
                  </span>
                  <span className="text-xs text-stone-400">{text.supportedImages}</span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'thumbnail')}
                    disabled={uploadingThumbnail}
                    className="hidden"
                    accept="image/*"
                  />
                </label>
              </div>

              {/* 显示已上传的 URL */}
              {formData.file_url && (
                <p className="text-xs text-green-600 truncate bg-green-50 p-2 rounded-lg">
                  ✅ 文件: {formData.file_url}
                </p>
              )}
              {formData.thumbnail_url && (
                <p className="text-xs text-green-600 truncate bg-green-50 p-2 rounded-lg">
                  ✅ 缩略图: {formData.thumbnail_url}
                </p>
              )}
            </div>

            {/* Manual URL inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {text.fileUrl} <span className="text-stone-400 text-xs">({text.orEnterUrl})</span>
                </label>
                <input
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{text.thumbnailUrl}</label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
              </div>
            </div>

            {/* Author, Duration, File Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{text.author}</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{text.duration}</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                  placeholder="例：30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{text.fileSize}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.file_size_mb}
                  onChange={(e) => setFormData({ ...formData, file_size_mb: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                  placeholder="例：2.5"
                />
              </div>
            </div>

            {/* Price (only for paid) */}
            {formData.access_level === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{text.price}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                  placeholder="例：19.90"
                />
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">{text.tags}</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                placeholder="例：冥想, 自我成长, 心理学"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-4 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors"
              >
                {text.cancel}
              </button>
              <button
                type="submit"
                disabled={uploading || !formData.title}
                className="flex-1 py-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {text.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingId ? text.update : text.submit}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resource List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold text-stone-800">
            {text.resourceList}
            <span className="text-sm font-normal text-stone-500 ml-2">
              ({text.total} {resources.length} {text.items})
            </span>
          </h2>
          <button
            onClick={loadResources}
            disabled={loadingResources}
            className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-stone-500 ${loadingResources ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={text.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-brand-50 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-300 focus:border-transparent"
          />
        </div>

        {/* List */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 text-stone-500">{text.noResources}</div>
        ) : (
          <div className="space-y-3">
            {filteredResources.map((resource) => {
              const Icon = categoryIcons[resource.category];
              const isExpanded = expandedId === resource.id;

              return (
                <div
                  key={resource.id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    resource.is_active ? 'border-brand-100' : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      resource.is_active ? 'bg-brand-100' : 'bg-stone-200'
                    }`}>
                      <Icon className={`w-6 h-6 ${resource.is_active ? 'text-brand-600' : 'text-stone-400'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium truncate ${resource.is_active ? 'text-stone-800' : 'text-stone-500'}`}>
                          {resource.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          resource.access_level === 'free' ? 'bg-green-100 text-green-700' :
                          resource.access_level === 'pro' ? 'bg-brand-100 text-brand-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {text.accessLevels[resource.access_level]}
                        </span>
                        {!resource.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            {text.inactive}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500 mt-1">
                        <span>{resource.download_count || 0} {text.downloads}</span>
                        <span>{resource.view_count || 0} {text.views}</span>
                        {resource.author && <span>by {resource.author}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleVisibility(resource)}
                        className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
                        title={text.toggleVisibility}
                      >
                        {resource.is_active ? (
                          <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(resource)}
                        className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
                        title={text.edit}
                      >
                        <Edit2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
                        title={text.delete}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : resource.id)}
                        className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-stone-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-brand-100 p-4 bg-brand-50/50 text-sm space-y-2">
                      {resource.description && (
                        <p className="text-stone-600">{resource.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {resource.file_url && (
                          <div>
                            <span className="text-stone-500">文件链接: </span>
                            <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline truncate block">
                              {resource.file_url}
                            </a>
                          </div>
                        )}
                        {resource.file_size_mb && (
                          <div>
                            <span className="text-stone-500">文件大小: </span>
                            <span>{resource.file_size_mb} MB</span>
                          </div>
                        )}
                        {resource.duration_minutes && (
                          <div>
                            <span className="text-stone-500">时长: </span>
                            <span>{resource.duration_minutes} 分钟</span>
                          </div>
                        )}
                        {resource.tags && resource.tags.length > 0 && (
                          <div>
                            <span className="text-stone-500">标签: </span>
                            <span>{resource.tags.join(', ')}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-stone-500">创建时间: </span>
                          <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResourceUpload;
