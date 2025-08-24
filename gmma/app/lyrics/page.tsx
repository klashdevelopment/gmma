"use client";
import { useRouter } from "next/navigation";
import useServer from "../hooks/useServer";
import { CSSProperties, useEffect, useRef, useState } from "react";
import PageLayout from "../components/Layout";
import { PlayingContextType, usePlaying } from "../hooks/usePlaying";
import { Button, Tooltip } from "@mui/joy";
import { getCommonColors, makeNotTooBright } from "../util/ImageUtility";
import { PlainLyrics, RichSyncLyrics, SyncedLyrics } from "./types";

export interface RichSyncLitem {
    c: string;
    o: number;
}
export interface RichSyncItem {
    ts: number;
    te: number;
    l: RichSyncLitem[];
    x: string;
}

export default function LyricsPage() {
    const [server, setServer] = useServer();
    const router = useRouter();
    const [music, setMusic] = useState<GmmaSong[]>([]);
    const playing = usePlaying();

    const [lyrics, setLyrics] = useState<LyricFetch | null>(null);
    const [type, setType] = useState<'synced' | 'plain' | 'richsync' | 'unset'>('unset');

    const [color, setColor] = useState<string>('transparent');

    const [loading, setLoading] = useState(false);

    function fetchLyrics() {
        if (playing.song) {
            if (playing.song.artwork) {
                getCommonColors(`${server}${playing.song.artwork}`, 0.5).then(col => {
                    if (col.length > 0) {
                        setColor(makeNotTooBright(col[0]));
                    }
                });
            }

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
                    if (type === 'unset' || !data[type]) {
                        if (data.richsync) {
                            setType('richsync');
                        } else if (data.synced) {
                            setType('synced');
                        } else if (data.plain) {
                            setType('plain');
                        }
                    }
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
    }, [playing.song]);

    return (
        <PageLayout>
            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden', width: '100%', height: '100%', background: `${color}` }}>
                <div style={{ width: 'calc(100% - 8px)', height: '40px', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center', padding: '4px', backgroundColor: '#ffffff05', borderBottom: '1px solid #ffffff30', color: '#fff' }}>
                    <Button variant="soft" color={'neutral'} onClick={() => { router.back() }}><i className="fas fa-arrow-left" /></Button>
                    {lyrics?.synced && <Tooltip variant="soft" title={lyrics?.source['synced']}><Button variant={type === 'synced' ? 'solid' : 'soft'} startDecorator={<i className="fas fa-microphone-stand" />} onClick={() => { setType('synced') }}>Synced</Button></Tooltip>}
                    {lyrics?.plain && <Tooltip variant="soft" title={lyrics?.source['plain']}><Button variant={type === 'plain' ? 'solid' : 'soft'} startDecorator={<i className="fas fa-headphones" />} onClick={() => { setType('plain') }}>Plain</Button></Tooltip>}
                    {lyrics?.richsync && <Tooltip variant="soft" title={lyrics?.source['richsync']}><Button variant={type === 'richsync' ? 'solid' : 'soft'} startDecorator={<i className="fas fa-brain" />} onClick={() => { setType('richsync') }}>RichSync</Button></Tooltip>}
                    <Button variant="soft" disabled={loading} color={'neutral'} onClick={() => { fetchLyrics() }}><i className="fas fa-refresh" /></Button>
                </div>
                <div className="lyrics-container" style={{ width: 'calc(100% - 80px)', height: 'calc(100% - 120px)', padding: '40px', fontSize: '3vw', fontWeight: '600', overflowY: 'auto', wordWrap: 'normal', scrollbarColor: '#ccc #1a1a1b', scrollbarWidth: 'thin' }}>
                    {loading ? <p style={{ textAlign: 'center' }}>Loading lyrics...</p> : (type === 'synced' && lyrics?.synced) ? <SyncedLyrics playing={playing} lyrics={lyrics} /> : (
                        (type === 'plain' && lyrics?.plain) ? (
                            <PlainLyrics lyrics={lyrics} />
                        ) : (
                            (type === 'richsync' && lyrics?.richsync) ? (
                                <RichSyncLyrics playing={playing} lyrics={lyrics} />
                            ) : (
                                <p style={{ textAlign: 'center' }}>
                                    {playing.song ? <>
                                        <span>No lyrics found</span>
                                    </> : "No song playing"}
                                </p>
                            )
                        )
                    )}
                </div>
            </div>
        </PageLayout>
    );
}

// example item:
// {\"ts\":0.09,\"te\":2.05,\"l\":[{\"c\":\"(\",\"o\":0},{\"c\":\"'Til\",\"o\":0.011},{\"c\":\" \",\"o\":0.101},{\"c\":\"I'm\",\"o\":0.431},{\"c\":\" \",\"o\":0.575},{\"c\":\"in\",\"o\":0.862},{\"c\":\" \",\"o\":0.938},{\"c\":\"the\",\"o\":1.161},{\"c\":\" \",\"o\":1.26},{\"c\":\"grave)\",\"o\":1.526}],\"x\":\"('Til I'm in the grave)\"}
export interface LyricFetch { source: { plain?: string, synced?: string, richsync?: string }, plain?: string, synced?: string, richsync?: RichSyncItem[] };