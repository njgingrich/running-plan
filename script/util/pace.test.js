import { describe, it, expect } from "vitest";
import {
  getAdjustedPaces,
  marathonTimeToPace,
  marathonPaceToTime,
  calculatePaceDetails,
} from "./pace.js";

describe("getAdjustedPaces", () => {
  it("should adjust pace by percentage correctly", () => {
    const basePace = { hours: 0, minutes: 8, seconds: 0 };
    const [slowPace, middlePace, fastPace] = getAdjustedPaces(
      basePace,
      "pct",
      -10, // 10% faster
      10 // 10% slower
    );
    expect(slowPace).toEqual({ hours: 0, minutes: 8, seconds: 48 });
    expect(fastPace).toEqual({ hours: 0, minutes: 7, seconds: 12 });
    expect(middlePace).toEqual({ hours: 0, minutes: 8, seconds: 0 });
  });

  it("should adjust pace by time correctly", () => {
    const basePace = { hours: 0, minutes: 8, seconds: 0 };
    const [slowPace, middlePace, fastPace] = getAdjustedPaces(
      basePace,
      "time",
      -30, // 30 seconds faster
      30 // 30 seconds slower
    );
    expect(slowPace).toEqual({ hours: 0, minutes: 8, seconds: 30 });
    expect(fastPace).toEqual({ hours: 0, minutes: 7, seconds: 30 });
    expect(middlePace).toEqual({ hours: 0, minutes: 8, seconds: 0 });
  });
});

describe("marathonTimeToPace", () => {
  it("should calculate marathon pace correctly", () => {
    const marathonTime = { hours: 4, minutes: 0, seconds: 0 };
    const pace = marathonTimeToPace(marathonTime);
    expect(pace).toEqual({ hours: 0, minutes: 9, seconds: 10 });
  });
});

describe("marathonPaceToTime", () => {
  it("should calculate marathon time correctly", () => {
    const marathonPace = { hours: 0, minutes: 9, seconds: 9 };
    const time = marathonPaceToTime(marathonPace);
    expect(time).toEqual({ hours: 3, minutes: 59, seconds: 54 });
  });
});

describe("calculatePaceDetails", () => {
  it("should return default values for invalid pace", () => {
    const details = calculatePaceDetails(0, {});
    expect(details).toEqual({
      pace: "--:-- /mi",
      range: "--:-- - --:-- /mi",
      description: undefined,
    });
  });

  it("should calculate race pace correctly", () => {
    const details = calculatePaceDetails(549, {
      paceType: "race",
      description: "Race pace",
    });
    expect(details).toEqual({
      pace: "09:09/mi",
      range: "Race Pace",
      description: "Race pace",
    });
  });

  it("should calculate adjusted paces correctly", () => {
    const details = calculatePaceDetails(480, {
      paceType: "pct",
      fast: -10,
      slow: 10,
      description: "Training pace",
    });
    expect(details).toEqual({
      pace: "08:00/mi",
      range: "07:12 - 08:48",
      description: "Training pace",
    });
  });
});