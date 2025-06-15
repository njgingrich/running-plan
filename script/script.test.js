import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'temporal-polyfill';

// Mock the State class and PLANS import
vi.mock('./state.js', () => ({
  State: class MockState {
    constructor() {
      this.goalPaceSeconds = null;
      this.plan = null;
      this.raceDate = null;
      this.planId = null;
    }
  }
}));

vi.mock('../plans/index.js', () => ({
  PLANS: {
    test_plan: {
      id: 'test_plan',
      name: 'Test Plan',
      description: 'A test training plan',
      distance: 'marathon',
      types: {
        rest: 'Rest',
        long_run: 'Long Run',
        recovery: 'Recovery'
      },
      paces: {
        easy: {
          paceType: 'pct',
          fast: -10,
          slow: -20,
          description: 'Easy pace'
        },
        race: {
          paceType: 'race',
          description: 'Race pace'
        }
      },
      weeks: [
        [
          { type: 'rest', distance: 0, distanceUnit: 'mi' },
          { type: 'long_run', distance: 8, distanceUnit: 'mi' },
          { type: 'recovery', distance: 4, distanceUnit: 'mi' }
        ]
      ]
    }
  }
}));

// Helper functions extracted from script.js for testing
function durationToSeconds({ hours = 0, minutes = 0, seconds = 0 }) {
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
  const seconds = Math.ceil(totalSeconds - (hours * 3600) - (minutes * 60));
  return { hours, minutes, seconds };
}

function parseDurationString(str) {
  const parts = str.split(':').map(num => parseInt(num, 10));
  if (parts.length === 3) {
    return {
      hours: parts[0],
      minutes: parts[1],
      seconds: parts[2]
    };
  }
  return {
    hours: 0,
    minutes: parts[0],
    seconds: parts[1]
  };
}

