export type EmailConfig = {
  primaryEmail: string;
  backupEmail?: string;
  notificationTypes: ("health_alerts" | "daily_summary" | "emergency_alerts" | "medication_reminders")[];
  frequency: "immediate" | "hourly" | "daily" | "weekly";
  subjectPrefix?: string;
  senderName: string;
  useDefaultThresholds: boolean;
  thresholds: {
    temperature: number | "";
    heartRate: number | "";
    spo2: number | "";
    respiratoryRate: number | "";
    systolicBP: number | "";
    diastolicBP: number | "";
    painScale: number | "";
  };
};

const CONFIG_API_URLS = [
  'http://127.0.0.1:5002/api/config',
  'http://127.0.0.1:5000/api/config'
];

async function tryFetch(url: string, options: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, options);
    return response.ok ? response : null; // only treat 2xx as success
  } catch (err) {
    console.warn(`Failed to reach ${url}:`, err);
    return null;
  }
}

async function fetchWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
  for (const baseUrl of CONFIG_API_URLS) {
    const response = await tryFetch(`${baseUrl}${endpoint}`, options);
    if (response) return response;
  }
  throw new Error(`Could not reach config service at any URL: ${CONFIG_API_URLS.join(', ')}`);
}

export async function loadConfig(): Promise<EmailConfig | null> {
  try {
    const response = await fetchWithFallback('/read', { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    console.log('[configStorage] Loaded config:', data.config);
    return data.config || null;
  } catch (err) {
    console.error('[configStorage] Failed to load config:', err);
    return null;
  }
}

export async function saveConfig(config: EmailConfig): Promise<boolean> {
  try {
    const response = await fetchWithFallback('/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    console.log('[configStorage] Saved config successfully');
    return true;
  } catch (err) {
    console.error('[configStorage] Failed to save config:', err);
    return false;
  }
}

export async function clearConfig(): Promise<boolean> {
  try {
    const response = await fetchWithFallback('/clear', { method: 'POST' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('[configStorage] Cleared config successfully');
    return true;
  } catch (err) {
    console.error('[configStorage] Failed to clear config:', err);
    return false;
  }
}
