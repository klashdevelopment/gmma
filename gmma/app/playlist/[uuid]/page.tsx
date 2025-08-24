"use client";
import CircleButton from "@/app/components/CircleButton";
import PageLayout from "@/app/components/Layout";
import { usePlaying } from "@/app/hooks/usePlaying";
import useServer from "@/app/hooks/useServer";
import { getCommonColors } from "@/app/util/ImageUtility";
import { formatTime } from "@/app/util/NumberUtility";
import { Button, Tooltip } from "@mui/joy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface PlaylistPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function PlaylistPage({ params }: PlaylistPageProps) {
    const [server, setServer] = useServer();
    const router = useRouter();
    const playing = usePlaying();
    const [uuid, setUuid] = useState<string>("");
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [songs, setSongs] = useState<GmmaSong[]>([]);
    const [artworkColors, setArtworkColors] = useState<string[]>([]);

    const artworkInputRef = useRef<HTMLInputElement | null>(null);
    const onArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!uuid || !e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('artwork', file);
        fetch(`${server}/modify-playlist/artwork/${uuid}`, {
            method: 'POST',
            body: formData
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to upload artwork");
                return res.json();
            })
            .then(() => {
                alert("Artwork uploaded successfully!");
                getCommonColors(`${server}/playlist/${uuid}/artwork?v=${Date.now()}`)
                    .then(colors => {
                        setArtworkColors(colors);
                    })
                    .catch(err => console.error("Failed to get artwork colors:", err));
                setPlaylist(prev => ({
                    ...(prev || {}),
                    artwork: `/playlist/${uuid || ''}/artwork?v=${Date.now()}`
                } as Playlist));
            })
            .catch(err => {
                console.error(err);
                alert("Failed to upload artwork.");
            });
    };

    useEffect(() => {
        params.then(p => {
            setUuid(p.uuid);
        });
    }, [params]);

    useEffect(() => {
        if (!uuid) return;

        fetch(`${server}/playlist/${uuid}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to fetch playlist");
                }
                return res.json();
            })
            .then(data => {
                setPlaylist(data);
                getCommonColors(data.artwork ? `${server}${data.artwork}` : '/default-artwork.png')
                    .then(colors => {
                        setArtworkColors(colors);
                    })
                    .catch(err => console.error("Failed to get artwork colors:", err));
            })
            .catch(err => {
                console.error(err);
                router.push("/library/songs");
            });

        fetch(`${server}/playlist/${uuid}/songs`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to fetch playlist songs");
                }
                return res.json();
            })
            .then(data => {
                setSongs(data);
            });
    }, [uuid]);

    return (
        <PageLayout>
            <div className="song-page" style={{
                background: artworkColors.length > 0 ? `linear-gradient(to bottom, ${artworkColors[0]} 0px, ${artworkColors[1]} 250px, #0a0a0b 500px)` : 'transparent',
            }}>
                <div className="song-data">
                    <img src={playlist?.artwork ? `${server}${playlist.artwork}` : '/default-artwork.png'} className="song-artwork" />
                    <div className="song-info" style={{ justifyContent: 'flex-end' }}>
                        <span className="song-type">Playlist</span>
                        <b className="song-name">{playlist?.name || 'Loading'}</b>
                        <span className="song-artist">{playlist?.description}</span>
                    </div>
                </div>
                <div className="song-page-row">
                    <CircleButton
                        icon="fas fa-play"
                        size={60}
                        tooltip="Play Playlist"
                        onClick={() => {
                            if (!playlist || songs.length === 0) {
                                alert("No songs in this playlist to play.");
                                return;
                            }
                            playing.setQueue(songs);
                            playing.setQueueIndex(0);
                            playing.setSong(songs[0]);
                            playing.setIsPlaying(true);
                        }}
                    />
                    <CircleButton
                        appearance="soft"
                        color="danger"
                        size={40}
                        icon={"fas fa-trash"}
                        tooltip="Delete Playlist"
                        onClick={() => {
                            if (!playlist) return;
                            if (confirm(`Are you sure you want to delete the playlist "${playlist.name}"?`)) {
                                fetch(`${server}/playlist/${playlist.uuid}`, {
                                    method: 'DELETE'
                                })
                                    .then(res => {
                                        if (!res.ok) {
                                            throw new Error("Failed to delete playlist");
                                        }
                                        router.push("/library/songs");
                                    })
                                    .catch(err => {
                                        console.error(err);
                                        alert("Failed to delete playlist.");
                                    });
                            }
                        }}
                    />
                </div>
                <div className="song-page-row" style={{ padding: '10px 40px', marginTop: '40px' }}>
                    <div style={{ width: '100%', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>Artwork <span style={{ display: 'flex', width: '100%', height: '1px', background: '#ffffff20' }} /></div>
                </div>
                <div className="song-page-row" style={{ padding: '0px 40px', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '200', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={`${playlist?.artwork ? `${server}${playlist?.artwork}` : '/default-artwork.png'}`} height={40} style={{ borderRadius: '4px' }} />
                        <span className="desktop-flex">{playlist?.artwork ? `artwork.png` : "No artwork"}</span>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        ref={artworkInputRef}
                        onChange={onArtUpload}
                    />
                    <div style={{ display: 'flex', gap: '10px' }} className="spr-buttons">
                        <Button
                            variant="solid"
                            color="warning"
                            startDecorator={<i className="fas fa-upload" />}
                            onClick={() => {
                                if (!uuid) {
                                    alert("Please create a song first.");
                                    return;
                                }
                                artworkInputRef.current?.click();
                            }}
                        >
                            Upload{playlist?.artwork ? " New" : ""}
                        </Button>
                        <Button
                            variant="solid"
                            color="warning"
                            startDecorator={<i className="fas fa-download" />}
                            onClick={() => {
                                fetch(`${server}/playlist/${uuid}/artwork`)
                                    .then(response => response.blob())
                                    .then(blob => {
                                        const url = URL.createObjectURL(blob);
                                        const e = document.createElement('a');
                                        e.href = url;
                                        e.download = `${playlist?.uuid}.png`;
                                        document.body.appendChild(e);
                                        e.click();
                                        document.body.removeChild(e);
                                        URL.revokeObjectURL(url);
                                    });
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </div>
                <div className="song-page-row" style={{ padding: '10px 40px', marginTop: '40px' }}>
                    <div style={{ width: '100%', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>Songs <span style={{ display: 'flex', width: '100%', height: '1px', background: '#ffffff20' }} /></div>
                </div>
                <div className="song-page-row fd-c">
                    {songs.map((song, i) => (
                        <div key={song.uuid} className="song-fullwidth">
                            <div className="song-number">
                                {i + 1}
                            </div>
                            <div className="song-play" onClick={() => {
                                if (playing.song?.uuid === song.uuid) {
                                    playing.setIsPlaying(!playing.isPlaying);
                                } else {
                                    playing.changeQueueToSingle(song);
                                }
                            }}>
                                <Tooltip title={`${(playing.song?.uuid === song.uuid && playing.isPlaying) ? 'Pause' : 'Play'
                                    } ${song.name.slice(0, 20)}${song.name.length > 20 ? '...' : ''}`} placement="top" variant="soft">
                                    <i className={`fas fa-${(playing.song?.uuid === song.uuid && playing.isPlaying) ? 'pause' : 'play'
                                        }`}></i>
                                </Tooltip>
                            </div>
                            <div className="song-fw-data">
                                <img
                                    src={`${song.artwork ? server + song.artwork : '/default-artwork.png'}`}
                                    alt={song.name}
                                    width={100}
                                    height={100}
                                    className="song-fw-artwork"
                                />
                                <div className="song-fw-info">
                                    <b onClick={() => {
                                        router.push(`/song/${song.uuid}`);
                                    }}>{song.name}</b>
                                    <span onClick={() => {
                                        router.push(`/artist/${encodeURIComponent(song.artist)}`);
                                    }}>{song.artist}</span>
                                </div>
                            </div>
                            <div className="song-fw-duration desktop-flex">
                                <span>{song.duration ? formatTime(song.duration) : <i className="fas fa-music-slash" />}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageLayout>
    );
}