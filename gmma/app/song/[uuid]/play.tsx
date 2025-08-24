import CircleButton from "@/app/components/CircleButton";
import { usePlaying } from "@/app/hooks/usePlaying";
import { Button, VariantProp } from "@mui/joy";

export default function PlaySongBtn({ song, size=60, variant='solid' }: any) {
    const playing = usePlaying();
    return <CircleButton
        size={size}
        appearance={variant as VariantProp}
        icon={"fas fa-"+((playing.isPlaying && playing.song?.uuid === song.uuid) ? "pause" : "play")}
        onClick={() => {
            if(playing.song?.uuid === song.uuid) {
                playing.setIsPlaying(!playing.isPlaying);
            } else {
                playing.changeQueueToSingle(song);
                playing.setIsPlaying(true);
            }
        }}
    >
    </CircleButton>;
}