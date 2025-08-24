"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const useServer = (): [string, (server: string) => void] => {
    const [server, setServerState] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('server') || '';
        }
        return '';
    });

    const setServer = (serverIn: string) => {
        // trim and remove trailing slashes
        const newServer = serverIn.trim().replace(/\/+$/, '');
        if (!newServer) {
            console.error("Server URL cannot be empty");
            return;
        }
        setServerState(newServer);
        if (typeof window !== 'undefined') {
            localStorage.setItem('server', newServer);
        }
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'server' && e.newValue !== null) {
                setServerState(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return [server, setServer];
};

export default useServer;

export function checkServer(router: any, server: string) {
    if (!server) {
        router.push('/setup');
    }
}