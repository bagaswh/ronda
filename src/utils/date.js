import { readFileSync } from "fs";
import { getConfig } from "../config.js";
import { getIndexFromArray } from "./array.js";

const year = new Date().getFullYear();
const holidays = JSON.parse(readFileSync(`./holidays/${year}.json`, "utf-8"));

export function isDateHoliday(date) {
  const offDays = getConfig("offDays", []).map((dayName) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return getIndexFromArray(days, dayName);
  });
  const today = date.getDay();
  let reason = "";
  if (offDays.includes(today)) {
    reason = "offday";
  }
  if (isDatePublicHoliday(date)) {
    reason = "public_holiday";
  }
  return { reason, holiday: reason != "" };
}

export function isDatePublicHoliday(date) {
  for (const holiday of holidays) {
    const holidayJsDate = new Date(year, holiday.monthIndex, holiday.day);
    if (date.toLocaleDateString() == holidayJsDate.toLocaleDateString()) {
      return true;
    }
  }
  return false;
}
