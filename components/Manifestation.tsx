import React, { useState } from 'react';
import { ManifestationItem, JournalEntry, Language, User } from '../types';
import { generateManifestationGuidance } from '../services/geminiService';
import { translations } from '../i18n';
import { Loader2, Plus, CheckCircle2, Clock, Calendar, Sparkles, Send, Trash2, X, Check, HeartHandshake } from 'lucide-react';

interface ManifestationProps {
  goals: ManifestationItem[];
  journalHistory: JournalEntry[];
  onAddGoal: (goal: ManifestationItem) => void;
  onUpdateGoal: (goal: ManifestationItem) => void;
  onDeleteGoal: (id: string) => void;
  language: Language;
  currentUser?: User | null;  // ✅ 新增：当前用户，用于获取名字
}

const Manifestation: React.FC<ManifestationProps> = ({ 
  goals, 
  journalHistory, 
  onAddGoal, 
  onUpdateGoal, 
  onDeleteGoal, 
  language,
  currentUser  // ✅ 新增
}) => {
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    goal: '',
    expectedDate: '',
    reason: '',
    beneficiaries: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.goal || !formData.expectedDate) return;

    setIsSubmitting(true);
    
    const newGoal: ManifestationItem = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      date: new Date().toISOString().split('T')[0],
      goal: formData.goal,
      expectedDate: formData.expectedDate,
      reason: formData.reason,
      beneficiaries: formData.beneficiaries,
      status: 'active',
      aiGuidance: '',
    };

    try {
      // ✅ 修改：传入用户名字
      const userName = currentUser?.name || '';
      const guidance = await generateManifestationGuidance(newGoal, journalHistory, language, userName);
      onAddGoal({ ...newGoal, aiGuidance: guidance });
      setFormData({ goal: '', expectedDate: '', reason: '', beneficiaries: '' });
      setShowForm(false);
    } catch (error) {
      console.error("Manifestation submit failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (goal: ManifestationItem, status: ManifestationItem['status']) => {
    onUpdateGoal({ ...goal, status });
  };

  return (
    <div className="space-y-8">
      {/* Header / Add Button */}
      <div className="flex justify-between items-end border-b border-brand-100 pb-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-800">{t.manifest_title}</h2>
          <p className="text-stone-500 text-sm mt-1">{t.manifest_subtitle}</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-md hover:shadow-brand-500/20"
          >
            <Plus size={16} /> {t.btn_new_order}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-1 rounded-3xl border border-brand-100 shadow-lg animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
           {/* Ticket Decoration */}
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 via-fuchsia-400 to-brand-400"></div>
           
           <div className="p-6 sm:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-50/50 via-white to-white rounded-3xl">
             <div className="flex items-center gap-2 mb-6 text-brand-600">
               <Sparkles size={20} />
               <span className="text-sm font-bold uppercase tracking-widest">Universe Order Ticket</span>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-stone-400">{t.label_goal}</label>
                <textarea
                  value={formData.goal}
                  onChange={(e) => setFormData({...formData, goal: e.target.value})}
                  className="w-full bg-white border border-brand-200 rounded-xl p-4 text-lg font-serif text-brand-900 focus:ring-2 focus:ring-brand-400 focus:outline-none placeholder:text-brand-200 min-h-[120px] shadow-inner"
                  rows={3}
                  placeholder={t.ph_goal}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                  <label className="block text-xs font-semibold uppercase text-stone-400 mb-2">{t.label_expected}</label>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                    className="w-full bg-white border border-brand-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    required
                  />
                 </div>
                 <div>
                  <label className="block text-xs font-semibold uppercase text-stone-400 mb-2">{t.label_reason}</label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="w-full bg-white border border-brand-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    placeholder={t.ph_reason}
                  />
                 </div>
              </div>

              {/* Beneficiaries Section - Highlighting Altruism */}
              <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-brand-600 mb-2">
                  <HeartHandshake size={14} />
                  {t.label_beneficiaries}
                </label>
                <input
                  type="text"
                  value={formData.beneficiaries}
                  onChange={(e) => setFormData({...formData, beneficiaries: e.target.value})}
                  className="w-full bg-white border border-brand-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-400 focus:outline-none placeholder:text-stone-300 placeholder:italic"
                  placeholder={t.ph_beneficiaries}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-50 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="text-stone-500 px-4 py-2 text-sm hover:text-stone-800"
                >
                  {t.btn_cancel}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-stone-800 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  {t.btn_send}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-6">
        {goals.length === 0 && !showForm && (
          <div className="text-center py-12 text-stone-400 bg-white rounded-3xl border border-dashed border-brand-100">
            <p>{t.empty_manifest}</p>
          </div>
        )}
        
        {goals.map(goal => (
           <ManifestationCard 
             key={goal.id} 
             goal={goal} 
             onUpdateGoal={onUpdateGoal} 
             onDeleteGoal={onDeleteGoal} 
             handleStatusChange={handleStatusChange} 
             t={t} 
           />
        ))}
      </div>
    </div>
  );
};

