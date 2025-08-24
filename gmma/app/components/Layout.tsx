"use client";
import { Button } from "@mui/joy";
import useServer, { checkServer } from "../hooks/useServer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SongCreationModal from "./SongCreationModal";
import { PlayingProvider } from "../hooks/usePlaying";
import NowPlaying from "./NowPlaying";
import MusicHandler from "./MusicHandler";
import { css } from "../util/CSSUtility";
import CircleButton from "./CircleButton";
import PlaylistCreationModal from "./PlaylistCreationModal";

function NavItem({ icon, text, subtext, iconClass = "", onClick = () => { } }: { icon: [string, string] | string, text: string, subtext?: string, iconClass?: string, onClick?: () => void }) {
    return (
        <div className="nav-item" onClick={onClick}>
            {typeof icon === 'string' ? (
                <img src={icon} className="nav-icon" />
            ) : (
                <div className="nav-icon" style={css({ '--col-1': icon[0], '--col-2': icon[1] })}>
                    <i className={iconClass} />
                </div>
            )}
            <div className="nav-text">
                <b>{text}</b>
                {subtext && <span className="nav-subtext">{subtext}</span>}
            </div>
        </div>
    );
}

export default function PageLayout({ children, hideLeft = false, hideBottom = false }: { hideLeft?: boolean, hideBottom?: boolean, children: React.ReactNode }) {
    const [server, setServer] = useServer();
    const [entries, setEntries] = useState<GmmaEntry[]>();
    const router = useRouter();
    useEffect(() => {
        checkServer(router, server);
    }, [router, server]);
    useEffect(() => {
        fetch(`${server}/playlists`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch music list");
                }
                return res.json();
            })
            .then((data) => {
                setEntries(data.map((song: Playlist) => ({
                    type: 'playlist',
                    ...song
                })));
            });
    }, [server]);
    return (
        <>
            <div className="app">
                {true && (<div className={`left ${hideLeft ? 'mobile-flex' : ''}`}>
                    <div className="left-top">
                        <img src="/gmma.png" className="logo" />
                    </div>
                    <div className="left-bottom">
                        <Button
                            variant="solid"
                            startDecorator={
                                <i className="fas fa-home" />
                            }
                            onClick={() => {
                                router.push("/");
                            }}
                        >Home</Button>
                        <Button
                            variant="solid"
                            color="neutral"
                            startDecorator={
                                <i className="fas fa-refresh" />
                            }
                            onClick={() => {
                                setServer("");
                                router.push("/setup");
                            }}
                        >Switch Server</Button>
                        <CircleButton className="mobile-flex" onClick={() => {
                            router.push('/lyrics');
                        }} icon="fas fa-microphone-stand" color="primary" />
                        <CircleButton className="mobile-flex" onClick={() => {
                            if (location.pathname === '/fullscreen') {
                                router.back();
                            } else {
                                router.push('/fullscreen');
                            }
                        }} icon={`fas fa-expand`} color="primary" />
                        <div className="nav-split">
                        </div>
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Search"
                            iconClass="fas fa-search"
                            onClick={() => {
                                router.push('/search');
                            }}
                        />
                        {/* <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Playlists"
                            iconClass="fas fa-list-music"
                        />
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Artists"
                            iconClass="fas fa-user-music"
                        />
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Albums"
                            iconClass="fas fa-album-collection"
                        /> */}
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Your Songs"
                            iconClass="fas fa-folder-open"
                            onClick={() => {
                                router.push('/library/songs');
                            }}
                        />
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Your Playlists"
                            iconClass="fas fa-folder-open"
                            onClick={() => {
                                router.push('/library/playlists');
                            }}
                        />
                        <NavItem
                            icon={['#0e9048', '#13b065']}
                            text="Your Videos"
                            iconClass="fas fa-folder-open"
                            onClick={() => {
                                router.push('/library/videos');
                            }}
                        />
                        {(entries && entries?.length > 0) && (
                            <>
                                <div className="nav-split"></div>
                                {entries.map((song) => (
                                    <NavItem
                                        key={song.uuid}
                                        icon={song.artwork ? server + song.artwork : '/default-artwork.png'}
                                        text={song.name}
                                        onClick={() => {
                                            router.push(`/${song.type}/${song.uuid}`);
                                        }}
                                        subtext={song.type.split('')[0].toUpperCase() + song.type.substring(1) + (song.artist ? ' - ' + song.artist : '')}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>)}
                <div className="right" style={{ width: hideLeft ? '100%' : undefined }}>
                    {hideBottom ? children : <><div className="right-top">
                        {children}
                    </div><div className="now-playing">
                        <NowPlaying />
                    </div></>}
                </div>
            </div>
        </>
    )
}