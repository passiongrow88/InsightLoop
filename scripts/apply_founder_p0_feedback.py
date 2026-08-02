from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing replacement target: {label}")
    return text.replace(old, new, 1)


def patch_auth() -> None:
    path = Path("components/Auth.tsx")
    text = path.read_text(encoding="utf-8")

    replacements = {
        'eyebrow: "不是陪聊，而是一颗会记得你的大脑",': 'eyebrow: "把散落的经历，慢慢连成轨迹",',
        'title: "当熟悉的路口再次出现，\\n看见这一次仍然有选择。",': 'title: "记下今天，\\n看见生活如何重复。",',
        'body: "记录今天的故事、梦境和选择。InsightLoop 会在真实日期与原话的基础上，陪你看见重复，也看见你已经不同的地方。",': 'body: "你只需要写下发生了什么。随着记录累积，InsightLoop 会从真实日期和原话中，找出反复出现的处境、选择与变化。",',
        'privacy: "你的记录由你掌控。AI 的理解可以被修改或否定。",': 'privacy: "原话永远保留；任何解读都只是线索，不替你下结论。",',
        'todayText: "我明明不同意，却还是没有说。",': 'todayText: "会议上我不同意，最后还是说了“好”。",',
        'memoryText: "我怕说出来以后，大家会觉得我难相处。",': 'memoryText: "3 月 12 日｜“我怕拒绝后让关系变僵。”",',
        'insightText: "你已经开始在意：沉默是否仍是你想要的选择。",': 'insightText: "两次都在担心关系变僵；这一次，你已经先看见了这个顾虑。",',
        'eyebrow: "Not a chat pet — a mind that remembers you",': 'eyebrow: "Turn scattered moments into a visible path",',
        'title: "When a familiar crossroads returns,\\nsee that you still have a choice.",': 'title: "Keep today.\\nSee how life repeats.",',
        'body: "Record today\'s stories, dreams and choices. InsightLoop uses real dates and your own words to reveal repetition—and where you have already changed.",': 'body: "Write down what happened. As your records grow, InsightLoop uses real dates and your own words to reveal recurring situations, choices and change.",',
        'privacy: "Your records stay under your control. You can edit or reject every AI interpretation.",': 'privacy: "Your original words stay intact. Every interpretation is a clue, never a verdict.",',
    }
    for old, new in replacements.items():
        text = replace_once(text, old, new, old[:50])

    text = replace_once(
        text,
        'registered: "注册成功。请先验证邮箱，然后再登录。",\n    invalid:',
        'registered: "验证邮件已发送。请检查收件箱与垃圾邮件。",\n    existing: "这个邮箱已经注册过，不会再次发送注册邮件。请直接登录。",\n    invalid:',
        "zh existing-account copy",
    )
    text = replace_once(
        text,
        'registered: "Registered. Please verify your email, then sign in.",\n    invalid:',
        'registered: "Verification email sent. Check your inbox and spam folder.",\n    existing: "This email is already registered, so no new signup email was sent. Please sign in instead.",\n    invalid:',
        "en existing-account copy",
    )

    signup_old = '''        if (signUpError) throw signUpError;
        if (data.user && !data.user.email_confirmed_at) {
          setNotice(c.registered);
          setScreen("login");
          return;
        }
        if (data.user) {'''
    signup_new = '''        if (signUpError) throw signUpError;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError(c.existing);
          setScreen("login");
          return;
        }
        if (data.user && !data.user.email_confirmed_at) {
          setNotice(c.registered);
          setScreen("login");
          return;
        }
        if (data.user) {'''
    text = replace_once(text, signup_old, signup_new, "existing account detection")

    text = replace_once(
        text,
        'className="whitespace-pre-line font-serif text-4xl font-semibold leading-[1.18] text-stone-800 sm:text-6xl"',
        'className="max-w-[680px] whitespace-pre-line font-serif text-4xl font-semibold leading-[1.12] text-stone-800 sm:text-5xl lg:text-[54px]"',
        "landing title scale",
    )

    path.write_text(text, encoding="utf-8")


