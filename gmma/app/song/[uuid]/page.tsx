"use client";
import PageLayout from "@/app/components/Layout";
import { usePlaying } from "@/app/hooks/usePlaying";
import useServer from "@/app/hooks/useServer";
import { Button, Input, Modal, ModalClose, ModalDialog, Tooltip, Typography } from "@mui/joy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PlaySongBtn from "./play";
import { ExtSearchResult } from "@/app/components/SongCreationModal";
import { getCommonColors } from "@/app/util/ImageUtility";
import CircleButton from "@/app/components/CircleButton";

interface SongPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

function AnimatedEllipsis() {
    return (
        <span className="animated-ellipsis">
            <span>.</span>
            <span>.</span>
            <span>.</span>
        </span>
    );
}

export default function SongPage({ params }: SongPageProps) {
    const [server, setServer] = useServer();
    const router = useRouter();
    const [uuid, setUuid] = useState<string>("");

    const [song, setSong] = useState<GmmaSong | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const artworkInputRef = useRef<HTMLInputElement>(null);
    function upload() {
        if (!uuid) {
            alert("Please create a song first.");
            return;
        }
        fileInputRef.current?.click();
    }
    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const format = file.name.split(".").pop() || "";
        const formData = new FormData();
        formData.append("music", file);
        formData.append("uuid", uuid);
        formData.append("format", format);

        const res = await fetch("http://localhost:8080/modify/music", {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            alert("Music uploaded successfully.");
            setSong((prev) => ({
                ...prev,
                hasMusic: true
            } as GmmaSong));
        } else {
            alert("Upload failed.");
        }
    }
    async function onArtUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("artwork", file);
        formData.append("uuid", uuid);
        const res = await fetch("http://localhost:8080/modify/artwork", {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            setSong((prev) => ({
                ...prev,
                artwork: '/artwork/' + uuid + "?timestamp=" + Date.now(),
            } as GmmaSong));
            getCommonColors(`${server}${song?.artwork}`, 0.75).then((colors) => {
                if (colors.length > 0) {
                    setCommonColors(colors);
                } else {
                    setCommonColors(['#0a0a0b', '#0a0a0b']);
                }
            });
        } else {
            alert("Artwork upload failed.");
        }
    }

    useEffect(() => {
        params.then(({ uuid }) => {
            setUuid(uuid);
        });
    }, [params]);

    const [commonColors, setCommonColors] = useState<string[]>([]);

    useEffect(() => {
        if (uuid && server) {
            fetch(`${server}/get/${uuid}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error("Failed to fetch song data");
                    }
                    return res.json();
                })
                .then((data) => {
                    console.log(data);
                    setSong(data);
                    getCommonColors(`${server}${data.artwork}`, 0.75).then((colors) => {
                        if (colors.length > 0) {
                            setCommonColors(colors);
                        } else {
                            setCommonColors(['#0a0a0b', '#0a0a0b']);
                        }
                    });
                })
                .catch((error) => {
                    console.error("Error fetching song data:", error);
                });
        }
    }, [uuid, server]);

    const [artworkSearch, setArtworkSearch] = useState<ExtSearchResult[] | null>(null);
    const [sourceSearch, setSourceSearch] = useState<YoutubeSearchResult[] | null>(null);
    const [downloading, setDownloading] = useState<boolean>(false);

    const [selSource, setSelSource] = useState<string | null>(null);

    const playing = usePlaying();

    function downloadSource(url: string) {
        if (!uuid) return;
        setDownloading(true);
        fetch(`${server}/youtube-download/${uuid}?url=${url}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to download source");
                }
                return res.json();
            })
            .then((data) => {
                setDownloading(false);
                setSourceSearch(null);
                setSelSource(null);
                setSong((prev) => ({
                    ...prev,
                    hasMusic: true,
                    musicExtension: 'mp3'
                } as GmmaSong));
            })
            .catch((error) => {
                console.error("Error downloading source:", error);
                alert("Failed to start download.");
                setDownloading(false);
            });
    }

    return (
        <PageLayout>

            <Modal open={!!sourceSearch} onClose={() => setSourceSearch(null)}>
                <ModalDialog sx={{ width: '100%', overflowX: 'auto', maxWidth: '555px' }}>
                    <ModalClose />
                    <Typography component={'h1'}>Source Search</Typography>
                    {downloading ? <Typography>Downloading & converting video<AnimatedEllipsis /></Typography> : <>
                        {sourceSearch && sourceSearch.length > 0 ? <>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                <Input
                                    placeholder="Enter valid Youtube URL"
                                    size="md"
                                    value={selSource || ''}
                                    onChange={(e) => setSelSource(e.target.value)}
                                    endDecorator={
                                        <Button
                                            variant="solid"
                                            color="primary"
                                            onClick={async () => {
                                                downloadSource(selSource || '');
                                            }}
                                        >
                                            Set Source
                                        </Button>
                                    }
                                    style={{ width: '100%' }}
                                ></Input>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, 160px)', gap: '10px' }}>
                                {sourceSearch.map((r, i) => (
                                    <div key={r.url + 'ssn' + i} style={{
                                        backgroundImage: `url(${r.thumbnail})`,
                                        border: `${selSource === r.url ? '2px solid #007bff' : '1px solid #ffffff20'}`,
                                        scale: selSource === r.url ? 1.025 : '1',
                                    }} className="source-search-item" onClick={() => {
                                        setSelSource(r.url);
                                    }}>
                                        <span style={{ fontSize: '10px', textShadow: '0 0 2px black' }}>{r.artist}</span>
                                        <b style={{
                                            width: '100%',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            display: 'block',
                                            textShadow: '0 0 2px black',
                                        }}>{r.title}</b>
                                    </div>
                                ))}
                            </div>
                        </> : <span>Loading</span>}
                    </>}
                </ModalDialog>
            </Modal>
            <Modal open={!!artworkSearch} onClose={() => setArtworkSearch(null)}>
                <ModalDialog sx={{ width: '100%', overflowX: 'hidden', overflowY: 'auto', minWidth: '555px', maxWidth: '560px', scrollbarColor: '#ffffff20 #0a0a0b' }}>
                    <ModalClose />
                    <Typography>Artwork Search</Typography>

                    {artworkSearch && <>
                        {artworkSearch.length > 0 ? <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, 250px)', gap: '5px' }}>
                                {artworkSearch.map((result, i) => (
                                    <div onClick={async () => {
                                        const res = await fetch(`${server}/modify/artwork-url`, {
                                            method: "POST",
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                artworkUrl: result.artwork,
                                                uuid: uuid
                                            })
                                        });
                                        if (res.ok) {
                                            setSong((prev) => ({
                                                ...prev,
                                                artwork: prev?.artwork + "?timestamp=" + Date.now(),
                                            } as GmmaSong));
                                            setArtworkSearch(null);
                                        } else {
                                            alert("Failed to set artwork.");
                                        }
                                    }}
                                        key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }} className="art-search-item">
                                        <img
                                            src={result.artwork}
                                            alt={result.title}
                                            style={{ width: '40px', height: '40px', objectFit:'cover', borderRadius: '4px', marginRight: '8px' }}
                                        />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {result.title}
                                            </div>
                                            <div style={{ fontSize: '0.9em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {result.artist}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </> : <span>Searching</span>}
                    </>}
                </ModalDialog>
            </Modal>

            {song ? (
                <>
                    <div className="song-page" style={{
                        background: `${commonColors.length > 0 ? `linear-gradient(to bottom, ${commonColors[0]} 0px, ${commonColors[1]} 250px, #0a0a0b 500px)` : 'transparent'}`
                    }}>
                        <div className="song-data">
                            <img
                                src={`${song.artwork ? server + song.artwork : '/default-artwork.png'}`}
                                alt={song.name}
                                width={100}
                                height={100}
                                className="song-artwork"
                            />
                            <div className="song-info" style={{ justifyContent: 'flex-end' }}>
                                <span className="song-type">Song</span>
                                <b className="song-name">{song.name}</b>
                                <span className="song-artist">{song.artist} <span className="song-album"> - {song.album}</span></span>
                            </div>
                        </div>
                        <div className="song-page-row">
                            {song?.hasMusic ? (
                                <PlaySongBtn song={song} />
                            ) :
                                <CircleButton
                                    appearance="solid"
                                    color="neutral"
                                    sizeMultiplier={0.4}
                                    size={60}
                                    icon={"fas fa-music-slash"}
                                ></CircleButton>
                            }
                            <CircleButton
                                icon="fas fa-plus-square"
                                color="primary"
                                onClick={() => {
                                    playing.addToQueue(song);
                                }}
                                size={40}
                            ></CircleButton>
                            <CircleButton
                                appearance="soft"
                                color="danger"
                                size={40}
                                icon={"fas fa-trash"}
                                onClick={async () => {
                                    if (!uuid) {
                                        alert("Please create a song first.");
                                        return;
                                    }
                                    const res = await fetch(`${server}/delete/${uuid}`, {
                                        method: "DELETE"
                                    });
                                    if (res.ok) {
                                        alert("Song deleted successfully.");
                                        router.push("/");
                                    } else {
                                        alert("Failed to delete song.");
                                    }
                                    if (playing.song?.uuid === uuid) {
                                        playing.setSong(null);
                                    }
                                }}
                            ></CircleButton>
                            <CircleButton
                                appearance="plain"
                                icon="fas fa-ellipsis-v"
                                color="primary"
                                onClick={() => {
                                    router.push(`/song/${uuid}/edit`);
                                }}
                                size={40}
                            ></CircleButton>
                        </div>
                        <div className="song-page-row" style={{ padding: '10px 40px', marginTop: '10px' }}>
                            <div style={{ width: '100%', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>Sources <span style={{ display: 'flex', width: '100%', height: '1px', background: '#ffffff20' }} /></div>
                        </div>
                        <div className="song-page-row" style={{ padding: '0px 40px', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: '200', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {song?.hasMusic ? (
                                    <PlaySongBtn variant="outlined" size={40} song={song} />
                                ) :
                                    <CircleButton
                                        appearance="outlined"
                                        color="neutral"
                                        sizeMultiplier={0.4}
                                        size={40}
                                        icon={"fas fa-music-slash"}
                                    ></CircleButton>
                                }
                                <span className="desktop-flex">{song.hasMusic ? `source.${song.musicExtension}` : "No sources"}</span>
                            </div>
                            <input
                                type="file"
                                accept="audio/*"
                                style={{ display: "none" }}
                                ref={fileInputRef}
                                onChange={onFileChange}
                            />
                            <div style={{ display: 'flex', gap: '10px' }} className="spr-buttons">
                                <Button
                                    variant="solid"
                                    color="warning"
                                    startDecorator={<i className="fas fa-upload" />}
                                    onClick={() => {
                                        upload();
                                    }}
                                >
                                    Upload{song.artwork ? " New" : ""}
                                </Button>
                                <Button
                                    variant="solid"
                                    color="warning"
                                    startDecorator={<i className="fas fa-search" />}
                                    onClick={() => {
                                        setSourceSearch([]);
                                        fetch(`${server}/youtube-search/${song.name} ${song.artist}`)
                                            .then((res) => {
                                                if (!res.ok) {
                                                    setSourceSearch(null);
                                                    throw new Error("Failed to fetch source search");
                                                }
                                                return res.json();
                                            })
                                            .then((data) => {
                                                setSourceSearch(data);
                                            })
                                            .catch((error) => {
                                                console.error("Error fetching source search:", error);
                                                alert("Failed to fetch source search.");
                                                setSourceSearch(null);
                                            });
                                    }}
                                >
                                    Search
                                </Button>
                                <Button
                                    variant="solid"
                                    color="warning"
                                    startDecorator={<i className="fas fa-download" />}
                                    onClick={() => {
                                        fetch(`${server}/play/${song.uuid}`)
                                            .then(response => response.blob())
                                            .then(blob => {
                                                const url = URL.createObjectURL(blob);
                                                const e = document.createElement('a');
                                                e.href = url;
                                                e.download = `${song.name} - ${song.artist}.${song.musicExtension}`;
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
                            <div style={{ width: '100%', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>Artwork <span style={{ display: 'flex', width: '100%', height: '1px', background: '#ffffff20' }} /></div>
                        </div>
                        <div className="song-page-row" style={{ padding: '0px 40px', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: '200', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={`${song.artwork ? `${server}${song.artwork}` : '/default-artwork.png'}`} height={40} style={{ borderRadius: '4px' }} />
                                <span className="desktop-flex">{song.artwork ? `artwork.png` : "No artwork"}</span>
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
                                    Upload{song.artwork ? " New" : ""}
                                </Button>
                                <Button
                                    variant="solid"
                                    color="warning"
                                    startDecorator={<i className="fas fa-search" />}
                                    onClick={() => {
                                        setArtworkSearch([]);
                                        fetch(`${server}/external-search/${song.name} ${song.artist}`)
                                            .then((res) => {
                                                if (!res.ok) {
                                                    setArtworkSearch(null);
                                                    throw new Error("Failed to fetch artwork search results");
                                                }
                                                return res.json();
                                            })
                                            .then((data) => {
                                                setArtworkSearch(data.map((result: any) => ({
                                                    title: result.title,
                                                    album: result.album || result.name,
                                                    artist: result.artist,
                                                    artwork: result.artwork || '/default-artwork.png',
                                                    geniusId: result.genius_id
                                                })));
                                            })
                                            .catch((error) => {
                                                console.error("Error fetching artwork search results:", error);
                                                alert("Failed to fetch artwork search results.");
                                                setArtworkSearch(null);
                                            });
                                    }}
                                >
                                    Search
                                </Button>
                                <Button
                                    variant="solid"
                                    color="warning"
                                    startDecorator={<i className="fas fa-download" />}
                                    onClick={() => {
                                        fetch(`${server}/artwork/${song.uuid}`)
                                            .then(response => response.blob())
                                            .then(blob => {
                                                const url = URL.createObjectURL(blob);
                                                const e = document.createElement('a');
                                                e.href = url;
                                                e.download = `${song.name} - ${song.artist}.png`;
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
                    </div>
                </>
            ) : (
                <p>Loading song data...</p>
            )}
        </PageLayout>
    );
}