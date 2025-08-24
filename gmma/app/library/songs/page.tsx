"use client";

import { useRouter } from "next/navigation";
import useServer from "../../hooks/useServer";
import { useEffect, useState } from "react";
import PageLayout from "@/app/components/Layout";
import { Button, Modal, ModalClose, ModalDialog, Tooltip, Typography } from "@mui/joy";
import { usePlaying } from "@/app/hooks/usePlaying";
import { formatTime } from "@/app/util/NumberUtility";
import SongCreationModal from "@/app/components/SongCreationModal";

export default function SongsPage() {
    const [server, setServer] = useServer();
    const router = useRouter();
    const [songs, setSongs] = useState<GmmaSong[]>([]);
    const playing = usePlaying();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    const [playlistAddSong, setPlaylistAddSong] = useState<GmmaSong | null>(null);

    const [createSongOpen, setCreateSongOpen] = useState(false);

    useEffect(() => {
        fetch(`${server}/list`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch music list");
                }
                return res.json();
            })
            .then((data) => {
                setSongs(data);
            });

        fetch(`${server}/playlists`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch playlists");
                }
                return res.json();
            })
            .then((data) => {
                setPlaylists(data);
            });
    }, [server]);

    return (
        <PageLayout>
            <SongCreationModal open={createSongOpen} setOpen={setCreateSongOpen} onCreate={(data) => {
                setSongs((prev) => [...(prev || []), data]);
            }} />
            <Modal
                open={!!playlistAddSong}
                onClose={() => setPlaylistAddSong(null)}
                aria-labelledby="add-to-playlist-modal"
            >
                <ModalDialog>
                    <ModalClose />
                    <Typography component={'h1'}>Add to Playlist</Typography>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                        {playlistAddSong && playlists.map((playlist) => (
                            <div className="song" style={{ width: 'calc(100% - 20px)', cursor: 'pointer', height: '50px', border: playlist.songs.includes(playlistAddSong!.uuid) ? '1px solid #ffffff30' : 'none', background: playlist.songs.includes(playlistAddSong!.uuid) ? '#ffffff10' : 'transparent' }} key={playlist.uuid} onClick={() => {
                                if (playlist.songs.includes(playlistAddSong!.uuid)) {
                                    fetch(`${server}/modify-playlist/remove-song-uuid`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ uuid: playlist.uuid, songUuid: playlistAddSong?.uuid })
                                    }).then((res) => {
                                        if (!res.ok) {
                                            throw new Error("Failed to remove song from playlist");
                                        }
                                        return res.json(); 
                                    }).then(() => {
                                        router.refresh();
                                    });
                                    setPlaylists(playlists.map(p => {
                                        if (p.uuid === playlist.uuid) {
                                            return {
                                                ...p,
                                                songs: p.songs.filter(s => s !== playlistAddSong!.uuid)
                                            };
                                        }
                                        return p;
                                    }));
                                } else {
                                    fetch(`${server}/modify-playlist/add-songs`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ uuid: playlist.uuid, songs: [playlistAddSong?.uuid] })
                                    }).then((res) => {
                                        if (!res.ok) {
                                            throw new Error("Failed to add song to playlist");
                                        }
                                        return res.json();
                                    }).then(() => {
                                        router.refresh();
                                    });
                                    setPlaylists(playlists.map(p => {
                                        if (p.uuid === playlist.uuid) {
                                            return {
                                                ...p,
                                                songs: [...p.songs, playlistAddSong!.uuid]
                                            };
                                        }
                                        return p;
                                    }));
                                }
                            }}>
                                <img src={playlist.artwork ? `${server}${playlist.artwork}` : '/default-artwork.png'} style={{ width: '50px', height: '50px' }} />
                                <div className="song-info">
                                    <b>{playlist.name}</b>
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalDialog>
            </Modal>
            <div className="song-page" style={{
                background: `linear-gradient(to bottom, #0e9048 0px, #13b065 250px, #0a0a0b 500px)`
            }}>
                <div className="song-data">
                    <div className="song-artwork" style={{ background: 'linear-gradient(45deg, #0e9048, #13b065)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-folder-open"></i>
                    </div>
                    <div className="song-info" style={{ justifyContent: 'flex-end' }}>
                        <span className="song-type">Library</span>
                        <b className="song-name">Your Songs</b>
                        <span className="song-artist"></span>
                    </div>
                </div>
                <div className="song-page-row">
                    <Button size="lg" startDecorator={<i className="fas fa-plus" />} onClick={() => {
                        setCreateSongOpen(true);
                    }}>New Song</Button>
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
                            <div className="song-fw-duration song-fw-add" onClick={() => {
                                setPlaylistAddSong(song);
                            }}>
                                <i className="fa-regular fa-circle-plus"></i>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageLayout>
    );
}