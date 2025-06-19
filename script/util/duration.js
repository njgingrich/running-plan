export function durationToSeconds({ hours = 0, minutes = 0, seconds = 0 }) {
    return hours * 3600 + minutes * 60 + seconds;
}

export function secondsToDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.ceil(totalSeconds - (hours * 3600) - (minutes * 60));
    return { hours, minutes, seconds };
}

// Parse a duration string in format "HH:MM:SS" or "MM:SS"
export function parseDurationString(str) {
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
export function formatDuration(duration) {
    const formatter = new Intl.DurationFormat('en', { style: 'digital', unitDisplay: 'long', hoursDisplay: 'auto', hours: '2-digit' });
    return formatter.format(duration);
}
