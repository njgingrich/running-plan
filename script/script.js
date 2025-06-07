import 'temporal-polyfill';
import { ICalCalendar, ICalCalendarMethod } from 'ical-generator';
import { PLANS } from '../plans/index.js';

import { State as AppState } from './state.js';

const State = new AppState();
const MARATHON_DISTANCE = 26.218;

function durationToSeconds({ hours = 0, minutes = 0, seconds = 0 }) {
    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.ceil(totalSeconds - (hours * 3600) - (minutes * 60));
    return { hours, minutes, seconds };
}

// Parse a duration string in format "HH:MM:SS" or "MM:SS"
function parseDurationString(str) {
    const parts = str.split(':').map(num => parseInt(num, 10));
    if (parts.length === 3) {
        return {
            hours: parts[0],
            minutes: parts[1],
            seconds: parts[2]
        };
    }
    return {
        hours: 0,
        minutes: parts[0],
        seconds: parts[1]
    };
}

// Format a duration as HH:MM:SS or MM:SS
function formatDuration(duration) {
    const formatter = new Intl.DurationFormat('en', { style: 'digital', unitDisplay: 'long', hoursDisplay: 'auto', hours: '2-digit' });
    return formatter.format(duration);
}

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

function getAdjustedPaces(basePaceDuration, adjustmentType, fastAdjustment, slowAdjustment) {
    let fastPace, slowPace;

    if (adjustmentType === 'pct') {
        slowPace = adjustPaceByPercentage(basePaceDuration, slowAdjustment);
        fastPace = adjustPaceByPercentage(basePaceDuration, fastAdjustment);
    } else { // time
        slowPace = adjustPaceByTime(basePaceDuration, slowAdjustment);
        fastPace = adjustPaceByTime(basePaceDuration, fastAdjustment);
    }

    // Calculate average pace
    const slowSeconds = durationToSeconds(slowPace);
    const fastSeconds = durationToSeconds(fastPace);
    const averageSeconds = (slowSeconds + fastSeconds) / 2;

    return [slowPace, secondsToDuration(averageSeconds), fastPace];
}

function estimate10kPace(marathonPaceDuration) {
    const paceSeconds = durationToSeconds(marathonPaceDuration);
    return secondsToDuration(paceSeconds / 1.06);
}

function formatPaceRange(fastPace, slowPace) {
    return `${formatDuration(fastPace)} - ${formatDuration(slowPace)}`;
}

function marathonTimeToPace(timeDuration) {
    const timeSeconds = durationToSeconds(timeDuration);
    return secondsToDuration(timeSeconds / MARATHON_DISTANCE);
}

function marathonPaceToTime(paceDuration) {
    const paceSeconds = durationToSeconds(paceDuration);
    return secondsToDuration(paceSeconds * MARATHON_DISTANCE);
}

function calculatePaceDetails(config) {
    let paceDuration = secondsToDuration(State.goalPaceSeconds);
    if (config.multiplier) {
        // If there's a multiplier, apply it to the base pace
        const baseSeconds = durationToSeconds(paceDuration);
        paceDuration = secondsToDuration(baseSeconds * config.multiplier);
    }

    if (config.paceType === 'race') {
        // Race pace is just the marathon pace
        return {
            pace: `${formatDuration(paceDuration)}/mi`,
            range: 'Race Pace',
            description: config.description || '',
        }
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
            description: config.description || '',
        }
    }
}

// Handle duration input formatting and return parsed duration
function getDurationFromInput(e) {
    // Parse and return duration if valid
    const pattern = /^(\d{1,2}):([0-5]\d)(:[0-5]\d)?$/;
    if (pattern.test(e.target.value)) {
        return parseDurationString(e.target.value);
    }
    return null;
}

function generatePaceCard(title, config) {
    if (!State.goalPaceSeconds) {
        const card = document.createElement('div');
        card.className = 'pace-card';
        card.innerHTML = `
            <h3>${title}</h3>
            <div class="pace-info">
                <p class="pace">--:-- /mile</p>
                <p class="pace-range">--:-- - --:-- / mile</p>
            </div>
            <p class="description"></p>
        `;
        return card;
    }

    const {pace, range, description} = calculatePaceDetails(config);

    const template = `
        <h3>${title}</h3>
        <div class="pace-info">
            <p class="pace">${pace}</p>
            <p class="pace-range">${range}</p>
        </div>
        <p class="description">${description}</p>
    `;

    const card = document.createElement('div');
    card.className = 'pace-card';
    card.innerHTML = template;
    return card;
}