def patch_daily_record() -> None:
    path = Path("components/DailyRecord.tsx")
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '  const replyAudioRef = useRef<HTMLAudioElement | null>(null);',
        '  const replyAudioRef = useRef<HTMLAudioElement | null>(null);\n  const speechRecognitionRef = useRef<any>(null);',
        "speech recognition ref",
    )

    text = replace_once(
        text,
        '      streamRef.current?.getTracks().forEach((track) => track.stop());\n      replyAudioRef.current?.pause();',
        '      streamRef.current?.getTracks().forEach((track) => track.stop());\n      try { speechRecognitionRef.current?.abort?.(); } catch {}\n      window.speechSynthesis?.cancel();\n      replyAudioRef.current?.pause();',
        "voice cleanup",
    )

    text = replace_once(
        text,
        ': "今天发生了什么？从你最想留下的那个瞬间说起就好。";',
        ': "今天有什么想留下的？从一个具体瞬间开始就好。";',
        "opening copy",
    )

    play_pattern = re.compile(r'  const playReply = async \(text = \[visibleReply, saved \? "" : question\]\.filter\(Boolean\)\.join\(" "\)\) => \{.*?\n  \};\n\n  const stopRecording', re.S)
    play_replacement = '''  const speakWithBrowser = (words: string) =>
    new Promise<void>((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("Browser speech synthesis is unavailable."));
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(words);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((voice) =>
        language === "en" ? voice.lang.toLowerCase().startsWith("en") : voice.lang.toLowerCase().startsWith("zh")
      );
      if (preferred) utterance.voice = preferred;
      utterance.lang = language === "en" ? "en-SG" : "zh-CN";
      utterance.rate = companion === "phoenix" ? 0.96 : 0.92;
      utterance.pitch = companion === "phoenix" ? 1.04 : 0.92;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Browser speech playback failed."));
      window.speechSynthesis.speak(utterance);
    });

  const playReply = async (text = [visibleReply, saved ? "" : question].filter(Boolean).join(" ")) => {
    if (!text || isSpeaking) return;
    setVoiceError("");
    setIsSpeaking(true);
    try {
      replyAudioRef.current?.pause();
      const source = await synthesizeCompanionReply({ text, companion });
      const audio = new Audio(source);
      replyAudioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = async () => {
        try {
          await speakWithBrowser(text);
        } catch {
          setVoiceError(language === "en" ? "Voice playback failed." : "声音暂时无法播放。 ");
        } finally {
          setIsSpeaking(false);
        }
      };
      await audio.play();
    } catch {
      try {
        await speakWithBrowser(text);
      } catch {
        setVoiceError(language === "en" ? "Voice is temporarily unavailable." : "声音暂时无法播放。 ");
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  const stopRecording'''
    text, count = play_pattern.subn(play_replacement, text, count=1)
    if count != 1:
        raise SystemExit("Could not replace playReply")

    text = replace_once(
        text,
        '''  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };''',
        '''  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      return;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };''',
        "stop recording",
    )

    start_pattern = re.compile(r'  const startRecording = async \(\) => \{.*?\n  \};\n\n  const applyBrainResult', re.S)
    start_replacement = '''  const startRecording = async () => {
    setVoiceError("");

    const BrowserRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (BrowserRecognition) {
      const recognition = new BrowserRecognition();
      const existingInput = input.trim();
      let transcript = "";
      let failed = false;
      recognition.lang = language === "en" ? "en-SG" : "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      speechRecognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let combined = "";
        for (let index = 0; index < event.results.length; index += 1) {
          combined += event.results[index]?.[0]?.transcript || "";
        }
        transcript = combined.trim();
        if (transcript) {
          setInput(existingInput ? `${existingInput}\\n${transcript}` : transcript);
          setAction("listening");
        }
      };

      recognition.onerror = (event: any) => {
        failed = true;
        const code = String(event?.error || "");
        setVoiceError(
          language === "en"
            ? code === "not-allowed"
              ? "Microphone permission was blocked. Allow it in the address bar and try again."
              : code === "audio-capture"
                ? "No working microphone was found."
                : "No speech was recognised. Please try again."
            : code === "not-allowed"
              ? "麦克风权限被阻止了。请在浏览器地址栏允许麦克风后再试。"
              : code === "audio-capture"
                ? "没有找到可用的麦克风。"
                : "没有识别到清楚的语音，请再试一次。"
        );
      };

      recognition.onend = () => {
        if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
        speechRecognitionRef.current = null;
        setIsRecording(false);
        if (transcript) {
          setVoiceInput(true);
          setSaved(false);
          setAction("listening");
        } else if (!failed) {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "No speech was captured." : "没有录到清楚的声音，请再试一次。 ");
        }
      };

      try {
        recognition.start();
        setIsRecording(true);
        setAction("voice-listening");
        recordingTimerRef.current = window.setTimeout(stopRecording, 60_000);
        return;
      } catch {
        speechRecognitionRef.current = null;
      }
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(language === "en" ? "This browser cannot record audio." : "这个浏览器暂不支持录音。 ");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];

        if (!blob.size) {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "No audio was captured." : "没有录到声音，请再试一次。 ");
          return;
        }

        setIsTranscribing(true);
        setAction("thinking");
        try {
          const result = await transcribeCompanionAudio(blob);
          setInput((previous) => (previous.trim() ? `${previous.trim()}\\n${result.transcript}` : result.transcript));
          setVoiceInput(true);
          setSaved(false);
          setAction("listening");
        } catch {
          setAction("idle-breathe");
          setVoiceError(
            language === "en"
              ? "The recording was captured, but transcription failed. Please type this one instead."
              : "声音已经录到，但转成文字失败了。请先用文字输入这一段。"
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setAction("voice-listening");
      recordingTimerRef.current = window.setTimeout(stopRecording, 60_000);
    } catch {
      setVoiceError(language === "en" ? "Microphone permission was not granted." : "没有取得麦克风权限。 ");
    }
  };

  const applyBrainResult'''
    text, count = start_pattern.subn(start_replacement, text, count=1)
    if count != 1:
        raise SystemExit("Could not replace startRecording")

    observation_pattern = re.compile(r'\n\s*\{!saved && observation && \(.*?\n\s*\)\}', re.S)
    text, count = observation_pattern.subn("", text, count=1)
    if count != 1:
        raise SystemExit("Could not remove user-facing observation block")

    path.write_text(text, encoding="utf-8")


