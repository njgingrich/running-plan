import { vi } from 'vitest';

// Mock DOM elements that might be used in the script
global.document = {
  getElementById: vi.fn(),
  addEventListener: vi.fn(),
  createElement: vi.fn(),
};

global.window = {
  location: {
    search: '',
    pathname: '/',
    href: 'http://localhost/',
  },
  history: {
    replaceState: vi.fn(),
  },
  URL: {
    revokeObjectURL: vi.fn(),
  },
  webkitURL: {
    revokeObjectURL: vi.fn(),
  },
};

// Mock console methods
global.console = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Mock MouseEvent
global.MouseEvent = class MockMouseEvent {
  constructor(type, options) {
    this.type = type;
    this.options = options;
  }
}; 