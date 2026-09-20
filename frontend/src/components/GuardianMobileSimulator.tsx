'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  CreditCard,
  PhoneCall,
  PhoneOff,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  QrCode,
  Lock,
  Radio,
  Eye,
  Info,
  ChevronRight,
  UserCheck,
  Bot,
  Send,
  FileText,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Bell,
  MessageSquare,
  Sparkles,
  Scale,
  ShieldBan,
  HelpCircle,
  Activity,
  Zap,
  Flame,
  Terminal,
} from 'lucide-react';
import { guardianApi } from '../lib/guardianApi';

interface Props {
  initialSubTab?: 'call' | 'url' | 'upi' | 'notifications' | 'permissions';
  onIncidentCreated?: () => void;
  onSelectIncident?: (id: number) => void;
}

export const GuardianMobileSimulator: React.FC<Props> = ({
  initialSubTab = 'call',
  onIncidentCreated,
  onSelectIncident,
}) => {
  const [subTab, setSubTab] = useState<'call' | 'url' | 'upi' | 'notifications' | 'permissions'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  // ----------------------------------------------------------------
  // State: Permissions Onboarding
  // ----------------------------------------------------------------
  const [permissions, setPermissions] = useState({
    call_assistant: true,
    url_vpn: true,
    accessibility: true,
    notifications: true,
  });

  // ----------------------------------------------------------------
  // Audio & Speech Synthesis / Recognition Engine
  // ----------------------------------------------------------------
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechState, setSpeechState] = useState<'idle' | 'caller_speaking' | 'ai_speaking' | 'evaluating'>('idle');
  const [decisionLogs, setDecisionLogs] = useState<Array<{ time: string; type: 'sensor' | 'detect' | 'decision' | 'voice'; message: string }>>([]);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);

  const addDecisionLog = (type: 'sensor' | 'detect' | 'decision' | 'voice', message: string) => {
    const now = new Date();
    const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 100))}`;
    setDecisionLogs((prev) => [{ time: timeStr, type, message }, ...prev.slice(0, 19)]);
  };

  const speakText = (text: string, onDone?: () => void) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      setSpeechState('ai_speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Zira'))
      );
      if (engVoice) utterance.voice = engVoice;

      utterance.onend = () => {
        setSpeechState('idle');
        if (onDone) onDone();
      };
      utterance.onerror = () => {
        setSpeechState('idle');
        if (onDone) onDone();
      };

      addDecisionLog('voice', `Guardian AI Voice: "${text.slice(0, 60)}..."`);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS Speech Synthesis error:', e);
      setSpeechState('idle');
      if (onDone) onDone();
    }
  };

  // Instant real-time regex scanner for interim live audio stream
  const detectLiveThreatKeywords = (text: string) => {
    const lower = text.toLowerCase();
    const cues: string[] = [];
    let instantScore = 5;

    if (lower.includes('digital arrest') || lower.includes('arrest') || lower.includes('warrant') || lower.includes('secrecy') || lower.includes('video call') || lower.includes('skype')) {
      cues.push('DIGITAL_ARREST_COERCION');
      instantScore = Math.max(instantScore, 95);
    }
    if (lower.includes('police') || lower.includes('cbi') || lower.includes('crime branch') || lower.includes('customs') || lower.includes('rbi') || lower.includes('narcotics') || lower.includes('officer') || lower.includes('inspector')) {
      cues.push('AUTHORITY_CLAIM');
      instantScore = Math.max(instantScore, 75);
    }
    if (lower.includes('contraband') || lower.includes('narcotics') || lower.includes('passports') || lower.includes('courier') || lower.includes('parcel intercepted') || lower.includes('fedex customs')) {
      cues.push('CONTRABAND_PARCEL_SCAM');
      instantScore = Math.max(instantScore, 92);
    }
    if (lower.includes('otp') || lower.includes('verification code') || lower.includes('6-digit') || lower.includes('pin') || lower.includes('password')) {
      cues.push('OTP_HARVESTING');
      instantScore = Math.max(instantScore, 98);
    }
    if (lower.includes('transfer') || lower.includes('security deposit') || lower.includes('escrow') || lower.includes('phonepe') || lower.includes('gpay') || lower.includes('paytm') || lower.includes('upi')) {
      cues.push('PAYMENT_DEMAND');
      instantScore = Math.max(instantScore, 96);
    }
    if (lower.includes('urgent') || lower.includes('15 minutes') || lower.includes('2 hours') || lower.includes('9:30 pm') || lower.includes('power cut') || lower.includes('disconnected') || lower.includes('blocked immediately')) {
      cues.push('URGENCY_PRESSURE');
      instantScore = Math.max(instantScore, 70);
    }

    return { cues, instantScore };
  };

  // Continuous Speech Recognition Lifecycle
  const startContinuousListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Continuous live speech recognition is not supported in this browser. You can type in the input box below or use the Auto-Simulation mode.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsContinuousListening(true);
        addDecisionLog('sensor', '🔴 Real-time microphone listening active (continuous 16kHz stream).');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(currentInterim);
        setSpeechState('caller_speaking');

        // Real-time instantaneous cue detection during live speech
        const activeText = finalChunk || currentInterim;
        if (activeText.trim()) {
          const { cues, instantScore } = detectLiveThreatKeywords(activeText);
          if (cues.length > 0) {
            setCallCues((prev) => Array.from(new Set([...prev, ...cues])));
            setCallRiskScore((prev) => Math.max(prev, instantScore));
            if (instantScore >= 80) setCallRiskLevel('CRITICAL');
            else if (instantScore >= 60) setCallRiskLevel('HIGH');
            else if (instantScore >= 30) setCallRiskLevel('SUSPICIOUS');

            addDecisionLog('detect', `⚡ Live stream detected threat cues: [${cues.join(', ')}] -> Threat Score: ${instantScore}/100`);
          }
        }

        // Voice Activity Detection (VAD) debounce for submitting completed utterances
        if (finalChunk.trim()) {
          addDecisionLog('sensor', `Live audio segment captured: "${finalChunk.trim()}"`);
          handleLiveUtteranceReceived(finalChunk.trim());
          setInterimTranscript('');
        } else if (currentInterim.trim().length > 15) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentInterim.trim()) {
              addDecisionLog('sensor', `VAD pause threshold reached. Submitting phrase: "${currentInterim.trim()}"`);
              handleLiveUtteranceReceived(currentInterim.trim());
              setInterimTranscript('');
            }
          }, 1200);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition event:', event.error);
        }
      };

      recognition.onend = () => {
        if (callActive && isContinuousListening) {
          try {
            recognition.start();
          } catch (e) {
            setIsContinuousListening(false);
          }
        } else {
          setIsContinuousListening(false);
          setSpeechState('idle');
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsContinuousListening(false);
    }
  };

  const stopContinuousListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    clearTimeout(silenceTimerRef.current);
    setIsContinuousListening(false);
    setInterimTranscript('');
    setSpeechState('idle');
    addDecisionLog('sensor', 'Microphone stream suspended.');
  };

  // ----------------------------------------------------------------
  // State: HERO 1 — EQUAL AI CALL ASSISTANT
  // ----------------------------------------------------------------
  const callPresets = [
    {
      id: 'customs_contraband',
      name: '🚨 FedEx Customs & Narcotics Contraband Extortion',
      callerPhone: '+91 99102 34567',
      callerName: 'Customs Clearance Desk (FedEx Mumbai)',
      category: 'CUSTOMS_EXTORTION',
      script: [
        {
          text: 'Hello, this is FedEx Courier Customs branch in Mumbai. A parcel addressed to you containing 5 fake passports and 140 grams of contraband narcotics has been seized.',
          expectedLevel: 'SUSPICIOUS',
        },
        {
          text: 'An official FIR has been registered with the Narcotics Control Bureau. You must stay on this line in a quiet room or an arrest warrant will be issued in 15 minutes.',
          expectedLevel: 'HIGH',
        },
        {
          text: 'To clear your name from the drug trafficking registry, transfer a ₹25,000 verified RBI refundable security clearance bond right now to our officer handle.',
          expectedLevel: 'CRITICAL',
        },
      ],
    },
    {
      id: 'digital_arrest_cbi',
      name: '🚨 CBI Digital Arrest & Money Laundering Trap',
      callerPhone: '+91 98765 43210',
      callerName: 'CBI Cyber Crime Cell (Officer Rathore)',
      category: 'DIGITAL_ARREST',
      script: [
        {
          text: 'This is Officer Rathore from CBI HQ Delhi. Your bank account has been flagged in a ₹3.8 Crore international money laundering syndicate.',
          expectedLevel: 'SUSPICIOUS',
        },
        {
          text: 'You are placed under immediate 24-hour Digital Arrest. Do not disconnect this call or inform anyone under National Security provisions.',
          expectedLevel: 'HIGH',
        },
        {
          text: 'A one-time verification security token has been sent to your phone. Read out the 6-digit OTP right now to verify your identity.',
          expectedLevel: 'HIGH',
        },
        {
          text: 'Now open PhonePe or Google Pay and transfer ₹15,000 verification bond to our designated RBI safe escrow account to lift the arrest warrant.',
          expectedLevel: 'CRITICAL',
        },
      ],
    },
    {
      id: 'electricity_bill_scam',
      name: '⚠️ Electricity Power Cut at 9:30 PM Scam',
      callerPhone: '+91 88002 99123',
      callerName: 'State Electricity Billing Dept',
      category: 'BILL_SCAM',
      script: [
        {
          text: 'Dear consumer, your monthly electricity power bill is overdue. Your power connection will be permanently disconnected at 9:30 PM tonight.',
          expectedLevel: 'SUSPICIOUS',
        },
        {
          text: 'Call our billing executive immediately and download the QuickSupport screen sharing app to verify your ₹10 bill reconnection update.',
          expectedLevel: 'CRITICAL',
        },
      ],
    },
    {
      id: 'sim_kyc_suspicious',
      name: '⚠️ TRAI / SIM Card Deactivation in 2 Hours',
      callerPhone: '+91 80001 23456',
      callerName: 'TRAI Telecom Regulatory Desk',
      category: 'SIM_KYC',
      script: [
        {
          text: 'Hello, your mobile SIM card will be deactivated within 2 hours due to pending KYC verification and bulk spam complaints.',
          expectedLevel: 'SUSPICIOUS',
        },
        {
          text: 'Please confirm your 16-digit debit card number and date of birth so we can keep your SIM active.',
          expectedLevel: 'HIGH',
        },
      ],
    },
    {
      id: 'safe_delivery',
      name: '✓ Safe Call (Verified Amazon Logistics Delivery)',
      callerPhone: '+91 91234 56789',
      callerName: 'Amazon Logistics Driver',
      category: 'LEGIT_DELIVERY',
      script: [
        {
          text: 'Hello, I have an Amazon delivery parcel for Alex. Are you available at your address to receive it?',
          expectedLevel: 'SAFE',
        },
        {
          text: 'Great, I will leave it with your building security guard as requested. Have a wonderful day!',
          expectedLevel: 'SAFE',
        },
      ],
    },
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [callId, setCallId] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState('+91 99102 34567');
  const [callerName, setCallerName] = useState('Customs Clearance Desk');
  const [turnIndex, setTurnIndex] = useState(0);
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string; detected_cues?: string[] }>>([]);
  const [callRiskLevel, setCallRiskLevel] = useState('SAFE');
  const [callRiskScore, setCallRiskScore] = useState(0);
  const [callCues, setCallCues] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isTakeover, setIsTakeover] = useState(false);
  const [postCallSummary, setPostCallSummary] = useState<any>(null);
  const [customCallerInput, setCustomCallerInput] = useState('');
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);

  useEffect(() => {
    let interval: any;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopContinuousListening();
      clearInterval(simIntervalRef.current);
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const handleStartCallScreening = async (enableLiveMic: boolean = false) => {
    const preset = callPresets[selectedPresetIndex];
    setCallerPhone(preset.callerPhone);
    setCallerName(preset.callerName);
    setTurnIndex(0);
    setTranscript([]);
    setCallRiskLevel('SAFE');
    setCallRiskScore(5);
    setCallCues([]);
    setCallDuration(0);
    setIsTakeover(false);
    setPostCallSummary(null);
    setDecisionLogs([]);
    setIsAutoSimulating(false);

    const initialGreeting =
      'Hello, this is Guardian AI safety assistant on behalf of the recipient. Please state your name, organization, and the explicit purpose of your call.';

    addDecisionLog('decision', `🤖 AI Screening initiated for incoming caller ${preset.callerPhone}`);

    try {
      const res = await guardianApi.startCallScreening(preset.callerPhone, preset.callerName);
      setCallId(res.call_id);
      const greeting = res.initial_greeting || initialGreeting;
      setTranscript([
        {
          speaker: 'GUARDIAN_AI',
          text: greeting,
          detected_cues: [],
        },
      ]);
      setCallActive(true);
      speakText(greeting, () => {
        if (enableLiveMic) {
          startContinuousListening();
        }
      });
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error('Failed to start call screening:', err);
      setCallId('CALL-SIM-999');
      setTranscript([
        {
          speaker: 'GUARDIAN_AI',
          text: initialGreeting,
          detected_cues: [],
        },
      ]);
      setCallActive(true);
      speakText(initialGreeting, () => {
        if (enableLiveMic) {
          startContinuousListening();
        }
      });
    }
  };

  // Real-Time Core Utterance Pipeline Dispatcher
  const handleLiveUtteranceReceived = async (utteranceText: string) => {
    if (!utteranceText.trim()) return;
    setLoadingTurn(true);
    setSpeechState('evaluating');

    try {
      const updatedTranscript = [
        ...transcript,
        { speaker: 'CALLER', text: utteranceText.trim(), detected_cues: [] },
      ];
      setTranscript(updatedTranscript);

      addDecisionLog('detect', `Analyzing caller speech turn with Multi-Agent Engine...`);

      const res = await guardianApi.processTurnTwoWay({
        call_id: callId,
        caller_phone: callerPhone,
        transcript_history: updatedTranscript,
        latest_utterance: utteranceText.trim(),
      });

      setCallRiskLevel(res.risk_level);
      setCallRiskScore(res.risk_score);
      const cues = res.cues_detected || [];
      setCallCues(cues);

      // Autonomous AI Decision Logic
      let aiReply = res.ai_response || 'Thank you. I have logged this statement in the call record.';

      if (res.risk_level === 'CRITICAL' || res.risk_score >= 80) {
        addDecisionLog(
          'decision',
          `🚨 CRITICAL THREAT DETECTED (${res.risk_score}/100) -> Triggering Autonomous Voice Counter-Intervention!`
        );
      } else if (res.risk_level === 'HIGH') {
        addDecisionLog(
          'decision',
          `⚠️ High Risk Pattern Detected (${res.risk_score}/100) -> Demanding Officer Verification & ID.`
        );
      } else {
        addDecisionLog(
          'decision',
          `✓ Conversation Safe (${res.risk_score}/100) -> Monitoring caller statement.`
        );
      }

      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'GUARDIAN_AI',
          text: aiReply,
          detected_cues: res.cues_detected,
        },
      ]);

      // Speak back response in real-time
      speakText(aiReply);
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error('Failed to process turn in real-time:', err);
      // Client-side fallback response if backend offline
      const { cues, instantScore } = detectLiveThreatKeywords(utteranceText);
      setCallRiskScore((prev) => Math.max(prev, instantScore));
      if (instantScore >= 80) setCallRiskLevel('CRITICAL');

      let fallbackReply = 'Statement logged for verification.';
      if (instantScore >= 80) {
        fallbackReply = 'Security Warning: Official agencies and banks never demand emergency fund transfers, OTPs, or bail bonds over phone calls.';
      }
      setTranscript((prev) => [
        ...prev,
        { speaker: 'GUARDIAN_AI', text: fallbackReply, detected_cues: cues },
      ]);
      speakText(fallbackReply);
    } finally {
      setLoadingTurn(false);
    }
  };

  // Automated Real-Time Stream Simulation Runner
  const handleStartAutoSimulation = () => {
    if (isAutoSimulating) {
      setIsAutoSimulating(false);
      clearInterval(simIntervalRef.current);
      addDecisionLog('sensor', 'Auto simulation paused.');
      return;
    }

    handleStartCallScreening(false);
    setIsAutoSimulating(true);
    let step = 0;
    const preset = callPresets[selectedPresetIndex];

    addDecisionLog('sensor', `⚡ Starting autonomous live stream simulation for scenario: "${preset.name}"`);

    simIntervalRef.current = setInterval(() => {
      if (step >= preset.script.length) {
        clearInterval(simIntervalRef.current);
        setIsAutoSimulating(false);
        addDecisionLog('decision', 'Simulation completed all turns.');
        return;
      }

      const scriptItem = preset.script[step];
      step += 1;
      setTurnIndex(step);

      addDecisionLog('sensor', `Caller audio stream: "${scriptItem.text}"`);
      handleLiveUtteranceReceived(scriptItem.text);
    }, 4500);
  };

  const handleCustomCallerSpeak = () => {
    if (!customCallerInput.trim()) return;
    const text = customCallerInput;
    setCustomCallerInput('');
    handleLiveUtteranceReceived(text);
  };

  const handleAssistantAction = (type: 'ASK_BADGE' | 'CITE_RBI' | 'WARN_1930' | 'MUTE_THREAT') => {
    let actionText = '';
    if (type === 'ASK_BADGE') {
      actionText = 'Please provide your official police station name, officer badge ID, and registered case FIR number for identity verification.';
      addDecisionLog('decision', '⚡ Triggered: Demand Police Station & Officer Badge Verification.');
    } else if (type === 'CITE_RBI') {
      actionText = 'Under RBI Circular & IT Act, bank representatives and law enforcement officers are strictly prohibited from demanding OTPs, CVVs, or emergency UPI fund transfers over phone calls.';
      addDecisionLog('decision', '⚡ Triggered: Cite RBI & IT Act Regulatory Protections.');
    } else if (type === 'WARN_1930') {
      actionText = 'Notice: This phone call trajectory has been classified as a suspected digital fraud attempt. A cryptographic evidence bundle is being generated for National Cyber Crime Portal (1930).';
      addDecisionLog('decision', '⚡ Triggered: Issue 1930 Cybercrime Registration Warning.');
    } else if (type === 'MUTE_THREAT') {
      setIsMuted(!isMuted);
      addDecisionLog('decision', `⚡ ${!isMuted ? 'Muted caller audio stream.' : 'Unmuted caller audio stream.'}`);
      return;
    }

    setTranscript((prev) => [
      ...prev,
      {
        speaker: 'GUARDIAN_AI',
        text: actionText,
        detected_cues: ['DIRECT_DEFENSIVE_INTERVENTION'],
      },
    ]);
    speakText(actionText);
  };

  const handleTakeover = async () => {
    setIsTakeover(true);
    addDecisionLog('decision', '✋ User Alex initiated manual call takeover.');
    try {
      await guardianApi.takeoverCall(callId);
      const msg = '✋ User Alex has taken over the call. Guardian AI switching to background monitoring.';
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'GUARDIAN_AI',
          text: msg,
          detected_cues: [],
        },
      ]);
      speakText('User has taken over the call. Switching to background monitoring.');
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndCall = async (action: 'USER_TERMINATED_CALL' | 'CALL_COMPLETED' | 'USER_TAKEOVER') => {
    setCallActive(false);
    setIsAutoSimulating(false);
    stopContinuousListening();
    clearInterval(simIntervalRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    addDecisionLog('decision', `Call terminated. Compiling cryptographic incident report.`);

    try {
      const res = await guardianApi.concludeCallAndSummarize({
        call_id: callId,
        caller_phone: callerPhone,
        turn_history: transcript,
        final_risk: callRiskLevel,
        final_score: callRiskScore,
        action_taken: action,
        duration_sec: callDuration || 42,
      });
      setPostCallSummary(res);
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  };

  // ----------------------------------------------------------------
  // State: HERO 2 — URL Protection
  // ----------------------------------------------------------------
  const [urlInput, setUrlInput] = useState('https://hdfc-bankk-kyc.top/login-update');
  const [urlState, setUrlState] = useState<'idle' | 'inspecting' | 'intercepted_blocked' | 'navigated_safe'>('idle');
  const [urlAnalysisResult, setUrlAnalysisResult] = useState<any>(null);

  const handleInspectUrl = async (targetUrl: string) => {
    setUrlInput(targetUrl);
    setUrlState('inspecting');
    try {
      const res = await guardianApi.inspectUrl(targetUrl);
      setUrlAnalysisResult(res);
      if (res.risk?.risk_level === 'CRITICAL' || res.risk?.risk_level === 'HIGH' || res.risk?.risk_level === 'SUSPICIOUS') {
        setUrlState('intercepted_blocked');
      } else {
        setUrlState('navigated_safe');
      }
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error(err);
      setUrlState('idle');
    }
  };

  const handleUrlDecision = async (decision: 'ABORTED' | 'PROCEEDED_ANYWAY') => {
    if (urlAnalysisResult?.incident_id) {
      await guardianApi.recordUrlDecision(urlAnalysisResult.incident_id, decision);
    }
    setUrlState('idle');
    if (onIncidentCreated) onIncidentCreated();
  };

  // ----------------------------------------------------------------
  // State: HERO 3 — UPI & QR Shield
  // ----------------------------------------------------------------
  const [upiPayload, setUpiPayload] = useState(
    'upi://pay?pa=refund-support@xyz&pn=Instant%20Refund%20Desk&am=8500&cu=INR&tn=Security%20Reversal'
  );
  const [upiState, setUpiState] = useState<'idle' | 'intercepting' | 'blocked' | 'verified_safe'>('idle');
  const [upiAnalysisResult, setUpiAnalysisResult] = useState<any>(null);

  const handleInspectPayment = async (payload: string) => {
    setUpiPayload(payload);
    setUpiState('intercepting');
    try {
      const res = await guardianApi.inspectPayment(payload);
      setUpiAnalysisResult(res);
      if (res.risk?.risk_level === 'CRITICAL' || res.risk?.risk_level === 'HIGH' || res.risk?.risk_level === 'SUSPICIOUS') {
        setUpiState('blocked');
      } else {
        setUpiState('verified_safe');
      }
      if (onIncidentCreated) onIncidentCreated();
    } catch (err) {
      console.error(err);
      setUpiState('idle');
    }
  };

  const handlePaymentDecision = async (decision: 'CANCELLED_BY_USER' | 'PROCEEDED_DESPITE_WARNING') => {
    if (upiAnalysisResult?.incident_id) {
      await guardianApi.recordPaymentDecision(upiAnalysisResult.incident_id, decision);
    }
    setUpiState('idle');
    if (onIncidentCreated) onIncidentCreated();
  };

  // ----------------------------------------------------------------
  // State: HERO 4 — REAL-TIME NOTIFICATION & SMS LISTENER SHIELD
  // ----------------------------------------------------------------
  const notifPresets = [
    {
      id: 'otp_drain',
      name: '🚨 High-Pressure Bank Debit OTP (SMS)',
      app: 'Messages',
      pkg: 'com.google.android.apps.messaging',
      title: 'SBI-ALERT: Urgent OTP Request',
      text: 'Your debit card ending in 4491 is BLOCKED. Call officer Sharma at 9876543210 and share OTP 889102 immediately to restore access.',
      expectedLevel: 'CRITICAL',
      score: 96,
      reasons: [
        'High urgency coercion (card blocked notice)',
        'Solicits one-time verification password (OTP 889102)',
        'Impersonates SBI Bank security division',
      ],
    },
    {
      id: 'phishing_prize',
      name: '🚨 Fake Cash Reward Phish Link (WhatsApp)',
      app: 'WhatsApp',
      pkg: 'com.whatsapp',
      title: 'HDFC Bank Festive Reward ₹5,000',
      text: 'Congratulations Alex! You received ₹5,000 festive bonus. Claim instantly at https://hdfc-bankk-kyc.top/reward-claim before midnight.',
      expectedLevel: 'CRITICAL',
      score: 92,
      reasons: [
        'Typosquatted domain (hdfc-bankk-kyc.top)',
        'High-abuse .top TLD disposable phishing kit',
        'Unsolicited monetary prize claim trick',
      ],
    },
    {
      id: 'sim_kyc_suspicious',
      name: '⚠️ Telecom SIM Deactivation Notice',
      app: 'Messages',
      pkg: 'com.google.android.apps.messaging',
      title: 'Telecom Verification (Airtel)',
      text: 'Dear customer, your mobile connection will be suspended within 2 hours. Update Aadhaar details with officer.',
      expectedLevel: 'HIGH',
      score: 70,
      reasons: [
        'Artificial urgency tactic (2-hour suspension)',
        'Extortion pattern for identity documents',
      ],
    },
    {
      id: 'clean_delivery',
      name: '✓ Verified Order Delivered (Amazon)',
      app: 'Amazon',
      pkg: 'in.amazon.mShop.android.shopping',
      title: 'Amazon Logistics',
      text: 'Your package #883921 has been delivered to your front door. Thank you for shopping with Amazon.',
      expectedLevel: 'SAFE',
      score: 5,
      reasons: ['Clean delivery notice from verified merchant app'],
    },
  ];

  const [selectedNotifIndex, setSelectedNotifIndex] = useState(0);
  const [activeNotif, setActiveNotif] = useState<any>(null);
  const [notifHistory, setNotifHistory] = useState<any[]>([
    {
      id: '1',
      app: 'Messages',
      title: 'SBI-ALERT: Urgent KYC Action Required',
      text: 'Debit card BLOCKED. Call officer and share OTP.',
      level: 'CRITICAL',
      time: '10:42 PM',
      isUpdate: false,
    },
    {
      id: '2',
      app: 'Amazon',
      title: 'Package Delivered',
      text: 'Order #9921 arrived safely.',
      level: 'SAFE',
      time: '10:14 PM',
      isUpdate: false,
    },
  ]);
  const [customNotifTitle, setCustomNotifTitle] = useState('');
  const [customNotifText, setCustomNotifText] = useState('');

  const handlePostNotification = (preset: typeof notifPresets[0]) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const notifObj = {
      id: Math.random().toString(),
      app: preset.app,
      pkg: preset.pkg,
      title: preset.title,
      text: preset.text,
      level: preset.expectedLevel,
      score: preset.score,
      reasons: preset.reasons,
      time: timeStr,
      isUpdate: false,
    };
    setActiveNotif(notifObj);
    setNotifHistory((prev) => [notifObj, ...prev]);
    if (onIncidentCreated) onIncidentCreated();
  };

  const handleSendCustomNotification = () => {
    if (!customNotifText.trim()) return;
    const title = customNotifTitle.trim() || 'Incoming SMS Alert';
    const text = customNotifText.trim();
    const lower = text.toLowerCase();

    let level = 'SAFE';
    let score = 5;
    const reasons: string[] = [];

    if (lower.includes('http') || lower.includes('.top') || lower.includes('.xyz') || lower.includes('kyc')) {
      level = 'CRITICAL';
      score = 90;
      reasons.push('Deceptive link or credential harvesting keyword detected in alert');
    } else if (lower.includes('otp') || lower.includes('code') || lower.includes('share') || lower.includes('urgent')) {
      level = 'CRITICAL';
      score = 94;
      reasons.push('Sensitive OTP / Security code solicitation cue identified');
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const notifObj = {
      id: Math.random().toString(),
      app: 'Messages',
      pkg: 'com.google.android.apps.messaging',
      title,
      text,
      level,
      score,
      reasons: reasons.length ? reasons : ['Notification content analyzed clean'],
      time: timeStr,
      isUpdate: false,
    };

    setActiveNotif(notifObj);
    setNotifHistory((prev) => [notifObj, ...prev]);
    setCustomNotifTitle('');
    setCustomNotifText('');
    if (onIncidentCreated) onIncidentCreated();
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
      {/* Left Control Panel & Scenario Selector */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Guardian AI Call & Device Shield</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Voice Toggle */}
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                  voiceEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle AI Speech Voice output"
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>{voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Select a protection layer below to experience proactive AI screening, live streaming microphone listening, and real-time autonomous decision making:
          </p>

          {/* Sub Tab Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            <button
              onClick={() => setSubTab('call')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                subTab === 'call'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="h-4 w-4" />
              <span>1. Call AI</span>
            </button>

            <button
              onClick={() => setSubTab('url')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                subTab === 'url'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>2. URL Shield</span>
            </button>

            <button
              onClick={() => setSubTab('upi')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                subTab === 'upi'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>3. UPI Shield</span>
            </button>

            <button
              onClick={() => setSubTab('notifications')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                subTab === 'notifications'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>4. SMS Shield</span>
            </button>

            <button
              onClick={() => setSubTab('permissions')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                subTab === 'permissions'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>5. Status</span>
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: CALL SCREENING CONTROLS */}
        {/* ----------------------------------------------------------------- */}
        {subTab === 'call' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-400" />
                  <span>Real-Time Live Call Defense Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Streams live microphone or automated caller audio into the multi-agent detection pipeline.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                EQUAL AI MODEL
              </span>
            </div>

            {/* Live Mode Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (callActive && isContinuousListening) {
                    stopContinuousListening();
                  } else {
                    handleStartCallScreening(true);
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all shadow-md active:scale-95 ${
                  isContinuousListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                {isContinuousListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isContinuousListening ? 'Stop Live Mic Listening' : '🎙️ Start Continuous Live Mic'}</span>
              </button>

              <button
                onClick={handleStartAutoSimulation}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all active:scale-95 ${
                  isAutoSimulating
                    ? 'border-amber-500/80 bg-amber-950/40 text-amber-300'
                    : 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-white'
                }`}
              >
                {isAutoSimulating ? <Pause className="h-4 w-4 text-amber-400" /> : <Zap className="h-4 w-4 text-amber-400" />}
                <span>{isAutoSimulating ? 'Pause Auto-Simulation' : '⚡ Auto-Simulate Live Call'}</span>
              </button>
            </div>

            {/* Preset Scenarios Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                1. CHOOSE SIMULATED CALL SCENARIO:
              </label>
              <div className="space-y-2">
                {callPresets.map((preset, idx) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetIndex(idx);
                      if (callActive) {
                        handleStartCallScreening(isContinuousListening);
                      }
                    }}
                    className={`w-full text-left rounded-xl border p-3 text-xs transition-all ${
                      selectedPresetIndex === idx
                        ? 'border-emerald-500/60 bg-emerald-950/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>{preset.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          preset.category === 'CUSTOMS_EXTORTION' || preset.category === 'DIGITAL_ARREST'
                            ? 'bg-rose-500/20 text-rose-400'
                            : preset.category === 'BILL_SCAM' || preset.category === 'SIM_KYC'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {preset.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{preset.callerName}</span>
                      <span className="font-mono">{preset.callerPhone}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Caller Speech Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-mono text-slate-400 uppercase">
                2. TYPE OR SPEAK ANY CUSTOM CALLER LINE:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCallerInput}
                  onChange={(e) => setCustomCallerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomCallerSpeak()}
                  placeholder="e.g. 'I am Inspector Sharma from Crime Branch. Share OTP 9482 now.'"
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={handleCustomCallerSpeak}
                  disabled={!customCallerInput.trim() || loadingTurn}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>

            {/* Quick Defensive Counter-Intervention Chips */}
            {callActive && (
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    PROACTIVE DEFENSE COUNTER-INTERVENTIONS:
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">1-TAP ENFORCE</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAssistantAction('ASK_BADGE')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-left text-[11px] text-slate-200 hover:border-emerald-500/60 transition-all"
                  >
                    <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Demand Badge & Station ID</span>
                  </button>
                  <button
                    onClick={() => handleAssistantAction('CITE_RBI')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-left text-[11px] text-slate-200 hover:border-amber-500/60 transition-all"
                  >
                    <Scale className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Cite RBI Policy on OTP</span>
                  </button>
                  <button
                    onClick={() => handleAssistantAction('WARN_1930')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-left text-[11px] text-slate-200 hover:border-rose-500/60 transition-all"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span>Warn of 1930 Cybercrime Log</span>
                  </button>
                  <button
                    onClick={() => handleAssistantAction('MUTE_THREAT')}
                    className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-[11px] transition-all ${
                      isMuted
                        ? 'border-rose-500/80 bg-rose-950/30 text-rose-300'
                        : 'border-slate-700 bg-slate-950/80 text-slate-200 hover:border-blue-500/60'
                    }`}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400 shrink-0" /> : <Volume2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    <span>{isMuted ? 'Unmute Caller Audio' : 'Mute Caller Audio'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Real-Time AI Internal Decision Ticker Feed */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  REAL-TIME AGENTIC DECISION LOG:
                </span>
                <span className="text-[9px] text-emerald-400">LIVE SENSOR STREAM</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 h-36 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                {decisionLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-4">Waiting for audio / caller event stream...</div>
                ) : (
                  decisionLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-tight">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span
                        className={
                          log.type === 'decision'
                            ? 'text-emerald-300 font-bold'
                            : log.type === 'detect'
                            ? 'text-amber-300'
                            : log.type === 'voice'
                            ? 'text-cyan-300'
                            : 'text-slate-400'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 2: PRE-NAVIGATION URL SHIELD */}
        {/* ----------------------------------------------------------------- */}
        {subTab === 'url' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span>Pre-Navigation URL Defense</span>
            </h3>
            <p className="text-xs text-slate-400">
              Guardian intercepts web links before browser dispatch to analyze typosquatting, token harvesting, and homoglyphs.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase">QUICK URL PRESETS:</label>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleInspectUrl('https://hdfc-bankk-kyc.top/login-update')}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-rose-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-rose-400">🚨 Typosquatted Phishing Domain</div>
                  <div className="text-[11px] text-slate-500">hdfc-bankk-kyc.top (Brand spoof + .top abuse)</div>
                </button>

                <button
                  onClick={() => handleInspectUrl('https://paypa1-secure-verification.xyz/account/login')}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-rose-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-rose-400">🚨 Homoglyph Brand Impersonation</div>
                  <div className="text-[11px] text-slate-500">paypa1-secure-verification.xyz (Replaces 'l' with '1')</div>
                </button>

                <button
                  onClick={() => handleInspectUrl('https://www.hdfcbank.com/personal/ways-to-bank/online-banking')}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-emerald-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-emerald-400">✓ Legitimate Banking Portal</div>
                  <div className="text-[11px] text-slate-500">hdfcbank.com (Verified SSL + Official Domain)</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 3: QR & UPI PRE-PAYMENT SHIELD */}
        {/* ----------------------------------------------------------------- */}
        {subTab === 'upi' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              <span>Real-Time UPI & QR Pre-Payment Shield</span>
            </h3>
            <p className="text-xs text-slate-400">
              Inspects payment intents before handing control to PhonePe, Google Pay, or Paytm to detect reverse debit traps.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase">QUICK PAYMENT PRESETS:</label>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    handleInspectPayment(
                      'upi://pay?pa=refund-support@xyz&pn=Instant%20Refund%20Desk&am=8500&cu=INR&tn=Security%20Reversal'
                    )
                  }
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-rose-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-rose-400">🚨 Reverse Debit Refund Trap (₹8,500)</div>
                  <div className="text-[11px] text-slate-500">Handle: refund-support@xyz (Outbound debit framed as refund)</div>
                </button>

                <button
                  onClick={() =>
                    handleInspectPayment(
                      'upi://pay?pa=lottery-claim-gov@okaxis&pn=Govt%20Tax%20Clearance&am=15000&cu=INR&tn=Processing%20Fee'
                    )
                  }
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-amber-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-amber-400">⚠️ Fake Lottery Fee Trap (₹15,000)</div>
                  <div className="text-[11px] text-slate-500">Handle: lottery-claim-gov@okaxis (Coercive advance fee)</div>
                </button>

                <button
                  onClick={() =>
                    handleInspectPayment(
                      'upi://pay?pa=freshmart@icici&pn=Fresh%20Supermarket&am=450&cu=INR&tn=Groceries'
                    )
                  }
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 hover:border-emerald-500/40 transition-all text-xs"
                >
                  <div className="font-semibold text-emerald-400">✓ Verified Merchant QR (₹450)</div>
                  <div className="text-[11px] text-slate-500">Handle: freshmart@icici (Verified merchant code)</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 4: REAL-TIME NOTIFICATION & SMS LISTENER SHIELD */}
        {/* ----------------------------------------------------------------- */}
        {subTab === 'notifications' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-rose-400" />
                <span>Real-Time Android Notification Listener</span>
              </h3>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-400 border border-rose-500/30">
                ACTIVE SENSOR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Simulates Android <code className="text-emerald-400 font-mono">NotificationListenerService</code> events. Triage occurs instantaneously off the main thread to catch OTP theft and urgent SMS extortion before the user taps.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase">CHOOSE NOTIFICATION ATTACK SCENARIO:</label>
              <div className="space-y-2">
                {notifPresets.map((preset, idx) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedNotifIndex(idx);
                      handlePostNotification(preset);
                    }}
                    className={`w-full text-left rounded-xl border p-3 text-xs transition-all ${
                      selectedNotifIndex === idx && activeNotif?.title === preset.title
                        ? 'border-rose-500/60 bg-rose-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">{preset.name}</div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        preset.expectedLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        preset.expectedLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {preset.expectedLevel}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                      &ldquo;{preset.text}&rdquo;
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notification Tester */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-mono text-slate-400 uppercase">TYPE CUSTOM SMS / WHATSAPP PUSH ALERT:</label>
              <input
                type="text"
                value={customNotifTitle}
                onChange={(e) => setCustomNotifTitle(e.target.value)}
                placeholder="Sender / Title (e.g. HDFC-ALERT or Telecom KYC)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customNotifText}
                  onChange={(e) => setCustomNotifText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomNotification()}
                  placeholder="Notification body (e.g. Share OTP 4491 to prevent arrest...)"
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <button
                  onClick={handleSendCustomNotification}
                  disabled={!customNotifText.trim()}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PERMISSIONS */}
        {subTab === 'permissions' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-400" />
              <span>Android Permissions & Protection Layer</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Telecom / In-Call Screening Service</div>
                  <p className="text-[11px] text-slate-400">Enables autonomous AI call screening for unknown incoming calls.</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.call_assistant}
                  onChange={(e) => setPermissions({ ...permissions, call_assistant: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>

              <div className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Local VPN / DNS Packet Filter</div>
                  <p className="text-[11px] text-slate-400">Enables pre-navigation URL checking without third-party servers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.url_vpn}
                  onChange={(e) => setPermissions({ ...permissions, url_vpn: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>

              <div className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">UPI & QR Intent Hook</div>
                  <p className="text-[11px] text-slate-400">Intercepts deep links matching `upi://pay` before UPI app launch.</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.accessibility}
                  onChange={(e) => setPermissions({ ...permissions, accessibility: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>

              <div className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">NotificationListenerService Hook</div>
                  <p className="text-[11px] text-slate-400">Receives onNotificationPosted() callbacks in real time for SMS/banking scams.</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.notifications}
                  onChange={(e) => setPermissions({ ...permissions, notifications: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Realistic Mobile Phone Viewport (Pixel 8 Pro) */}
      <div className="lg:col-span-6 flex justify-center">
        <div className="relative w-full max-w-[380px] rounded-[44px] border-[10px] border-slate-800 bg-black p-3 shadow-2xl ring-1 ring-slate-700/50 min-h-[660px] flex flex-col justify-between overflow-hidden">
          {/* Top Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-slate-800 rounded-b-2xl z-30 flex items-center justify-center">
            <div className="h-1.5 w-10 bg-slate-700 rounded-full" />
            <div className="h-2.5 w-2.5 bg-slate-900 rounded-full ml-3 border border-slate-700" />
          </div>

          {/* Android Status Bar */}
          <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-mono text-slate-400 z-20">
            <span>10:42 PM</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* Screen Content Viewport */}
          <div className="my-auto py-3 flex-1 flex flex-col justify-between relative">
            {/* ------------------------------------------------------------- */}
            {/* SCREEN: EQUAL AI CALL ASSISTANT */}
            {/* ------------------------------------------------------------- */}
            {subTab === 'call' && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                {!callActive && !postCallSummary && (
                  <div className="my-auto text-center px-4 space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                      <Bot className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Guardian AI Call Assistant</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Equal AI interaction model with continuous speech streaming, real-time threat scoring & autonomous counter-interventions.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => handleStartCallScreening(true)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Start Live Call (Voice Stream)</span>
                      </button>
                      <button
                        onClick={handleStartAutoSimulation}
                        className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>Run Automated Simulation</span>
                      </button>
                    </div>
                  </div>
                )}

                {callActive && (
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    {/* Call Header */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-center space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Bot className="h-3 w-3" />
                          {isTakeover ? 'USER IN CALL' : isContinuousListening ? 'LIVE STREAM LISTENING' : 'AI SCREENING ACTIVE'}
                        </span>
                        <span>00:{callDuration < 10 ? `0${callDuration}` : callDuration}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{callerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{callerPhone}</div>

                      {/* Real-Time Audio Waveform Visualizer */}
                      <div className="flex justify-center items-center gap-1 h-5 pt-1">
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-4 animate-pulse' : 'h-1.5'}`} />
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-5 animate-pulse' : 'h-2'}`} />
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-3 animate-pulse' : 'h-1'}`} />
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-6 animate-pulse' : 'h-2.5'}`} />
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-4 animate-pulse' : 'h-1.5'}`} />
                        <span className={`w-1 rounded-full bg-emerald-400 transition-all ${speechState !== 'idle' ? 'h-5 animate-pulse' : 'h-2'}`} />
                      </div>
                    </div>

                    {/* Live Dual Transcript Feed */}
                    <div className="flex-1 max-h-[200px] overflow-y-auto space-y-2 p-1 text-xs pr-1">
                      {transcript.map((t, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            t.speaker === 'GUARDIAN_AI' ? 'items-start' : 'items-end'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-slate-500 mb-0.5">
                            {t.speaker === 'GUARDIAN_AI' ? '🤖 Guardian Assistant' : '👤 Caller'}
                          </span>
                          <div
                            className={`rounded-xl p-2 max-w-[88%] text-[11px] leading-snug ${
                              t.speaker === 'GUARDIAN_AI'
                                ? 'bg-slate-800/90 text-emerald-200 border border-slate-700'
                                : 'bg-slate-900 text-slate-200 border border-slate-800'
                            }`}
                          >
                            {t.text}
                          </div>
                        </div>
                      ))}

                      {/* Live Streaming Interim Transcript Bubble */}
                      {interimTranscript && (
                        <div className="flex flex-col items-end animate-pulse">
                          <span className="text-[9px] font-mono text-amber-400 mb-0.5">
                            👤 Caller (Speaking Live...)
                          </span>
                          <div className="rounded-xl p-2 max-w-[88%] text-[11px] leading-snug bg-amber-950/40 text-amber-200 border border-amber-500/40 italic">
                            &ldquo;{interimTranscript}&rdquo;
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Real-Time Risk & Heads-Up Overlay */}
                    {callRiskLevel !== 'SAFE' && (
                      <div
                        className={`rounded-2xl border p-3 space-y-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 ${
                          callRiskLevel === 'CRITICAL'
                            ? 'border-rose-500/80 bg-gradient-to-b from-rose-950/95 to-black text-rose-200'
                            : 'border-amber-500/80 bg-gradient-to-b from-amber-950/95 to-black text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                            <span>AUTONOMOUS THREAT INTERVENTION</span>
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold font-mono ${
                              callRiskLevel === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black'
                            }`}
                          >
                            {callRiskLevel} ({callRiskScore}/100)
                          </span>
                        </div>

                        <div className="space-y-0.5 text-[10px]">
                          <div className="font-bold text-white">Active Threat Vector:</div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {callCues.map((c, i) => (
                              <span key={i} className="rounded bg-rose-900/60 px-1.5 py-0.5 text-[9px] text-rose-200">
                                ✓ {c.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>

                        {callRiskLevel === 'CRITICAL' && (
                          <div className="rounded bg-rose-950/80 border border-rose-500/40 p-1.5 text-[9px] font-bold text-rose-300">
                            🚨 DO NOT SHARE: OTP • UPI PIN • PASSWORDS
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom In-Call Controls */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleTakeover}
                        className="rounded-xl border border-blue-500/30 bg-slate-900 py-2 text-xs font-semibold text-blue-400 hover:bg-slate-800"
                      >
                        {isTakeover ? 'In Call' : 'Take Over'}
                      </button>
                      <button
                        onClick={() => handleEndCall('USER_TERMINATED_CALL')}
                        className="rounded-xl bg-rose-600 hover:bg-rose-500 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30"
                      >
                        End Call
                      </button>
                    </div>
                  </div>
                )}

                {/* Post-Call Summary Modal View */}
                {postCallSummary && !callActive && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left space-y-3 shadow-2xl animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-emerald-400" />
                        <span className="font-mono text-xs font-bold text-white">CALL INCIDENT SUMMARY</span>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold font-mono ${
                          postCallSummary.final_risk === 'CRITICAL'
                            ? 'bg-rose-500 text-white'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {postCallSummary.final_risk}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Caller:</span>
                        <span className="font-mono text-white">{postCallSummary.caller_phone}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Duration:</span>
                        <span className="font-mono text-white">00:{postCallSummary.duration_sec}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500 block">Purpose:</span>
                        {postCallSummary.purpose_summary}
                      </div>
                    </div>

                    {postCallSummary.detected_concerns?.length > 0 && (
                      <div className="space-y-1 text-[10px]">
                        <span className="font-bold text-rose-400 uppercase">Detected Concerns:</span>
                        <ul className="space-y-0.5 text-slate-400">
                          {postCallSummary.detected_concerns.map((c: string, i: number) => (
                            <li key={i}>• {c.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-lg bg-slate-950 p-2 text-[10px] text-emerald-400 border border-slate-800">
                      <strong>Recommended Action:</strong> {postCallSummary.recommended_action}
                    </div>

                    <button
                      onClick={() => setPostCallSummary(null)}
                      className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-white"
                    >
                      Done / Reset
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SCREEN: URL PROTECTION */}
            {/* ------------------------------------------------------------- */}
            {subTab === 'url' && (
              <div className="my-auto space-y-4">
                {urlState === 'idle' && (
                  <div className="space-y-3 text-center px-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Globe className="h-7 w-7" />
                    </div>
                    <div className="text-sm font-bold text-white">Browser Pre-Navigation Interceptor</div>
                    <p className="text-[11px] text-slate-400">
                      Tap test presets on the left or enter a custom link to simulate navigation interception.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleInspectUrl(urlInput)}
                        className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                )}

                {urlState === 'inspecting' && (
                  <div className="text-center py-12 space-y-3">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    <div className="text-xs font-mono text-cyan-400">Inspecting URL packets with Local VPN...</div>
                  </div>
                )}

                {urlState === 'intercepted_blocked' && (
                  <div className="rounded-2xl border border-rose-500/80 bg-gradient-to-b from-rose-950/90 to-black p-4 text-center space-y-3 animate-in fade-in">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="rounded bg-rose-500 px-2 py-0.5 text-[9px] font-mono font-bold text-white">
                        INTERCEPTED THREAT
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1">Phishing Link Blocked</h4>
                      <p className="text-[10px] text-rose-300 font-mono mt-0.5 truncate">{urlInput}</p>
                    </div>

                    <div className="rounded-xl bg-slate-950/80 p-2.5 text-left text-[10px] space-y-1 border border-rose-900/50">
                      <div className="font-bold text-rose-400">Risk Assessment:</div>
                      <div className="text-slate-300">
                        {urlAnalysisResult?.explanation?.why_flagged?.[0] ||
                          'Typosquatted domain mimicking official banking login.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleUrlDecision('ABORTED')}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white"
                      >
                        Return to Safety
                      </button>
                      <button
                        onClick={() => handleUrlDecision('PROCEEDED_ANYWAY')}
                        className="rounded-xl border border-slate-700 bg-slate-900 py-2 text-[10px] font-semibold text-slate-400 hover:text-white"
                      >
                        Proceed (Unsafe)
                      </button>
                    </div>
                  </div>
                )}

                {urlState === 'navigated_safe' && (
                  <div className="rounded-2xl border border-emerald-500/80 bg-slate-900 p-4 text-center space-y-3 animate-in fade-in">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">URL Verified Safe</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{urlInput}</p>
                    </div>
                    <button
                      onClick={() => setUrlState('idle')}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SCREEN: UPI PRE-PAYMENT SHIELD */}
            {/* ------------------------------------------------------------- */}
            {subTab === 'upi' && (
              <div className="my-auto space-y-4">
                {upiState === 'idle' && (
                  <div className="space-y-3 text-center px-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div className="text-sm font-bold text-white">Pre-Payment Intent Interceptor</div>
                    <p className="text-[11px] text-slate-400">
                      Simulate a malicious reverse-debit QR code or payment deep-link before handing off to UPI apps.
                    </p>
                    <button
                      onClick={() => handleInspectPayment(upiPayload)}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20"
                    >
                      Inspect Payment Link
                    </button>
                  </div>
                )}

                {upiState === 'intercepting' && (
                  <div className="text-center py-12 space-y-3">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <div className="text-xs font-mono text-amber-400">Inspecting UPI Intent Parameters...</div>
                  </div>
                )}

                {upiState === 'blocked' && (
                  <div className="rounded-2xl border border-rose-500/80 bg-gradient-to-b from-rose-950/90 to-black p-4 text-center space-y-3 animate-in fade-in">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <AlertOctagon className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="rounded bg-rose-500 px-2 py-0.5 text-[9px] font-mono font-bold text-white">
                        PAYMENT TRAP DETECTED
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1">Reverse Debit Trap Blocked</h4>
                      <p className="text-[10px] text-rose-300 font-mono mt-0.5">Amount: ₹8,500 Outbound Debit</p>
                    </div>

                    <div className="rounded-xl bg-slate-950/80 p-2.5 text-left text-[10px] space-y-1 border border-rose-900/50">
                      <div className="font-bold text-rose-400">Why this was blocked:</div>
                      <div className="text-slate-300">
                        {upiAnalysisResult?.explanation?.why_flagged?.[0] ||
                          'The sender claims you are receiving a refund, but this intent will deduct ₹8,500 from your account.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handlePaymentDecision('CANCELLED_BY_USER')}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white"
                      >
                        Decline Payment
                      </button>
                      <button
                        onClick={() => handlePaymentDecision('PROCEEDED_DESPITE_WARNING')}
                        className="rounded-xl border border-slate-700 bg-slate-900 py-2 text-[10px] font-semibold text-slate-400 hover:text-white"
                      >
                        Authorize (Unsafe)
                      </button>
                    </div>
                  </div>
                )}

                {upiState === 'verified_safe' && (
                  <div className="rounded-2xl border border-emerald-500/80 bg-slate-900 p-4 text-center space-y-3 animate-in fade-in">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Verified Merchant VPA</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Fresh Supermarket (₹450)</p>
                    </div>
                    <button
                      onClick={() => setUpiState('idle')}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SCREEN: NOTIFICATION LISTENER & SMS SHIELD */}
            {/* ------------------------------------------------------------- */}
            {subTab === 'notifications' && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <Bell className="h-3 w-3" />
                      NOTIFICATION SENSOR HUD
                    </span>
                    <span>{notifHistory.length} Alerts Intercepted</span>
                  </div>

                  {/* Active Notification Banner (Pop-up style) */}
                  {activeNotif && (
                    <div
                      className={`rounded-2xl border p-3 text-left space-y-2 shadow-2xl animate-in fade-in slide-in-from-top-2 ${
                        activeNotif.level === 'CRITICAL'
                          ? 'border-rose-500/80 bg-gradient-to-b from-rose-950/95 to-slate-950 text-rose-100'
                          : activeNotif.level === 'HIGH'
                          ? 'border-amber-500/80 bg-gradient-to-b from-amber-950/95 to-slate-950 text-amber-100'
                          : 'border-emerald-500/60 bg-slate-900 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-rose-400" />
                          <span className="text-[10px] font-bold font-mono">{activeNotif.app}</span>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[8px] font-bold font-mono ${
                            activeNotif.level === 'CRITICAL'
                              ? 'bg-rose-500 text-white'
                              : activeNotif.level === 'HIGH'
                              ? 'bg-amber-500 text-black'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {activeNotif.level} ({activeNotif.score}/100)
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white">{activeNotif.title}</div>
                      <div className="text-[11px] text-slate-300 leading-snug">&ldquo;{activeNotif.text}&rdquo;</div>

                      {activeNotif.reasons && (
                        <div className="rounded-lg bg-slate-950/80 p-2 text-[9px] border border-rose-900/40 space-y-0.5">
                          <div className="font-bold text-rose-400 uppercase">Threat Triaged in 14ms:</div>
                          {activeNotif.reasons.map((r: string, i: number) => (
                            <div key={i} className="text-slate-300">
                              • {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* History feed */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Recent Notification Stream:</span>
                    {notifHistory.map((n, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-2 text-left space-y-0.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-300">{n.app}</span>
                          <span className="font-mono text-slate-500">{n.time}</span>
                        </div>
                        <div className="text-[11px] text-white font-medium truncate">{n.title}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{n.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SCREEN: PERMISSIONS & DEVICE STATUS */}
            {/* ------------------------------------------------------------- */}
            {subTab === 'permissions' && (
              <div className="my-auto space-y-4 px-2">
                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4 text-center space-y-2">
                  <ShieldCheck className="mx-auto h-8 w-8 text-purple-400" />
                  <div className="text-xs font-bold text-white">Guardian Shield Active</div>
                  <div className="text-[10px] text-purple-300 font-mono">Pixel 8 Pro • Android 14 (API 34)</div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Call Screening Engine:</span>
                    <span className="text-emerald-400 font-mono font-bold">READY (Continuous STT)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Local DNS / VPN Filter:</span>
                    <span className="text-emerald-400 font-mono font-bold">ENABLED</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Notification Listener:</span>
                    <span className="text-emerald-400 font-mono font-bold">LISTENING</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Android Home Navigation Bar */}
          <div className="flex items-center justify-around px-8 py-2 z-20">
            <div className="h-1 w-24 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
