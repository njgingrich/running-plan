import 'temporal-polyfill';
import { PLANS } from './plans';

const State = {
    plan: null,
    marathonPace: null,
    marathonTime: null,
    longRunPace: null,
    longRunRange: null,
    aerobicPace: null,
    aerobicRange: null,
}
window.State = State;

function durationToSeconds({hours = 0, minutes = 0, seconds = 0}) {
    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.ceil(totalSeconds - (hours * 3600) - (minutes * 60));
    return {hours, minutes, seconds};
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

// Format a duration as MM:SS
function formatPaceDuration({minutes, seconds}) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format a duration as HH:MM:SS
function formatTimeDuration(duration) {
    const formatter = new Intl.DurationFormat('en', {style: 'digital', unitDisplay: 'long'});
    return formatter.format(duration);
}

// Calculate percentage adjustment of pace
function adjustPaceByPercentage(paceDuration, percentageSlower) {
    const paceSeconds = durationToSeconds(paceDuration);
    const adjustedSeconds = paceSeconds * (1 + percentageSlower / 100);
    return secondsToDuration(adjustedSeconds);
}

// Calculate time-based adjustment of pace
function adjustPaceByTime(paceDuration, secondsAdjustment) {
    const paceSeconds = durationToSeconds(paceDuration);
    const adjustedSeconds = paceSeconds + secondsAdjustment;
    return secondsToDuration(adjustedSeconds);
}

// Get adjusted paces for a range, returns [slowPace, averagePace, fastPace]
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

// Estimate 10k race pace from marathon pace
function estimate10kPace(marathonPaceDuration) {
    const paceSeconds = durationToSeconds(marathonPaceDuration);
    return secondsToDuration(paceSeconds / 1.06);
}

// Format pace range as string (faster to slower)
function formatPaceRange(fastPace, slowPace) {
    return `${formatPaceDuration(fastPace)} - ${formatPaceDuration(slowPace)} /mile`;
}

// Convert between marathon time and pace
function marathonTimeToPace(timeDuration) {
    const timeSeconds = durationToSeconds(timeDuration);
    return secondsToDuration(timeSeconds / 26.2);
}

function marathonPaceToTime(paceDuration) {
    const paceSeconds = durationToSeconds(paceDuration);
    return secondsToDuration(paceSeconds * 26.2);
}

// Save duration to localStorage
function saveDurationToStorage(key, duration) {
    localStorage.setItem(key, JSON.stringify(duration));
}

// Load duration from localStorage
function loadDurationFromStorage(key) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

function calculatePaces(marathonPaceDuration) {
    const plan = State.plan;
    if (!plan || !plan.paces) return;

    // Calculate base paces
    const estimated10kPaceDuration = estimate10kPace(marathonPaceDuration);

    // Process each pace type from the plan
    Object.entries(plan.paces).forEach(([type, config]) => {
        const paceElement = document.getElementById(`${type}Pace`);
        const rangeElement = document.getElementById(`${type}Range`);
        if (!paceElement || !rangeElement) return;

        let basePace = marathonPaceDuration;
        if (config.multiplier) {
            // If there's a multiplier, apply it to the base pace
            const baseSeconds = durationToSeconds(basePace);
            basePace = secondsToDuration(baseSeconds * config.multiplier);
        }

        if (config.paceType === 'race') {
            // Race pace is just the marathon pace
            paceElement.textContent = `${formatPaceDuration(marathonPaceDuration)} /mile`;
            rangeElement.textContent = 'Target Race Pace';
        } else {
            // Calculate adjusted paces based on configuration
            const [slowPace, middlePace, fastPace] = getAdjustedPaces(
                basePace,
                config.paceType,
                config.fast,
                config.slow
            );

            paceElement.textContent = `${formatPaceDuration(middlePace)} /mile`;
            rangeElement.textContent = formatPaceRange(fastPace, slowPace);
        }
    });
}

// Handle duration input formatting and return parsed duration
function handleDurationInput(e, isTimeInput) {
    let value = e.target.value.replace(/[^\d:]/g, '');
    const maxLength = isTimeInput ? 8 : 5;
    
    if (value.length > maxLength) {
        value = value.slice(0, maxLength);
    }
    
    // Auto-add colons
    if (isTimeInput) {
        if (value.length >= 2 && value.split(':').length < 2) {
            value = value.slice(0, 2) + ':' + value.slice(2);
        }
        if (value.length >= 5 && value.split(':').length < 3) {
            value = value.slice(0, 5) + ':' + value.slice(5);
        }
    } else {
        if (value.length >= 2 && !value.includes(':')) {
            value = value.slice(0, 2) + ':' + value.slice(2);
        }
    }
    
    e.target.value = value;

    // Parse and return duration if valid
    const pattern = isTimeInput ? /^\d{1,2}:\d{2}:\d{2}$/ : /^\d{1,2}:\d{2}$/;
    if (pattern.test(value)) {
        return parseDurationString(value);
    }
    return null;
}

function updatePaces() {
    const plan = State.plan;
    if (!plan) return;
    
    // Generate pace cards based on plan configuration
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    Object.entries(plan.paces).forEach(([type, config]) => {
        const card = document.createElement('div');
        card.className = 'pace-card';

        const title = document.createElement('h3');
        title.textContent = plan.types[type] || type;
        card.appendChild(title);

        const paceInfo = document.createElement('div');
        paceInfo.className = 'pace-info';

        const paceMain = document.createElement('div');
        paceMain.className = 'pace-main';
        const pace = document.createElement('p');
        pace.className = 'pace';
        pace.id = `${type}Pace`;
        pace.textContent = '--:-- /mile';
        paceMain.appendChild(pace);
        paceInfo.appendChild(paceMain);

        const paceRangeContainer = document.createElement('div');
        paceRangeContainer.className = 'pace-range-container';
        const paceRange = document.createElement('p');
        paceRange.className = 'pace-range';
        paceRange.id = `${type}Range`;
        paceRange.textContent = '--:-- - --:-- /mile';
        paceRangeContainer.appendChild(paceRange);
        paceInfo.appendChild(paceRangeContainer);

        card.appendChild(paceInfo);

        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = config.description || '';
        card.appendChild(description);

        resultsContainer.appendChild(card);
    });

    // Recalculate paces if we have a marathon pace
    const paceInput = document.getElementById('goalPace');
    if (paceInput.value && /^\d{1,2}:\d{2}$/.test(paceInput.value)) {
        const paceDuration = parseDurationString(paceInput.value);
        calculatePaces(paceDuration);
    }
}

function updateCalendar() {
    const plan = State.plan;
    if (!plan) return;

    const startDate = document.getElementById('raceDate').value;
    if (!startDate) return; // Don't update if no date selected

    const raceDate = Temporal.PlainDate.from(startDate);
    const numWeeksInPlan = plan.weeks.length;
    const trainingStartDate = raceDate.subtract({days: 6}).subtract({weeks: numWeeksInPlan - 1});
    
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';

    const trainingPlanTitle = document.getElementById('training-plan-title');
    trainingPlanTitle.textContent = plan.name;
    if (plan.description) {
        const trainingPlanDescription = document.getElementById('training-plan-description');
        trainingPlanDescription.textContent = plan.description;
    }

    plan.weeks.forEach((week, weekIndex) => {
        const weekStartDate = trainingStartDate.add({weeks: weekIndex});
        const totalMiles = week.reduce((acc, day) => acc + day.distance, 0);

        // Create row for dates
        const dateRow = document.createElement('tr');
        // Add week number (rowspan=2)
        const weekCell = document.createElement('td');
        const weekCellContainer = document.createElement('div');
        weekCell.className = 'week-number';
        weekCell.setAttribute('rowspan', '2');
        weekCellContainer.className = 'week-cell-container';

        // Create week number span
        const weekNumberSpan = document.createElement('span');
        weekNumberSpan.textContent = `Week ${weekIndex + 1}`;
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
        dateRow.appendChild(weekCell);

        week.forEach((_, dayIndex) => {
            const dateCell = document.createElement('td');
            const date = weekStartDate.add({days: dayIndex});
            dateCell.textContent = date.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric'
            });
            dateCell.className = 'date-cell';
            dateRow.appendChild(dateCell);
        });

        // Create row for workouts
        const row = document.createElement('tr');

        // Add each day's workout
        week.forEach((day, dayIndex) => {
            const cell = document.createElement('td');
            const workout = document.createElement('div');
            workout.className = 'workout';

            const type = document.createElement('div');
            type.className = 'workout-type';
            type.textContent = plan.types[day.type];
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

            cell.appendChild(workout);
            row.appendChild(cell);
        });

        calendarBody.appendChild(dateRow);
        calendarBody.appendChild(row);
    });
}

