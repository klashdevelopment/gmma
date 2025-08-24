import fs from 'fs';
import path from 'path';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export default function playlistRoutes(app, loadSong, __dirname) {
    // playlist basics:
    /*
    Types:
    interface Playlist {
    uuid: string;
    name: string;
    description?: string;
    artwork?: string;
    songs: GmmaSong[];
    }
    interface GmmaSong {
    uuid: string;
    name: string;
    artist: string;
    artwork?: string;
    album: string;
    hasMusic?: boolean;
    musicExtension?: string;
    duration?: number;
    }
    */
    /*
    loadSong(uuid: string): Promise<GmmaSong | null>
    */
    /* save playlists to /playlists/<uuid>/playlist.json. The file should only save songs as a string[] (of UUIDs)! */
    /* routes needed:
        - GET /playlists - get all playlists
        - GET /playlist/:uuid - get a specific playlist
        - POST /playlist - create a new playlist with only name required.
        - PUT /modify-playlist/metadata - modify playlist metadata (name, description)
        - POST /modify-playlist/add-songs - add songs (array of UUIDs) to a playlist
        - POST /modify-playlist/remove-songs - remove a list of songs (via index) from a playlist
        - DELETE /playlist/:uuid - delete a playlist
        - POST /modify-playlist/artwork - change the artwork of a playlist via multer upload. always save under filename "artwork.png" reguardless of file type.
        - GET /playlist/:uuid/artwork - get the artwork of a playlist
        - GET /playlist/:uuid/songs - get all songs in a playlist, return an array of GmmaSong objects
    */
    const basePath = path.join(__dirname, 'playlists');
    const upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                const playlistUuid = req.params.uuid;
                const playlistPath = path.join(basePath, playlistUuid);
                if (!fs.existsSync(playlistPath)) {
                    fs.mkdirSync(playlistPath, { recursive: true });
                }
                cb(null, playlistPath);
            },
            filename: (req, file, cb) => {
                cb(null, 'artwork.png');
            }
        })
    });
    function loadPlaylist(uuid) {
        const playlistPath = path.join(basePath, uuid, 'playlist.json');
        if (fs.existsSync(playlistPath)) {
            const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
            const artworkPath = path.join(basePath, uuid, 'artwork.png');
            if (fs.existsSync(artworkPath)) {
                playlistData.artwork = `/playlist/${uuid}/artwork`;
            } else {
                playlistData.artwork = null;
            }
            return {
                uuid,
                ...playlistData,
            };
        }
        return null;
    }
    function getManySongs(uuids) {
        return Promise.all(uuids.map(uuid => loadSong(uuid)));
    }
    app.get('/playlists', async (req, res) => {
        try {
            const playlists = fs.readdirSync(basePath)
                .filter(file => fs.statSync(path.join(basePath, file)).isDirectory())
                .map(file => loadPlaylist(file))
                .filter(playlist => playlist !== null);
            res.json(playlists);
        } catch (error) {
            console.error('Error loading playlists:', error);
            res.status(500).json({ error: 'Failed to load playlists' });
        }
    });
    app.get('/playlist/:uuid', (req, res) => {
        const playlist = loadPlaylist(req.params.uuid);
        if (playlist) {
            res.json(playlist);
        } else {
            res.status(404).json({ error: 'Playlist not found' });
        }
    });
    app.post('/playlist', (req, res) => {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const uuid = uuidv4();
        const playlistPath = path.join(basePath, uuid);
        fs.mkdirSync(playlistPath, { recursive: true });
        const playlistData = {
            name,
            description,
            songs: [],
        };
        fs.writeFileSync(path.join(playlistPath, 'playlist.json'), JSON.stringify(playlistData, null, 2));
        res.status(201).json({ uuid });
    });
    app.put('/modify-playlist/metadata', (req, res) => {
        const { uuid, name, description } = req.body;
        const playlistPath = path.join(basePath, uuid, 'playlist.json');
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
        if (name) playlistData.name = name;
        if (description) playlistData.description = description;
        fs.writeFileSync(playlistPath, JSON.stringify(playlistData, null, 2));
        res.json({ success: true });
    });
    app.post('/modify-playlist/add-songs', async (req, res) => {
        const { uuid, songs } = req.body;
        if (!Array.isArray(songs) || songs.length === 0) {
            return res.status(400).json({ error: 'Songs must be a non-empty array' });
        }
        const playlistPath = path.join(basePath, uuid, 'playlist.json');
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
        playlistData.songs = Array.from(new Set([...playlistData.songs, ...songs]));
        fs.writeFileSync(playlistPath, JSON.stringify(playlistData, null, 2));
        res.json({ success: true });
    });
    app.post('/modify-playlist/remove-songs', (req, res) => {
        const { uuid, indices } = req.body;
        if (!Array.isArray(indices) || indices.length === 0) {
            return res.status(400).json({ error: 'Indices must be a non-empty array' });
        }
        const playlistPath = path.join(basePath, uuid, 'playlist.json');
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
        indices.sort((a, b) => b - a); // Sort in descending order
        for (const index of indices) {
            if (index >= 0 && index < playlistData.songs.length) {
                playlistData.songs.splice(index, 1);
            }
        }
        fs.writeFileSync(playlistPath, JSON.stringify(playlistData, null, 2));
        res.json({ success: true });
    });
    app.post('/modify-playlist/remove-song-uuid', (req, res) => {
        const { uuid, songUuid } = req.body;
        const playlistPath = path.join(basePath, uuid, 'playlist.json');
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
        const songIndex = playlistData.songs.findIndex(song => song === songUuid);
        if (songIndex === -1) {
            return res.status(404).json({ error: 'Song not found in playlist' });
        }
        playlistData.songs.splice(songIndex, 1);
        fs.writeFileSync(playlistPath, JSON.stringify(playlistData, null, 2));
        res.json({ success: true });
    });
    app.delete('/playlist/:uuid', (req, res) => {
        const playlistPath = path.join(basePath, req.params.uuid);
        if (fs.existsSync(playlistPath)) {
            fs.rmSync(playlistPath, { recursive: true, force: true });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Playlist not found' });
        }
    });
    app.post('/modify-playlist/artwork/:uuid', upload.single('artwork'), (req, res) => {
        const playlistUuid = req.params.uuid;
        const playlistPath = path.join(basePath, playlistUuid);
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const artworkPath = path.join(playlistPath, 'artwork.png');
        fs.renameSync(req.file.path, artworkPath);
        res.json({ success: true });
    });
    app.get('/playlist/:uuid/artwork', (req, res) => {
        const artworkPath = path.join(basePath, req.params.uuid, 'artwork.png');
        if (fs.existsSync(artworkPath)) {
            res.sendFile(artworkPath);
        } else {
            res.status(404).json({ error: 'Artwork not found' });
        }
    });
    app.get('/playlist/:uuid/songs', async (req, res) => {
        const playlist = loadPlaylist(req.params.uuid);
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        const songs = await getManySongs(playlist.songs);
        res.json(songs);
    });
}