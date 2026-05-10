import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOG_DIR = path.join(os.homedir(), '.pantry');
const LOG_FILE = path.join(LOG_DIR, 'commands.log');

export function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Sanitizes text to remove sensitive information like passwords,
 * secrets, tokens, and credentials in URLs before logging.
 */
export function sanitizeLogData(text: string): string {
  if (!text) return text;

  let sanitized = text;

  // We need to apply regex replacements one by one carefully.

  // Mask credentials in URLs (e.g. https://user:pass@github.com)
  sanitized = sanitized.replace(/(https?:\/\/)([^:\/\s]+):([^@\/\s]+)@/gi, '$1***:***@');

  // Mask single tokens/usernames in URLs (e.g. https://token@github.com)
  // Fix the negative lookahead issue identified in the code review. The fix is to not use negative lookahead
  // since the token regex `[^:\/\s@]+` already avoids matching the `***:***` since it avoids colons.
  sanitized = sanitized.replace(/(https?:\/\/)([^:\/\s@]+)@/gi, '$1***@');

  // Mask token/password key-value pairs (e.g. password=secret123, token: "abc", password="my secret")
  sanitized = sanitized.replace(
    /(password|pwd|secret|token|api[_\-]?key|auth|access[_\-]?token|client[_\-]?secret)([\s]*[=:]\s*)(['"]?)[^\s'"]+(?:\s[^\s'"]+)*\3/gi,
    (match, p1, p2, p3) => {
      // If there's an opening quote, keep it and mask the contents inside.
      // If no opening quote, just mask until next space/newline
      return `${p1}${p2}${p3 ? p3 : ''}***${p3 ? p3 : ''}`;
    }
  );

  // Mask Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-\._~+\/]+=*/gi, 'Bearer ***');

  return sanitized;
}

export function logCommand(command: string, output?: string, exitCode?: number | null): void {
  try {
    ensureLogDirectory();

    const timestamp = new Date().toISOString();

    // Sanitize the inputs before logging to prevent data leakage
    // Note: sanitize output first before substring to avoid leaking partial passwords on truncation
    const sanitizedCommand = sanitizeLogData(command);
    let sanitizedOutput = null;
    if (output) {
      sanitizedOutput = sanitizeLogData(output);
      sanitizedOutput = sanitizedOutput.substring(0, 1000); // Limit output to 1000 chars AFTER sanitization
    }

    const logEntry = {
      timestamp,
      command: sanitizedCommand,
      exitCode: exitCode !== undefined && exitCode !== null ? exitCode : null,
      output: sanitizedOutput,
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    console.log('[Logger] Command logged to:', LOG_FILE);
  } catch (error) {
    // Log error but don't break the app
    console.error('[Logger] Failed to log command:', error);
    console.error('[Logger] Log file path:', LOG_FILE);
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
