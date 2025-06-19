import { calculatePaceDetails } from "./pace.js";

export function generatePaceCard(goalPaceSeconds, title, config) {
  const { pace, range, description } = calculatePaceDetails(goalPaceSeconds, config);

  const template = `
        <h3>${title}</h3>
        <div class="pace-info">
            <p class="pace">${pace}</p>
            <p class="pace-range">${range}</p>
        </div>
        <p class="description">${description}</p>
    `;

  const card = document.createElement("div");
  card.className = "pace-card";
  card.innerHTML = template;
  return card;
}

function generateDateCell(weekStartDate, dayIndex) {
  const dateCell = document.createElement("td");
  const date = weekStartDate.add({ days: dayIndex });
  dateCell.textContent = date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
  });
  dateCell.className = "date-cell";

  return dateCell;
}

function generateWeekCell(weekIndex, numWeeksInPlan, totalMiles) {
  const weekCell = document.createElement("td");
  const weekCellContainer = document.createElement("div");
  weekCell.className = "week-number";
  weekCell.setAttribute("rowspan", "2");
  weekCellContainer.className = "week-cell-container";

  // Create week number span
  const weekNumberSpan = document.createElement("span");
  weekNumberSpan.textContent = `Week ${weekIndex + 1}`;
  weekNumberSpan.className = "week-number-title";
  weekCellContainer.appendChild(weekNumberSpan);

  // Create weeks to goal span
  const weeksToGoalSpan = document.createElement("span");
  weeksToGoalSpan.textContent = `(${numWeeksInPlan - 1 - weekIndex} to goal)`;
  weekCellContainer.appendChild(weeksToGoalSpan);

  // Create total miles span
  const totalMilesSpan = document.createElement("span");
  totalMilesSpan.className = "total-volume";
  totalMilesSpan.textContent = `${totalMiles} miles`;
  weekCellContainer.appendChild(totalMilesSpan);

  weekCell.appendChild(weekCellContainer);

  return weekCell;
}

function generateCalendarCell(day, config) {
  const workoutContainer = document.createElement("td");
  const workout = document.createElement("div");
  workout.className = "workout";

  const type = document.createElement("div");
  type.className = "workout-type";
  type.textContent = config.types[day.type];
  workout.appendChild(type);

  if (day.distance && day.distance > 0) {
    const distance = document.createElement("div");
    distance.className = "workout-distance";
    distance.textContent = `${day.distance}${day.distanceUnit}`;
    workout.appendChild(distance);
  }

  if (day.notes) {
    const notes = document.createElement("div");
    notes.className = "workout-notes";
    notes.textContent = day.notes;
    workout.appendChild(notes);
  }

  workoutContainer.appendChild(workout);
  return workoutContainer;
}

function generateDateRow(week, weekIndex, trainingStartDate, plan) {
  const weekStartDate = trainingStartDate.add({ weeks: weekIndex });
  const totalMiles = week.reduce((acc, day) => acc + day.distance, 0);
  const numWeeksInPlan = plan.weeks.length;

  // Create row for dates
  const dateRow = document.createElement("tr");
  dateRow.appendChild(generateWeekCell(weekIndex, numWeeksInPlan, totalMiles));
  week.forEach((_, dayIndex) => dateRow.appendChild(generateDateCell(weekStartDate, dayIndex)));

  return dateRow;
}

export function generateCalendarWeekRows(week, weekIndex, trainingStartDate, plan) {
  const dateRow = generateDateRow(week, weekIndex, trainingStartDate, plan);
  const row = document.createElement("tr");
  week.forEach((day) => row.appendChild(generateCalendarCell(day, plan)));

  return [dateRow, row];
}

export function generatePlanSelectOptions(plans, currentPlanId) {
  const options = [];
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Select a plan";
  options.push(emptyOption);

  Object.entries(plans).forEach(([key, plan]) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = plan.name;
    if (plan.id === currentPlanId) {
      option.selected = true;
    }
    options.push(option);
  });

  return options;
}

export function createDownloadElement(fileData, fileName) {
  const file = "data:text/calendar;charset=utf-8," + encodeURIComponent(fileData);
  // const filename = `${plan.name}-${raceDate}.ics`;

  const saveBtn = document.createElement("a");
  saveBtn.rel = "noopener";
  saveBtn.href = file;
  saveBtn.target = "_blank";
  saveBtn.download = fileName;
  const evt = new MouseEvent("click", {
    view: window,
    button: 0,
    bubbles: true,
    cancelable: false,
  });
  saveBtn.dispatchEvent(evt);
  (window.URL || window.webkitURL).revokeObjectURL(saveBtn.href);
}