function updatePaces() {
    const plan = State.plan;
    if (!plan) return;

    // Generate pace cards based on plan configuration
    const resultsContainer = document.getElementById('pace-cards');
    resultsContainer.innerHTML = '';

    Object.entries(plan.paces).forEach(([type, config]) => {
        const title = plan.types[type] || type;
        resultsContainer.appendChild(generatePaceCard(title, config));
    });
}

function generateCalendarCell(day, config) {
    const workoutContainer = document.createElement('td');
    const workout = document.createElement('div');
    workout.className = 'workout';

    const type = document.createElement('div');
    type.className = 'workout-type';
    type.textContent = config.types[day.type];
    workout.appendChild(type);

    if (day.distance && day.distance > 0) {
        const distance = document.createElement('div');
        distance.className = 'workout-distance';
        distance.textContent = `${day.distance}${day.distanceUnit}`;
        workout.appendChild(distance);
    }

    if (day.notes) {
        const notes = document.createElement('div');
        notes.className = 'workout-notes';
        notes.textContent = day.notes;
        workout.appendChild(notes);
    }

    workoutContainer.appendChild(workout);
    return workoutContainer;
}

function generateDateCell(weekStartDate, dayIndex) {
    const dateCell = document.createElement('td');
    const date = weekStartDate.add({ days: dayIndex });
    dateCell.textContent = date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric'
    });
    dateCell.className = 'date-cell';

    return dateCell;
}

function generateWeekCell(weekIndex, numWeeksInPlan, totalMiles) {
    const weekCell = document.createElement('td');
    const weekCellContainer = document.createElement('div');
    weekCell.className = 'week-number';
    weekCell.setAttribute('rowspan', '2');
    weekCellContainer.className = 'week-cell-container';

    // Create week number span
    const weekNumberSpan = document.createElement('span');
    weekNumberSpan.textContent = `Week ${weekIndex + 1}`;
    weekNumberSpan.className = 'week-number-title';
    weekCellContainer.appendChild(weekNumberSpan);

    // Create weeks to goal span
    const weeksToGoalSpan = document.createElement('span');
    weeksToGoalSpan.textContent = `(${numWeeksInPlan - 1 - weekIndex} to goal)`;
    weekCellContainer.appendChild(weeksToGoalSpan);

    // Create total miles span
    const totalMilesSpan = document.createElement('span');
    totalMilesSpan.className = 'total-volume';
    totalMilesSpan.textContent = `${totalMiles} miles`;
    weekCellContainer.appendChild(totalMilesSpan);

    weekCell.appendChild(weekCellContainer);

    return weekCell;
}


function updateCalendar() {
    const plan = State.plan;

    const exportButton = document.getElementById('export-plan');
    exportButton.style.display = State.plan ? 'flex' : 'none';
    if (!plan) {
        // clear calendar, hide button
        const calendarBody = document.getElementById('calendar-body');
        calendarBody.innerHTML = '';
        const exportButton = document.getElementById('export-plan');
        exportButton.style.display = 'none';
        return;
    }

    const startDate = document.getElementById('raceDate').value;
    if (!startDate) return; // Don't update if no date selected

    const raceDate = Temporal.PlainDate.from(startDate);
    const numWeeksInPlan = plan.weeks.length;
    const trainingStartDate = raceDate.subtract({ days: 6 }).subtract({ weeks: numWeeksInPlan - 1 });

    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';

    const trainingPlanTitle = document.getElementById('training-plan-title');
    trainingPlanTitle.textContent = plan.name;
    if (plan.description) {
        const trainingPlanDescription = document.getElementById('training-plan-description');
        trainingPlanDescription.textContent = plan.description;
    }

    plan.weeks.forEach((week, weekIndex) => {
        const weekStartDate = trainingStartDate.add({ weeks: weekIndex });
        const totalMiles = week.reduce((acc, day) => acc + day.distance, 0);

        // Create row for dates
        const dateRow = document.createElement('tr');
        dateRow.appendChild(generateWeekCell(weekIndex, numWeeksInPlan, totalMiles));
        week.forEach((_, dayIndex) => dateRow.appendChild(generateDateCell(weekStartDate, dayIndex)));

        // Create row for workouts
        const row = document.createElement('tr');
        week.forEach((day) => row.appendChild(generateCalendarCell(day, plan)));

        calendarBody.appendChild(dateRow);
        calendarBody.appendChild(row);
    });
}