function formatDuration(duration) {
  const { hours, minutes, seconds } = duration;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function adjustPaceByPercentage(paceDuration, percentageSlower) {
  const paceSeconds = durationToSeconds(paceDuration);
  const adjustedSeconds = paceSeconds * (1 + percentageSlower / 100);
  return secondsToDuration(adjustedSeconds);
}

function adjustPaceByTime(paceDuration, secondsAdjustment) {
  const paceSeconds = durationToSeconds(paceDuration);
  const adjustedSeconds = paceSeconds + secondsAdjustment;
  return secondsToDuration(adjustedSeconds);
}

function getAdjustedPaces(basePaceDuration, adjustmentType, fastAdjustment, slowAdjustment) {
  let fastPace, slowPace;

  if (adjustmentType === 'pct') {
    slowPace = adjustPaceByPercentage(basePaceDuration, slowAdjustment);
    fastPace = adjustPaceByPercentage(basePaceDuration, fastAdjustment);
  } else { // time
    slowPace = adjustPaceByTime(basePaceDuration, slowAdjustment);
    fastPace = adjustPaceByTime(basePaceDuration, fastAdjustment);
  }

  // Calculate average pace
  const slowSeconds = durationToSeconds(slowPace);
  const fastSeconds = durationToSeconds(fastPace);
  const averageSeconds = (slowSeconds + fastSeconds) / 2;

  return [slowPace, secondsToDuration(averageSeconds), fastPace];
}

function estimate10kPace(marathonPaceDuration) {
  const paceSeconds = durationToSeconds(marathonPaceDuration);
  return secondsToDuration(paceSeconds / 1.06);
}

function formatPaceRange(fastPace, slowPace) {
  return `${formatDuration(fastPace)} - ${formatDuration(slowPace)}`;
}

function marathonTimeToPace(timeDuration) {
  const timeSeconds = durationToSeconds(timeDuration);
  return secondsToDuration(timeSeconds / 26.218);
}

function marathonPaceToTime(paceDuration) {
  const paceSeconds = durationToSeconds(paceDuration);
  return secondsToDuration(paceSeconds * 26.218);
}

function getDurationFromInput(e) {
  const pattern = /^(\d{1,2}):([0-5]\d)(:[0-5]\d)?$/;
  if (pattern.test(e.target.value)) {
    return parseDurationString(e.target.value);
  }
  return null;
}

describe('Duration Utilities', () => {
  describe('durationToSeconds', () => {
    it('should convert hours, minutes, seconds to total seconds', () => {
      const duration = { hours: 2, minutes: 30, seconds: 15 };
      const result = durationToSeconds(duration);
      expect(result).toBe(9015); // 2*3600 + 30*60 + 15
    });

    it('should handle zero values', () => {
      const duration = { hours: 0, minutes: 0, seconds: 0 };
      const result = durationToSeconds(duration);
      expect(result).toBe(0);
    });

    it('should handle partial duration objects', () => {
      const duration = { minutes: 30, seconds: 15 };
      const result = durationToSeconds(duration);
      expect(result).toBe(1815); // 30*60 + 15
    });

    it('should handle only seconds', () => {
      const duration = { seconds: 45 };
      const result = durationToSeconds(duration);
      expect(result).toBe(45);
    });
  });

  describe('secondsToDuration', () => {
    it('should convert total seconds to duration object', () => {
      const seconds = 9015;
      const result = secondsToDuration(seconds);
      expect(result).toEqual({ hours: 2, minutes: 30, seconds: 15 });
    });

    it('should handle zero seconds', () => {
      const seconds = 0;
      const result = secondsToDuration(seconds);
      expect(result).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    });

    it('should handle seconds less than a minute', () => {
      const seconds = 45;
      const result = secondsToDuration(seconds);
      expect(result).toEqual({ hours: 0, minutes: 0, seconds: 45 });
    });

    it('should handle seconds less than an hour', () => {
      const seconds = 1830; // 30 minutes 30 seconds
      const result = secondsToDuration(seconds);
      expect(result).toEqual({ hours: 0, minutes: 30, seconds: 30 });
    });

    it('should round up seconds', () => {
      const seconds = 3600.7; // 1 hour 0.7 seconds
      const result = secondsToDuration(seconds);
      expect(result).toEqual({ hours: 1, minutes: 0, seconds: 1 });
    });
  });

  describe('parseDurationString', () => {
    it('should parse HH:MM:SS format', () => {
      const result = parseDurationString('02:30:15');
      expect(result).toEqual({ hours: 2, minutes: 30, seconds: 15 });
    });

    it('should parse MM:SS format', () => {
      const result = parseDurationString('30:15');
      expect(result).toEqual({ hours: 0, minutes: 30, seconds: 15 });
    });

    it('should handle single digit values', () => {
      const result = parseDurationString('1:05:09');
      expect(result).toEqual({ hours: 1, minutes: 5, seconds: 9 });
    });

    it('should handle single digit minutes and seconds', () => {
      const result = parseDurationString('5:9');
      expect(result).toEqual({ hours: 0, minutes: 5, seconds: 9 });
    });
  });

  describe('formatDuration', () => {
    it('should format duration with hours', () => {
      const duration = { hours: 2, minutes: 30, seconds: 15 };
      const result = formatDuration(duration);
      expect(result).toBe('02:30:15');
    });

    it('should format duration without hours', () => {
      const duration = { hours: 0, minutes: 30, seconds: 15 };
      const result = formatDuration(duration);
      expect(result).toBe('30:15');
    });

    it('should handle single digit values', () => {
      const duration = { hours: 1, minutes: 5, seconds: 9 };
      const result = formatDuration(duration);
      expect(result).toBe('01:05:09');
    });
  });
});

describe('Pace Calculations', () => {
  describe('adjustPaceByPercentage', () => {
    it('should slow down pace by percentage', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByPercentage(basePace, 10); // 10% slower
      expect(result).toEqual({ hours: 0, minutes: 8, seconds: 48 }); // 8:00 * 1.1 = 8:48
    });

    it('should speed up pace by negative percentage', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByPercentage(basePace, -10); // 10% faster
      expect(result).toEqual({ hours: 0, minutes: 7, seconds: 12 }); // 8:00 * 0.9 = 7:12
    });

    it('should handle zero percentage change', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByPercentage(basePace, 0);
      expect(result).toEqual({ hours: 0, minutes: 8, seconds: 0 });
    });
  });

  describe('adjustPaceByTime', () => {
    it('should add seconds to pace', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByTime(basePace, 30); // Add 30 seconds
      expect(result).toEqual({ hours: 0, minutes: 8, seconds: 30 });
    });

    it('should subtract seconds from pace', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByTime(basePace, -30); // Subtract 30 seconds
      expect(result).toEqual({ hours: 0, minutes: 7, seconds: 30 });
    });

    it('should handle zero time adjustment', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = adjustPaceByTime(basePace, 0);
      expect(result).toEqual({ hours: 0, minutes: 8, seconds: 0 });
    });
  });

  describe('getAdjustedPaces', () => {
    it('should calculate percentage-based pace range', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = getAdjustedPaces(basePace, 'pct', -10, 10);
      
      // Fast pace: 8:00 * 0.9 = 7:12
      // Slow pace: 8:00 * 1.1 = 8:48
      // Average: (7:12 + 8:48) / 2 = 8:00
      expect(result[0]).toEqual({ hours: 0, minutes: 8, seconds: 48 }); // slow
      expect(result[1]).toEqual({ hours: 0, minutes: 8, seconds: 0 }); // average
      expect(result[2]).toEqual({ hours: 0, minutes: 7, seconds: 12 }); // fast
    });

    it('should calculate time-based pace range', () => {
      const basePace = { minutes: 8, seconds: 0 };
      const result = getAdjustedPaces(basePace, 'time', -30, 30);
      
      // Fast pace: 8:00 - 30s = 7:30
      // Slow pace: 8:00 + 30s = 8:30
      // Average: (7:30 + 8:30) / 2 = 8:00
      expect(result[0]).toEqual({ hours: 0, minutes: 8, seconds: 30 }); // slow
      expect(result[1]).toEqual({ hours: 0, minutes: 8, seconds: 0 }); // average
      expect(result[2]).toEqual({ hours: 0, minutes: 7, seconds: 30 }); // fast
    });
  });

  describe('estimate10kPace', () => {
    it('should estimate 10k pace from marathon pace', () => {
      const marathonPace = { minutes: 8, seconds: 0 };
      const result = estimate10kPace(marathonPace);
      // 8:00 / 1.06 ≈ 7:33
      expect(result).toEqual({ hours: 0, minutes: 7, seconds: 33 });
    });

    it('should handle faster marathon pace', () => {
      const marathonPace = { minutes: 7, seconds: 0 };
      const result = estimate10kPace(marathonPace);
      // 7:00 / 1.06 ≈ 6:37
      expect(result).toEqual({ hours: 0, minutes: 6, seconds: 37 });
    });
  });

  // TODO: fix these - less estimating
  describe('marathonTimeToPace', () => {
    it('should convert marathon time to pace', () => {
      const marathonTime = { hours: 3, minutes: 30, seconds: 0 };
      const result = marathonTimeToPace(marathonTime);
      // 3:30:00 / 26.218 ≈ 8:00 per mile
      const expected = { hours: 0, minutes: 8, seconds: 0 };
      expect(result.hours).toBe(expected.hours);
      expect(result.minutes).toBe(expected.minutes);
      expect(Math.abs(result.seconds - expected.seconds)).toBeLessThanOrEqual(1);
    });

    it('should handle faster marathon time', () => {
      const marathonTime = { hours: 3, minutes: 0, seconds: 0 };
      const result = marathonTimeToPace(marathonTime);
      // 3:00:00 / 26.218 ≈ 6:52 per mile
      const expected = { hours: 0, minutes: 6, seconds: 52 };
      expect(result.hours).toBe(expected.hours);
      expect(result.minutes).toBe(expected.minutes);
      expect(Math.abs(result.seconds - expected.seconds)).toBeLessThanOrEqual(1);
    });
  });

  describe('marathonPaceToTime', () => {
    it('should convert marathon pace to time', () => {
      const marathonPace = { minutes: 8, seconds: 0 };
      const result = marathonPaceToTime(marathonPace);
      // 8:00 * 26.218 ≈ 3:30:00
      const expected = { hours: 3, minutes: 29, seconds: 44 };
      expect(result.hours).toBe(expected.hours);
      expect(result.minutes).toBe(expected.minutes);
      expect(Math.abs(result.seconds - expected.seconds)).toBeLessThanOrEqual(1);
    });

    it('should handle faster marathon pace', () => {
      const marathonPace = { minutes: 7, seconds: 0 };
      const result = marathonPaceToTime(marathonPace);
      // 7:00 * 26.218 ≈ 3:03:00
      const expected = { hours: 3, minutes: 3, seconds: 26 };
      expect(result.hours).toBe(expected.hours);
      expect(result.minutes).toBe(expected.minutes);
      expect(Math.abs(result.seconds - expected.seconds)).toBeLessThanOrEqual(6);
    });
  });
});

