const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const secondsToMilliseconds = (seconds: number): number =>
  seconds * MILLISECONDS_PER_SECOND;

export const minutesToMilliseconds = (minutes: number): number =>
  secondsToMilliseconds(minutes * SECONDS_PER_MINUTE);

export const hoursToMilliseconds = (hours: number): number =>
  minutesToMilliseconds(hours * MINUTES_PER_HOUR);

export const daysToMilliseconds = (days: number): number =>
  hoursToMilliseconds(days * HOURS_PER_DAY);
