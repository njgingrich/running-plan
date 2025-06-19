import { secondsToDuration, durationToSeconds, formatDuration } from "./duration.js";

const MARATHON_DISTANCE = 26.218;

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

function formatPaceRange(fastPace, slowPace) {
  return `${formatDuration(fastPace)} - ${formatDuration(slowPace)}`;
}

export function getAdjustedPaces(basePaceDuration, adjustmentType, fastAdjustment, slowAdjustment) {
  let fastPace, slowPace;

  if (adjustmentType === "pct") {
    slowPace = adjustPaceByPercentage(basePaceDuration, slowAdjustment);
    fastPace = adjustPaceByPercentage(basePaceDuration, fastAdjustment);
  } else {
    // time
    slowPace = adjustPaceByTime(basePaceDuration, slowAdjustment);
    fastPace = adjustPaceByTime(basePaceDuration, fastAdjustment);
  }

  // Calculate average pace
  const slowSeconds = durationToSeconds(slowPace);
  const fastSeconds = durationToSeconds(fastPace);
  const averageSeconds = (slowSeconds + fastSeconds) / 2;

  return [slowPace, secondsToDuration(averageSeconds), fastPace];
}

export function marathonTimeToPace(timeDuration) {
  const timeSeconds = durationToSeconds(timeDuration);
  return secondsToDuration(timeSeconds / MARATHON_DISTANCE);
}

export function marathonPaceToTime(paceDuration) {
  const paceSeconds = durationToSeconds(paceDuration);
  return secondsToDuration(paceSeconds * MARATHON_DISTANCE);
}

export function calculatePaceDetails(goalPaceSeconds, config) {
  if (!goalPaceSeconds || goalPaceSeconds <= 0) {
    return {
      pace: "--:-- /mi",
      range: "--:-- - --:-- /mi",
      description: undefined,
    };
  }

  let paceDuration = secondsToDuration(goalPaceSeconds);
  if (config.multiplier) {
    // If there's a multiplier, apply it to the base pace
    const baseSeconds = durationToSeconds(paceDuration);
    paceDuration = secondsToDuration(baseSeconds * config.multiplier);
  }

  if (config.paceType === "race") {
    // Race pace is just the marathon pace
    return {
      pace: `${formatDuration(paceDuration)}/mi`,
      range: "Race Pace",
      description: config.description || "",
    };
  } else {
    // Calculate adjusted paces based on configuration
    const [slowPace, middlePace, fastPace] = getAdjustedPaces(
      paceDuration,
      config.paceType,
      config.fast,
      config.slow
    );

    return {
      pace: `${formatDuration(middlePace)}/mi`,
      range: formatPaceRange(fastPace, slowPace),
      description: config.description || "",
    };
  }
}
