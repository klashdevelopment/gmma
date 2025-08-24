import { Slider, Box, Sheet, IconButton, Tooltip } from "@mui/joy";
import { usePlaying } from "../hooks/usePlaying";
import { useEffect, useState } from "react";
import CircleButton from "./CircleButton";
import useServer from "../hooks/useServer";
import CustomTooltip from "./CustomTooltip";
import { useRouter } from "next/navigation";

export default function NowPlaying() {
    const playing = usePlaying();
    const [server, setServer] = useServer();
    const router = useRouter();

    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showDisplays, setShowDisplays] = useState(false);

    const [pathname, setPathname] = useState<string>("");
    const displays = ['/lyrics', '/fullscreen', '/tunnel'];
    useEffect(() => {
        setPathname(location.pathname);
    }, []);

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '100%',
                width: '100%',
                padding: '0 0px',
            }}>
                <div className="desktop-w100">
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0' }}>
                        <img style={{ height: '50px', borderRadius: '4px', marginLeft: '4px', marginTop: '0px' }} src={`${playing.song?.artwork ? server + playing.song.artwork : '/default-artwork.png'}`} />
                        <div className="desktop-flex" style={{ flexDirection: 'column', marginLeft: '5px', fontSize: '12px' }}>
                            <b>{playing.song ? playing.song.name : "No song playing"}</b>
                            <span>{playing.song && playing.song.artist}</span>
                        </div>
                    </div>
                </div>
                <div className="mobile-w90" style={{ width: '50%', gap: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <CircleButton appearance="soft" icon={`fas fa-shuffle`} size={25}></CircleButton>
                        <CircleButton icon={`fas fa-backward-step`} size={25} onClick={() => {
                            if (playing.queueIndex > 0) {
                                playing.previousSong();
                            } else {
                                playing.setTimeTo(0);
                            }
                        }}></CircleButton>
                        <CircleButton icon={`fa-solid fa-${playing.isPlaying ? 'pause' : 'play'}`} onClick={() => {
                            playing.setIsPlaying(!playing.isPlaying);
                        }}></CircleButton>
                        <CircleButton icon={`fas fa-forward-step`} size={25} onClick={() => {
                            if (playing.hasNextSong()) {
                                playing.nextSong();
                            } else {
                                playing.setTimeTo(0);
                            }
                        }}></CircleButton>
                        <CircleButton appearance="soft" icon={`${playing.isLooping ? 'fas fa-repeat|fas fa-slash small-transp' : 'fas fa-repeat'}`} onClick={() => {
                            playing.setIsLooping(!playing.isLooping);
                        }} size={25}></CircleButton>
                    </div>
                    <Slider
                        value={playing.currentTime}
                        onChange={(e, value) => {
                            if (typeof value === "number") {
                                playing.setTimeTo(value);
                            }
                        }}
                        min={0}
                        max={playing.song?.duration || 100}
                        step={0.1}
                        size="sm"
                        sx={{ width: '80%', mx: '5px', padding: '2px 0' }}>
                    </Slider>
                </div>
                <div className="desktop-flex" style={{ width: '100%', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', paddingRight: '10px' }}>
                    <CustomTooltip open={showSpeedSlider} tooltip={
                        <>
                            <Slider
                                value={playing.speed}
                                onChange={(e, value) => {
                                    if (typeof value === "number") {
                                        playing.setSpeed(value);
                                    }
                                }}
                                min={0.25}
                                max={2}
                                step={0.25}
                                size="sm"
                                orientation="vertical"
                                sx={{ height: '100px', px: '0' }}
                            />
                            {playing.speed}x
                        </>
                    }>
                        <CircleButton onClick={() => {
                            setShowSpeedSlider(!showSpeedSlider);
                        }} icon="fas fa-tachometer-alt" color="warning" />
                    </CustomTooltip>
                    <CustomTooltip open={showVolumeSlider} tooltip={
                        <>
                            <Slider
                                value={playing.volume}
                                onChange={(e, value) => {
                                    if (typeof value === "number") {
                                        playing.setVolume(value);
                                    }
                                }}
                                min={0}
                                max={1}
                                step={0.01}
                                size="sm"
                                orientation="vertical"
                                sx={{ height: '100px', px: '0' }}
                            />
                            {Math.floor(playing.volume * 100)}
                        </>
                    }>
                        <CircleButton onClick={() => {
                            setShowVolumeSlider(!showVolumeSlider);
                        }} icon="fas fa-volume" color="warning" />
                    </CustomTooltip>
                    <CustomTooltip open={showDisplays} tooltip={
                        !displays.includes(pathname) ? <>
                            <CircleButton size={25} onClick={() => {
                                router.push('/lyrics');
                            }} icon="fas fa-microphone-stand" color="warning" tooltip="Lyrics" tooltipPlacement="left" tooltipAppearance="soft" />
                            <CircleButton size={25} onClick={() => {
                                router.push('/fullscreen');
                            }} icon={`fas fa-maximize`} color="warning" tooltip="Full Display" tooltipPlacement="left" tooltipAppearance="soft" />
                            <CircleButton size={25} onClick={() => {
                                router.push('/tunnel');
                            }} icon={`fas fa-camera-viewfinder`} color="warning" tooltip="Tunnel Display" tooltipPlacement="left" tooltipAppearance="soft" />
                        </> : "Go Home"
                    }>
                        {!displays.includes(pathname) ? (
                            <CircleButton
                                icon={`fas fa-presentation-screen`}
                                color="warning"
                                onClick={() => {
                                    setShowDisplays(!showDisplays);
                                }}
                            />
                        ) : (
                            <CircleButton
                                icon={`fas fa-minimize`}
                                color="warning"
                                onClick={() => {
                                    router.push('/');
                                }}
                            />
                        )}
                    </CustomTooltip>
                </div>
            </div>
        </>
    );
}