import "temporal-polyfill";
import { ICalCalendar, ICalCalendarMethod } from "ical-generator";
import { PLANS } from "../plans/index.js";

import { State as AppState } from "./state.js";
import { generatePaceCard, generateCalendarWeekRows } from "./util/dom.js";
import {
  durationToSeconds,
  parseDurationString,
  formatDuration,
} from "./util/duration.js";
import {
  marathonPaceToTime,
  marathonTimeToPace,
} from "./util/pace.js";

const State = new AppState();

// Handle duration input formatting and return parsed duration
function getDurationFromInput(e) {
  // Parse and return duration if valid
  const pattern = /^(\d{1,2}):([0-5]\d)(:[0-5]\d)?$/;
  if (pattern.test(e.target.value)) {
    return parseDurationString(e.target.value);
  }
  return null;
}

function updatePaces() {
  const plan = State.plan;
  if (!plan) return;

  // Generate pace cards based on plan configuration
  const resultsContainer = document.getElementById("pace-cards");
  resultsContainer.innerHTML = "";

  Object.entries(plan.paces).forEach(([type, config]) => {
    const title = plan.types[type] || type;
    resultsContainer.appendChild(generatePaceCard(State.goalPaceSeconds, title, config));
  });
}

function updateCalendar() {
  const plan = State.plan;

  const exportButton = document.getElementById("export-plan");
  exportButton.style.display = State.plan ? "flex" : "none";
  if (!plan) {
    // clear calendar, hide button
    const calendarBody = document.getElementById("calendar-body");
    calendarBody.innerHTML = "";
    const exportButton = document.getElementById("export-plan");
    exportButton.style.display = "none";
    return;
  }

  const startDate = document.getElementById("raceDate").value;
  if (!startDate) return; // Don't update if no date selected

  const raceDate = Temporal.PlainDate.from(startDate);
  const numWeeksInPlan = plan.weeks.length;
  const trainingStartDate = raceDate.subtract({ days: 6 }).subtract({ weeks: numWeeksInPlan - 1 });

  const calendarBody = document.getElementById("calendar-body");
  calendarBody.innerHTML = "";

  const trainingPlanTitle = document.getElementById("training-plan-title");
  trainingPlanTitle.textContent = plan.name;
  if (plan.description) {
    const trainingPlanDescription = document.getElementById("training-plan-description");
    trainingPlanDescription.textContent = plan.description;
  }

  plan.weeks.forEach((week, weekIndex) => {
    const weekRows = generateCalendarWeekRows(week, weekIndex, trainingStartDate, plan);
    for (const row of weekRows) {
        calendarBody.appendChild(row);
    }
  });
}

function generateCalendarExport() {
  const plan = State.plan;
  const raceDateVal = document.getElementById("raceDate").value;
  if (!plan || !raceDateVal) return;

  const raceDate = Temporal.PlainDate.from(raceDateVal);
  const startDate = raceDate.subtract({ days: 6 }).subtract({ weeks: plan.weeks.length - 1 });

  const cal = new ICalCalendar();
  cal.name("Training Plan");
  cal.description(`${plan.name} - Race date: ${raceDate}`);
  cal.prodId("//njgingrich.github.io//Training Plan//EN");
  cal.method(ICalCalendarMethod.PUBLISH);

  plan.weeks.forEach((week, weekIndex) => {
    const weekStartDate = startDate.add({ weeks: weekIndex });
    const weekVolume = week.reduce((acc, workout) => acc + workout.distance, 0);

    const startString = weekStartDate.toZonedDateTime("UTC").toString().replace("+00:00[UTC]", "");
    const endString = weekStartDate
      .add({ weeks: 1 })
      .toZonedDateTime("UTC")
      .toString()
      .replace("+00:00[UTC]", "");

    const weekEvent = cal.createEvent({
      start: new Date(startString),
      end: new Date(endString),
      description: `Week ${weekIndex + 1} - ${weekVolume} miles`,
      summary: `${plan.weeks.length - 1 - weekIndex} weeks to goal (${weekVolume} miles)`,
    });

    week.forEach((workout, dayIndex) => {
      const date = weekStartDate.add({ days: dayIndex });
      let description = `${workout.distance}${workout.distanceUnit}`;

      let summary = `${plan.types[workout.type]}`;
      if (workout.distance && workout.distance > 0) {
        summary = `${plan.types[workout.type]} - ${workout.distance}${workout.distanceUnit}`;
      }
      if (workout.notes) {
        description += ` - ${workout.notes}`;
      }
      const event = cal.createEvent({
        allDay: true,
        start: new Date(date.toString()),
        description: description,
        summary,
      });
    });
  });

  return cal;
}

