import { vi } from 'vitest'

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

