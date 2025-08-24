import { Autocomplete, AutocompleteOption, Button, Input, ListItemContent, ListItemDecorator, Modal, ModalClose, ModalDialog, Typography } from "@mui/joy";
import { useState } from "react";
import useServer from "../hooks/useServer";

export interface ExtSearchResult {
    title: string;
    album: string;
    artist: string;
    artwork: string;
    geniusId: number;
};

export function resultFormat(result: any): ExtSearchResult {
    return {
        title: result.title,
        album: result.album || result.name,
        artist: result.artist,
        artwork: result.artwork || '/default-artwork.png',
        geniusId: result.genius_id
    };
}

export default function SongCreationModal({
    open, setOpen, onCreate = () => { }
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreate?: (song: GmmaSong) => void;
}) {
    const [name, setName] = useState("");
    const [album, setAlbum] = useState("");
    const [server, setServer] = useServer();
    const [artist, setArtist] = useState("");
    const [autocompOptions, setAutocompOptions] = useState<ExtSearchResult[]>([]);
    const [optionSelected, setOptionSelected] = useState<ExtSearchResult | null>();
    const [loading, setLoading] = useState(false);

    const [debouncedSearch, setDebouncedSearch] = useState<NodeJS.Timeout | null>(null);

    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog>
                <ModalClose />
                <Typography component={'h1'}>New Song Entry</Typography>
                <div style={{
                    display: 'flex'
                }} className="scm-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '40px' }} className="scm-manual">
                        <Typography>Manual</Typography>
                        <Input
                            placeholder="Song Name"
                            value={name}
                            required
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Input
                            placeholder="Album (optional)"
                            value={album}
                            onChange={(e) => setAlbum(e.target.value)}
                        />
                        <Input
                            placeholder="Artist"
                            value={artist}
                            required
                            onChange={(e) => setArtist(e.target.value)}
                        />
                        <Button
                            variant="solid"
                            color="primary"
                            onClick={async () => {
                                if (!name || !artist) {
                                    alert("Please fill in required fields.");
                                    return;
                                }
                                console.log("Creating song:", { name, album: album || name, artist });
                                const res = await fetch(`${server}/create`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name, album: album || name, artist })
                                });
                                if (!res.ok) {
                                    alert("Failed to create song.");
                                    return;
                                }
                                const data = await res.json();

                                onCreate({
                                    uuid: data.uuid,
                                    name: name,
                                    artist: artist,
                                    artwork: data.artwork,
                                    album: album || name
                                });

                                setOpen(false);
                            }}
                        >
                            Create Song Entry
                        </Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '1px solid #cccccc40', paddingLeft: '40px' }} className="scm-external">
                        <Typography>Automatic</Typography>
                        <Autocomplete
                            filterOptions={(x) => x} onInputChange={(_, v, r) => {
                                if (r === 'reset') {
                                    setLoading(false);
                                    setAutocompOptions([]);
                                    if (debouncedSearch) {
                                        clearTimeout(debouncedSearch);
                                    }
                                    return;
                                }
                                if (v.length < 3) {
                                    setAutocompOptions([]);
                                    if (debouncedSearch) {
                                        clearTimeout(debouncedSearch);
                                    }
                                    return;
                                }
                                setLoading(true);
                                if (debouncedSearch) {
                                    clearTimeout(debouncedSearch);
                                }
                                setDebouncedSearch(setTimeout(async () => {
                                    setLoading(false);
                                    setDebouncedSearch(null);
                                    const res = await fetch(`${server}/external-search/${encodeURIComponent(v)}`);
                                    if (!res.ok) {
                                        alert("Failed to fetch song suggestions.");
                                        return;
                                    }
                                    const data = await res.json();
                                    setAutocompOptions(data.map(resultFormat));
                                }, 500));
                            }}
                            placeholder="Search for a song..." slotProps={{ input: { autoComplete: 'new-password' } }} options={autocompOptions}
                            getOptionLabel={(option) => option.title} getOptionKey={(option) => `scm_opt${option.geniusId}`}
                            noOptionsText={loading ? "Loading..." : "No results found"}
                            renderOption={(props, option) => (
                                <AutocompleteOption {...props}>
                                    <ListItemDecorator sx={{ minWidth: '40px', marginRight: '0px' }}>
                                        <img
                                            loading="lazy"
                                            width="40"
                                            src={`${option.artwork ? option.artwork : '/default-artwork.png'}`}
                                            alt=""
                                            style={{ borderRadius: '4px', objectFit: 'cover' }}
                                        />
                                    </ListItemDecorator>
                                    <ListItemContent sx={{ fontSize: 'sm' }}>
                                        {option.title}
                                        <Typography level="body-xs">
                                            {option.artist}{option.album ? ` - ${option.album}` : ''}
                                        </Typography>
                                    </ListItemContent>
                                </AutocompleteOption>
                            )} sx={{ width: '250px' }} onChange={(e, v, r, d) => {
                                setOptionSelected(v as ExtSearchResult);
                                if (r === 'clear') {
                                    setOptionSelected(null);
                                    return;
                                }
                            }}></Autocomplete>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minHeight: '82px'
                        }}>
                            <img src={`${optionSelected?.artwork ? optionSelected.artwork : '/default-artwork.png'}`} alt="Artwork" style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <Typography level="body-md" sx={{ fontWeight: 'bold' }}>{optionSelected?.title || "No song selected"}</Typography>
                                <Typography level="body-sm">{optionSelected?.artist}{optionSelected?.album ? ` - ${optionSelected.album}` : ''}</Typography>
                            </div>
                        </div>
                        <Button
                            variant="solid"
                            color="primary"
                            disabled={!optionSelected}
                            onClick={async () => {
                                if (!optionSelected) {
                                    alert("Please select a song.");
                                    return;
                                }
                                console.log("Creating song from external source:", optionSelected);
                                const res = await fetch(`${server}/create`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        name: optionSelected.title,
                                        album: optionSelected.album || optionSelected.title,
                                        artist: optionSelected.artist,
                                        artwork: optionSelected.artwork || undefined
                                    })
                                });
                                if (!res.ok) {
                                    alert("Failed to create song.");
                                    return;
                                }
                                const data = await res.json();

                                onCreate({
                                    uuid: data.uuid,
                                    name: optionSelected.title,
                                    artist: optionSelected.artist,
                                    artwork: `/artwork/${data.uuid}`,
                                    album: optionSelected.album || optionSelected.title
                                });

                                setOpen(false);
                            }}
                        >
                            Create Song Entry
                        </Button>
                    </div>
                </div>
            </ModalDialog>
        </Modal>
    );
}