function updateGoalInputs({ raceDuration, paceDuration }) {
  const paceInput = document.getElementById("goalPace");
  const timeInput = document.getElementById("goalTime");

  // Clear inputs if no valid duration provided
  if (!raceDuration && !paceDuration) {
    State.goalPaceSeconds = null;
    paceInput.value = "";
    timeInput.value = "";
    updatePaces();
    return;
  }

  // Calculate pace and race time based on whichever input was provided
  const calculatedPace = raceDuration ? marathonTimeToPace(raceDuration) : paceDuration;
  const calculatedRaceTime = paceDuration ? marathonPaceToTime(paceDuration) : raceDuration;

  // Update state and form inputs
  State.goalPaceSeconds = durationToSeconds(calculatedPace);
  paceInput.value = formatDuration(calculatedPace);
  timeInput.value = formatDuration(calculatedRaceTime);

  updatePaces();
}

// Add input handlers
document.getElementById("raceDate").addEventListener("change", (e) => {
  if (e.target.value === "") {
    State.raceDate = null;
    return;
  }

  const date = Temporal.PlainDate.from(e.target.value);
  State.raceDate = date.toString();

  updateCalendar();
});

document.getElementById("goalPace").addEventListener("change", (e) => {
  updateGoalInputs({ paceDuration: getDurationFromInput(e) });
});

document.getElementById("goalTime").addEventListener("change", (e) => {
  updateGoalInputs({ raceDuration: getDurationFromInput(e) });
});

document.getElementById("trainingPlan").addEventListener("change", (e) => {
  if (e.target.value == "") {
    State.planId = null;
  } else {
    State.planId = e.target.value;
  }

  updatePaces();
  updateCalendar();
});

// Add event listener for export button
document.getElementById("export-plan").addEventListener("click", (e) => {
  const plan = State.plan;
  const raceDate = document.getElementById("raceDate").value;
  if (!plan || !raceDate) return;

  const cal = generateCalendarExport();
  const file = "data:text/calendar;charset=utf-8," + encodeURIComponent(cal.toString());
  const filename = `${plan.name}-${raceDate}.ics`;

  const saveBtn = document.createElement("a");
  saveBtn.rel = "noopener";
  saveBtn.href = file;
  saveBtn.target = "_blank";
  saveBtn.download = filename;
  const evt = new MouseEvent("click", {
    view: window,
    button: 0,
    bubbles: true,
    cancelable: false,
  });
  saveBtn.dispatchEvent(evt);
  (window.URL || window.webkitURL).revokeObjectURL(saveBtn.href);
});

// Load saved values on page load
document.addEventListener("DOMContentLoaded", async () => {
  const paceInput = document.getElementById("goalPace");
  const timeInput = document.getElementById("goalTime");

  if (State.goalPaceSeconds) {
    paceInput.value = formatDuration(State.goalPaceSeconds);
    timeInput.value = formatDuration(marathonPaceToTime(State.goalPaceSeconds));
  } else if (paceInput.value && /^\d{1,2}:\d{2}$/.test(paceInput.value)) {
    const paceDuration = parseDurationString(paceInput.value);
    updateGoalInputs({ paceDuration });
  } else if (timeInput.value && /^\d{1,2}:\d{2}:\d{2}$/.test(timeInput.value)) {
    const raceDuration = parseDurationString(timeInput.value);
    updateGoalInputs({ raceDuration });
  }

  if (State.raceDate) {
    document.getElementById("raceDate").value = State.raceDate.toString();
  }

  // Update select options based on known plans
  const trainingPlanSelect = document.getElementById("trainingPlan");
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Select a plan";
  trainingPlanSelect.appendChild(option);

  Object.entries(PLANS).forEach(([key, plan]) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = plan.name;
    if (plan.id === State.planId) {
      option.selected = true;
    }
    trainingPlanSelect.appendChild(option);
  });

  updatePaces();
  updateCalendar();
});
