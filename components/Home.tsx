import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Language, User } from '../types';
import { translations } from '../i18n';
import { Edit3, Sparkles, Bell, BellRing, Check, X } from 'lucide-react';

interface HomeProps {
  setCurrentView: (view: ViewType) => void;
  language: Language;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentView, language, currentUser, onUpdateUser }) => {
  const t = translations[language];
  const [reminderTime, setReminderTime] = useState(currentUser.reminderTime || '');
  const [isSettingReminder, setIsSettingReminder] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('');
  
  // State for In-App Alarm (visual fallback)
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  // Track the last minute we sent a notification to avoid duplicates in the same minute
  const lastNotificationMinute = useRef<string | null>(null);

  // Request notification permission and save time
  const handleSetReminder = async () => {
    if (!reminderTime) return;

    // Save preference regardless of permission
    onUpdateUser({ ...currentUser, reminderTime });
    setIsSettingReminder(false);
    setNotificationStatus(t.reminder_set_success + ' ' + reminderTime);
    setTimeout(() => setNotificationStatus(''), 3000);

    // Try to get System Notification Permission
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
         new Notification(t.title, {
            body: `${t.reminder_desc} (Test)`
          });
      }
    }
  };

  const handleDismissAlarm = () => {
    setIsAlarmActive(false);
  };

  // Robust poller: Checks every second, but only triggers once per minute matching user time
  useEffect(() => {
    if (!currentUser.reminderTime) return;

    const checkTime = () => {
      const now = new Date();
      // Format current time to HH:MM (24h)
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const currentMinuteStr = `${hours}:${minutes}`;

      // User Time format is likely HH:MM
      const [userH, userM] = currentUser.reminderTime!.split(':');
      // Normalize user time to pad zeros if needed
      const userTimeFormatted = `${userH.padStart(2, '0')}:${userM.padStart(2, '0')}`;

      if (currentMinuteStr === userTimeFormatted) {
         // Only trigger if we haven't triggered for this specific minute yet
         if (lastNotificationMinute.current !== currentMinuteStr) {
             
             // 1. Trigger In-App Alarm (Always works if app is open)
             setIsAlarmActive(true);

             // 2. Try System Notification
             if ("Notification" in window && Notification.permission === "granted") {
                new Notification(t.title, {
                  body: t.reminder_desc
                });
             }
             
             lastNotificationMinute.current = currentMinuteStr;
         }
      }
    };

    const intervalId = setInterval(checkTime, 1000);
    
    // Cleanup
    return () => clearInterval(intervalId);
  }, [currentUser.reminderTime, t]);

  return (
    <div className="space-y-12 py-4 relative">
      
      {/* --- In-App Alarm Modal (Ensures visibility) --- */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative border border-brand-100 animate-in zoom-in-95 duration-300">
              <button 
                onClick={handleDismissAlarm}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
              
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <BellRing size={40} className="text-brand-600" />
              </div>
              
              <h3 className="font-serif text-2xl text-stone-800 mb-2">{t.reminder_section}</h3>
              <p className="text-stone-600 mb-8 leading-relaxed">
                {t.reminder_desc}
                <br />
                <span className="text-sm text-brand-500 font-medium mt-2 block">{currentUser.reminderTime}</span>
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleDismissAlarm();
                    setCurrentView('journal');
                  }}
                  className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
                >
                  {t.card_journal_action}
                </button>
                <button
                  onClick={handleDismissAlarm}
                  className="w-full py-3 text-stone-500 hover:text-stone-700 text-sm"
                >
                  {t.btn_cancel}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Hero Text */}
      <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="font-serif text-lg sm:text-2xl text-stone-600 leading-relaxed">
          {t.tagline_1}
          <br />
          {t.tagline_2}
        </p>
      </div>

      {/* Reminder Section */}
      <div className="bg-white/60 backdrop-blur-sm border border-brand-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in duration-500 delay-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 text-brand-600 rounded-full">
            {currentUser.reminderTime ? <BellRing size={20} /> : <Bell size={20} />}
          </div>
          <div>
             <h3 className="text-sm font-semibold text-stone-700">{t.reminder_section}</h3>
             <p className="text-xs text-stone-500">{t.reminder_desc}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {isSettingReminder ? (
             <div className="flex items-center gap-2">
               <input 
                 type="time" 
                 value={reminderTime}
                 onChange={(e) => setReminderTime(e.target.value)}
                 className="px-3 py-1.5 rounded-lg border border-brand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
               />
               <button 
                 onClick={handleSetReminder}
                 className="bg-brand-500 text-white p-2 rounded-lg hover:bg-brand-600 transition-colors"
               >
                 <Check size={16} />
               </button>
             </div>
           ) : (
             <button 
               onClick={() => setIsSettingReminder(true)}
               className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                 currentUser.reminderTime 
                  ? 'bg-brand-50 border-brand-200 text-brand-700' 
                  : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300'
               }`}
             >
               {currentUser.reminderTime ? `${currentUser.reminderTime}` : t.reminder_btn_set}
             </button>
           )}
        </div>
      </div>
      {notificationStatus && (
        <div className="text-center text-xs text-brand-600 font-medium animate-pulse">
          {notificationStatus}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Journal Card */}
        <div 
          onClick={() => setCurrentView('journal')}
          className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100/50 hover:shadow-lg hover:border-brand-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Edit3 size={120} className="text-brand-300 rotate-12 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4 max-w-lg">
              <h2 className="font-serif text-2xl font-bold text-stone-800 group-hover:text-brand-700 transition-colors">
                {t.card_journal_title}
              </h2>
              <p className="text-stone-500 leading-relaxed text-sm sm:text-base">
                {t.card_journal_desc}
              </p>
              <div className="pt-4">
                <span className="text-brand-600 font-medium text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {t.card_journal_action}
                </span>
              </div>
            </div>
            
            <div className="hidden sm:flex bg-brand-50 w-16 h-16 rounded-2xl items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300 shadow-inner">
              <Edit3 size={32} />
            </div>
          </div>
        </div>

        {/* Manifestation Card */}
        <div 
          onClick={() => setCurrentView('manifestation')}
          className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100/50 hover:shadow-lg hover:border-brand-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={120} className="text-brand-300 rotate-12 transform translate-x-8 -translate-y-8" />
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4 max-w-lg">
              <h2 className="font-serif text-2xl font-bold text-stone-800 group-hover:text-brand-700 transition-colors">
                {t.card_manifest_title}
              </h2>
              <p className="text-stone-500 leading-relaxed text-sm sm:text-base">
                {t.card_manifest_desc}
              </p>
              <div className="pt-4">
                <span className="text-brand-600 font-medium text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {t.card_manifest_action}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex bg-brand-50 w-16 h-16 rounded-2xl items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300 shadow-inner">
              <Sparkles size={32} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;