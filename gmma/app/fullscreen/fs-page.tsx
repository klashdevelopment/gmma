"use client";
import "./fs.css";
import { Button } from "@mui/joy";
import { usePlaying } from "../hooks/usePlaying";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RichSyncLyrics, SyncedLyrics } from "../lyrics/types";
import useServer from "../hooks/useServer";
import { getCommonColors, makeNotTooBright } from "../util/ImageUtility";
import { LyricFetch } from "../lyrics/page";

export default function FullscreenPage() {
    const playing = usePlaying();
    const [server, setServer] = useServer();
    const router = useRouter();

    const [lyrics, setLyrics] = useState<LyricFetch | null>(null);
    const [colors, setColors] = useState<string[]>(['transparent']);
    const [loading, setLoading] = useState(false);

    function fetchColors() {
        if (playing.song && playing.song.artwork) {
            getCommonColors(`${server}${playing.song.artwork}`, 0.5).then(col => {
                if (col.length > 0) {
                    setColors(col);
                } else {
                    setColors(['transparent']);
                }
            });
        } else {
            setColors(['transparent']);
        }
    }

    function fetchLyrics() {
        if (playing.song) {
            var keep = true;
            setLoading(true);
            fetch(`${server}/lyrics/${playing.song.uuid}`)
                .then((res) => {
                    if (!res.ok) {
                        if (res.status === 404) {
                            console.log("No lyrics found for this song.");
                            setLyrics(null);
                            keep = false;
                            return;
                        }
                        throw new Error(`Failed to fetch lyrics: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    if (!keep) return;
                    setLyrics(data || null);
                })
                .catch((err) => {
                    setLyrics(null);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLyrics(null);
        }
    }

    useEffect(() => {
        fetchLyrics();
        fetchColors();
    }, [playing.song]);
    useEffect(() => {
        fetchColors();
    }, []);

    return (
        <div style={{
            width: '100%', height: '100%',
            background: `url(${server}${playing.song?.artwork})`,
            backgroundColor: `linear-gradient(${colors[0]}, ${colors[1]||colors[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}>{
                playing.song ? (
                    <div className="fullscreen-page" style={{
                        backdropFilter: 'blur(20px) brightness(0.7)',
                    }}>
                        <div className="fsp-left">
                            <img src={`${server}${playing.song.artwork}`} />
                            <b>{playing.song.name}</b>
                            <span>{playing.song.artist}</span>
                        </div>
                        <div className="fsp-right">
                            {loading ? <p>Loading lyrics...</p> : <>
                                {lyrics?.richsync ? (<RichSyncLyrics playing={playing} lyrics={lyrics} style={{ fontSize: '2.5em', textAlign: 'right', height: 'calc(1.5em * 6)', lineHeight: '1.5em', overflow: 'hidden' }} transformOrigin="right" />) : <>{lyrics?.synced ? <SyncedLyrics playing={playing} lyrics={lyrics} style={{ fontSize: '2.5em', textAlign: 'right', height: 'calc(1.5em * 6)', lineHeight: '1.5em', overflow: 'hidden' }} transformOrigin="right" /> : (
                                    <p style={{ textAlign: 'center' }}>
                                        {playing.song ? `No synced lyrics found` : "No song playing"}
                                    </p>
                                )}</>}
                            </>}
                            <Button onClick={() => {
                                fetchLyrics();
                            }} variant="plain" color="neutral" size="sm" disabled={loading}><i className="fas fa-refresh" /></Button>
                        </div>
                    </div>
                ) : <p style={{margin: 'auto'}}>No song is currently playing. <Button onClick={() => {
                    router.push('/');
                }}>Go home</Button></p>
            }</div>
    );
}