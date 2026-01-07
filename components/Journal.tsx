import React, { useState, useEffect } from 'react';
import { JournalEntry, Language, User } from '../types';
import { generateJournalInsight } from '../services/geminiService';
import { saveJournal, loadJournals } from '../services/cloudStore';
import { translations } from '../i18n';
import {
  Loader2, Send, ChevronDown, ChevronUp, History, Sparkles,
  Heart, Save, FileEdit, PenSquare, RefreshCcw, Trash2,
  X, Check, MessageCircle, CloudMoon, BrainCircuit, Hash
} from 'lucide-react';

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry?: (id: string) => void;
  language: Language;
  viewOnly?: boolean;
  editingEntry?: JournalEntry | null;
  onEditEntry?: (entry: JournalEntry) => void;
  onCancelEdit?: () => void;
  currentUser?: User | null;  // ✅ 新增：当前用户，用于获取名字
}

const Journal: React.FC<JournalProps> = ({ 
  entries, 
  onAddEntry, 
  onUpdateEntry,
  onDeleteEntry,
  language, 
  viewOnly = false,
  editingEntry,
  onEditEntry,
  onCancelEdit,
  currentUser  // ✅ 新增
}) => {
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    event: '',
    gratitude: '',
    reflection: '',
    selfTalk: '',
    angelNumbers: '',
    dreams: '',
    loveTarget: '',
    apologyTarget: '',
  });

  // Load draft on mount ONLY if not editing
  useEffect(() => {
    if (!editingEntry) {
      const savedDraft = localStorage.getItem('insightLoop_draft');
      if (savedDraft) {
        try {
          setFormData(JSON.parse(savedDraft));
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      }
    } else {
      // If editing, populate form with entry data
      setFormData({ ...editingEntry });
      // If editing, showing optional fields might be good if they have content
      if (editingEntry.angelNumbers || editingEntry.dreams || editingEntry.loveTarget || editingEntry.apologyTarget) {
        setShowOptional(true);
      }
    }
  }, [editingEntry]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDraftSaved(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem('insightLoop_draft', JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event || !formData.gratitude || !formData.reflection || !formData.selfTalk) return;

    setIsSubmitting(true);

    // If editing, keep ID and createdAt, otherwise generate new
    const baseEntry = editingEntry || {};
    
    const entryToProcess: JournalEntry = {
      id: editingEntry?.id || crypto.randomUUID(),
      createdAt: editingEntry?.createdAt || Date.now(),
      date: formData.date || new Date().toISOString().split('T')[0],
      event: formData.event || '',
      gratitude: formData.gratitude || '',
      reflection: formData.reflection || '',
      selfTalk: formData.selfTalk || '',
      angelNumbers: formData.angelNumbers,
      dreams: formData.dreams,
      loveTarget: formData.loveTarget,
      apologyTarget: formData.apologyTarget,
      additionalNotes: editingEntry?.additionalNotes, // Preserve notes if editing
      aiResponse: editingEntry?.aiResponse || '', 
    };

    try {
      // ✅ 修改：传入用户名字
      const userName = currentUser?.name || '';
      const response = await generateJournalInsight(entryToProcess, entries.slice(0, 30), language, userName); 
      const finalEntry = { ...entryToProcess, aiResponse: response };
      await saveJournal(finalEntry);
      if (editingEntry) {
        onUpdateEntry(finalEntry);
        await saveJournal(finalEntry);
        if (onCancelEdit) onCancelEdit(); // Clear edit mode
      } else {
        onAddEntry(finalEntry);
        await saveJournal(finalEntry);
        // Clear draft
        localStorage.removeItem('insightLoop_draft');
      }

      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        event: '',
        gratitude: '',
        reflection: '',
        selfTalk: '',
        angelNumbers: '',
        dreams: '',
        loveTarget: '',
        apologyTarget: '',
      });
      setShowOptional(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Submission failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedEntries = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  if (viewOnly) {
    // History View Only
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2 text-stone-400 pb-2 border-b border-brand-100">
           <History size={18} />
           <span className="text-sm uppercase tracking-wider font-semibold">{t.history_title}</span>
        </div>
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="font-serif italic">{t.empty_history}</p>
          </div>
        ) : (
          sortedEntries.map(entry => (
             <JournalEntryCard 
               key={entry.id} 
               entry={entry} 
               onUpdateEntry={onUpdateEntry} 
               onDeleteEntry={onDeleteEntry}
               t={t} 
               onEdit={() => onEditEntry && onEditEntry(entry)}
             />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 relative">
      {/* Healing Loader Overlay */}
      {isSubmitting && <HealingLoader language={language} />}

      {/* Input Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-100 relative overflow-hidden">
        {editingEntry && (
          <div className="absolute top-0 left-0 right-0 bg-brand-100/50 p-2 text-center text-xs font-semibold text-brand-700 uppercase tracking-widest">
            {t.journal_title_edit} - {editingEntry.date}
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6 mt-4">
          <h2 className="font-serif text-2xl text-stone-800">{editingEntry ? t.journal_title_edit : t.journal_title}</h2>
          
          {!editingEntry && (
            <button 
              onClick={handleSaveDraft}
              className="text-brand-600 text-sm font-medium flex items-center gap-1 hover:text-brand-700 transition-colors"
            >
              {draftSaved ? <span className="text-green-600 flex items-center gap-1"><CheckIcon /> {t.draft_saved}</span> : <><Save size={16}/> {t.btn_save_draft}</>}
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_date}</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-brand-50/50 border border-brand-100 rounded-xl px-4 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_event}</label>
              <textarea
                name="event"
                value={formData.event}
                onChange={handleInputChange}
                placeholder={t.ph_event}
                className="w-full bg-brand-50/50 border border-brand-100 rounded-xl px-4 py-3 text-stone-800 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-stone-300"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-2xl border-2 border-brand-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Heart size={80} className="text-brand-500" />
                 </div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2 relative z-10">
                  <Heart size={12} className="fill-brand-600" />
                  {t.label_gratitude}
                </label>
                <textarea
                  name="gratitude"
                  value={formData.gratitude}
                  onChange={handleInputChange}
                  placeholder={t.ph_gratitude}
                  className="w-full bg-transparent border-none rounded-lg p-0 text-stone-800 min-h-[120px] focus:ring-0 placeholder:text-stone-300 relative z-10 resize-none"
                  required
                />
              </div>
              <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50/50">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_reflection}</label>
                <textarea
                  name="reflection"
                  value={formData.reflection}
                  onChange={handleInputChange}
                  placeholder={t.ph_reflection}
                  className="w-full bg-transparent border-none p-0 text-stone-800 min-h-[120px] focus:ring-0 placeholder:text-stone-300 resize-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_selftalk}</label>
              <input
                type="text"
                name="selfTalk"
                value={formData.selfTalk}
                onChange={handleInputChange}
                placeholder={t.ph_selftalk}
                className="w-full bg-brand-50/50 border border-brand-100 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-stone-300"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 transition-colors w-fit mx-auto"
            >
              {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showOptional ? t.btn_optional_hide : t.btn_optional_show}
            </button>

            {showOptional && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300 bg-brand-50/30 p-6 rounded-2xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_angel}</label>
                  <input
                    type="text"
                    name="angelNumbers"
                    value={formData.angelNumbers}
                    onChange={handleInputChange}
                    placeholder={t.ph_angel}
                    className="w-full bg-white border border-brand-100 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_dreams}</label>
                  <input
                    type="text"
                    name="dreams"
                    value={formData.dreams}
                    onChange={handleInputChange}
                    placeholder={t.ph_dreams}
                    className="w-full bg-white border border-brand-100 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_love}</label>
                  <input
                    type="text"
                    name="loveTarget"
                    value={formData.loveTarget}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-brand-100 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t.label_apology}</label>
                  <input
                    type="text"
                    name="apologyTarget"
                    value={formData.apologyTarget}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-brand-100 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
             {editingEntry ? (
               <button 
                type="button" 
                onClick={onCancelEdit}
                className="text-stone-500 text-sm hover:text-stone-800 px-4"
               >
                 Cancel
               </button>
             ) : <div></div>}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-brand-500 to-fuchsia-500 hover:from-brand-600 hover:to-fuchsia-600 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              {editingEntry ? <RefreshCcw size={18} /> : <Send size={18} />}
              <span>{editingEntry ? t.btn_update : t.btn_submit}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

// --- Healing Progress Bar Component ---
const HealingLoader: React.FC<{ language: Language }> = ({ language }) => {
  const [stage, setStage] = useState(0);
  
  const messages = language === 'zh' ? [
    "正在感受你的文字能量...",
    "连接高维智慧场域...",
    "梳理当下的觉察与选择...",
    "正在生成温柔的指引..."
  ] : [
    "Sensing the energy of your words...",
    "Connecting to the field of wisdom...",
    "Organizing present awareness...",
    "Generating gentle guidance..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="relative">
        {/* Breathing Circle */}
        <div className="w-24 h-24 rounded-full bg-brand-100/50 animate-ping absolute top-0 left-0"></div>
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-200 to-fuchsia-200 flex items-center justify-center shadow-lg relative z-10 animate-pulse">
           <Sparkles className="text-white w-10 h-10 animate-spin-slow" />
        </div>
      </div>
      
      <div className="mt-8 h-16 flex flex-col items-center justify-center">
        <p className="text-stone-600 font-serif text-lg tracking-wide animate-fade-in-up key={stage}">
          {messages[stage]}
        </p>
        
        {/* Soft Progress Line */}
        <div className="w-48 h-1 bg-stone-100 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-300 to-fuchsia-300 animate-progress-indeterminate"></div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

// --- Updated JournalEntryCard Component ---
const JournalEntryCard: React.FC<{ 
  entry: JournalEntry, 
  onUpdateEntry: (e:JournalEntry)=>void, 
  onDeleteEntry?: (id: string) => void,
  t: any,
  onEdit: () => void 
}> = ({ entry, onUpdateEntry, onDeleteEntry, t, onEdit }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleSaveNote = () => {
    if (noteText.trim()) {
      const existing = entry.additionalNotes ? entry.additionalNotes + '\n' : '';
      onUpdateEntry({ ...entry, additionalNotes: existing + noteText });
      setNoteText('');
      setIsAddingNote(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden group hover:shadow-md transition-all duration-300">
      {/* Header / Summary (Always Visible) */}
      <div 
        className="bg-brand-50/50 px-6 py-4 border-b border-brand-50 flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 overflow-hidden">
          <span className="font-serif font-bold text-stone-700 text-lg whitespace-nowrap">{entry.date}</span>
          <span className="text-sm text-stone-500 truncate max-w-[200px] sm:max-w-[300px] italic">
             {isExpanded ? t.card_journal_title : entry.event}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           {isDeleting ? (
             <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-full border border-red-100 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-red-600 font-medium hidden xs:inline">{t.btn_confirm}?</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteEntry && onDeleteEntry(entry.id); }}
                  className="p-1 rounded-full hover:bg-red-200 text-red-600"
                  title={t.btn_confirm}
                >
                  <Check size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
                  className="p-1 rounded-full hover:bg-red-200 text-stone-500"
                  title={t.btn_cancel}
                >
                  <X size={14} />
                </button>
             </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 bg-white px-3 py-1.5 rounded-full border border-brand-100 shadow-sm transition-all hover:shadow-md"
              >
                <PenSquare size={14} />
                <span className="hidden sm:inline">{t.btn_edit}</span>
              </button>
              {onDeleteEntry && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title={t.btn_delete}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div className="text-stone-300 pl-2">
                 {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 sm:p-8 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
          
          {/* User Input Section */}
          <div className="grid grid-cols-1 gap-6">
             {/* Event & Gratitude */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <strong className="block text-stone-400 text-xs uppercase mb-2 flex items-center gap-1"><History size={12}/> {t.label_event}</strong>
                    <p className="text-stone-700 text-sm leading-relaxed">{entry.event}</p>
                 </div>
                 <div className="bg-[#FDFBF7] p-4 rounded-xl border border-brand-100/50">
                    <strong className="block text-brand-500 text-xs uppercase mb-2 flex items-center gap-1"><Heart size={12}/> {t.label_gratitude}</strong>
                    <p className="text-stone-700 text-sm leading-relaxed">{entry.gratitude}</p>
                 </div>
             </div>

             {/* Reflection & Self Talk */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <strong className="block text-stone-400 text-xs uppercase mb-2 flex items-center gap-1"><BrainCircuit size={12}/> {t.label_reflection}</strong>
                    <p className="text-stone-700 text-sm leading-relaxed">{entry.reflection}</p>
                 </div>
                 <div className="bg-brand-50/30 p-4 rounded-xl border border-brand-50">
                    <strong className="block text-brand-400 text-xs uppercase mb-2 flex items-center gap-1"><MessageCircle size={12}/> {t.label_selftalk}</strong>
                    <p className="text-stone-700 text-sm leading-relaxed italic">"{entry.selfTalk}"</p>
                 </div>
             </div>

             {/* Optional Fields (Only show if exist) */}
             {(entry.dreams || entry.angelNumbers || entry.loveTarget || entry.apologyTarget) && (
               <div className="bg-white p-4 rounded-xl border border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {entry.angelNumbers && (
                    <div>
                      <strong className="block text-stone-400 text-xs uppercase mb-1 flex items-center gap-1"><Hash size={12}/> {t.label_angel}</strong>
                      <p className="text-sm text-stone-600">{entry.angelNumbers}</p>
                    </div>
                  )}
                  {entry.dreams && (
                    <div>
                      <strong className="block text-stone-400 text-xs uppercase mb-1 flex items-center gap-1"><CloudMoon size={12}/> {t.label_dreams}</strong>
                      <p className="text-sm text-stone-600">{entry.dreams}</p>
                    </div>
                  )}
                  {entry.loveTarget && (
                    <div>
                       <strong className="block text-stone-400 text-xs uppercase mb-1">{t.label_love}</strong>
                       <p className="text-sm text-stone-600">{entry.loveTarget}</p>
                    </div>
                  )}
                  {entry.apologyTarget && (
                    <div>
                       <strong className="block text-stone-400 text-xs uppercase mb-1">{t.label_apology}</strong>
                       <p className="text-sm text-stone-600">{entry.apologyTarget}</p>
                    </div>
                  )}
               </div>
             )}
          </div>

          {/* AI Insight */}
          <div className="relative mt-8">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-fuchsia-300 rounded-full"></div>
            <div className="pl-6 space-y-4">
              <h3 className="font-serif italic text-stone-800 font-medium flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                {t.insight_guidance}
              </h3>
              <div className="prose prose-stone prose-sm max-w-none whitespace-pre-wrap leading-relaxed bg-[#F8F7FF] p-6 rounded-xl border border-brand-50">
                {entry.aiResponse}
              </div>
            </div>
          </div>
          
          {/* Supplementary Notes */}
          <div className="border-t border-brand-50 pt-4 mt-4">
            {entry.additionalNotes && (
               <div className="bg-brand-50/30 p-4 rounded-xl mb-4">
                  <p className="text-xs font-semibold uppercase text-stone-400 mb-2">Supplement Notes</p>
                  <p className="text-stone-600 italic text-sm whitespace-pre-wrap">{entry.additionalNotes}</p>
               </div>
            )}

            {!isAddingNote ? (
              <button 
                onClick={() => setIsAddingNote(true)}
                className="text-xs text-stone-400 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <FileEdit size={12} />
                Add note
              </button>
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl animate-in fade-in zoom-in duration-200">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your thoughts..."
                  className="w-full bg-white border border-stone-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 mb-2"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                   <button 
                     onClick={() => setIsAddingNote(false)}
                     className="px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-md"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleSaveNote}
                     className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600"
                   >
                     Save Note
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
)

export default Journal;
