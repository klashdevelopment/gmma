"use client";

import { useRouter } from "next/navigation";
import useServer from "../../hooks/useServer";
import { useEffect, useState } from "react";
import PageLayout from "@/app/components/Layout";
import { Button, Modal, ModalClose, ModalDialog, Tooltip, Typography } from "@mui/joy";
import { usePlaying } from "@/app/hooks/usePlaying";
import { formatTime } from "@/app/util/NumberUtility";
import PlaylistCreationModal from "@/app/components/PlaylistCreationModal";

export default function SongsPage() {
    const [server, setServer] = useServer();
    const router = useRouter();
    const playing = usePlaying();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    const [playlistCreatorOpen, setPlaylistCreatorOpen] = useState(false);

    useEffect(() => {
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
            <PlaylistCreationModal open={playlistCreatorOpen} setOpen={setPlaylistCreatorOpen} onCreate={(uuid, name, description) => {
                setPlaylists((prev) => [...(prev || []), { uuid, name, description, songs: [] }]);
            }} />
            <div className="song-page" style={{
                background: `linear-gradient(to bottom, #0e9048 0px, #13b065 250px, #0a0a0b 500px)`
            }}>
                <div className="song-data">
                    <div className="song-artwork" style={{ background: 'linear-gradient(45deg, #0e9048, #13b065)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-folder-open"></i>
                    </div>
                    <div className="song-info" style={{ justifyContent: 'flex-end' }}>
                        <span className="song-type">Library</span>
                        <b className="song-name">Your Playlists</b>
                        <span className="song-artist"></span>
                    </div>
                </div>
                <div className="song-page-row">
                    <Button size="lg" startDecorator={<i className="fas fa-plus" />} onClick={() => {
                        setPlaylistCreatorOpen(true);
                    }}>
                        New Playlist
                    </Button>
                </div>
                <div className="song-page-row fd-c">
                    {playlists.map((playlist, i) => (
                        <div key={playlist.uuid} className="song-fullwidth" style={{height:'80px'}} onClick={() => {
                            router.push(`/playlist/${playlist.uuid}`);
                        }}>
                            <div className="song-fw-data" style={{width:'auto', height: '80px'}}>
                                <img
                                    src={`${playlist.artwork ? server + playlist.artwork : '/default-artwork.png'}`}
                                    alt={playlist.name}
                                    className="song-fw-artwork"
                                    style={{height:'80px', width: '80px', objectFit: 'cover'}}
                                />
                                <div className="song-fw-info">
                                    <b style={{fontSize:'20px'}}>{playlist.name}</b>
                                </div>
                            </div>
                            <div className="song-fw-duration desktop-flex">
                                <span>{playlist.songs.length} songs</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageLayout>
    );
}