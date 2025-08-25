import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import cors from 'cors';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import MusixMatchAPI from './mm-api.js';

import { fileURLToPath } from 'url';
import playlistRoutes from './playlists.js';
import videoRoutes from './videos.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

// ensure dirs 'music' and 'playlists' exist
if (!fs.existsSync('music')) {
    fs.mkdirSync('music', { recursive: true });
    console.log('[Boot] created music');
}
if (!fs.existsSync('playlists')) {
    fs.mkdirSync('playlists', { recursive: true });
    console.log('[Boot] created playlists');
}

const app = express();
const PORT = process.env.PORT || 8080;
app.use(bodyParser.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const upload = multer();

app.post('/create', async (req, res) => {
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const uuid = uuidv4();
    const musicDir = path.join('music', uuid);

    fs.mkdirSync(musicDir, { recursive: true });

    if (req.body.artwork) {
        try {
            const artworkResponse = await fetch(req.body.artwork);
            if (artworkResponse.ok) {
                const imageBuffer = await artworkResponse.arrayBuffer();
                fs.writeFileSync(path.join(musicDir, 'artwork.png'), Buffer.from(imageBuffer));
            }
        } catch (error) {
            console.error('Failed to fetch artwork:', error);
        }
    }

    const songData = {
        name: req.body.name || '',
        album: req.body.album || '',
        artist: req.body.artist || ''
    };

    fs.writeFileSync(path.join(musicDir, 'song.json'), JSON.stringify(songData, null, 2));

    res.json({ uuid });
});

app.post('/modify/metadata', (req, res) => {
    const { uuid, metadata } = req.body;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const songPath = path.join('music', uuid, 'song.json');

    if (!fs.existsSync(songPath)) {
        return res.status(404).json({ error: 'Song not found' });
    }

    const currentData = JSON.parse(fs.readFileSync(songPath, 'utf8'));
    const updatedData = { ...currentData, ...metadata };

    fs.writeFileSync(songPath, JSON.stringify(updatedData, null, 2));
    res.json({ success: true });
});

app.post('/modify/artwork', upload.single('artwork'), (req, res) => {
    const { uuid } = req.body;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const artworkPath = path.join('music', uuid, 'artwork.png');

    if (!fs.existsSync(path.join('music', uuid))) {
        return res.status(404).json({ error: 'Song not found' });
    }

    fs.writeFileSync(artworkPath, req.file.buffer);
    res.json({ success: true });
});

app.post('/modify/artwork-url', async (req, res) => {
    const { uuid, artworkUrl } = req.body;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const musicDir = path.join('music', uuid);
    if (!fs.existsSync(musicDir)) {
        return res.status(404).json({ error: 'Song not found' });
    }
    try {
        const response = await fetch(artworkUrl);
        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to fetch artwork' });
        }
        const imageBuffer = await response.arrayBuffer();
        fs.writeFileSync(path.join(musicDir, 'artwork.png'), Buffer.from(imageBuffer));
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to fetch artwork:', error);
        res.status(500).json({ error: 'Failed to fetch artwork' });
    }
});

app.post('/modify/music', upload.single('music'), (req, res) => {
    const { uuid, format } = req.body;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const musicPath = path.join('music', uuid, `source.${format}`);
    const songPath = path.join('music', uuid, 'song.json');

    if (!fs.existsSync(path.join('music', uuid))) {
        return res.status(404).json({ error: 'Song not found' });
    }
    fs.writeFileSync(musicPath, req.file.buffer);

    const songData = JSON.parse(fs.readFileSync(songPath, 'utf8'));
    getAudioDurationInSeconds(musicPath)
        .then(duration => {
            songData.duration = duration;
            fs.writeFileSync(songPath, JSON.stringify(songData, null, 2));
        })
        .catch(err => {
            console.error('Error getting audio duration:', err);
        });

    res.json({ success: true });
});

app.delete('/delete/:uuid', (req, res) => {
    const { uuid } = req.params;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const musicDir = path.join('music', uuid);
    if (fs.existsSync(musicDir)) {
        fs.rmSync(musicDir, { recursive: true, force: true });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Song not found' });
    }
});

const possibleFormats = [
    'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma',
    'webm', 'opus', 'aiff', 'au', 'ra', '3gp', 'amr',
    'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv',
    'mpg', 'mpeg', 'm4v'
];

