import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We must mock 'os' before importing 'logger.ts' because logger.ts
// accesses os.homedir() at the module level.
jest.mock('os', () => ({
  homedir: jest.fn(() => '/Users/mockuser'),
}));
jest.mock('fs');

import { ensureLogDirectory, sanitizeLogData, logCommand, getLogFilePath } from '../logger';

describe('logger utilities', () => {
  const mockHomeDir = '/Users/mockuser';
  const mockLogDir = path.join(mockHomeDir, '.pantry');
  const mockLogFile = path.join(mockLogDir, 'commands.log');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global.console, 'log').mockImplementation();
    jest.spyOn(global.console, 'error').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getLogFilePath', () => {
    it('should return the correct log file path', () => {
      // The logger path is initialized once on import, so we can't easily mock os.homedir()
      // before the import unless we use require or do module isolation.
      // But we can check if it returns a string ending with '.pantry/commands.log'
      const p = getLogFilePath();
      expect(p.endsWith('.pantry/commands.log')).toBe(true);
    });
  });

  describe('ensureLogDirectory', () => {
    it('should create log directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      ensureLogDirectory();

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('.pantry'));
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.pantry'), {
        recursive: true,
      });
    });

    it('should not create log directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      ensureLogDirectory();

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('.pantry'));
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeLogData', () => {
    it('should mask credentials in URLs', () => {
      expect(sanitizeLogData('https://user:pass@github.com')).toBe(
        'https://***:***@github.com'
      );
      expect(sanitizeLogData('git clone https://user:pass@github.com/repo.git')).toBe(
        'git clone https://***:***@github.com/repo.git'
      );
    });

    it('should mask single tokens in URLs', () => {
      expect(sanitizeLogData('https://token@github.com')).toBe('https://***@github.com');
    });

    it('should mask key-value assignments', () => {
      expect(sanitizeLogData('password=secret123')).toBe('password=***');
      expect(sanitizeLogData('token: "abc"')).toBe('token: "***"');
      expect(sanitizeLogData('--api-key=12345')).toBe('--api-key=***');
      expect(sanitizeLogData('auth token_abc')).toBe('auth token_abc'); // Shouldn't mask without separator
      expect(sanitizeLogData('client_secret="hidden secret"')).toBe('client_secret="***"');
    });

    it('should mask Bearer tokens', () => {
      expect(sanitizeLogData('Authorization: Bearer 1234567890abcdef')).toBe(
        'Authorization: Bearer ***'
      );
    });

    it('should return empty string if input is empty', () => {
      expect(sanitizeLogData('')).toBe('');
    });

    it('should return same string if no sensitive data is found', () => {
      expect(sanitizeLogData('brew install node')).toBe('brew install node');
    });
  });

  describe('logCommand', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should write log entry with sanitized data', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      logCommand('git clone https://user:pass@github.com', 'Output with password=secret', 0);

      expect(fs.appendFileSync).toHaveBeenCalled();
      const appendCallArg = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
      const parsedLog = JSON.parse(appendCallArg.trim());

      expect(parsedLog.command).toBe('git clone https://***:***@github.com');
      expect(parsedLog.output).toBe('Output with password=***');
      expect(parsedLog.exitCode).toBe(0);
      expect(parsedLog.timestamp).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle missing output and exit code', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      logCommand('brew list');

      expect(fs.appendFileSync).toHaveBeenCalled();
      const appendCallArg = (fs.appendFileSync as jest.Mock).mock.calls[0][1];
      const parsedLog = JSON.parse(appendCallArg.trim());

      expect(parsedLog.command).toBe('brew list');
      expect(parsedLog.output).toBeNull();
      expect(parsedLog.exitCode).toBeNull();
    });

    it('should catch and log errors during logging without crashing', () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      expect(() => {
        logCommand('brew update');
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[Logger] Failed to log command:',
        expect.any(Error)
      );
    });
  });
});
