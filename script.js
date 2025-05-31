// Convert pace string (MM:SS) to total seconds
function paceToSeconds(paceStr) {
    const [minutes, seconds] = paceStr.split(':').map(num => parseInt(num));
    return minutes * 60 + seconds;
}

// Convert seconds to pace string (MM:SS)
function secondsToPace(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate percentage adjustment of pace
function adjustPaceByPercentage(paceInSeconds, percentageSlower) {
    return paceInSeconds * (1 + percentageSlower / 100);
}

// Get adjusted paces for a range, returns [slowPace, averagePace, fastPace]
function getAdjustedPaces(basePaceSeconds, fastPacePercentage, slowPacePercentage) {
    const slowPace = adjustPaceByPercentage(basePaceSeconds, slowPacePercentage);
    const fastPace = adjustPaceByPercentage(basePaceSeconds, fastPacePercentage);
    const averagePace = (slowPace + fastPace) / 2;
    return [slowPace, averagePace, fastPace];
}

// Estimate 10k race pace from marathon pace
// Using a common race equivalency formula
function estimate10kPace(marathonPaceSeconds) {
    // 10k pace is typically about 95% of marathon pace
    return marathonPaceSeconds * 0.95;
}

// Format pace range as string (faster to slower)
function formatPaceRange(fastPace, slowPace) {
    return `${secondsToPace(fastPace)} - ${secondsToPace(slowPace)} /mile`;
}

function calculatePaces() {
    const paceInput = document.getElementById('goalPace').value;
    
    // Validate input format (MM:SS)
    if (!/^\d{1,2}:\d{2}$/.test(paceInput)) {
        alert('Please enter a valid pace in MM:SS format (e.g., 8:00)');
        return;
    }

    const marathonPaceSeconds = paceToSeconds(paceInput);
    const estimated10kPaceSeconds = estimate10kPace(marathonPaceSeconds);

    // Calculate various training paces with ranges
    // Long Run: 10-20% slower than marathon pace
    const [longRunSlowPace, longRunMiddlePace, longRunFastPace] = 
        getAdjustedPaces(marathonPaceSeconds, 10, 20);
    
    // General Aerobic: 15-25% slower than marathon pace
    const [aerobicSlowPace, aerobicMiddlePace, aerobicFastPace] = 
        getAdjustedPaces(marathonPaceSeconds, 15, 25);
    
    // Lactate Threshold: 10-15% slower than 10k pace
    const [thresholdSlowPace, thresholdMiddlePace, thresholdFastPace] = 
        getAdjustedPaces(estimated10kPaceSeconds, 10, 15);

    // Update the display with middle paces
    document.getElementById('longRunPace').textContent = `${secondsToPace(longRunMiddlePace)} /mile`;
    document.getElementById('marathonPace').textContent = `${secondsToPace(marathonPaceSeconds)} /mile`;
    document.getElementById('aerobicPace').textContent = `${secondsToPace(aerobicMiddlePace)} /mile`;
    document.getElementById('thresholdPace').textContent = `${secondsToPace(thresholdMiddlePace)} /mile`;

    // Update ranges (faster to slower)
    document.getElementById('longRunRange').textContent = formatPaceRange(longRunFastPace, longRunSlowPace);
    document.getElementById('marathonRange').textContent = 'Target Race Pace';
    document.getElementById('aerobicRange').textContent = formatPaceRange(aerobicFastPace, aerobicSlowPace);
    document.getElementById('thresholdRange').textContent = formatPaceRange(thresholdFastPace, thresholdSlowPace);
}

// Add input validation and auto-formatting
document.getElementById('goalPace').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d:]/g, '');
    
    if (value.length > 5) {
        value = value.slice(0, 5);
    }
    
    // Auto-add colon after minutes
    if (value.length >= 2 && !value.includes(':')) {
        const minutes = value.slice(0, 2);
        const seconds = value.slice(2);
        value = `${minutes}:${seconds}`;
    }
    
    e.target.value = value;
});

// Calculate paces on page load if there's a value in the input
document.addEventListener('DOMContentLoaded', function() {
    const paceInput = document.getElementById('goalPace');
    if (paceInput.value) {
        calculatePaces();
    }
}); 