async function loadSong(uuid, { includeHasMusic = false, includeMusicExtension = false } = {}) {
    const basePath = path.join('music', uuid);
    const songPath = path.join(basePath, 'song.json');
    const artworkPath = path.join(basePath, 'artwork.png');

    try {
        const data = await fs.promises.readFile(songPath, 'utf8');
        const songData = JSON.parse(data);

        var result = {
            name: songData.name || '',
            uuid,
            artwork: fs.existsSync(artworkPath) ? `/artwork/${uuid}` : undefined,
            artist: songData.artist || '',
            ...songData
        };

        if (!result.duration) {
            const musicFile = possibleFormats.find(format => fs.existsSync(path.join(basePath, `source.${format}`)));
            if (musicFile) {
                result.duration = await getAudioDurationInSeconds(path.join(basePath, `source.${musicFile}`));
            }
            if (result.duration) {
                fs.writeFileSync(songPath, JSON.stringify({
                    ...songData,
                    duration: result.duration
                }, null, 2));
            }
        }

        if (includeHasMusic) {
            result.hasMusic = await Promise.any(possibleFormats.map(async format => {
                try {
                    await fs.promises.access(path.join(basePath, `source.${format}`));
                    if (includeMusicExtension) {
                        result.musicExtension = format;
                    }
                    return true;
                } catch {
                    throw false;
                }
            })).catch(() => false);
        }

        return result;
    } catch (err) {
        console.error(`Error loading song with UUID ${uuid}:`, err);
        return null;
    }
}

app.get('/list', async (req, res) => {
    const musicDir = 'music';

    try {
        await fs.promises.access(musicDir);
        const uuids = await fs.promises.readdir(musicDir);
        const songs = await Promise.all(uuids.map(uuid =>
            loadSong(uuid)
        ));
        res.json(songs.filter(Boolean));
    } catch {
        res.json([]);
    }
});

app.get('/list-by/:artist', async (req, res) => {
    const { artist } = req.params;
    const musicDir = 'music';

    try {
        await fs.promises.access(musicDir);
        const uuids = await fs.promises.readdir(musicDir);
        const songs = await Promise.all(uuids.map(uuid =>
            loadSong(uuid)
        ));
        const filtered = songs.filter(song =>
            song && song.artist?.toLowerCase() === artist.toLowerCase()
        );
        res.json(filtered);
    } catch {
        res.json([]);
    }
});

app.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    const searchQuery = query.toLowerCase();
    const musicDir = 'music';

    try {
        await fs.promises.access(musicDir);
        const uuids = await fs.promises.readdir(musicDir);
        const songs = await Promise.all(uuids.map(uuid =>
            loadSong(uuid)
        ));

        const filtered = songs.filter(song => {
            if (!song) return false;
            return (
                song.name?.toLowerCase().includes(searchQuery) ||
                song.artist?.toLowerCase().includes(searchQuery) ||
                song.album?.toLowerCase().includes(searchQuery)
            );
        });

        res.json(filtered);
    } catch {
        res.json([]);
    }
});

app.get('/list-artists', async (req, res) => {
    const musicDir = 'music';

    try {
        await fs.promises.access(musicDir);
        const uuids = await fs.promises.readdir(musicDir);
        const songs = await Promise.all(uuids.map(uuid => loadSong(uuid)));

        const artists = new Set();
        for (const song of songs) {
            if (song?.artist) artists.add(song.artist);
        }

        res.json(Array.from(artists).sort((a, b) => a.localeCompare(b)));
    } catch {
        res.json([]);
    }
});
app.get('/list-albums', async (req, res) => {
    const musicDir = 'music';
    try {
        await fs.promises.access(musicDir);
        const uuids = await fs.promises.readdir(musicDir);
        const songs = await Promise.all(uuids.map(uuid => loadSong(uuid)));
        const albums = new Set();
        for (const song of songs) {
            if (song?.album) albums.add(song.album);
        }
        res.json(Array.from(albums).sort((a, b) => a.localeCompare(b)));
    } catch {
        res.json([]);
    }
});

app.get('/get/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const song = await loadSong(uuid, { includeHasMusic: true, includeMusicExtension: true });

    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }

    res.json(song);
});

