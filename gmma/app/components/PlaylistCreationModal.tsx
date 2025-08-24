"use client";
import { Button, Input, Modal, ModalClose, ModalDialog, Typography } from "@mui/joy";
import { useState } from "react";
import useServer from "../hooks/useServer";

export default function PlaylistCreationModal({
    open, setOpen, onCreate
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreate: (uuid: string, name: string, description: string) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [server, setServer] = useServer();

    const handleCreate = () => {
        if (!name.trim()) {
            alert("Playlist name cannot be empty");
            return;
        }
        fetch(`${server}/playlist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, description })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to create playlist");
                }
                return res.json();
            })
            .then(data => {
                onCreate(data.uuid, name, description);
            })
            .catch(err => {
                console.error(err);
                alert("Failed to create playlist");
            });
        setName("");
        setDescription("");
        setOpen(false);
    };

    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog>
                <ModalClose />
                <Typography component="h1">New Playlist</Typography>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Input
                        placeholder="Playlist Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        required
                    />
                    <Button onClick={handleCreate} disabled={!name.trim()}>
                        Create
                    </Button>
                </div>
            </ModalDialog>
        </Modal>
    );
}