def patch_mimo_service() -> None:
    path = Path("services/mimoService.ts")
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''- Strength comes from evidence of what the user noticed or chose, never generic praise.

Return JSON only with the same fields requested by the user prompt.''',
        '''- Strength comes from evidence of what the user noticed or chose, never generic praise.

User-facing voice rules:
- Speak directly to the person as “你”; never describe them as “用户”.
- Never classify their wording as aggressive, defensive, resistant, avoidant, testing, provocative, or attention-seeking.
- Never infer a hidden motive from brevity, refusal, swearing, silence, or “nothing happened”.
- Never narrate your analysis process or mention AI, model, system, prompt, interpretation controls, or policy.
- If they do not want to record, accept it plainly. Offer one small concrete option without psychoanalysing them.
- The reply must sound like a perceptive long-term companion, not a clinical report or customer-service chatbot.

Return JSON only with the same fields requested by the user prompt.''',
        "client soul voice rules",
    )

    text = replace_once(
        text,
        ': `Write 3–6 natural sentences with no headings. Follow concrete detail → what may matter → real evidence or difference → present agency. Ask zero or one useful question. Do not turn every record into therapy.`}',
        ': `Write 1–4 natural sentences with no headings. Speak to the person directly. Follow concrete detail → what may matter → real evidence or difference → present agency. Ask zero or one useful question. Never describe the person in third person, classify their tone, or guess why they are testing you. Do not turn every record into therapy.`}',
        "record prompt style",
    )

    guard_code = '''
const META_ANALYSIS_PATTERN = /(?:用户.{0,24}(?:攻击|测试|防御|抗拒|逃避|表达状态|挑衅)|可能是在测试|带点攻击性|测试回应是否真实|可能只是今天确实没有|defensive|aggressive|testing (?:the )?response|resistant|avoidant)/i;

