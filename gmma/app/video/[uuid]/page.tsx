"use client";
import "./video.css";
import PageLayout from "@/app/components/Layout";
import { usePlaying } from "@/app/hooks/usePlaying";
import useServer from "@/app/hooks/useServer";
import { useRouter } from "next/navigation";
import React, { ChangeEvent, ReactNode, use, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button, Slider, Tooltip } from "@mui/joy";
import { formatTime } from "@/app/util/NumberUtility";

interface VideoPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function VideoPage({ params }: VideoPageProps) {
    const [server, setServer] = useServer();
    const router = useRouter();
    const playing = usePlaying(); // not for videos at all
    const [uuid, setUuid] = useState<string>("");
    const [video, setVideo] = useState<GmmaVideo | null>(null);
    const player = useRef<HTMLVideoElement>(null);
    const [showControls, setShowControls] = useState<'hidden' | 'closing' | ''>('hidden');

    const [state, setState] = useState<{
        playing: boolean;
        currentTime: number;
        duration: number;
        volume: number;
        quality: '480' | '1080' | 'audio';
        loop: boolean;
    }>({
        playing: true,
        currentTime: 0,
        duration: 0,
        volume: 1,
        quality: '1080',
        loop: false
    });

    function qualityParam() {
        return `ver=${state.quality}`;
    }

    function setPlaying(playing: boolean | ((prev: boolean) => boolean)) {
        setState(prev => {
            const next = typeof playing === "function" ? playing(prev.playing) : playing;
            if (player.current) {
                if (next) {
                    player.current.play();
                } else {
                    player.current.pause();
                }
            }
            return { ...prev, playing: next };
        });
    }
    function setCurrentTime(currentTime: number) {
        setState(prev => ({ ...prev, currentTime }));
        if (player.current) {
            player.current.currentTime = currentTime;
        }
    }
    function setVolume(volume: number) {
        setState(prev => ({ ...prev, volume }));
        if (player.current) {
            player.current.volume = volume;
        }
    }
    function setLoop(loop: boolean) {
        setState(prev => ({ ...prev, loop }));
        if (player.current) {
            player.current.loop = loop;
        }
    }
    function setQuality(quality: '480' | '1080' | 'audio') {
        setState(prev => ({ ...prev, quality }));
        updateSource(quality);
    }

    useEffect(() => {
        params.then(p => {
            setUuid(p.uuid);
        });
    }, [params]);

