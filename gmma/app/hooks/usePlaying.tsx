"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

const SESSION_KEY = 'playing-context';

function loadSessionData(): Partial<PlayingState> | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveSessionData(data: Partial<PlayingState>) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch { }
}

interface PlayingState {
    song: GmmaSong | null;
    currentTime: number;
    _setTimeTo: number;
    isPlaying: boolean;
    isLooping: boolean;
    volume: number;
    speed?: number;
    queue: GmmaSong[];
    queueIndex: number;
}

export interface PlayingContextType extends PlayingState {
    setSong: (song: GmmaSong | null) => void;
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsLooping: (looping: boolean) => void;
    setVolume: (volume: number) => void;
    setSpeed: (speed?: number) => void;
    setTimeTo: (time: number) => void;
    setQueue: (queue: GmmaSong[]) => void;
    setQueueIndex: (index: number) => void;
    addToQueue: (song: GmmaSong) => void;
    removeFromQueue: (index: number) => void;
    nextSong: () => void;
    previousSong: () => void;
    clearQueue: () => void;
    hasNextSong: () => boolean;
    changeQueueToSingle: (song: GmmaSong) => void;
}

const PlayingContext = createContext<PlayingContextType | undefined>(undefined);

export const PlayingProvider = ({ children }: { children: ReactNode }) => {
    const initialData = loadSessionData() || {};

    const [song, setSong] = useState<GmmaSong | null>(initialData.song ?? null);
    const [currentTime, setCurrentTime] = useState<number>(initialData.currentTime ?? 0);
    const [isPlaying, setIsPlaying] = useState<boolean>(initialData.isPlaying ?? false);
    const [isLooping, setIsLooping] = useState<boolean>(initialData.isLooping ?? false);
    const [volume, setVolume] = useState<number>(initialData.volume ?? 1);
    const [speed, setSpeed] = useState<number | undefined>(initialData.speed ?? 1);
    const [_setTimeTo, setTimeTo] = useState<number>(0);
    const [queue, setQueue] = useState<GmmaSong[]>(initialData.queue ?? []);
    const [queueIndex, setQueueIndex] = useState<number>(initialData.queueIndex ?? 0);

    const addToQueue = (newSong: GmmaSong) => {
        setQueue((prevQueue) => [...prevQueue, newSong]);
    };
    const removeFromQueue = (index: number) => {
        setQueue((prevQueue) => prevQueue.filter((_, i) => i !== index));
    };
    const hasNextSong = () => {
        return queueIndex < queue.length - 1;
    }
    const changeQueueToSingle = (song: GmmaSong) => {
        setQueue([song]);
        setQueueIndex(0);
        setSong(song);
    }
    const nextSong = () => {
        if (queueIndex < queue.length - 1) {
            setQueueIndex(queueIndex + 1);
            setSong(queue[queueIndex + 1]);
        } else {
            setQueueIndex(0);
            setSong(queue[0]);
        }
    };
    const previousSong = () => {
        if (queueIndex > 0) {
            setQueueIndex(queueIndex - 1);
            setSong(queue[queueIndex - 1]);
        } else {
            setQueueIndex(queue.length - 1);
            setSong(queue[queue.length - 1]);
        }
    };

    useEffect(() => {
        saveSessionData({
            song,
            currentTime,
            isPlaying,
            isLooping,
            volume,
            speed,
            queue,
            queueIndex
        });
    }, [song, currentTime, isPlaying, isLooping, volume, speed, queue, queueIndex]);

    return (
        <PlayingContext.Provider
            value={{
                song,
                setSong,
                currentTime,
                setCurrentTime,
                isPlaying,
                setIsPlaying,
                isLooping,
                setIsLooping,
                volume,
                setVolume,
                speed,
                setSpeed,
                _setTimeTo,
                setTimeTo,
                queue,
                setQueue,
                queueIndex,
                addToQueue,
                removeFromQueue,
                nextSong,
                previousSong,
                clearQueue: () => setQueue([]),
                setQueueIndex: (index: number) => {
                    if (index >= 0 && index < queue.length) {
                        setQueueIndex(index);
                        setSong(queue[index]);
                    }
                },
                hasNextSong,
                changeQueueToSingle
            }}
        >
            {children}
        </PlayingContext.Provider>
    );
};

export const usePlaying = () => {
    const context = useContext(PlayingContext);
    if (context === undefined) {
        throw new Error('usePlaying must be used within a PlayingProvider');
    }
    return context;
};