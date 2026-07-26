/* 说明：这是你的 Journal.tsx 全量文件，已按你要求仅改 History/Calendar Summary 与文案。
   直接整份覆盖。 */

import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry, Language, User } from '../types';
import { generateJournalInsight, generateHistorySummary } from '../services/geminiService';
import { saveJournal } from '../services/cloudStore';
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
  currentUser?: User | null;
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
  currentUser
}) => {
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [event, setEvent] = useState('');
  const [reflection, setReflection] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [selfTalk, setSelfTalk] = useState('');
  const [angelNumbers, setAngelNumbers] = useState('');
  const [dreams, setDreams] = useState('');
  const [loveTarget, setLoveTarget] = useState('');
  const [apologyTarget, setApologyTarget] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [aiResponse, setAiResponse] = useState('');
  const [insight, setInsight] = useState('');

  const today = new Date();
  const dateString = today.toISOString().split('T')[0];

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingEntry;

  useEffect(() => {
    if (editingEntry) {
      setEvent(editingEntry.event || '');
      setReflection(editingEntry.reflection || '');
      setGratitude(editingEntry.gratitude || '');
      setSelfTalk(editingEntry.selfTalk || '');
      setAngelNumbers(editingEntry.angelNumbers || '');
      setDreams(editingEntry.dreams || '');
      setLoveTarget((editingEntry as any).loveTarget || '');
      setApologyTarget((editingEntry as any).apologyTarget || '');
      setAdditionalNotes((editingEntry as any).additionalNotes || '');
      setAiResponse((editingEntry as any).aiResponse || '');
      setInsight((editingEntry as any).insight || '');
      setShowOptional(true);
    } else {
      setEvent('');
      setReflection('');
      setGratitude('');
      setSelfTalk('');
      setAngelNumbers('');
      setDreams('');
      setLoveTarget('');
      setApologyTarget('');
      setAdditionalNotes('');
      setAiResponse('');
      setInsight('');
    }
  }, [editingEntry]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const draft = {
        event,
        reflection,
        gratitude,
        selfTalk,
        angelNumbers,
        dreams,
        loveTarget,
        apologyTarget,
        additionalNotes
      };
      localStorage.setItem('insightLoop_draft', JSON.stringify(draft));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [event, reflection, gratitude, selfTalk, angelNumbers, dreams, loveTarget, apologyTarget, additionalNotes]);

  useEffect(() => {
    if (!isEditing) {
      const savedDraft = localStorage.getItem('insightLoop_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setEvent(draft.event || '');
          setReflection(draft.reflection || '');
          setGratitude(draft.gratitude || '');
          setSelfTalk(draft.selfTalk || '');
          setAngelNumbers(draft.angelNumbers || '');
          setDreams(draft.dreams || '');
          setLoveTarget(draft.loveTarget || '');
          setApologyTarget(draft.apologyTarget || '');
          setAdditionalNotes(draft.additionalNotes || '');
        } catch { }
      }
    }
  }, [isEditing]);

  const handleSaveDraft = () => {
    const draft = {
      event,
      reflection,
      gratitude,
      selfTalk,
      angelNumbers,
      dreams,
      loveTarget,
      apologyTarget,
      additionalNotes
    };
    localStorage.setItem('insightLoop_draft', JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    if (!event.trim() && !reflection.trim() && !gratitude.trim() && !selfTalk.trim()) {
      setError(language === "zh" ? "请至少填写一项主要内容。" : "Please fill at least one main field.");
      return;
    }

    setIsSubmitting(true);

    try {
      const entry: JournalEntry = {
        id: isEditing ? editingEntry!.id : String(Date.now()),
        createdAt: isEditing ? editingEntry!.createdAt : Date.now(),
        date: isEditing ? editingEntry!.date : dateString,
        event,
        reflection,
        gratitude,
        selfTalk,
        angelNumbers,
        dreams,
        loveTarget,
        apologyTarget,
        additionalNotes,
        aiResponse,
        insight
      } as any;

      const userName = currentUser?.name || "";

      // ✅ LONG-TERM MODE (CORE): unchanged
      const lastEntries = entries
        .filter((x) => x.date !== entry.date)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 30);

      const response = await generateJournalInsight(entry, lastEntries, language, userName);

      const updated: JournalEntry = {
        ...(entry as any),
        aiResponse: response
      } as any;

      if (isEditing) {
        onUpdateEntry(updated);
      } else {
        onAddEntry(updated);
      }

      await saveJournal(updated);

      setSaveSuccess(true);
      localStorage.removeItem('insightLoop_draft');
      setTimeout(() => setSaveSuccess(false), 2000);

      if (!isEditing) {
        setEvent('');
        setReflection('');
        setGratitude('');
        setSelfTalk('');
        setAngelNumbers('');
        setDreams('');
        setLoveTarget('');
        setApologyTarget('');
        setAdditionalNotes('');
        setAiResponse('');
        setInsight('');
        setShowOptional(false);
      } else {
        onCancelEdit && onCancelEdit();
      }
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========= VIEW ONLY / HISTORY =========
  if (viewOnly) {
    const sortedEntries = [...entries].sort((a, b) => (parseInt(b.date.replace(/-/g, "")) - parseInt(a.date.replace(/-/g, ""))));

    const JournalHistoryCalendar: React.FC<{
      sortedEntries: JournalEntry[];
      onUpdateEntry: (entry: JournalEntry) => void;
      onDeleteEntry?: (id: string) => void;
      onEditEntry?: (entry: JournalEntry) => void;
      t: any;
      language: Language;
      currentUser?: User | null;
    }> = ({ sortedEntries, onUpdateEntry, onDeleteEntry, onEditEntry, t, language, currentUser }) => {
      // ---- helpers ----
      const toYMD = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      };

      const parseYMD = (ymd: string) => {
        const [y, m, d] = ymd.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const addDays = (d: Date, days: number) => {
        const x = new Date(d);
        x.setDate(x.getDate() + days);
        return x;
      };

      const clampRange = (a: string, b: string) => {
        const da = parseYMD(a).getTime();
        const db = parseYMD(b).getTime();
        return da <= db ? { start: a, end: b } : { start: b, end: a };
      };

      const normalizeText = (s: any) =>
        String(s ?? "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const entryToSearchBlob = (e: JournalEntry) => {
        return normalizeText(
          [
            e.date,
            e.event,
            e.gratitude,
            e.reflection,
            e.selfTalk,
            e.angelNumbers,
            e.dreams,
            e.loveTarget,
            e.apologyTarget,
            (e as any).additionalNotes,
            (e as any).aiResponse,
            (e as any).insight,
          ].join(" | ")
        );
      };

      // ---- state ----
      const [monthCursor, setMonthCursor] = useState<Date>(() => {
        if (sortedEntries.length > 0) return parseYMD(sortedEntries[0].date);
        return new Date();
      });

      const [selectedDay, setSelectedDay] = useState<string>(() => {
        if (sortedEntries.length > 0) return sortedEntries[0].date;
        return toYMD(new Date());
      });

      const [search, setSearch] = useState<string>("");
      const [rangeStart, setRangeStart] = useState<string | null>(null);
      const [rangeEnd, setRangeEnd] = useState<string | null>(null);
      const [summaryText, setSummaryText] = useState<string>("");
      const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
      const [summaryError, setSummaryError] = useState<string>("");

      // 24h once (local only)
      const SUMMARY_LAST_KEY = "insightLoop_history_summary_last_at";
      const MAX_HISTORY_SUMMARY_DAYS = 14; // inclusive

      // ---- derived ----
      const byDate = useMemo(() => {
        const map = new Map<string, JournalEntry>();
        for (const e of sortedEntries) {
          const prev = map.get(e.date);
          const prevTs = (prev?.createdAt ?? 0);
          const curTs = (e.createdAt ?? 0);
          if (!prev || curTs >= prevTs) map.set(e.date, e);
        }
        return map;
      }, [sortedEntries]);

      const searchNeedle = normalizeText(search);
      const matchedDates = useMemo(() => {
        if (!searchNeedle) return new Set<string>();
        const set = new Set<string>();
        for (const e of sortedEntries) {
          const blob = entryToSearchBlob(e);
          if (blob.includes(searchNeedle)) set.add(e.date);
        }
        return set;
      }, [sortedEntries, searchNeedle]);

      const selectedEntry = byDate.get(selectedDay) || null;

      const prevDay = selectedEntry ? toYMD(addDays(parseYMD(selectedDay), -1)) : null;
      const nextDay = selectedEntry ? toYMD(addDays(parseYMD(selectedDay), +1)) : null;

      const currentRange = useMemo(() => {
        if (!rangeStart || !rangeEnd) return null;
        return clampRange(rangeStart, rangeEnd);
      }, [rangeStart, rangeEnd]);

      const rangeEntries = useMemo(() => {
        if (!currentRange) return [];
        const s = parseYMD(currentRange.start).getTime();
        const e = parseYMD(currentRange.end).getTime();
        const items: JournalEntry[] = [];
        for (const it of sortedEntries) {
          const t0 = parseYMD(it.date).getTime();
          if (t0 >= s && t0 <= e) items.push(it);
        }
        items.sort((a, b) => parseYMD(a.date).getTime() - parseYMD(b.date).getTime());
        return items;
      }, [sortedEntries, currentRange]);

      const summaryCooldown = useMemo(() => {
        const last = Number(localStorage.getItem(SUMMARY_LAST_KEY) || "0");
        if (!last) return { ok: true, remainingMs: 0 };
        const now = Date.now();
        const diff = now - last;
        const ms24h = 24 * 60 * 60 * 1000;
        if (diff >= ms24h) return { ok: true, remainingMs: 0 };
        return { ok: false, remainingMs: ms24h - diff };
      }, []);

      const formatRemaining = (ms: number) => {
        const totalMin = Math.ceil(ms / 60000);
        if (totalMin <= 1) return "1m";
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h <= 0) return `${m}m`;
        return `${h}h ${m}m`;
      };

      // ---- month grid ----
      const monthStart = startOfMonth(monthCursor);
      const startWeekday = monthStart.getDay();
      const gridStart = addDays(monthStart, -startWeekday);
      const totalCells = 42;
      const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

      const hasEntryOn = (ymd: string) => byDate.has(ymd);
      const isInMonth = (d: Date) => d.getMonth() === monthCursor.getMonth();
      const isSelected = (ymd: string) => ymd === selectedDay;

      const onDayClick = (ymd: string) => setSelectedDay(ymd);

      const onRangePick = (ymd: string) => {
        setSummaryText("");
        setSummaryError("");
        if (!rangeStart || (rangeStart && rangeEnd)) {
          setRangeStart(ymd);
          setRangeEnd(null);
          return;
        }
        setRangeEnd(ymd);
      };

      const isInRange = (ymd: string) => {
        if (!currentRange) return false;
        const t0 = parseYMD(ymd).getTime();
        const s = parseYMD(currentRange.start).getTime();
        const e = parseYMD(currentRange.end).getTime();
        return t0 >= s && t0 <= e;
      };

      // ---- InsightLoop summary (HISTORY only, TEMP, not saved) ----
      const runHistorySummary = async () => {
        setSummaryError("");
        setSummaryText("");

        if (!currentRange) {
          setSummaryError(language === "zh" ? "请先在日历上选择日期区间。" : "Please select a date range on the calendar first.");
          return;
        }
        if (!rangeEntries || rangeEntries.length === 0) {
          setSummaryError(language === "zh" ? "所选区间内没有日记内容。" : "No journal entries found in the selected range.");
          return;
        }
        // Hard cap to control cost & privacy surface
        const rangeDays = Math.floor((parseYMD(currentRange.end).getTime() - parseYMD(currentRange.start).getTime()) / (24 * 60 * 60 * 1000)) + 1;
        if (rangeDays > MAX_HISTORY_SUMMARY_DAYS) {
          setSummaryError(
            language === "zh"
              ? `区间最多只能选择 ${MAX_HISTORY_SUMMARY_DAYS} 天（你当前选择了 ${rangeDays} 天）。请缩小范围后再生成 InsightLoop 总结。`
              : `Range is limited to ${MAX_HISTORY_SUMMARY_DAYS} days (you selected ${rangeDays}). Please shorten the range before generating InsightLoop summary.`
          );
          return;
        }

        const last = Number(localStorage.getItem(SUMMARY_LAST_KEY) || "0");
        if (last && Date.now() - last < 24 * 60 * 60 * 1000) {
          setSummaryError(
            language === "zh"
              ? `今天已使用过 InsightLoop 总结，请在 ${formatRemaining(24 * 60 * 60 * 1000 - (Date.now() - last))} 后再试。`
              : `InsightLoop summary used today. Try again in ${formatRemaining(24 * 60 * 60 * 1000 - (Date.now() - last))}.`
          );
          return;
        }

        try {
          setSummaryLoading(true);

          // Keep payload lightweight for history mode
          const payload = rangeEntries
            .map((e) => {
              return [
                `Date: ${e.date}`,
                `Event: ${e.event || ""}`,
                `Reflection: ${e.reflection || ""}`,
                `Gratitude: ${e.gratitude || ""}`,
                `SelfTalk: ${e.selfTalk || ""}`,
                `AngelNumbers: ${e.angelNumbers || ""}`,
                `Dreams: ${e.dreams || ""}`,
                `LoveTarget: ${e.loveTarget || ""}`,
                `ApologyTarget: ${e.apologyTarget || ""}`,
                `Notes: ${(e as any).additionalNotes || ""}`,
                `InsightLoop: ${(e as any).aiResponse || ""}`,
              ].join("\n");
            })
            .join("\n\n---\n\n");

          const virtualEntry: JournalEntry = {
            id: "history-summary",
            createdAt: Date.now(),
            date: currentRange.end,
            event: "",
            reflection: "",
            gratitude: "",
            selfTalk: "",
            angelNumbers: "",
            dreams: "",
            loveTarget: "",
            apologyTarget: "",
            additionalNotes: `INSIGHTLOOP SUMMARY REQUEST (${currentRange.start} ~ ${currentRange.end})\n\n${payload}`,
            aiResponse: "",
          } as any;

          const userName = currentUser?.name || "";

          // ✅ HISTORY ONLY: use dedicated function (DEV mock, PROD real)
          const res = await generateHistorySummary(rangeEntries, language, userName);

          setSummaryText(res || "");
          localStorage.setItem(SUMMARY_LAST_KEY, String(Date.now()));
        } catch (e: any) {
          setSummaryError(e?.message || "Unknown error");
        } finally {
          setSummaryLoading(false);
        }
      };

      // ---- UI ----
      return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-800 flex items-center gap-2">
                <History className="text-brand-500" size={26} />
                {language === "zh" ? "历史记录" : "History"}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {language === "zh"
                  ? "月历视图 + 关键词搜索 + 区间总结（不入库）"
                  : "Calendar view + keyword search + range summary (not saved)"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-semibold text-stone-700 flex items-center gap-2"
                onClick={() => setMonthCursor(addDays(startOfMonth(monthCursor), -1))}
              >
                ← {language === "zh" ? "上月" : "Prev"}
              </button>
              <div className="px-3 py-2 rounded-2xl bg-brand-50 border border-brand-100 text-sm font-bold text-brand-700">
                {monthCursor.getFullYear()}-{String(monthCursor.getMonth() + 1).padStart(2, "0")}
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-semibold text-stone-700 flex items-center gap-2"
                onClick={() => setMonthCursor(addDays(endOfMonth(monthCursor), +1))}
              >
                {language === "zh" ? "下月" : "Next"} →
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === "zh" ? "关键词搜索（全字段）" : "Search (all fields)"}
                className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                  onClick={() => setSearch("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-3xl border border-brand-100 shadow-sm p-4 sm:p-6">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
              {(language === "zh"
                ? ["日", "一", "二", "三", "四", "五", "六"]
                : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((w) => (
                  <div key={w} className="text-center py-2">{w}</div>
                ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-2">
              {cells.map((d) => {
                const ymd = toYMD(d);
                const has = hasEntryOn(ymd);
                const match = matchedDates.has(ymd);
                const inMonth = isInMonth(d);
                const selected = isSelected(ymd);
                const inRange = isInRange(ymd);

                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => onDayClick(ymd)}
                    className={[
                      "relative rounded-2xl border text-left p-2 sm:p-3 transition",
                      inMonth ? "bg-white" : "bg-stone-50/60",
                      selected ? "border-brand-500 ring-2 ring-brand-200" : "border-brand-100 hover:bg-brand-50/60",
                      inRange ? "outline outline-2 outline-brand-200" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold text-stone-800">
                        {d.getDate()}
                      </div>

                      {/* dots */}
                      <div className="flex items-center gap-1">
                        {has && <span className="w-2 h-2 rounded-full bg-brand-400" title="Has entry" />}
                        {match && <span className="w-2 h-2 rounded-full bg-amber-400" title="Matched search" />}
                      </div>
                    </div>

                    {/* Range pick (avoid nested button) */}
                    <div className="mt-2">
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-block text-[10px] uppercase tracking-widest text-stone-400 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRangePick(ymd);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onRangePick(ymd);
                          }
                        }}
                      >
                        {language === "zh" ? "选区间" : "Pick"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Range + Summary */}
            <div className="mt-6 rounded-3xl bg-brand-50 border border-brand-100 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Hash size={16} className="text-brand-600" />
                  {language === "zh" ? "区间总结（临时，不保存）" : "Range Summary (temp, not saved)"}
                </div>

                <button
                  type="button"
                  disabled={summaryLoading || !summaryCooldown.ok}
                  className={[
                    "px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition",
                    summaryLoading || !summaryCooldown.ok
                      ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                      : "bg-brand-500 text-white hover:bg-brand-600",
                  ].join(" ")}
                  onClick={runHistorySummary}
                >
                  <BrainCircuit size={16} />
                  {language === "zh" ? "InsightLoop总结" : "InsightLoop Summary"}
                  {!summaryCooldown.ok && (
                    <span className="text-[10px] opacity-80">
                      ({formatRemaining(summaryCooldown.remainingMs)})
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-2 text-xs text-stone-500">
                {language === "zh"
                  ? `提示：请先在日历上点击“选区间”两次确定范围；最多 ${MAX_HISTORY_SUMMARY_DAYS} 天；24小时仅一次。`
                  : `Tip: click "Pick" twice to set range; max ${MAX_HISTORY_SUMMARY_DAYS} days; once per 24h.`}
                {currentRange && (
                  <span className="ml-2 font-semibold text-stone-700">
                    {currentRange.start} ~ {currentRange.end}
                  </span>
                )}
              </div>

              {summaryError && (
                <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3">
                  {summaryError}
                </div>
              )}

              {summaryLoading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                  <Loader2 className="animate-spin" size={16} />
                  {language === "zh" ? "生成中…" : "Generating..."}
                </div>
              )}

              {summaryText && !summaryLoading && (
                <div className="mt-4 bg-white rounded-2xl border border-brand-100 p-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                  {summaryText}
                </div>
              )}
            </div>
          </div>

          {/* Selected Entry */}
          <div className="mt-8 bg-white rounded-3xl border border-brand-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-800">
                  {language === "zh" ? "当天日记" : "Selected Day"}
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  {selectedDay}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-semibold text-stone-700"
                  disabled={!prevDay}
                  onClick={() => prevDay && setSelectedDay(prevDay)}
                >
                  ← {language === "zh" ? "前一天" : "Prev"}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-semibold text-stone-700"
                  disabled={!nextDay}
                  onClick={() => nextDay && setSelectedDay(nextDay)}
                >
                  {language === "zh" ? "后一天" : "Next"} →
                </button>
              </div>
            </div>

            {!selectedEntry ? (
              <div className="mt-6 text-sm text-stone-500">
                {language === "zh" ? "这一天没有日记记录。" : "No entry for this day."}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {selectedEntry.event && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
                      {t.label_event}
                    </div>
                    <p className="text-sm text-stone-600">{selectedEntry.event}</p>
                  </div>
                )}
                {selectedEntry.reflection && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
                      {t.label_reflection}
                    </div>
                    <p className="text-sm text-stone-600">{selectedEntry.reflection}</p>
                  </div>
                )}
                {selectedEntry.gratitude && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
                      {t.label_gratitude}
                    </div>
                    <p className="text-sm text-stone-600">{selectedEntry.gratitude}</p>
                  </div>
                )}
                {selectedEntry.selfTalk && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
                      {t.label_selftalk}
                    </div>
                    <p className="text-sm text-stone-600">{selectedEntry.selfTalk}</p>
                  </div>
                )}
                {(selectedEntry as any).additionalNotes && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-400 font-semibold mb-1">
                      {language === "zh" ? "补充记录" : "Additional Notes"}
                    </div>
                    <p className="text-sm text-stone-600 whitespace-pre-wrap">{(selectedEntry as any).additionalNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <JournalHistoryCalendar
        sortedEntries={sortedEntries}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={onDeleteEntry}
        onEditEntry={onEditEntry}
        t={t}
        language={language}
        currentUser={currentUser}
      />
    );
  }

  // ========= NORMAL EDIT MODE =========
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-800 flex items-center gap-2">
          <PenSquare className="text-brand-500" size={26} />
          {isEditing ? (language === "zh" ? "编辑日记" : "Edit Journal") : (language === "zh" ? "写日记" : "Write Journal")}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-2 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-semibold text-stone-700 flex items-center gap-2"
          >
            <Save size={16} />
            {language === "zh" ? "保存草稿" : "Save Draft"}
          </button>

          {draftSaved && (
            <span className="text-xs text-green-600 font-bold">
              {language === "zh" ? "已保存" : "Saved"}
            </span>
          )}
        </div>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="bg-white rounded-3xl border border-brand-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
              <MessageCircle size={18} className="text-brand-600" />
              {language === "zh" ? "今日记录" : "Today"}
            </h3>

            <button
              type="button"
              className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              onClick={() => setShowOptional(!showOptional)}
            >
              {showOptional ? (language === "zh" ? "收起" : "Hide") : (language === "zh" ? "展开更多" : "More")}
              {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                {t.label_event}
              </label>
              <textarea
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[90px]"
                placeholder={language === "zh" ? "今天发生了什么？" : "What happened today?"}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                {t.label_reflection}
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[90px]"
                placeholder={language === "zh" ? "你的感受/想法是什么？" : "What did you feel/think?"}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                {t.label_gratitude}
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[80px]"
                placeholder={language === "zh" ? "今天你感谢什么？" : "What are you grateful for?"}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                {t.label_selftalk}
              </label>
              <textarea
                value={selfTalk}
                onChange={(e) => setSelfTalk(e.target.value)}
                className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[80px]"
                placeholder={language === "zh" ? "你今天对自己说了什么？" : "What did you tell yourself today?"}
              />
            </div>

            {showOptional && (
              <div className="mt-2 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                    {t.label_angel}
                  </label>
                  <input
                    value={angelNumbers}
                    onChange={(e) => setAngelNumbers(e.target.value)}
                    className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                    placeholder={language === "zh" ? "例如：111 / 444 / 1212" : "e.g. 111 / 444 / 1212"}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                    {t.label_dreams}
                  </label>
                  <textarea
                    value={dreams}
                    onChange={(e) => setDreams(e.target.value)}
                    className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[80px]"
                    placeholder={language === "zh" ? "梦境/灵感记录" : "Dreams / inspirations"}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                      {language === "zh" ? "想念对象" : "Love Target"}
                    </label>
                    <input
                      value={loveTarget}
                      onChange={(e) => setLoveTarget(e.target.value)}
                      className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder={language === "zh" ? "写名字/代号即可" : "Name / alias"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                      {language === "zh" ? "需要道歉对象" : "Apology Target"}
                    </label>
                    <input
                      value={apologyTarget}
                      onChange={(e) => setApologyTarget(e.target.value)}
                      className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder={language === "zh" ? "写名字/代号即可" : "Name / alias"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
                    {language === "zh" ? "补充记录" : "Additional Notes"}
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="w-full rounded-2xl border border-brand-100 px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 min-h-[90px]"
                    placeholder={language === "zh" ? "任何你想补充的细节" : "Anything else you want to note"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-4">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-2xl p-4">
            {language === "zh" ? "保存成功" : "Saved successfully"}
          </div>
        )}

        <div className="flex items-center justify-between">
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-3 rounded-2xl bg-white border border-brand-100 hover:bg-brand-50 text-sm font-bold text-stone-700 flex items-center gap-2"
            >
              <X size={16} />
              {language === "zh" ? "取消编辑" : "Cancel"}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              "ml-auto px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition",
              isSubmitting ? "bg-stone-200 text-stone-500 cursor-not-allowed" : "bg-brand-600 text-white hover:bg-brand-700",
            ].join(" ")}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isEditing ? (language === "zh" ? "更新" : "Update") : (language === "zh" ? "提交" : "Submit")}
          </button>
        </div>
      </form>

      {/* InsightLoop Insight */}
      <div className="relative mt-8">
        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-fuchsia-300 rounded-full"></div>
        <div className="bg-white rounded-3xl border border-brand-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-500" size={22} />
            <h3 className="text-lg font-black text-stone-800">
              {language === "zh" ? "InsightLoop 指引" : "InsightLoop Guidance"}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
            {aiResponse || (language === "zh" ? "提交后会在这里生成指引。" : "Submit to generate guidance here.")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Journal;
