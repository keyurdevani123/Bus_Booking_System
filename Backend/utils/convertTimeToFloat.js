function convertTimeToFloat(timeString) {
  if (!timeString || typeof timeString !== "string") return 0;
  const [hoursPart = "0", minutesPart = "0"] = timeString.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return hours + minutes / 60;
}

module.exports = convertTimeToFloat;
