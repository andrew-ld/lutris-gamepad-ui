import { logError } from "./ipc.js";

export function formatPlaytime(seconds) {
  if (seconds <= 0) {
    return "0m";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "< 1m";
}

export function formatDate(date) {
  if (!date) return "Never";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function parseTimedeltaToSeconds(timedelta) {
  if (!timedelta) {
    return 0
  }

  const regex =
    /^(?:(-?\d+)\s+days?,\s+)?(-)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/;
  const match = timedelta.match(regex);

  if (!match) {
    logError("Invalid timedelta string format", timedelta);
    return 0
  }

  const daysString = match[1];
  const hmsOverallSignStr = match[2];
  const hoursString = match[3];
  const minutesString = match[4];
  const integerSecondsString = match[5];
  const fractionalSecondsString = match[6];

  let totalSeconds = 0;

  let hmsMagnitudeSeconds = 0;
  hmsMagnitudeSeconds += parseInt(hoursString, 10) * 3600;
  hmsMagnitudeSeconds += parseInt(minutesString, 10) * 60;

  let secondsComponent = parseInt(integerSecondsString, 10);
  if (fractionalSecondsString) {
    secondsComponent += parseFloat("0." + fractionalSecondsString);
  }
  hmsMagnitudeSeconds += secondsComponent;

  if (daysString !== undefined) {
    const daysValue = parseInt(daysString, 10);
    totalSeconds = daysValue * 86400 + hmsMagnitudeSeconds;
  } else {
    if (hmsOverallSignStr === "-") {
      totalSeconds = -hmsMagnitudeSeconds;
    } else {
      totalSeconds = hmsMagnitudeSeconds;
    }
  }

  return totalSeconds;
}
