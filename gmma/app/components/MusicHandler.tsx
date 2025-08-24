"use client";
import { use, useEffect, useRef, useState } from "react";
import { usePlaying } from "../hooks/usePlaying";
import useServer from "../hooks/useServer";

export default function MusicHandler() {
    const playing = usePlaying();
    const [server, setServer] = useServer();
    const [autoplayDone, setAutoplayDone] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    function onEnded() {
        if (!playing.isLooping) {
            if (playing.hasNextSong()) {
                playing.nextSong();
            } else {
                playing.setIsPlaying(false);
                playing.setCurrentTime(0);
            }
        } else {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                playing.setCurrentTime(0);
            }
        }
    }

    function onTimeUpdate() {
        if (audioRef.current) {
            playing.setCurrentTime(audioRef.current.currentTime);
        }
    }

    function fixSource() {
        if (audioRef.current) {
            if (playing.song) {
                if (audioRef.current.src !== `${server}/play/${playing.song.uuid}`) {
                    audioRef.current.src = `${server}/play/${playing.song.uuid}`;
                    audioRef.current.load();
                }
                return true;
            } else {
                audioRef.current.src = "";
                return false;
            }
        }
    }

    useEffect(() => {
        if(!autoplayDone) return;
        if (audioRef.current) {
            if (playing.isPlaying) {
                if (fixSource()) {
                    audioRef.current.play().catch((err) => {
                        console.error("Error playing audio:", err);
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [playing.isPlaying]);

    useEffect(() => {
        if(!autoplayDone) return;
        if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: playing.song?.name || "Unknown Title",
                artist: playing.song?.artist || "Unknown Artist",
                album: playing.song?.album || playing.song?.name || "Unknown Album",
                artwork: playing.song?.artwork ? [{ src: `${server}/artwork/${playing.song.uuid}`, sizes: "512x512", type: "image/png" }] : []
            });
        }
        playing.setIsPlaying(false);
        fixSource();
        var play = () => { playing.setIsPlaying(true); };
        audioRef.current?.addEventListener("canplay", play);
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener("canplay", play);
            }
        };
    }, [playing.song]);

    useEffect(() => {
        if(!autoplayDone) return;
        if (audioRef.current) {
            audioRef.current.loop = playing.isLooping;
            audioRef.current.volume = playing.volume;
            if (playing.speed) {
                audioRef.current.playbackRate = playing.speed;
            } else {
                audioRef.current.playbackRate = 1;
            }
        }
    }, [playing.isLooping, playing.volume, playing.speed]);

    useEffect(() => {
        if(!autoplayDone) return;
        if(playing._setTimeTo === -1) return;
        if (audioRef.current) {
            audioRef.current.currentTime = playing._setTimeTo;
            playing.setCurrentTime(playing._setTimeTo);
            playing.setTimeTo(-1);
        }
    }, [playing._setTimeTo]);

    // useEffect(() => {
    //     if (audioRef.current && playing.queueIndex !== -1) {

    //     }
    // }, [playing.queueIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === " " && document.activeElement === document.body) {
                e.preventDefault();
                playing.setIsPlaying(!playing.isPlaying);
            }
        }
        const msPlay = () => {
            if (audioRef.current) {
                playing.setIsPlaying(true);
            }
        };
        const msPause = () => {
            if (audioRef.current) {
                playing.setIsPlaying(false);
            }
        };
        const msPrevTrack = () => {
            if (audioRef.current) {
                playing.previousSong();
            }
        };
        const msNextTrack = () => {
            if (audioRef.current) {
                if (playing.hasNextSong()) {
                    playing.nextSong();
                } else {
                    playing.setIsPlaying(false);
                    playing.setCurrentTime(0);
                }
            }
        };
        const msSeekTo = (details: MediaSessionActionDetails) => {
            if (audioRef.current) {
                if (details.seekTime) {
                    audioRef.current.currentTime = details.seekTime;
                    playing.setCurrentTime(details.seekTime);
                }
            }
        }
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler("play", msPlay);
            navigator.mediaSession.setActionHandler("pause", msPause);
            navigator.mediaSession.setActionHandler("previoustrack", msPrevTrack);
            navigator.mediaSession.setActionHandler("nexttrack", msNextTrack);
            navigator.mediaSession.setActionHandler("seekto", msSeekTo);
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [playing]);

    useEffect(() => {
        if (playing.song && playing.isPlaying && audioRef.current) {
            fixSource();
            const audio = audioRef.current;
            audio.currentTime = playing.currentTime;
            audio.volume = playing.volume;
            audio.playbackRate = playing.speed || 1;
            audio.loop = playing.isLooping;
            playing.setIsPlaying(false);
        }
        setAutoplayDone(true);
    }, []);


    return <audio style={{ display: 'none' }} ref={audioRef} onEnded={onEnded} onTimeUpdate={onTimeUpdate}></audio>;
}