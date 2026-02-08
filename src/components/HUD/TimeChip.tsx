import React, { useState, useEffect } from 'react';

const TimeChip: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const handleClick = () => {
        // TODO: Implement time-based quick jump (future feature)
        console.log('TimeChip clicked - quick jump feature TBD');
    };

    const timeString = currentTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    return (
        <button
            onClick={handleClick}
            className="flex items-center px-3 h-8 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] hover:border-[var(--semantic-color-text-secondary)] transition-all text-sm font-mono text-[var(--semantic-color-text-primary)] opacity-80 hover:opacity-100"
            title="Local time (click for quick jump)"
        >
            {timeString}
        </button>
    );
};

export default TimeChip;
