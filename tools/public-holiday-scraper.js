import { readFileSync } from "fs";
import { getIndexFromArray } from "../src/utils/array.js";

function getMonthIndex(month) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return getIndexFromArray(monthNames, month);
}

//  This is supposed to be run on the web browser's console on page https://holidayapi.com/countries/id/2023.
//  Sure, they might paywall their api with expensive prices, but we can be smart (re: cunning) by scraping the table they provide on their website page
// and store them in file to be read later by our application.
function scrape() {
  const holidaysTable = $$("#holidays");
  const tbody = holidaysTable[0].querySelectorAll("tbody");
  const tr = tbody[0].querySelectorAll("tr");

  const holidays = [];
  for (const r of tr) {
    const td = r.querySelectorAll("td");
    const dateRegexMatch = td[0].innerText.match(
      /^(([A-Za-z]+) (\d+))[a-z]{2}/
    );
    const month = dateRegexMatch[2];
    const monthIndex = getMonthIndex(month);
    const day = Number(dateRegexMatch[3]);
    const date = dateRegexMatch[1];
    const weekday = td[1].innerText;
    const name = td[2].innerText;
    const notes = td[3].innerText;
    holidays.push({ date, day, monthIndex, weekday, name, notes });
  }

  return holidays;
}