app.get('/play/:uuid', (req, res) => {
    const { uuid } = req.params;
    const musicDir = path.join('music', uuid);

    if (!fs.existsSync(musicDir)) {
        return res.status(404).json({ error: 'Song not found' });
    }

    const files = fs.readdirSync(musicDir);
    const musicFile = files.find(file => file.startsWith('source.'));

    if (!musicFile) {
        return res.status(404).json({ error: 'Music file not found' });
    }

    const musicPath = path.join(musicDir, musicFile);
    const stat = fs.statSync(musicPath);
    const total = stat.size;

    const range = req.headers.range; // This took me AGES - You need range to support currentTime in audio elements. :facepalm:
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunkSize = (end - start) + 1;

        const stream = fs.createReadStream(musicPath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'audio/mpeg'
        });
        stream.pipe(res);
    } else { // else? just throw the whole file, why not
        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': 'audio/mpeg',
            'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(musicPath).pipe(res);
    }
});
app.get('/artwork/:uuid', (req, res) => {
    const { uuid } = req.params;
    const artworkPath = path.join('music', uuid, 'artwork.png');
    if (fs.existsSync(artworkPath)) {
        const file = fs.readFileSync(artworkPath);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(file);
    } else {
        res.status(404).json({ error: 'Artwork not found' });
    }
});