// Extracted Card Component to handle individual delete state
interface ManifestationCardProps {
  goal: ManifestationItem;
  onUpdateGoal: (goal: ManifestationItem) => void;
  onDeleteGoal: (id: string) => void;
  handleStatusChange: (goal: ManifestationItem, status: ManifestationItem['status']) => void;
  t: any;
}

const ManifestationCard: React.FC<ManifestationCardProps> = ({ 
  goal, 
  onUpdateGoal, 
  onDeleteGoal, 
  handleStatusChange, 
  t 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
       {/* Status Badge & Delete Actions */}
       <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {isDeleting ? (
             <div className="flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full border border-red-100 shadow-sm">
                <button 
                  onClick={() => onDeleteGoal(goal.id)}
                  className="p-1 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                  title={t.btn_confirm}
                >
                  <Check size={14} />
                </button>
                <button 
                  onClick={() => setIsDeleting(false)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
                  title={t.btn_cancel}
                >
                  <X size={14} />
                </button>
             </div>
          ) : (
            <>
              <select 
                value={goal.status}
                onChange={(e) => handleStatusChange(goal, e.target.value as any)}
                className={`text-xs font-medium uppercase tracking-wider bg-transparent border-none focus:ring-0 cursor-pointer ${
                  goal.status === 'completed' ? 'text-teal-600' : 
                  goal.status === 'delayed' ? 'text-amber-600' : 'text-stone-400'
                }`}
              >
                <option value="active">{t.status_active}</option>
                <option value="completed">{t.status_completed}</option>
                <option value="delayed">{t.status_delayed}</option>
              </select>
              
              {goal.status === 'completed' && <CheckCircle2 size={16} className="text-teal-600" />}
              {goal.status === 'active' && <Loader2 size={16} className="text-stone-400" />}
              {goal.status === 'delayed' && <Clock size={16} className="text-amber-500" />}

              <button 
                  onClick={() => setIsDeleting(true)}
                  className="ml-2 p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title={t.btn_delete}
              >
                  <Trash2 size={14} />
              </button>
            </>
          )}
       </div>

       {/* Background Decoration */}
       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Sparkles size={80} className="text-brand-300" />
       </div>

       <div className="pr-20 relative z-0">
         <h3 className="font-serif text-xl text-stone-800 mb-2">{goal.goal}</h3>
         <div className="flex flex-wrap gap-4 text-xs text-stone-500 uppercase tracking-wide mb-4">
           <span className="flex items-center gap-1"><Calendar size={12} /> {t.label_expected}: {goal.expectedDate}</span>
           {goal.reason && <span>{t.label_reason}: {goal.reason}</span>}
         </div>
         {goal.beneficiaries && (
           <div className="flex items-center gap-2 text-xs text-brand-600 font-medium">
             <HeartHandshake size={14} />
             <span>Beneficiaries: {goal.beneficiaries}</span>
           </div>
         )}
       </div>

       {goal.aiGuidance && (
         <div className="bg-[#F8F7FF] p-4 rounded-xl border border-brand-100 mt-4">
           <p className="text-sm text-stone-600 italic leading-relaxed">
             "{goal.aiGuidance}"
           </p>
         </div>
       )}
    </div>
  );
};

export default Manifestation;
