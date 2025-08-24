export function formatTime(seconds: number): string {
    if (seconds < 0) return '0:00';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    let result = '';
    if (days > 0) {
        result += `${days}:`;
    }
    if (hours > 0 || days > 0) {
        result += `${hours}:`;
    }
    result += `${minutes}:${secs.toString().padStart(2, '0')}`;
    return result;
}