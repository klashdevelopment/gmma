"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import useServer, { checkServer } from "./hooks/useServer";
import { useRouter } from "next/navigation";
import { Button } from "@mui/joy";
import PageLayout from "./components/Layout";

export default function Home() {
    const [server, setServer] = useServer();
    const router = useRouter();
    const [music, setMusic] = useState<GmmaSong[]>([]);

    useEffect(() => {
        fetch(`${server}/list`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch music list");
                }
                return res.json();
            })
            .then((data) => {
                setMusic(data);
            });
    }, [server]);

    return (
        <PageLayout music={{ music, setMusic }}>
            {/* <div className="song-grid">
                {music.map((song) => (
                    <div key={song.uuid} className="song" onClick={() => {
                        router.push(`/song/${song.uuid}`);
                    }}>
                        <img
                            src={`${song.artwork ? server + song.artwork : '/default-artwork.png'}`}
                            alt={song.name}
                            width={100}
                            height={100}
                            className="song-artwork"
                        />
                        <div className="song-info">
                            <h3>{song.name}</h3>
                            <p>{song.artist}</p>
                        </div>
                    </div>
                ))}
            </div> */}
            <div className="homepage" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h2 style={{margin: '0', lineHeight:'16px'}}>generic & modular</h2>
                <h1 style={{margin: '0'}}>MUSIC APP</h1>
                <p style={{ margin: '20px 0' }}>Store your music whenever, wherever, with whoever you want.</p>
            </div>
        </PageLayout>
    );
}