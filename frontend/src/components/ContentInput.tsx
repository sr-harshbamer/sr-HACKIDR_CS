import { cn } from "@/lib/cn";
import type { AnalysisMode } from "@/lib/types";
import { Sparkles, Mic, Square, Phone, PhoneOff, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

/**
 * Per-mode sample inputs. These are short, realistic, and cover the red flags
 * each analyzer looks for — so users can see the result experience immediately.
 */
const SAMPLES: Record<AnalysisMode, { label: string; value: string }[]> = {
  message: [
    {
      label: "Bank OTP phishing",
      value:
        "URGENT: Your BCA account is suspended. Verify now with OTP 828311 at http://bca-secure.xyz/login within 30 minutes or it will be closed.",
    },
    {
      label: "Parcel redelivery scam",
      value:
        "Your DHL parcel could not be delivered. Reschedule within 24 hours at http://dhl-reschedule.top/update to avoid return.",
    },
    {
      label: "Legitimate message",
      value: "Hey, are we still on for lunch tomorrow at noon?",
    },
  ],
  link: [
    {
      label: "Typosquatted brand",
      value: "http://paypa1-secure.login.xyz/account/verify?user=1",
    },
    {
      label: "Shortened link",
      value: "https://bit.ly/3xAbCdE",
    },
    {
      label: "Legitimate site",
      value: "https://github.com/torvalds/linux",
    },
  ],
  job_offer: [
    {
      label: "Advance-fee recruiter",
      value:
        "Congratulations! You're hired immediately as a data entry specialist, $500/day no experience needed. Pay a $50 training fee first. Contact recruiter@gmail.com or Telegram +628123456789.",
    },
    {
      label: "Mule-style role",
      value:
        "Work from home, flexible hours. Reshipping agent role, no skills required. Send passport photo to verify. Bank details needed for setup.",
    },
    {
      label: "Plausible offer",
      value:
        "Software Engineer position at Acme Corp. Interview scheduled next week via our careers page at acme.com/careers. HR contact: hr@acme.com.",
    },
  ],
  call: [
    {
      label: "Impersonation emergency",
      value:
        "[Simulated Call] 'Dad, it's me! I lost my phone and I'm at the police station. I need you to transfer $800 to this account immediately for bail. Don't call my old number! Please hurry!'",
    },
    {
      label: "Grandparent reward bait",
      value:
        "[Simulated Call] 'Congratulations, you have won a cash reward of $5,000 from the state lottery. To claim your reward, please verify your bank routing number and identity immediately.'",
    },
    {
      label: "Normal family chat",
      value:
        "[Simulated Call] 'Hey, just calling to see if you wanted to grab coffee this afternoon around 3. Let me know!'",
    },
  ],
};

export function ContentInput({
  mode,
  value,
  onChange,
  onAudioChange,
  disabled,
}: {
  mode: AnalysisMode;
  value: string;
  onChange: (v: string) => void;
  onAudioChange?: (blob: Blob | null) => void;
  disabled?: boolean;
}) {
  const placeholder =
    mode === "link"
      ? "Paste the full URL, including https://"
      : mode === "job_offer"
      ? "Paste the recruiter message, job description, or offer email"
      : mode === "call"
      ? "Use the recording panel below or paste simulated call speech text"
      : "Paste the suspicious SMS, chat, or email text";

  const limit = mode === "link" ? 500 : 6000;
  const tooLong = value.length > limit;

  // Recording State variables
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear recording if mode changes
  useEffect(() => {
    stopRecording();
    setRecordDuration(0);
    setAudioError(null);
  }, [mode]);

  const startRecording = async () => {
    setAudioError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        if (onAudioChange) onAudioChange(audioBlob);
        onChange(`[Voice Recording: ${recordDuration} seconds]`);
        
        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setAudioError("Microphone access denied or unavailable. You can still paste call transcripts manually.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-800">
          {mode === "call" ? "Voice Input / Call Transcript" : "Content to analyze"}
        </span>
        <span
          className={cn(
            "text-xs",
            tooLong ? "text-red-600" : "text-ink-400",
          )}
        >
          {value.length} / {limit}
        </span>
      </label>

      {mode === "call" && (
        <div className="mb-4 rounded-2xl border border-ink-200 bg-ink-50 p-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-3">
            {recording ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            ) : null}
            <span className="text-sm font-semibold text-ink-700">
              {recording
                ? `Simulated Incoming Call... (Recording: ${recordDuration}s)`
                : value.startsWith("[Voice Recording:")
                ? "Simulated Call Captured!"
                : "Incoming Call Simulator"}
            </span>
          </div>

          <div className="flex space-x-3">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="btn-brand flex items-center gap-2 bg-green-600 hover:bg-green-700 border-none text-white px-5 py-3 rounded-xl shadow-md transition"
              >
                <Phone className="h-4 w-4" />
                Answer & Record Call
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="btn-brand flex items-center gap-2 bg-red-600 hover:bg-red-700 border-none text-white px-5 py-3 rounded-xl shadow-md transition animate-pulse"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </button>
            )}
          </div>

          {audioError && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{audioError}</span>
            </div>
          )}
        </div>
      )}

      {mode === "link" ? (
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          className="input font-mono"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            if (onAudioChange) onAudioChange(null);
            onChange(e.target.value);
          }}
          disabled={disabled || recording}
        />
      ) : (
        <textarea
          rows={8}
          spellCheck={false}
          className="input min-h-[180px] resize-y leading-relaxed"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            if (onAudioChange) onAudioChange(null);
            onChange(e.target.value);
          }}
          disabled={disabled || recording}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <Sparkles className="h-3.5 w-3.5" />
          Try a sample:
        </span>
        {SAMPLES[mode].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              if (onAudioChange) onAudioChange(null);
              onChange(s.value);
            }}
            className="chip transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            disabled={disabled || recording}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

