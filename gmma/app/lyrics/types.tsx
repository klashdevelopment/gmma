"use client";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { LyricFetch } from "./page";
import { PlayingContextType } from "../hooks/usePlaying";

export function PlainLyrics({ lyrics }: { lyrics: LyricFetch | null }) {
    return (
        <>
            {lyrics?.plain?.split('\n').map((line, index) => (
                <p key={index} style={{ margin: '0.5rem 0', textAlign: 'center' }}>
                    {line}
                </p>
            ))}
        </>
    )
}

export interface LyricElementProps { lyrics: LyricFetch | null, playing: PlayingContextType, style?: CSSProperties, transformOrigin?: string, p_style?: CSSProperties, onlyCurrentLine?: boolean }

export function SyncedLyrics({ lyrics, playing, style = {}, p_style = {}, transformOrigin = "center", onlyCurrentLine = false }: LyricElementProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lastActiveLine, setLastActiveLine] = useState(-1);

    useEffect(() => {
        if (!lyrics?.synced) return;

        const lines = lyrics.synced.split('\n');
        let activeIndex = -1;

        for (let i = lines.length - 1; i >= 0; i--) {
            const match = lines[i].match(/^\[(\d+):(\d+\.\d+)\]/);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseFloat(match[2]);
                if (playing.currentTime >= minutes * 60 + seconds) {
                    activeIndex = i;
                    break;
                }
            }
        }

        if (activeIndex !== lastActiveLine) {
            setLastActiveLine(activeIndex);
            const element = containerRef.current?.children[activeIndex];
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [playing.currentTime, lyrics?.synced]);

    return (
        <div ref={containerRef} style={{ whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 600, ...style }}>
            {lyrics?.synced?.split('\n').map((line, index, arr) => {
                const match = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)$/);
                if (!match) return null;
                const minutes = parseInt(match[1], 10);
                const seconds = parseFloat(match[2]);
                const text = match[3];
                const timeInSeconds = minutes * 60 + seconds;
                const isActive = playing.currentTime >= timeInSeconds;
                if (onlyCurrentLine) {
                    // Find the last active line
                    let activeIndex = -1;
                    for (let i = arr.length - 1; i >= 0; i--) {
                        const m = arr[i].match(/^\[(\d+):(\d+\.\d+)\]/);
                        if (m) {
                            const min = parseInt(m[1], 10);
                            const sec = parseFloat(m[2]);
                            if (playing.currentTime >= min * 60 + sec) {
                                activeIndex = i;
                                break;
                            }
                        }
                    }
                    if (index !== activeIndex) return null;
                }
                return (
                    <p key={index} style={{
                        margin: '0.5rem 0',
                        opacity: isActive ? 1 : 0.5,
                        transform: `scale(${isActive ? 1 : 0.9})`,
                        transformOrigin: transformOrigin,
                        transition: 'all 0.4s ease',
                        cursor: 'pointer',
                        ...p_style
                    }} onClick={() => {
                        if (containerRef.current) {
                            const element = containerRef.current.children[index];
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                        playing.setTimeTo(timeInSeconds);
                    }}>
                        {text || '♫'}
                    </p>
                );
            })}
        </div>
    );
}

export function RichSyncLyrics({ lyrics, playing, style = {}, p_style = {}, transformOrigin = "center", onlyCurrentLine = false }: LyricElementProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lastActiveLine, setLastActiveLine] = useState(-1);

    useEffect(() => {
        if (!lyrics?.richsync) return;

        let activeIndex = -1;
        for (let i = lyrics.richsync.length - 1; i >= 0; i--) {
            const item = lyrics.richsync[i];
            if (playing.currentTime >= item.ts) {
                activeIndex = i;
                break;
            }
        }

        if (activeIndex !== lastActiveLine) {
            setLastActiveLine(activeIndex);
            const element = containerRef.current?.children[activeIndex];
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [playing.currentTime, lyrics?.richsync]);

    return (
        <div ref={containerRef} style={{ whiteSpace: 'pre-wrap', textAlign: 'center', fontWeight: 600, ...style }}>
            {lyrics?.richsync?.map((item, index, arr) => {
                // Find the last active line if onlyCurrentLine is true
                let activeIndex = -1;
                if (onlyCurrentLine) {
                    for (let i = arr.length - 1; i >= 0; i--) {
                        if (playing.currentTime >= arr[i].ts) {
                            activeIndex = i;
                            break;
                        }
                    }
                    if (index !== activeIndex) return null;
                }
                const isActive = playing.currentTime >= item.ts;
                return (
                    <p key={index} style={{
                        margin: '0.5rem 0',
                        opacity: isActive ? 1 : 0.5,
                        transform: `scale(${isActive ? 1 : 0.9})`,
                        transformOrigin,
                        transition: 'all 0.4s ease',
                        cursor: 'pointer',
                        ...p_style
                    }}>
                        {item.l.map((letter, letterIndex) => (
                            <span key={letterIndex} style={{
                                opacity: playing.currentTime >= (item.ts + letter.o) ? 1 : 0.3,
                                transition: 'opacity 0.2s ease'
                            }} onClick={() => {
                                playing.setTimeTo(item.ts + letter.o);
                                if (containerRef.current?.children[index]) {
                                    containerRef.current.children[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}>
                                {letter.c}
                            </span>
                        ))}
                    </p>
                );
            })}
        </div>
    );
}