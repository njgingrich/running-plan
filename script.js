import 'temporal-polyfill';

// Convert pace string (MM:SS) to total seconds
function paceToSeconds(paceStr) {
    const [minutes, seconds] = paceStr.split(':').map(num => parseInt(num, 10));
    return minutes * 60 + seconds;
}

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
function adjustPaceByTime(paceDuration, secondsSlower) {
    const paceSeconds = durationToSeconds(paceDuration);
    const adjustedSeconds = paceSeconds + secondsSlower;
    return secondsToDuration(adjustedSeconds);
}

// Get adjusted paces for a range, returns [slowPace, averagePace, fastPace]
function getAdjustedPaces(basePaceDuration, adjustmentType, fastAdjustment, slowAdjustment) {
    let fastPace, slowPace;
    
    if (adjustmentType === 'PCT') {
        slowPace = adjustPaceByPercentage(basePaceDuration, slowAdjustment);
        fastPace = adjustPaceByPercentage(basePaceDuration, fastAdjustment);
    } else { // TIME
        slowPace = adjustPaceByTime(basePaceDuration, slowAdjustment);
        fastPace = adjustPaceByTime(basePaceDuration, fastAdjustment);
    }
    
    // Calculate average pace
    const slowSeconds = durationToSeconds(slowPace);
    const fastSeconds = durationToSeconds(fastPace);
    const averageSeconds = (slowSeconds + fastSeconds) / 2;
    
    return [slowPace, secondsToDuration(averageSeconds), fastPace];
}

// Estimate 10k race pace from marathon pace (95% of marathon pace)
function estimate10kPace(marathonPaceDuration) {
    const paceSeconds = durationToSeconds(marathonPaceDuration);
    return secondsToDuration(paceSeconds * 0.95);
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
    const estimated10kPaceDuration = estimate10kPace(marathonPaceDuration);

    // Calculate various training paces with ranges
    // Long Run: 10-20% slower than marathon pace
    const [longRunSlowPace, longRunMiddlePace, longRunFastPace] = 
        getAdjustedPaces(marathonPaceDuration, 'PCT', 10, 20);
    
    // General Aerobic: 15-25% slower than marathon pace
    const [aerobicSlowPace, aerobicMiddlePace, aerobicFastPace] = 
        getAdjustedPaces(marathonPaceDuration, 'PCT', 15, 25);
    
    // Lactate Threshold: 10-15 seconds slower per mile than 10k pace
    const [thresholdSlowPace, thresholdMiddlePace, thresholdFastPace] = 
        getAdjustedPaces(estimated10kPaceDuration, 'TIME', 10, 15);

    // Update the display with middle paces
    document.getElementById('longRunPace').textContent = `${formatPaceDuration(longRunMiddlePace)} /mile`;
    document.getElementById('marathonPace').textContent = `${formatPaceDuration(marathonPaceDuration)} /mile`;
    document.getElementById('aerobicPace').textContent = `${formatPaceDuration(aerobicMiddlePace)} /mile`;
    document.getElementById('thresholdPace').textContent = `${formatPaceDuration(thresholdMiddlePace)} /mile`;

    // Update ranges (faster to slower)
    document.getElementById('longRunRange').textContent = formatPaceRange(longRunFastPace, longRunSlowPace);
    document.getElementById('marathonRange').textContent = 'Target Race Pace';
    document.getElementById('aerobicRange').textContent = formatPaceRange(aerobicFastPace, aerobicSlowPace);
    document.getElementById('thresholdRange').textContent = formatPaceRange(thresholdFastPace, thresholdSlowPace);
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

async function loadTrainingPlan(planName) {
    const planFile = await fetch(`/plans/${planName}.json`);
    return planFile.json();
}

async function updateCalendar() {
    const plan = await loadTrainingPlan('pfitzinger_18wk_55mi');

    const startDate = document.getElementById('raceDate').value;
    if (!startDate) return; // Don't update if no date selected

    const raceDate = Temporal.PlainDate.from(startDate);
    const trainingStartDate = raceDate.subtract({days: 6}).subtract({weeks: plan.weeks.length-1});
    
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    plan.weeks.forEach((week, weekIndex) => {
        const weekStartDate = trainingStartDate.add({weeks: weekIndex});
        

        // Create row for dates
        const dateRow = document.createElement('tr');
        // Add week number (rowspan=2)
        const weekCell = document.createElement('td');
        weekCell.className = 'week-number';
        weekCell.setAttribute('rowspan', '2');
        weekCell.textContent = `Week ${weekIndex + 1}`;
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
document.addEventListener('DOMContentLoaded', () => {
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

    updateCalendar();
}); 