function generateCalendarExport() {
    const plan = State.plan;
    const raceDateVal = document.getElementById('raceDate').value;
    if (!plan || !raceDateVal) return;

    const raceDate = Temporal.PlainDate.from(raceDateVal);
    const startDate = raceDate.subtract({ days: 6 }).subtract({ weeks: plan.weeks.length - 1 });

    const cal = new ICalCalendar();
    cal.name('Training Plan');
    cal.description(`${plan.name} - Race date: ${raceDate}`);
    cal.prodId('//njgingrich.github.io//Training Plan//EN');
    cal.method(ICalCalendarMethod.PUBLISH);

    plan.weeks.forEach((week, weekIndex) => {
        const weekStartDate = startDate.add({ weeks: weekIndex });
        const weekVolume = week.reduce((acc, workout) => acc + workout.distance, 0);

        const startString = weekStartDate.toZonedDateTime('UTC').toString().replace('+00:00[UTC]', '');
        const endString = weekStartDate.add({ weeks: 1 }).toZonedDateTime('UTC').toString().replace('+00:00[UTC]', '');

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
    const paceInput = document.getElementById('goalPace');
    const timeInput = document.getElementById('goalTime');

    // Clear inputs if no valid duration provided
    if (!raceDuration && !paceDuration) {
        State.goalPaceSeconds = null;
        paceInput.value = '';
        timeInput.value = '';
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
document.getElementById('raceDate').addEventListener('change', e => {
    if (e.target.value === '') {
        State.raceDate = null;
        return;
    }

    const date = Temporal.PlainDate.from(e.target.value);
    State.raceDate = date.toString();

    updateCalendar();
});

document.getElementById('goalPace').addEventListener('change', e => {
    updateGoalInputs({paceDuration: getDurationFromInput(e)});
});

document.getElementById('goalTime').addEventListener('change', e => {
    updateGoalInputs({raceDuration: getDurationFromInput(e)});
});

document.getElementById('trainingPlan').addEventListener('change', e => {
    if (e.target.value == "") {
        State.planId = null;
    } else {
        State.planId = e.target.value;
    }

    updatePaces();
    updateCalendar();
});

document.getElementById('toggle-sidebar').addEventListener('click', e => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('expanded');
});


// Add event listener for export button
document.getElementById('export-plan').addEventListener('click', (e) => {
    const plan = State.plan;
    const raceDate = document.getElementById('raceDate').value;
    if (!plan || !raceDate) return;

    const cal = generateCalendarExport();
    const file = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(cal.toString());
    const filename = `${plan.name}-${raceDate}.ics`;

    const saveBtn = document.createElement('a');
    saveBtn.rel = 'noopener';
    saveBtn.href = file;
    saveBtn.target = '_blank';
    saveBtn.download = filename;
    const evt = new MouseEvent('click', {
        view: window,
        button: 0,
        bubbles: true,
        cancelable: false,
    });
    saveBtn.dispatchEvent(evt);
    (window.URL || window.webkitURL).revokeObjectURL(saveBtn.href);
});

// Load saved values on page load
document.addEventListener('DOMContentLoaded', async () => {
    const paceInput = document.getElementById('goalPace');
    const timeInput = document.getElementById('goalTime');

    if (State.goalPaceSeconds) {
        paceInput.value = formatDuration(State.goalPaceSeconds);
        timeInput.value = formatDuration(marathonPaceToTime(State.goalPaceSeconds));
    } else if (paceInput.value && /^\d{1,2}:\d{2}$/.test(paceInput.value)) {
        const paceDuration = parseDurationString(paceInput.value);
        updateGoalInputs({paceDuration});
    } else if (timeInput.value && /^\d{1,2}:\d{2}:\d{2}$/.test(timeInput.value)) {
        const raceDuration = parseDurationString(timeInput.value);
        updateGoalInputs({raceDuration});
    }

    if (State.raceDate) {
        document.getElementById('raceDate').value = State.raceDate.toString();
    }

    // Update select options based on known plans
    const trainingPlanSelect = document.getElementById('trainingPlan');
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "Select a plan";
    trainingPlanSelect.appendChild(option);

    Object.entries(PLANS).forEach(([key, plan]) => {
        const option = document.createElement('option');
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