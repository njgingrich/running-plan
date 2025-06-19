import { describe, it, expect } from 'vitest';
import { durationToSeconds, secondsToDuration, parseDurationString, formatDuration } from './duration.js';

describe('durationToSeconds', () => {
    it('should convert duration to seconds correctly', () => {
        expect(durationToSeconds({ hours: 1, minutes: 2, seconds: 3 })).toBe(3723);
        expect(durationToSeconds({ minutes: 2, seconds: 3 })).toBe(123);
        expect(durationToSeconds({ seconds: 3 })).toBe(3);
        expect(durationToSeconds({})).toBe(0);
    });
});

describe('secondsToDuration', () => {
    it('should convert seconds to duration correctly', () => {
        expect(secondsToDuration(3723)).toEqual({ hours: 1, minutes: 2, seconds: 3 });
        expect(secondsToDuration(123)).toEqual({ hours: 0, minutes: 2, seconds: 3 });
        expect(secondsToDuration(3)).toEqual({ hours: 0, minutes: 0, seconds: 3 });
    });
});

describe('parseDurationString', () => {
    it('should parse valid duration strings correctly', () => {
        expect(parseDurationString('01:02:03')).toEqual({ hours: 1, minutes: 2, seconds: 3 });
        expect(parseDurationString('02:03')).toEqual({ hours: 0, minutes: 2, seconds: 3 });
    });

    it('should return default duration for invalid strings', () => {
        expect(parseDurationString('')).toEqual({ hours: 0, minutes: 0, seconds: 0 });
        expect(parseDurationString('invalid')).toEqual({ hours: 0, minutes: 0, seconds: 0 });
        expect(parseDurationString('01:invalid:03')).toEqual({ hours: 0, minutes: 0, seconds: 0 });
        expect(parseDurationString('01')).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    });
});

describe('formatDuration', () => {
    it('should format duration correctly', () => {
        expect(formatDuration({ hours: 1, minutes: 2, seconds: 3 })).toBe('01:02:03');
        expect(formatDuration({ minutes: 2, seconds: 3 })).toBe('02:03');
        expect(formatDuration({ seconds: 3 })).toBe('00:03');
    });
});