// Add input handlers
document.getElementById('raceDate').addEventListener('change', e => {
    const date = Temporal.PlainDate.from(e.target.value);
    console.log(date.toString());
    updateCalendar();
});

document.getElementById('goalPace').addEventListener('input', e => {
    const duration = handleDurationInput(e, false);
    if (!duration) return;
    
    saveDurationToStorage('marathonPace', duration);
    const timeDuration = marathonPaceToTime(duration);
    saveDurationToStorage('marathonTime', timeDuration);
    document.getElementById('goalTime').value = formatTimeDuration(timeDuration);
    calculatePaces(duration);
});

document.getElementById('goalTime').addEventListener('input', e => {
    const duration = handleDurationInput(e, true);
    if (!duration) return;

    saveDurationToStorage('marathonTime', duration);
    const paceDuration = marathonTimeToPace(duration);
    saveDurationToStorage('marathonPace', paceDuration);
    document.getElementById('goalPace').value = formatPaceDuration(paceDuration);
    calculatePaces(paceDuration);
});

// Load saved values on page load
document.addEventListener('DOMContentLoaded', async () => {
    const paceInput = document.getElementById('goalPace');
    const timeInput = document.getElementById('goalTime');
    
    // Try to load from localStorage first
    const storedPace = loadDurationFromStorage('marathonPace');
    const storedTime = loadDurationFromStorage('marathonTime');
    
    if (storedPace) {
        paceInput.value = formatPaceDuration(storedPace);
        timeInput.value = formatTimeDuration(storedTime);
        calculatePaces(storedPace);
    } else if (paceInput.value && /^\d{1,2}:\d{2}$/.test(paceInput.value)) {
        const paceDuration = parseDurationString(paceInput.value);
        calculatePaces(paceDuration);
    } else if (timeInput.value && /^\d{1,2}:\d{2}:\d{2}$/.test(timeInput.value)) {
        const timeDuration = parseDurationString(timeInput.value);
        const paceDuration = marathonTimeToPace(timeDuration);
        calculatePaces(paceDuration);
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
        trainingPlanSelect.appendChild(option);
    });

    updatePaces();
    updateCalendar();
});

// Add event listener for plan changes
document.getElementById('trainingPlan').addEventListener('change', (e) => {
    State.plan = PLANS[e.target.value];
    updatePaces();
    updateCalendar();
}); 