    useEffect(() => {
        if (!uuid) return;
        playing.setIsPlaying(false);
        playing.clearQueue();
        playing.setSong(null);
        fetch(`${server}/video-info/${uuid}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch video");
                }
                return res.json();
            })
            .then((data) => {
                setVideo(data);
            })
            .catch((error) => {
                console.error("Error fetching video:", error);
                router.push('/library/videos');
            });
    }, [uuid]);

    function updateState(overrideQuality?: '480' | '1080' | 'audio') {
        if (!player.current) return;

        player.current.addEventListener('timeupdate', () => {
            setState(prev => ({
                ...prev,
                currentTime: player.current?.currentTime || 0
            }));
        });
        player.current.addEventListener('durationchange', () => {
            setState(prev => ({
                ...prev,
                duration: player.current?.duration || 0
            }));
            let buffered = player.current?.buffered || new TimeRanges();
            let bufferedEnd = 0;
            if (buffered.length) {
                bufferedEnd = buffered.end(buffered.length - 1);
            }
            const bufferedPercent = (bufferedEnd / (player.current?.duration || 1)) * 100;
            setBufferedPercent(bufferedPercent);
        });
        player.current.addEventListener('play', () => {
            setPlaying(true);
        });
        player.current.addEventListener('pause', () => {
            setPlaying(false);
        });
        player.current.addEventListener('ended', () => {
            if (!player.current) return;
            setCurrentTime(0);
            if (!state.loop) {
                setPlaying(false);
            }
        });

        const quality = overrideQuality || state.quality;

        setState(prev => ({
            ...prev,
            duration: player.current?.duration || 0
        }));

        if (quality === '1080') {
            setCurrentQualityIcon(<span>HD</span>);
        } else if (quality === '480') {
            setCurrentQualityIcon(<span>SD</span>);
        } else {
            setCurrentQualityIcon(<i className="fas fa-regular fa-music"></i>);
        }
    }

    const hlsRef = useRef<Hls | null>(null);

    const [currentQualityIcon, setCurrentQualityIcon] = useState<ReactNode>('DF');

    const [bufferedPercent, setBufferedPercent] = useState(0);

    function updateSource(overrideQuality?: '480' | '1080' | 'audio') {
        if (!video || !video.hasVideo || !player.current) return;

        const quality = overrideQuality || state.quality;
        const query = `ver=${quality}`;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const videoElement = player.current;
        videoElement.pause();
        videoElement.src = "";
        videoElement.load();
        videoElement.removeAttribute('src');

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: function (xhr, url) {
                    const modifiedUrl = url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
                    xhr.open('GET', modifiedUrl, true);
                }
            });
            hlsRef.current = hls;
            hls.loadSource(`${server}/video/${video.uuid}/index.m3u8?${query}`);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play();
                updateState(quality);
            });
            hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                if (data.frag.type === 'main') {
                    const buffered = videoElement.buffered;
                    let bufferedEnd = 0;
                    if (buffered.length) {
                        bufferedEnd = buffered.end(buffered.length - 1);
                    }
                    const bufferedPercent = (bufferedEnd / (videoElement.duration || 1)) * 100;
                    setBufferedPercent(bufferedPercent);
                }
            });
            return () => {
                hls.destroy();
            }
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = `${server}/video/${video.uuid}/index.m3u8?${query}`;
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play();
                updateState(quality);
            });
        }
    }

    useEffect(() => {
        if (video && video.hasVideo) {
            return updateSource();
        }
    }, [video]);

    useEffect(() => {
        document.body.addEventListener('keydown', (e) => {
            if (e.key === " ") {
                e.preventDefault();
                setPlaying(pre => !pre);
            }
        });
    }, []);


    const thumbInput = useRef<HTMLInputElement>(null);
    const sourceInput = useRef<HTMLInputElement>(null);

    function onThumbUpload(event: ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('thumbnail', file);
        fetch(`${server}/modify-video/thumbnail/${video?.uuid}`, {
            method: 'POST',
            body: formData
        }).then(res => {
            if (!res.ok) {
                throw new Error("Failed to upload thumbnail");
            }
            return res.json();
        }).then(data => {
            setVideo(prev => ({ ...prev, thumbnail: `/video-thumbnail/${uuid}?v=${Date.now()}` } as GmmaVideo));
        }).catch(error => {
            console.error("Error uploading thumbnail:", error);
        });
    }

    function onSourceUpload(event: ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('video', file);
        fetch(`${server}/modify-video/source/${video?.uuid}`, {
            method: 'POST',
            body: formData
        }).then(res => {
            if (!res.ok) {
                throw new Error("Failed to upload video source");
            }
            return res.json();
        }).then(data => {
            setVideo(prev => ({ ...prev, hasVideo: true } as GmmaVideo));
            if (player.current) {
                player.current.load();
            }
        }).catch(error => {
            console.error("Error uploading video source:", error);
        });
    }

    function pc(callback: (vid: HTMLVideoElement) => void) {
        return () => {
            if (player.current) {
                callback(player.current);
            }
        }
    }

    const [timeout, setTimeout_] = useState<NodeJS.Timeout | null>(null);

    return (
        <PageLayout hideBottom>
            <input
                type="file"
                accept="image/*"
                ref={thumbInput}
                style={{ display: 'none' }}
                onChange={onThumbUpload}
            />
            <input
                type="file"
                accept="video/*"
                ref={sourceInput}
                style={{ display: 'none' }}
                onChange={onSourceUpload}
            />
            <div className="video-page">
                <div className="video"
                    onMouseEnter={() => {
                        if (timeout) clearTimeout(timeout);
                        setShowControls('');
                    }}
                    onMouseLeave={() => {
                        setShowControls('closing');
                        setTimeout_(setTimeout(() => {
                            setShowControls('hidden');
                        }, 300));
                    }}
                >
                    {video?.hasVideo ? <>
                        <video
                            id="video-player"
                            ref={player}
                            onClick={pc(vid => {
                                setPlaying(!state.playing);
                            })}
                        ></video>
                    </> : <b>No video source</b>}
                    <div className={`video-controls h${showControls}`}>
                        <div className="upper-controls">
                            <Slider
                                value={state.currentTime}
                                min={0}
                                max={state.duration}
                                onChange={(e, value) => {
                                    if (typeof value === 'number') {
                                        setCurrentTime(value);
                                    }
                                }}
                                size={'sm'}
                                slotProps={{
                                    root: {
                                        className: 'video-slider'
                                    },
                                    thumb: {
                                        className: 'video-slider-thumb'
                                    },
                                    track: {
                                        className: 'video-slider-track'
                                    },
                                    rail: {
                                        className: 'video-slider-rail',
                                        sx: {
                                            background: `linear-gradient(to right, #ffffff70 0%, #ffffff70 ${bufferedPercent}%, #ffffff40 ${bufferedPercent}%, #ffffff40 100%)`
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="lower-controls">
                            <div>
                                <Tooltip title={state.playing ? "Pause" : "Play"} placement="top" variant="soft">
                                    <div className="circle-control" onClick={pc(vid => {
                                        setPlaying(!state.playing);
                                    })}>
                                        <i className={`fas fa-${state.playing ? `pause` : `play`}`}></i>
                                    </div>
                                </Tooltip>
                                <div className="time-control">
                                    <span>
                                        {formatTime(state.currentTime)} / {formatTime(state.duration)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <Tooltip title={state.volume == 0 ? 'Unmute' : 'Mute'} placement="top" variant="soft">
                                    <div className="circle-control" onClick={pc(vid => {
                                        setVolume(vid.volume === 0 ? 1 : 0);
                                    })}>
                                        <i className={`fas fa-${state.volume == 0 ? `volume-mute` : `volume-up`}`}></i>
                                    </div>
                                </Tooltip>
                                <Tooltip title={state.loop ? 'No loop' : 'Loop'} placement="top" variant="soft">
                                    <div className="circle-control" onClick={() => {
                                        setLoop(!state.loop);
                                    }}>
                                        {state.loop ? <i className="fas fa-stack">
                                            <i className="fas fa-repeat fa-stack-1x"></i>
                                            <i className="fas fa-slash fa-stack-1x" style={{ position: 'absolute' }}></i>
                                        </i> : <i className="fas fa-repeat"></i>}
                                    </div>
                                </Tooltip>
                                <Tooltip title="Next Quality" placement="top" variant="soft">
                                    <div className="circle-control" onClick={() => {
                                        var has480 = video?.has480p || false;
                                        if (state.quality === '1080') {
                                            setQuality(has480 ? '480' : 'audio');
                                        } else if (state.quality === '480') {
                                            setQuality('audio');
                                        } else {
                                            setQuality('1080');
                                        }
                                    }}>
                                        {currentQualityIcon || <i className="fas fa-question"></i>}
                                    </div>
                                </Tooltip>

                            </div>
                        </div>
                    </div>
                </div>
                <div className="video-info">
                    <span className="video-title">
                        {video?.name || "Unknown Video"}
                    </span>
                    <span className="video-uploader">
                        <span className="circle-pfp">
                            <i className="fas fa-user"></i>
                        </span>
                        <span>
                            {video?.uploader || "Unknown Uploader"}
                        </span>
                    </span>
                </div>
                <div className="video-section">
                    <div className="video-section-title">
                        <span>Sources</span>
                        <span className="filler"></span>
                        <Button color="warning" startDecorator={<i className="fas fa-upload" />} onClick={() => {
                            sourceInput.current?.click();
                        }}>Upload</Button>
                        <Button color="danger" startDecorator={<i className="fas fa-trash" />} onClick={() => {
                            if (!video) return;
                            fetch(`${server}/video-info/${video.uuid}`, {
                                method: 'DELETE'
                            }).then(res => {
                                if (!res.ok) {
                                    throw new Error("Failed to delete video source");
                                }
                                router.push('/library/videos');
                            }).catch(error => {
                                console.error("Error deleting video source:", error);
                            });
                        }}>Delete</Button>
                    </div>
                    {video?.hasVideo ? <>
                    <div className="video-section-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="desktop-flex circle-pfp">
                                <i className="fas fa-video"></i>
                            </span>
                            <span>HD Video</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        </div>
                    </div>
                    <div className="video-section-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="desktop-flex circle-pfp">
                                <i className="fas fa-music"></i>
                            </span>
                            <span>Audio Only</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        </div>
                    </div>
                    {video.has480p && <div className="video-section-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="desktop-flex circle-pfp">
                                <i className="fas fa-video"></i>
                            </span>
                            <span>SD Video</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        </div>
                    </div>}</> : <div className="video-section-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="desktop-flex circle-pfp">
                                <i className="fas fa-xmark"></i>
                            </span>
                            <span>No source</span>
                        </div>
                    </div>}
                </div>
                <div className="video-section">
                    <div className="video-section-title">
                        <span>Thumbnail</span>
                        <span className="filler"></span>
                    </div>
                    <div className="video-section-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={video?.thumbnail ? server + video.thumbnail : '/default-thumbnail.png'} style={{ height: '50px', borderRadius: '6px' }} />
                            <span className="desktop-flex">{video?.hasVideo ? 'thumb.png' : 'None'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Button color="warning" startDecorator={<i className="fas fa-upload" />} onClick={() => {
                                thumbInput.current?.click();
                            }}>Upload</Button>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    )
}