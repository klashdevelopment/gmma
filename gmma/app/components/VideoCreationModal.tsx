"use client";

import { Button, Input, LinearProgress, Modal, ModalClose, ModalDialog, Switch, switchClasses, Typography } from "@mui/joy";
import { useEffect, useState } from "react";
import useServer from "../hooks/useServer";

export default function VideoCreationModal({
    open, setOpen, onCreate
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreate: (uuid: string, name: string, description: string | undefined, uploader: string) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [uploader, setUploader] = useState("");
    const [server, setServer] = useServer();

    const [ytURL, setYtURL] = useState("");
    const [ytData, setYtData] = useState<{ title: string, artist: string, thumbnail: string, duration: number, url: string } | null>(null);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (ytURL) {
            if (timeoutId) clearTimeout(timeoutId);
            const id = setTimeout(() => {
                fetch(`${server}/youtube-info/${encodeURIComponent(ytURL)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {

                            setYtData(null);
                        } else {
                            setYtData(data);
                        }
                    })
                    .catch(() => setYtData(null));
            }, 500);
            setTimeoutId(id);
        } else {
            setYtData(null);
        }
    }, [ytURL]);

    const [loading, setLoading] = useState(false);

    function saveVideo() {
        if (!ytData || !ytURL.trim()) {
            alert("Invalid YouTube URL");
            return;
        }
        if (loading) return;
        setLoading(true);
        fetch(`${server}/video-from-yt?url=${encodeURIComponent(ytURL)}&forceHDonly=${!externalSave480p}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to create video");
                }
                return res.json();
            })
            .then(data => {
                onCreate(data.uuid, ytData.title, ytData.url, ytData.artist);
                setYtURL("");
                setOpen(false);
                setLoading(false);
            })
            .catch(err => {
                setYtURL("");
                setOpen(false);
                setLoading(false);
                console.error(err);
                alert("Failed to create video");
            });
    }
    const [manualSave480p, setManualSave480p] = useState(false);
    const [externalSave480p, setExternalSave480p] = useState(false);

    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog sx={{ maxWidth: '600px' }}>
                {!loading && <ModalClose />}
                <Typography component={'h1'}>{loading ? "Saving video..." : "Create New Video"}</Typography>
                {loading ? <>
                    <LinearProgress />
                </> : <div style={{ display: 'flex', flexDirection: 'row' }} className="mobile-col">
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px', paddingRight: '20px' }} className="scm-manual">
                        <Typography>Manual</Typography>
                        <Input
                            placeholder="Title"
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                        <Input
                            placeholder="Uploader"
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                        <Input
                            placeholder="Description"
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <Button onClick={() => {
                            if (!name.trim() || !uploader.trim()) {
                                alert("Video name cannot be empty");
                                return;
                            }
                            fetch(`${server}/videos`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ name, description, uploader })
                            })
                                .then(res => {
                                    if (!res.ok) {
                                        throw new Error("Failed to create video");
                                    }
                                    return res.json();
                                })
                                .then(data => {
                                    onCreate(data.uuid, name, description || undefined, uploader);
                                })
                                .catch(err => {
                                    console.error(err);
                                    alert("Failed to create video");
                                });
                            setName("");
                            setDescription("");
                            setUploader("");
                            setOpen(false);
                        }}>Create Video</Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: '1px solid #cccccc40', paddingLeft: '20px' }} className="scm-external">
                        <Typography>External</Typography>
                        <Input
                            placeholder="YouTube URL"
                            value={ytURL}
                            onChange={(e) => setYtURL(e.target.value)}
                            required
                        />
                        <div style={{
                            height: '50px', display: 'flex', alignItems: 'center',
                            maxWidth: '236px'
                        }}>
                            <img src={ytData ? ytData.thumbnail : '/default-thumbnail.png'} style={{ height: '50px', objectFit: 'cover', borderRadius: '5px', maxWidth: '65px' }} />
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                fontSize: '14px',
                                marginLeft: '10px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ytURL ? (
                                    ytData ? ytData.title : "Loading..."
                                ) : "Invalid URL"}</b>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} >
                                    {ytData ? ytData.artist : "No artist information"}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Switch
                                checked={externalSave480p}
                                onChange={(e) => setExternalSave480p(e.target.checked)}
                                size={'lg'}
                                color="neutral"
                                sx={(theme) => ({
                                    [`& .${switchClasses.thumb}`]: {
                                        transition: 'width 0.2s, left 0.2s',
                                    },
                                    '&:active': {
                                        '--Switch-thumbWidth': '25px',
                                    },
                                    [`&.${switchClasses.checked}`]: {
                                        '--Switch-trackBackground': theme.vars.palette.primary.solidBg,
                                        '&:hover': {
                                            '--Switch-trackBackground': theme.vars.palette.primary.solidHoverBg,
                                        },
                                    },
                                })}
                            ></Switch>
                            Also save in 480p
                        </div>
                        <Button onClick={saveVideo}>Save Video</Button>
                    </div>
                </div>}
            </ModalDialog>
        </Modal>
    )
}