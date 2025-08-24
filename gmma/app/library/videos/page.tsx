"use client";

import { useRouter } from "next/navigation";
import useServer from "../../hooks/useServer";
import { useEffect, useState } from "react";
import PageLayout from "@/app/components/Layout";
import { Button, Modal, ModalClose, ModalDialog, Tooltip, Typography } from "@mui/joy";
import { usePlaying } from "@/app/hooks/usePlaying";
import { formatTime } from "@/app/util/NumberUtility";
import VideoCreationModal from "@/app/components/VideoCreationModal";

export default function SongsPage() {
    const [server, setServer] = useServer();
    const router = useRouter();
    const playing = usePlaying();

    const [videos, setVideos] = useState<GmmaVideo[]>([]);
    const [videoCreatorOpen, setVideoCreatorOpen] = useState(false);

    useEffect(() => {
        fetch(`${server}/videos`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch music list");
                }
                return res.json();
            })
            .then((data) => {
                setVideos(data);
            });
    }, [server]);

    return (
        <PageLayout>
            <VideoCreationModal
                open={videoCreatorOpen}
                setOpen={setVideoCreatorOpen}
                onCreate={(uuid, name, description, uploader) => {
                    setVideos(prev => [...prev, { uuid, name, description, uploader }]);
                    router.push(`/video/${uuid}`);
                }}
            />
            <div className="song-page" style={{
                background: `linear-gradient(to bottom, #0e9048 0px, #13b065 250px, #0a0a0b 500px)`
            }}>
                <div className="song-data">
                    <div className="song-artwork" style={{ background: 'linear-gradient(45deg, #0e9048, #13b065)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-folder-open"></i>
                    </div>
                    <div className="song-info" style={{ justifyContent: 'flex-end' }}>
                        <span className="song-type">Library</span>
                        <b className="song-name">Your Videos</b>
                        <span className="song-artist"></span>
                    </div>
                </div>
                <div className="song-page-row">
                    <Button size="lg" startDecorator={<i className="fas fa-plus" />} onClick={() => {
                        setVideoCreatorOpen(true);
                    }}>New Video</Button>
                </div>
                <div className="song-page-row fd-c">
                    {videos.map((video, i) => (
                        <div key={video.uuid} className="song-fullwidth" onClick={() => {
                            router.push(`/video/${video.uuid}`);
                        }}>
                            <div className="song-number">
                                {i + 1}
                            </div>
                            <div className="song-play">
                                <Tooltip title={`Open Video`} placement="top" variant="soft">
                                    <i className={`fas fa-caret-right`} style={{ fontSize: '26px' }}></i>
                                </Tooltip>
                            </div>
                            <div className="song-fw-data">
                                <img
                                    src={`${video.thumbnail ? server+video.thumbnail : '/default-thumbnail.png'}`}
                                    alt={video.name}
                                    style={{ width: 'auto', cursor: 'pointer' }}
                                    className="song-fw-artwork"
                                />
                                <div className="song-fw-info">
                                    <b onClick={() => {
                                        router.push(`/video/${video.uuid}`);
                                    }}>{video.name}</b>
                                    <span>{video.uploader}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageLayout>
    );
}