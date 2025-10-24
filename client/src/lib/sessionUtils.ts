const SESSION_STORAGE_PREFIX = 'giftai_request_';
const CURRENT_SESSION_KEY = 'giftai_current_session';

export function getAllSessionIds(): string[] {
  const sessionIds: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SESSION_STORAGE_PREFIX)) {
      sessionIds.push(key.replace(SESSION_STORAGE_PREFIX, ''));
    }
  }
  return sessionIds;
}

export function getCurrentSessionId(): string | null {
  const currentSession = localStorage.getItem(CURRENT_SESSION_KEY);
  if (currentSession) {
    return currentSession;
  }
  
  const allSessions = getAllSessionIds();
  return allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;
}

export function setCurrentSessionId(sessionId: string): void {
  localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
}

export function saveSessionData(sessionId: string, data: any): void {
  localStorage.setItem(`${SESSION_STORAGE_PREFIX}${sessionId}`, JSON.stringify(data));
  setCurrentSessionId(sessionId);
}

export function getSessionData(sessionId: string): any | null {
  const data = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}
