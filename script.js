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

// Get adjusted paces for a range, returns [slowPace, averagePace, fastPace]
function getAdjustedPaces(basePaceDuration, fastPacePercentage, slowPacePercentage) {
    const slowPace = adjustPaceByPercentage(basePaceDuration, slowPacePercentage);
    const fastPace = adjustPaceByPercentage(basePaceDuration, fastPacePercentage);
    
    // Calculate average pace
    const slowSeconds = durationToSeconds(slowPace);
    const fastSeconds = durationToSeconds(fastPace);
    const averageSeconds = (slowSeconds + fastSeconds) / 2;
    
    return [slowPace, secondsToDuration(averageSeconds), fastPace];
}

// Estimate 10k race pace from marathon pace
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

function calculatePaces(marathonPaceDuration) {
    const estimated10kPaceDuration = estimate10kPace(marathonPaceDuration);

    // Calculate various training paces with ranges
    // Long Run: 10-20% slower than marathon pace
    const [longRunSlowPace, longRunMiddlePace, longRunFastPace] = 
        getAdjustedPaces(marathonPaceDuration, 10, 20);
    
    // General Aerobic: 15-25% slower than marathon pace
    const [aerobicSlowPace, aerobicMiddlePace, aerobicFastPace] = 
        getAdjustedPaces(marathonPaceDuration, 15, 25);
    
    // Lactate Threshold: 10-15% slower than 10k pace
    const [thresholdSlowPace, thresholdMiddlePace, thresholdFastPace] = 
        getAdjustedPaces(estimated10kPaceDuration, 10, 15);

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

// Add input handlers
document.getElementById('goalPace').addEventListener('input', e => {
    const duration = handleDurationInput(e, false);
    if (duration) {
        const timeDuration = marathonPaceToTime(duration);
        document.getElementById('goalTime').value = formatTimeDuration(timeDuration);
        calculatePaces(duration);
    }
});

document.getElementById('goalTime').addEventListener('input', e => {
    const duration = handleDurationInput(e, true);
    if (duration) {
        const paceDuration = marathonTimeToPace(duration);
        document.getElementById('goalPace').value = formatPaceDuration(paceDuration);
        calculatePaces(paceDuration);
    }
});

// Calculate paces on page load if there's a value in either input
document.addEventListener('DOMContentLoaded', function() {
    const paceInput = document.getElementById('goalPace');
    const timeInput = document.getElementById('goalTime');
    
    if (paceInput.value && /^\d{1,2}:\d{2}$/.test(paceInput.value)) {
        const paceDuration = parseDurationString(paceInput.value);
        calculatePaces(paceDuration);
    } else if (timeInput.value && /^\d{1,2}:\d{2}:\d{2}$/.test(timeInput.value)) {
        const timeDuration = parseDurationString(timeInput.value);
        const paceDuration = marathonTimeToPace(timeDuration);
        calculatePaces(paceDuration);
    }
}); 