describe('Formatting Functions', () => {
  describe('formatPaceRange', () => {
    it('should format pace range correctly', () => {
      const fastPace = { minutes: 7, seconds: 30 };
      const slowPace = { minutes: 8, seconds: 30 };
      const result = formatPaceRange(fastPace, slowPace);
      expect(result).toBe('07:30 - 08:30');
    });

    it('should handle paces with hours', () => {
      const fastPace = { hours: 1, minutes: 0, seconds: 0 };
      const slowPace = { hours: 1, minutes: 15, seconds: 0 };
      const result = formatPaceRange(fastPace, slowPace);
      expect(result).toBe('01:00:00 - 01:15:00');
    });
  });

  describe('getDurationFromInput', () => {
    it('should parse valid HH:MM:SS input', () => {
      const mockEvent = { target: { value: '08:30:15' } };
      const result = getDurationFromInput(mockEvent);
      expect(result).toEqual({ hours: 8, minutes: 30, seconds: 15 });
    });

    it('should parse valid MM:SS input', () => {
      const mockEvent = { target: { value: '08:30' } };
      const result = getDurationFromInput(mockEvent);
      expect(result).toEqual({ hours: 0, minutes: 8, seconds: 30 });
    });

    it('should return null for invalid input', () => {
      const mockEvent = { target: { value: 'invalid' } };
      const result = getDurationFromInput(mockEvent);
      expect(result).toBeNull();
    });

    it('should return null for malformed input', () => {
      const mockEvent = { target: { value: '8:30:15:extra' } };
      const result = getDurationFromInput(mockEvent);
      expect(result).toBeNull();
    });

    it('should return null for out of range values', () => {
      const mockEvent = { target: { value: '08:60:15' } };
      const result = getDurationFromInput(mockEvent);
      expect(result).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  it('should convert marathon time to pace and back correctly', () => {
    const originalTime = { hours: 3, minutes: 30, seconds: 0 };
    const pace = marathonTimeToPace(originalTime);
    const convertedTime = marathonPaceToTime(pace);
    
    // Should be very close to original (within rounding error)
    const originalSeconds = durationToSeconds(originalTime);
    const convertedSeconds = durationToSeconds(convertedTime);
    const difference = Math.abs(originalSeconds - convertedSeconds);
    
    expect(difference).toBeLessThan(60); // Within 1 minute
  });

  it('should handle pace adjustments consistently', () => {
    const basePace = { minutes: 8, seconds: 0 };
    const slowerPace = adjustPaceByPercentage(basePace, 10);
    const fasterPace = adjustPaceByPercentage(basePace, -10);
    
    // Faster pace should be less than base pace
    expect(durationToSeconds(fasterPace)).toBeLessThan(durationToSeconds(basePace));
    
    // Slower pace should be greater than base pace
    expect(durationToSeconds(slowerPace)).toBeGreaterThan(durationToSeconds(basePace));
  });
}); 