/**
 * Calls a MusixMatch API function with the provided parameters.
[params below, func is a function that takes the MusixMatchAPI instance and params as arguments
 * @param {function(MusixMatchAPI, any?): any} func - The function to call on the MusixMatchAPI instance.
 * @param {string} [params=''] - The parameters to pass to the function.
*/
const i_mxm_call = async (func, params = '') => {
    const mmApi = new MusixMatchAPI();
    await mmApi.init();
    const result = await func(mmApi, params);
    return result;
}
const lyrics = {
    lrclib: async (req, res, song, duration) => {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(song.artist)}&track_name=${encodeURIComponent(song.name)}&album_name=${encodeURIComponent(song.album || song.name)}&duration=${Math.round(duration)}`;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const data = await response.json();
            let lyricdata = {
                source: 'lrclib'
            };
            if (data.plainLyrics) {
                lyricdata.plain = data.plainLyrics;
            }
            if (data.syncedLyrics) {
                lyricdata.synced = data.syncedLyrics;
            }
            return lyricdata;
        } catch (err) {
            return null;
        }
    },
    musixmatch: async (req, res, song, duration) => {
        try {
            var trackId = await i_mxm_call(mmApi => mmApi.searchTracksSpecific(song.name, song.artist));
            if (!trackId || !trackId.message || !trackId.message.body || !trackId.message.body.track_list) {
                trackId = await i_mxm_call(mmApi => mmApi.searchTracks((song.name + '+' + song.artist).replaceAll(/[^\w\s]/g, ' ')));
            }
            if (trackId && trackId.message && trackId.message.body && trackId.message.body.track_list && trackId.message.body.track_list.length > 0) {
                const track = trackId.message.body.track_list[0].track;

                // plain
                var plain = undefined;
                const lyrics = await i_mxm_call(mmApi => mmApi.getTrackLyrics({ track_id: track.track_id }));
                if (lyrics && lyrics.message && lyrics.message.body && lyrics.message.body.lyrics) {
                    plain = lyrics.message.body.lyrics.lyrics_body;
                }
                // richsync
                var richsyncRes = undefined;
                const richsync = await i_mxm_call(mmApi => mmApi.getTrackRichsync({ track_id: track.track_id }));
                if (richsync && richsync.message && richsync.message.body && richsync.message.body.richsync) {
                    richsyncRes = JSON.parse(richsync.message.body.richsync.richsync_body);
                }
                // synced
                var formatTime = (time) => {
                    const minutes = Math.floor(time / 60);
                    const seconds = Math.floor(time % 60);
                    const milliseconds = Math.round((time % 1) * 1000);
                    return {
                        minutes,
                        seconds,
                        milliseconds
                    }
                }
                var syncedRes = undefined;
                var synced = await i_mxm_call(mmApi => mmApi.getTrackSubtitles({ track_id: track.track_id }));
                if (synced && synced.message && synced.message.body && synced.message.body.subtitle) {
                    syncedRes = synced.message.body.subtitle.subtitle_body;
                }

                if (!syncedRes && richsyncRes) {
                    syncedRes = richsyncRes.map(line => {
                        var times = formatTime(line.ts);
                        var ts = `${String(times.minutes).padStart(2, '0')}:${String(times.seconds).padStart(2, '0')}.${String(times.milliseconds).padStart(3, '0')}`;
                        return `[${ts}] ${line.x}`;
                    }).join('\n');
                }

                if (plain || richsyncRes) {
                    return {
                        source: 'musixmatch',
                        plain,
                        richsync: richsyncRes,
                        synced: syncedRes
                    };
                }
            }
        } catch (err) {
            console.error('MusixMatch API error:', err);
        }
        return null;
    }
}
app.get('/lyrics/:uuid', async (req, res) => {
    const { uuid } = req.params;
    var song = await loadSong(uuid);
    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }
    const musicDir = path.join('music', uuid);
    if (!fs.existsSync(musicDir)) {
        return res.status(404).json({ error: 'Song not found' });
    }
    const files = fs.readdirSync(musicDir);
    const musicFile = files.find(file => file.startsWith('source.'));
    if (!musicFile) {
        return res.status(404).json({ error: 'Music file not found' });
    }
    const duration = await getAudioDurationInSeconds(path.join(musicDir, musicFile));
    let finalResult = { source: {} };
    for (const [key, func] of Object.entries(lyrics)) {
        try {
            const result = await func(req, res, song, duration);
            if (result) {
                if (result.plain && !finalResult.plain) {
                    finalResult.plain = result.plain;
                    finalResult.source.plain = key;
                }
                if (result.synced && !finalResult.synced) {
                    finalResult.synced = result.synced;
                    finalResult.source.synced = key;
                }
                if (result.richsync && !finalResult.richsync) {
                    finalResult.richsync = result.richsync;
                    finalResult.source.richsync = key;
                }
            }
        } catch (err) {
            console.error(`Error fetching lyrics from ${key}:`, err);
        }
    }

    if (finalResult.plain || finalResult.synced || finalResult.richsync) {
        return res.json(finalResult);
    }
    res.status(404).json({ error: 'No lyrics found' });
});
app.get('/external-search/:query', async (req, res) => {
    const { query } = req.params;
    try {
        const mmApi = new MusixMatchAPI();
        await mmApi.init();
        var mmSongs = await mmApi.searchTracks(query, 1, 10);
        if (!mmSongs || !mmSongs.message || !mmSongs.message.body || !mmSongs.message.body.track_list) {
            mmSongs = await mmApi.searchTracks(query.replaceAll(/[^\w\s]/g, ' '), 1, 10);
        }
        const mmResults = (mmSongs && mmSongs.message && mmSongs.message.body && mmSongs.message.body.track_list) ?
            mmSongs.message.body.track_list.map(track => {
                const t = track.track;
                return {
                    genius_id: 'mxm-' + t.track_id,
                    title: t.track_name,
                    artist: t.artist_name,
                    url: t.track_share_url,
                    album: t.album_name,
                    artwork: t.album_coverart_800x800 || t.album_coverart_500x500 || t.album_coverart_350x350 || t.album_coverart_100x100 || null
                };
            }) : [];

        let itunesSongs = [];
        let itunesResponse = await fetch("https://corsproxy.io/?url=https://itunes.apple.com/search?entity=song&term=" + encodeURIComponent(query).replaceAll('%20', '+'));
        let itunesData = await itunesResponse.json();
        if (itunesData && itunesData.results) {
            itunesSongs = itunesData.results.slice(0, 10).map(song => ({
                genius_id: 'itunes-' + song.trackId,
                title: song.trackName,
                artist: song.artistName,
                url: song.trackViewUrl,
                album: song.collectionName,
                artwork: song.artworkUrl100 || song.artworkUrl60 || song.artworkUrl30 || null
            }));
        }

        let geniusSongs = [];
        if (config.genius) {
            const geniusApiURL = `https://api.genius.com/search?q=${encodeURIComponent(query)}&access_token=${config.genius.access_token}`;
            const response = await fetch(geniusApiURL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            geniusSongs = data.response.hits.filter(hit => hit.type === 'song').map(hit => {
                const song = hit.result;
                return {
                    genius_id: song.id,
                    title: song.title,
                    artist: song.primary_artist.name,
                    url: song.url,
                    album: song.album ? song.album.name : song.title,
                    artwork: song.song_art_image_url || null
                };
            });
        }

        const mixSongs = [...mmResults, ...itunesSongs, ...geniusSongs].filter(song => song.title && song.artist && song.artwork);
        // remove duplicates based on title and artist
        const uniqueSongs = new Map();
        mixSongs.forEach(song => {
            const key = `${song.title.toLowerCase()}-${song.artist.toLowerCase()}`;
            if (!uniqueSongs.has(key)) {
                uniqueSongs.set(key, song);
            }
        });
        const allSongs = Array.from(uniqueSongs.values());
        if (allSongs.length === 0) {
            return res.status(404).json({ error: 'No songs found' });
        }
        res.json(allSongs);
    } catch (error) {
        console.error('Error fetching external search:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});
app.get('/youtube-search/:query', async (req, res) => {
    const { query } = req.params;
    try {
        const results = await yts(query);
        const songs = results.videos.slice(0, 14).map(video => ({
            title: video.title,
            artist: video.author.name,
            url: video.url,
            thumbnail: video.thumbnail,
            duration: video.timestamp
        }));
        res.json(songs);
    } catch (error) {
        console.error('Error fetching YouTube search:', error);
        res.status(500).json({ error: 'Failed to fetch YouTube videos' });
    }
});
app.get('/youtube-info/:url', async (req, res) => {
    let { url } = req.params;
    if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    try {
        const video = await yts({ videoId: url.split('v=')[1] });
        if (!video) {
            return res.status(400).json({ error: 'Video not found' });
        }

        const songData = {
            title: video.title,
            artist: video.author.name,
            url: video.url,
            thumbnail: video.thumbnail,
            duration: video.duration.seconds,
            format: 'mp4'
        };
        res.json(songData);
    } catch (error) {
        console.error('Error fetching YouTube info:', error);
        res.status(500).json({ error: 'Failed to fetch YouTube video info' });
    }
});

app.get('/youtube-download/:uuid', async (req, res) => {
    const { uuid } = req.params;
    if(!config.allow_edits) {
        return res.status(403).json({ error: 'Editing is disabled on this server' });
    }
    const url = req.query.url;
    const musicDir = path.join('music', uuid);

    if (!fs.existsSync(musicDir)) {
        return res.status(404).json({ error: 'Song not found' });
    }
    if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    try {
        const videoInfo = await ytdl.getInfo(url);
        const format = videoInfo.formats.find(f => f.hasAudio && f.hasVideo && f.mimeType.includes('mp4'));
        if (!format) {
            return res.status(400).json({ error: 'No suitable format found for download' });
        }

        const filePath = path.join(musicDir, `source.${format.container}`);
        const writeStream = fs.createWriteStream(filePath);

        ytdl(url, { format: format })
            .pipe(writeStream)
            .on('finish', () => {
                ffmpeg(filePath)
                    .outputOptions('-c:a', 'libmp3lame')
                    .toFormat('mp3')
                    .output(path.join(musicDir, 'source.mp3'))
                    .on('end', () => {
                        getAudioDurationInSeconds(path.join(musicDir, 'source.mp3'))
                            .then(duration => {
                                const songDataPath = path.join(musicDir, 'song.json');
                                const songData = JSON.parse(fs.readFileSync(songDataPath, 'utf8'));
                                songData.duration = duration;
                                fs.writeFileSync(songDataPath, JSON.stringify(songData, null, 2));
                            })
                            .catch(err => {
                                console.error('Error getting audio duration:', err);
                            });
                        res.json({ success: true, message: 'Source downloaded successfully', filePath });
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting original video file:', err);
                            } else {
                                console.log('Original video file deleted successfully');
                            }
                        });
                    })
                    .on('error', (err) => {
                        console.error('Error converting to MP3:', err);
                        res.status(500).json({ error: 'Failed to convert video to MP3' });
                    })
                    .run();
            })
            .on('error', (err) => {
                res.status(500).json({ error: 'Failed to download video' });
            });
    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({ error: 'Failed to download video' });
    }
});

