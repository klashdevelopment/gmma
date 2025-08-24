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

interface GmmaEntry extends GmmaSong {
    type: 'song' | 'playlist' | 'album' | 'artist';
}

interface YoutubeSearchResult {
    title: string;
    artist: string;
    url: string;
    thumbnail: string;
    duration: string;
}

interface Playlist {
    uuid: string;
    name: string;
    description?: string;
    artwork?: string;
    songs: string[];
}

interface GmmaVideo {
    uuid: string;
    name: string;
    description?: string;
    uploader: string;
    thumbnail?: string;
    hasVideo?: boolean;
    has480p?: boolean;
}