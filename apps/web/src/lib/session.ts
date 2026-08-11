type SessionExpiredCallback = () => void;

let handleSessionExpired: SessionExpiredCallback | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredCallback) {
  handleSessionExpired = handler;
}

export function clearSessionExpiredHandler() {
  handleSessionExpired = null;
}

export function triggerSessionExpired() {
  handleSessionExpired?.();
}
