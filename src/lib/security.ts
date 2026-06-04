/**
 * Sanitizes and validates a URL to prevent DOM-based XSS (CWE-79).
 * Ensures that the URL has a safe protocol.
 */
export function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Allow safe protocols explicitly
  if (
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') || 
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:image/')
  ) {
    try {
      const parsed = new URL(trimmed);
      if (['http:', 'https:', 'file:', 'data:'].includes(parsed.protocol)) {
        return trimmed;
      }
    } catch {
      // Local absolute or relative path fallback
      if (trimmed.startsWith('/') || trimmed.startsWith('file:///')) {
        return trimmed;
      }
    }
  }
  
  return '';
}

/**
 * Escapes dynamic values used in URL generation.
 */
export function sanitizeParam(param: string): string {
  return encodeURIComponent(param);
}
