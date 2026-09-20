/**
 * Guardian AI Client API & WebSocket SDK
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GuardianStats {
  protection_status: string;
  shield_version: string;
  total_incidents: number;
  threats_blocked: number;
  payments_protected: number;
  calls_analyzed: number;
  urls_scanned: number;
  recent_incidents: any[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('guardian_token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('guardian_token', token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('guardian_token');
  }
};

const authHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const guardianApi = {
  // Auth
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async register(username: string, email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/auth/settings`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async updateSettings(settings: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/auth/settings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // Stats & Incidents
  async getDashboardStats(): Promise<GuardianStats> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/dashboard/stats`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async listIncidents(params?: { threat_type?: string; risk_level?: string; limit?: number }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.threat_type) q.append('threat_type', params.threat_type);
    if (params?.risk_level) q.append('risk_level', params.risk_level);
    if (params?.limit) q.append('limit', params.limit.toString());
    const res = await fetch(`${API_BASE_URL}/api/guardian/incidents?${q.toString()}`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getIncidentDetail(id: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/incidents/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Incident not found');
    return res.json();
  },

  // Equal AI Call Assistant
  async startCallScreening(callerPhone = '+91 98765 43210', callerName = 'Unknown Caller'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/call/screen-start`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ caller_phone: callerPhone, caller_name: callerName }),
    });
    return res.json();
  },

  async sendCallTurnTwoWay(data: {
    call_id: string;
    caller_text: string;
    turn_history: any[];
    previous_level: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/call/turn-twoway`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async processTurnTwoWay(data: {
    call_id: string;
    caller_phone?: string;
    transcript_history?: any[];
    latest_utterance?: string;
    caller_text?: string;
    turn_history?: any[];
    previous_level?: string;
  }): Promise<any> {
    const payload = {
      call_id: data.call_id,
      caller_text: data.latest_utterance || data.caller_text || '',
      turn_history: data.transcript_history || data.turn_history || [],
      previous_level: data.previous_level || 'SAFE',
    };
    return this.sendCallTurnTwoWay(payload);
  },

  async takeoverCall(callId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/call/takeover`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ call_id: callId }),
    });
    return res.json();
  },

  async concludeCallAndSummarize(data: {
    call_id: string;
    caller_phone: string;
    turn_history: any[];
    final_risk: string;
    final_score: number;
    action_taken: string;
    duration_sec: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/call/conclude`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async listCallSessions(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/call/sessions`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  // URL Shield
  async inspectUrl(url: string, deviceName = 'Pixel 8 Pro (Guardian Shield)'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/url/inspect`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url, device_name: deviceName }),
    });
    return res.json();
  },

  async recordUrlDecision(incidentId: number, decision: string, comment?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/url/decision`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ incident_id: incidentId, decision, comment }),
    });
    return res.json();
  },

  // UPI Payment Shield
  async interceptPayment(payload: string, deviceName = 'Pixel 8 Pro (Guardian Shield)'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/payment/intercept`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ payload, device_name: deviceName }),
    });
    return res.json();
  },

  async inspectPayment(payload: string, deviceName = 'Pixel 8 Pro (Guardian Shield)'): Promise<any> {
    return this.interceptPayment(payload, deviceName);
  },

  async recordPaymentDecision(incidentId: number, decision: string, comment?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/payment/decision`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ incident_id: incidentId, decision, comment }),
    });
    return res.json();
  },

  // Threat Intel
  async listThreatEntities(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/intelligence/entities`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async reportThreat(data: { entity_type: string; entity_value: string; risk_category: string; notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guardian/intelligence/report`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // WebSocket Connection
  createEventsWebSocket(onMessage: (event: SecurityEvent) => void, onStatusChange?: (connected: boolean) => void): WebSocket {
    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/events`);
    
    ws.onopen = () => {
      if (onStatusChange) onStatusChange(true);
    };

    ws.onclose = () => {
      if (onStatusChange) onStatusChange(false);
    };

    ws.onerror = () => {
      if (onStatusChange) onStatusChange(false);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'HISTORY_SNAPSHOT' && Array.isArray(parsed.data)) {
          parsed.data.forEach((evt: SecurityEvent) => onMessage(evt));
        } else {
          onMessage(parsed);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    return ws;
  }
};
