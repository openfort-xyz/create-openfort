export class TemplateDownloadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'TemplateDownloadError';
  }
}

export class TemplateTimeoutError extends TemplateDownloadError {
  constructor(timeoutSeconds: number) {
    super(
      `Template download timed out after ${timeoutSeconds}s. ` +
      `This might be due to network issues or the repository being unavailable. ` +
      `Please check your internet connection and try again.`,
      'TIMEOUT',
      `Timeout: ${timeoutSeconds}s`
    );
    this.name = 'TemplateTimeoutError';
  }
}

interface ErrorCategory {
  pattern: RegExp;
  message: string;
  code: string;
}

const ERROR_CATEGORIES: ErrorCategory[] = [
  {
    pattern: /could not find commit hash/i,
    message: 'The repository or path might not exist.',
    code: 'REPO_NOT_FOUND'
  },
  {
    pattern: /ENOTFOUND|ECONNREFUSED/i,
    message: 'Network error - please check your internet connection.',
    code: 'NETWORK_ERROR'
  },
  {
    pattern: /rate limit/i,
    message: 'GitHub rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT'
  },
  {
    pattern: /(ENOENT.*npx|npx.*ENOENT|spawn npx)/i,
    message: 'npx command not found. Please ensure Node.js and npm are installed.',
    code: 'NPX_NOT_FOUND'
  }
];

export function categorizeCloneError(
  stderr: string,
  error?: Error
): { message: string; code: string; details: string } {
  const trimmedStderr = stderr.trim();
  
  // Check stderr for known error patterns
  if (trimmedStderr) {
    for (const category of ERROR_CATEGORIES) {
      if (category.pattern.test(trimmedStderr)) {
        return {
          message: category.message,
          code: category.code,
          details: trimmedStderr
        };
      }
    }
  }

  // Check error message for known patterns
  if (error?.message) {
    for (const category of ERROR_CATEGORIES) {
      if (category.pattern.test(error.message)) {
        return {
          message: category.message,
          code: category.code,
          details: error.message
        };
      }
    }
  }

  // Default error
  return {
    message: trimmedStderr ? `Error: ${trimmedStderr}` : (error?.message || 'Unknown error occurred'),
    code: 'UNKNOWN_ERROR',
    details: trimmedStderr || error?.message || ''
  };
}

export function createCloneError(exitCode: number, stderr: string): TemplateDownloadError {
  const { message, code, details } = categorizeCloneError(stderr);
  const fullMessage = `Failed to download template (exit code ${exitCode}). ${message}`;
  return new TemplateDownloadError(fullMessage, code, details);
}

export function createSpawnError(error: Error): TemplateDownloadError {
  const { message, code, details } = categorizeCloneError('', error);
  const fullMessage = `Failed to spawn download process. ${message}`;
  return new TemplateDownloadError(fullMessage, code, details);
}

