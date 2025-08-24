"use client";
import { Button, Input } from "@mui/joy";
import { useState } from "react";
import useServer from "../hooks/useServer";
import { useRouter } from "next/navigation";

export default function Setup() {
    const [serverInp, setServerInp] = useState<string>('');
    const [server, setServer] = useServer();
    const router = useRouter();
    return (
        <div className="app" style={{ background:'#0a0a0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="setup-container" style={{ textAlign: 'center' }}>
                <h1>Welcome to GMMA</h1>
                <p>It seems like it's your first time (on this device). Enter your GMMA server.</p>
                <Input placeholder="Enter server URL" onChange={(e) => {
                    setServerInp(e.target.value);
                }} />
                <Button
                    variant="solid"
                    color="primary"
                    style={{ marginTop: '20px' }}
                    onClick={() => {
                        if (!serverInp) {
                            alert("Please enter a server URL.");
                            return;
                        }
                        setServer(serverInp);
                        router.push('/');
                    }}
                >
                    Set Server
                </Button>
            </div>
        </div>
    );
}