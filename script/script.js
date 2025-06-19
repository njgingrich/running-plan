import "temporal-polyfill";
import { PLANS } from "../plans/index.js";

import { State as AppState } from "./state.js";
import { generateCalendarExport } from "./util/calendar.js";
import { generatePaceCard, generateCalendarWeekRows, generatePlanSelectOptions, createDownloadElement } from "./util/dom.js";
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
  const raceDate = document.getElementById("raceDate").value;
  if (!State.plan || !raceDate) return;

  const calData = generateCalendarExport(State.plan);
  createDownloadElement(calData.toString(), `${State.plan.name}-${raceDate}.ics`);
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

  const trainingPlanSelect = document.getElementById("trainingPlan");
  generatePlanSelectOptions(PLANS, State.planId).forEach(option => {
    trainingPlanSelect.appendChild(option);
  });

  updatePaces();
  updateCalendar();
});