function guardUserFacingReply(
  result: CompanionReply,
  input: CompanionBrainInput,
  phase: "record" | "finalize"
): CompanionReply {
  const visible = [result.reply, result.observation, result.finalReflection].filter(Boolean).join("\\n");
  if (!META_ANALYSIS_PATTERN.test(visible)) return result;

  const noContent = /^(?:没有|没什么|不知道|不想说|无|nothing|nothing much|idk|nope)[。.!！?？\\s]*$/i.test(input.message.trim());
  const fallback = input.language === "en"
    ? noContent
      ? "That is enough for today. You can leave nothing, or keep one honest line: I do not feel like talking today."
      : "I will keep your actual words and not guess at your motive. Which concrete moment matters most to preserve?"
    : noContent
      ? "好，今天先不硬挖。你可以什么都不记，也可以只留下一句：今天不想说。"
      : "我先按你的原话记下，不替你猜原因。哪一个具体瞬间最值得留下？";

  return {
    ...result,
    reply: fallback,
    observation: "",
    question: phase === "record" && !noContent ? (input.language === "en" ? "Which concrete moment should we keep?" : "哪一个具体瞬间最值得留下？") : "",
    questionField: phase === "record" && !noContent ? "event" : "",
    finalReflection: phase === "finalize" ? fallback : "",
  };
}
'''
    marker = '\nconst SOUL_SYSTEM = `\n'
    if marker not in text:
        raise SystemExit("Missing SOUL_SYSTEM marker")
    text = text.replace(marker, guard_code + marker, 1)

    text = replace_once(
        text,
        '    const result = await callMiMo<CompanionReply>({ mode: "reply", ...payload });\n    return normaliseReply(result, history, "mimo-v2.5-pro", "record");',
        '    const result = await callMiMo<CompanionReply>({ mode: "reply", ...payload });\n    return guardUserFacingReply(normaliseReply(result, history, "mimo-v2.5-pro", "record"), input, "record");',
        "guard MiMo reply",
    )
    text = replace_once(
        text,
        '    return callGeminiFallback(payload, "record");',
        '    return guardUserFacingReply(await callGeminiFallback(payload, "record"), input, "record");',
        "guard fallback reply",
    )
    text = replace_once(
        text,
        '    const result = await callMiMo<CompanionReply>({ mode: "finalize", ...payload });\n    return normaliseReply(result, history, "mimo-v2.5-pro", "finalize");',
        '    const result = await callMiMo<CompanionReply>({ mode: "finalize", ...payload });\n    return guardUserFacingReply(normaliseReply(result, history, "mimo-v2.5-pro", "finalize"), input, "finalize");',
        "guard MiMo final",
    )
    text = replace_once(
        text,
        '    return callGeminiFallback(payload, "finalize");',
        '    return guardUserFacingReply(await callGeminiFallback(payload, "finalize"), input, "finalize");',
        "guard fallback final",
    )

    path.write_text(text, encoding="utf-8")


def patch_edge_function() -> None:
    path = Path("supabase/functions/mimo-companion/index.ts")
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''Record fields are internal memory, not a questionnaire: ${FIELDS.join(", ")}. Infer only relevant fields, ask at most one useful question, and never repeat a skipped field.

Use symbolic, Socratic, relational and choice-based reasoning silently as one mind.''',
        '''Record fields are internal memory, not a questionnaire: ${FIELDS.join(", ")}. Infer only relevant fields, ask at most one useful question, and never repeat a skipped field.

USER-FACING VOICE — mandatory:
- Speak directly as “我/你”. Never call the person “用户”.
- Never label their language as aggressive, defensive, resistant, avoidant, provocative, attention-seeking, or a test.
- Never infer hidden motives from short replies, refusal, swearing, silence, or saying nothing happened.
- Never narrate model analysis or mention AI, system, prompt, policy, or interpretation controls.
- If the person does not want to record, accept that without analysis and offer one small concrete option.
- observation is internal working memory only. It must not contain clinical or third-person commentary.

Use symbolic, Socratic, relational and choice-based reasoning silently as one mind.''',
        "edge user-facing voice rules",
    )

    text = replace_once(
        text,
        ': "Write 3–6 natural sentences. Order: present scene → emotional truth/human stake → optional inference → optional history only after contact → present agency. Ask zero or one question."}',
        ': "Write 1–4 natural sentences. Speak directly to the person. Order: present scene → what concretely matters → optional evidence → present agency. Ask zero or one question. Never classify the person’s tone or speculate that they are testing the response."}',
        "edge reply length",
    )

    path.write_text(text, encoding="utf-8")


patch_auth()
patch_daily_record()
patch_mimo_service()
patch_edge_function()
print("Founder P0 feedback patches applied.")