playlistRoutes(app, loadSong, __dirname);
videoRoutes(app, __dirname);

app.get('/check', (req, res) => {
    res.json({ status: 'ok', editing: config.allow_edits });
});

app.get('/', async (req, res) => {
    await fs.promises.access('music');
    const uuids = await fs.promises.readdir('music');
    const songs = await Promise.all(uuids.map(uuid =>
        loadSong(uuid)
    ));

    const html = `<!DOCTYPE html>
    <html><head><title>GMMA Backend</title><style>html,body{background:#0b0b0f;color:white;font-family:sans-serif;}</style></head><body>
    <h1>GMMA Backend</h1>
    <p>This is the backend route, plug this link into the frontend to use GMMA.</p>
    <p>Songs in folder:</p>
    <div style="display:flex;flex-direction:column;gap:5px;">${songs.map(s => `<div onclick="prompt('UUID', '${s.uuid}')" style="border-radius:4px;display:flex;gap:5px;height:40px;cursor:pointer;width:fit-content;min-width:200px;align-items:center;border:1px solid #ffffff20;padding:4px;"><img style="object-fit:cover;width:40px;height:40px;border-radius:4px;" src="/artwork/${s.uuid}" height="40"></img>${s.name}</div>`).join('')}</div>
    </body></html>`;

    res.send(html);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});