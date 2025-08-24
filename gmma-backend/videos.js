import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from '@distube/ytdl-core';
import yts from 'yt-search';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { writeFile } from 'fs/promises';
export default function videoRoutes(app, __dirname) {
    /* Video Routes
    Stored in /videos. We'll need these routes:
    - GET /videos: List all videos
    - GET /video-info/:uuid: Get a specific video's metadata by UUID
    - POST /videos: Add a new video with only name and uploader required.
    - POST /modify-video/:uuid: Modify a video's metadata by UUID
    - DELETE /video-info/:uuid: Delete a video by UUID
    - GET /video/:uuid: Serve the video file by UUID using m3u8
    - POST /modify-video/source/:uuid: Modify a video's source by UUID. Can take any video file and uses fluent ffmpeg to convert it to HLS.
    Videos should be stored in /videos/<uuid>/video.json and /videos/<uuid>/source/... having the m3u8 and ts files in the source folder.
    */
    const basePath = path.join(__dirname, 'videos');
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }

    const upload = multer({ dest: 'temp_uploads/' });

    function serveFile(uuid, inputFile, res) {
        var file = inputFile.split('?')[0];
        const sourcePath = path.join(basePath, uuid, 'source');
        const filePath = path.join(sourcePath, file);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Not found' });

        const contentType = file.endsWith('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : file.endsWith('.ts')
                ? 'video/MP2T'
                : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        fs.createReadStream(filePath).pipe(res);
    }

    // List all videos
    app.get('/videos', (req, res) => {
        const videoDirs = fs.readdirSync(basePath);
        const allVideos = videoDirs.map(uuid => {
            const metadataPath = path.join(basePath, uuid, 'video.json');
            if (fs.existsSync(metadataPath)) {
                return {
                    uuid,
                    thumbnail: fs.existsSync(path.join(basePath, uuid, 'thumbnail.png')) ? `/video-thumbnail/${uuid}` : null,
                    hasVideo: fs.existsSync(path.join(basePath, uuid, 'source', '1080p', 'index.m3u8')),
                    has480p: fs.existsSync(path.join(basePath, uuid, 'source', '480p', 'index.m3u8')),
                    ...JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
                };
            }
            return null;
        }).filter(Boolean);
        res.json(allVideos);
    });

    // Get metadata for specific video
    app.get('/video-info/:uuid', (req, res) => {
        const { uuid } = req.params;
        const metadataPath = path.join(basePath, uuid, 'video.json');
        if (!fs.existsSync(metadataPath)) return res.status(404).json({ message: 'Not found' });
        res.json({
            uuid,
            thumbnail: fs.existsSync(path.join(basePath, uuid, 'thumbnail.png')) ? `/video-thumbnail/${uuid}` : null,
            hasVideo: fs.existsSync(path.join(basePath, uuid, 'source', '1080p', 'index.m3u8')),
            has480p: fs.existsSync(path.join(basePath, uuid, 'source', '480p', 'index.m3u8')),
            ...JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
        });
    });

    // Add a new video (metadata only)
    app.post('/videos', (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        const { name, uploader } = req.body;
        if (!name || !uploader) return res.status(400).json({ message: 'Missing name or uploader' });

        const uuid = uuidv4();
        const videoDir = path.join(basePath, uuid);
        fs.mkdirSync(videoDir);
        const metadata = { uuid, name, uploader };
        fs.writeFileSync(path.join(videoDir, 'video.json'), JSON.stringify(metadata, null, 2));
        res.json({ ...metadata, thumbnail: null, hasVideo: false });
    });

    // Modify video metadata
    app.post('/modify-video/:uuid', (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        const { uuid } = req.params;
        const metadataPath = path.join(basePath, uuid, 'video.json');
        if (!fs.existsSync(metadataPath)) return res.status(404).json({ message: 'Not found' });

        const existing = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        const updated = { ...existing, ...req.body };
        fs.writeFileSync(metadataPath, JSON.stringify(updated, null, 2));
        res.json(updated);
    });

    // Delete a video
    app.delete('/video-info/:uuid', (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        const { uuid } = req.params;
        const videoDir = path.join(basePath, uuid);
        if (!fs.existsSync(videoDir)) return res.status(404).json({ message: 'Not found' });
        fs.rmSync(videoDir, { recursive: true, force: true });
        res.json({ message: 'Deleted' });
    });

    // Serve HLS video
    app.get('/video/:uuid/:file', (req, res) => {
        const ver = req.query.ver;
        let subdir;
        switch (ver) {
            case '480':
                subdir = '480p';
                break;
            case 'audio':
                subdir = 'audio';
                break;
            case '1080':
            default:
                subdir = '1080p';
        }
        const { uuid, file } = req.params;
        serveFile(uuid, path.join(subdir, file), res);
    });

    app.get('/video-thumbnail/:uuid', (req, res) => {
        const { uuid } = req.params;
        const thumbnailPath = path.join(basePath, uuid, 'thumbnail.png');
        if (fs.existsSync(thumbnailPath)) {
            res.sendFile(thumbnailPath);
        } else {
            res.status(404).json({ message: 'Thumbnail not found' });
        }
    });

    app.post('/modify-video/thumbnail/:uuid', upload.single('thumbnail'), (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        const { uuid } = req.params;
        const videoDir = path.join(basePath, uuid);
        if (!fs.existsSync(videoDir)) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const thumbnailPath = path.join(videoDir, 'thumbnail.png');
        fs.renameSync(req.file.path, thumbnailPath);
        res.json({ success: true });
    });

    // Upload and convert video source to HLSs
    app.get('/video/:uuid', (req, res) => {
        const { uuid } = req.params;
        const ver = req.query.ver;
        let subdir;
        switch (ver) {
            case '480':
                subdir = '480p';
                break;
            case 'audio':
                subdir = 'audio';
                break;
            case '1080':
            default:
                subdir = '1080p';
        }
        const sourcePath = path.join(basePath, uuid, 'source', subdir, 'index.m3u8');

        if (fs.existsSync(sourcePath)) {
            serveFile(uuid, path.join(subdir, 'index.m3u8'), res);
        } else {
            res.status(404).json({ message: 'Video not found' });
        }
    });

    app.get('/video-from-yt', async (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        let { url } = req.query;
        let forceHDOnly = req.query.forceHDOnly === 'false' ? false : true;
        if (!url || !(url.includes('youtube.com') || url.includes('youtu.be') || url.includes('yt.be'))) {
            return res.status(400).json({ message: 'Invalid YouTube URL' });
        }
        const uuid = uuidv4();
        const videoDir = path.join(basePath, uuid);
        fs.mkdirSync(videoDir, { recursive: true });

        try {
            const videoInfo = await ytdl.getInfo(url);

            // Get best video format (without audio)
            var videoFormat = videoInfo.formats
                .filter(f => f.hasVideo && !f.hasAudio && (f.container === 'mp4' || f.mimeType.includes('mp4')))
                .sort((a, b) => {
                    const aHeight = parseInt(a.height) || 0;
                    const bHeight = parseInt(b.height) || 0;
                    return bHeight - aHeight; // Descending order for highest quality
                })[0];

            // Get best audio format
            var audioFormat = videoInfo.formats
                .filter(f => f.hasAudio && !f.hasVideo)
                .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

            if (!videoFormat || !audioFormat) {
                return res.status(400).json({ error: 'No suitable video or audio format found for download' });
            }

            // Download video and audio streams separately
            const tempVideoPath = path.join(videoDir, 'temp_video.mp4');
            const tempAudioPath = path.join(videoDir, 'temp_audio.mp4');
            const mergedVideoPath = path.join(videoDir, 'merged.mp4');

            const videoStream = ytdl(url, { format: videoFormat });
            const audioStream = ytdl(url, { format: audioFormat });

            // Download both streams
            const videoDownload = new Promise((resolve, reject) => {
                videoStream.pipe(fs.createWriteStream(tempVideoPath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            const audioDownload = new Promise((resolve, reject) => {
                audioStream.pipe(fs.createWriteStream(tempAudioPath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            // Wait for both downloads to complete
            await Promise.all([videoDownload, audioDownload]);

            // Merge video and audio using FFmpeg
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(tempVideoPath)
                    .input(tempAudioPath)
                    .outputOptions([
                        '-c:v copy',    // Copy video without re-encoding
                        '-c:a copy',    // Copy audio without re-encoding
                        '-movflags faststart'
                    ])
                    .output(mergedVideoPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // Clean up temp files
            fs.unlinkSync(tempVideoPath);
            fs.unlinkSync(tempAudioPath);

            // Now process the merged video
            const sourceDir = path.join(videoDir, 'source');
            fs.mkdirSync(sourceDir, { recursive: true });
            const path1080p = path.join(sourceDir, '1080p');
            fs.mkdirSync(path1080p, { recursive: true });
            const path480p = path.join(sourceDir, '480p');
            if (!forceHDOnly) fs.mkdirSync(path480p, { recursive: true });
            const pathAudio = path.join(sourceDir, 'audio');
            fs.mkdirSync(pathAudio, { recursive: true });

            const commands = [];

            // 1080p - use merged high-quality video
            commands.push(new Promise((resolve, reject) => {
                ffmpeg(mergedVideoPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .size('1920x1080')
                    .outputOptions([
                        '-preset fast',
                        '-g 48',
                        '-sc_threshold 0',
                        '-hls_time 10',
                        '-hls_playlist_type vod',
                        '-f hls'
                    ])
                    .output(path.join(path1080p, 'index.m3u8'))
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            }));

            // 480p - downscale from high-quality merged video
            if (!forceHDOnly) {
                commands.push(new Promise((resolve, reject) => {
                    ffmpeg(mergedVideoPath)
                        .videoCodec('libx264')
                        .audioCodec('aac')
                        .size('854x480')
                        .outputOptions([
                            '-preset fast',
                            '-g 48',
                            '-sc_threshold 0',
                            '-hls_time 10',
                            '-hls_playlist_type vod',
                            '-f hls'
                        ])
                        .output(path.join(path480p, 'index.m3u8'))
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                }));
            }

            // Audio-only - extract from high-quality merged video
            commands.push(new Promise((resolve, reject) => {
                ffmpeg(mergedVideoPath)
                    .noVideo()
                    .audioCodec('aac')
                    .outputOptions([
                        '-hls_time 10',
                        '-hls_playlist_type vod',
                        '-f hls'
                    ])
                    .output(path.join(pathAudio, 'index.m3u8'))
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            }));

            // Thumbnail
            const thumbnailPath = path.join(videoDir, 'thumbnail.png');
            const thumbnailUrl = videoInfo.videoDetails.thumbnails.reduce((prev, current) => {
                return (prev.width > current.width) ? prev : current;
            }).url;
            const streamPipeline = promisify(pipeline);
            commands.push(
                fetch(thumbnailUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch thumbnail: ${response.status} ${response.statusText}`);
                        }
                        return streamPipeline(response.body, fs.createWriteStream(thumbnailPath));
                    })
            );

            Promise.all(commands).then(() => {
                // Clean up merged temp file
                fs.unlinkSync(mergedVideoPath);

                const metadata = {
                    uuid,
                    name: videoInfo.videoDetails.title,
                    uploader: videoInfo.videoDetails.author.name
                };
                fs.writeFileSync(path.join(videoDir, 'video.json'), JSON.stringify(metadata, null, 2));
                res.json({
                    ...metadata,
                    thumbnail: `/video-thumbnail/${uuid}`,
                    hasVideo: true,
                    has480p: !forceHDOnly
                });
            }).catch(err => {
                console.error(err);
                res.status(500).json({ message: 'One or more conversions failed' });
            });

        } catch (error) {
            console.error('Error downloading YouTube video:', error);
            return res.status(500).json({ message: 'Failed to download video' });
        }
    });

    app.get('/video-audio/:uuid', (req, res) => {
        const { uuid } = req.params;
        const audioPath = path.join(basePath, uuid, 'source', 'audio', 'index.mp3');
        if (fs.existsSync(audioPath)) {
            res.setHeader('Content-Type', 'audio/mpeg');
            fs.createReadStream(audioPath).pipe(res);
        } else {
            res.status(404).json({ message: 'Audio only version not found' });
        }
    });

    app.post('/modify-video/source/:uuid', upload.single('video'), (req, res) => {
        if (!config.allow_edits) {
            return res.status(403).json({ error: 'Editing is disabled on this server' });
        }
        const { uuid } = req.params;
        const file = req.file;
        const forceHDOnly = req.body.forceHDOnly === 'false' ? false : true;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const sourceDir = path.join(basePath, uuid, 'source');
        const path1080p = path.join(sourceDir, '1080p');
        const path480p = path.join(sourceDir, '480p');
        const pathAudio = path.join(sourceDir, 'audio');

        fs.mkdirSync(path1080p, { recursive: true });
        fs.mkdirSync(pathAudio, { recursive: true });
        if (!forceHDOnly) fs.mkdirSync(path480p, { recursive: true });

        const commands = [];

        // 1080p
        commands.push(new Promise((resolve, reject) => {
            ffmpeg(file.path)
                .videoCodec('libx264')
                .audioCodec('aac')
                .size('1920x1080')
                .outputOptions([
                    '-preset fast',
                    '-g 48',
                    '-sc_threshold 0',
                    '-hls_time 10',
                    '-hls_playlist_type vod',
                    '-f hls'
                ])
                .output(path.join(path1080p, 'index.m3u8'))
                .on('end', resolve)
                .on('error', reject)
                .run();
        }));

        // 480p (optional)
        if (!forceHDOnly) {
            commands.push(new Promise((resolve, reject) => {
                ffmpeg(file.path)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .size('854x480')
                    .outputOptions([
                        '-preset fast',
                        '-g 48',
                        '-sc_threshold 0',
                        '-hls_time 10',
                        '-hls_playlist_type vod',
                        '-f hls'
                    ])
                    .output(path.join(path480p, 'index.m3u8'))
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            }));
        }

        // Audio-only
        commands.push(new Promise((resolve, reject) => {
            ffmpeg(file.path)
                .noVideo()
                .audioCodec('aac')
                .outputOptions([
                    '-hls_time 10',
                    '-hls_playlist_type vod',
                    '-f hls'
                ])
                .output(path.join(pathAudio, 'index.m3u8'))
                .on('end', resolve)
                .on('error', reject)
                .run();
        }));

        Promise.all(commands).then(() => {
            fs.unlinkSync(file.path);
            res.json({ message: 'Converted and stored versions' });
        }).catch(err => {
            console.error(err);
            res.status(500).json({ message: 'One or more conversions failed' });
        });
    });
}