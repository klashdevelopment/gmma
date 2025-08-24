/* A reverse engineered implementation of Musixmatch's API. */
/* tysm for Strvm/musicxmatch-api for the original python code! with some fixes (header changes) and porting to JS, gmma has a working Musixmatch API! */
/* This code is not affiliated with Musixmatch and does violate their ToS. Use at your own risk! */
import crypto from "crypto";

const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"; // a mac UA for all calls except getSecret

const EndPoints = Object.freeze({
    GET_ARTIST: "artist.get",
    GET_TRACK: "track.get",
    GET_TRACK_LYRICS: "track.lyrics.get",
    GET_TRACK_SUBTITLE: "track.subtitle.get",
    SEARCH_TRACK: "track.search",
    SEARCH_ARTIST: "artist.search",
    GET_ARTIST_CHART: "chart.artists.get",
    GET_TRACT_CHART: "chart.tracks.get",
    GET_ARTIST_ALBUMS: "artist.albums.get",
    GET_ALBUM: "album.get",
    GET_ALBUM_TRACKS: "album.tracks.get",
    GET_TRACK_LYRICS_TRANSLATION: "crowd.track.translations.get",
    GET_TRACK_RICHSYNC: "track.richsync.get",
});

function encodeAllSymbols(str) {
    return str.split('').map(ch => {
        if (/[a-zA-Z0-9]/.test(ch)) {
            return ch;
        } else if (ch === ' ') {
            return '+';
        } else {
            return '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
        }
    }).join('');
}

class MusixMatchAPI {
    constructor(proxies = null) {
        this.baseUrl = "https://www.musixmatch.com/ws/1.1/";
        this.headers = { "User-Agent": USER_AGENT }; // macos ua
        this.proxies = proxies;
        this.secret = null;
    }

    async init() {
        this.secret = await this.getSecret();
        // console.log("MxM API made with " + this.secret);
    }

    async getLatestApp() {
        const response = await fetch("https://www.musixmatch.com/search", {
            headers: {
                "User-Agent": USER_AGENT, // macOS ua
                Cookie: "mxm_bab=AB",
            },
        }).catch((err) => {
            throw new Error("Failed to fetch the latest app URL: " + err.message);
        });

        const html = await response.text();
        const match = html.match(
            /src="([^"]*\/_next\/static\/chunks\/pages\/_app-[^"]+\.js)"/g
        );
        if (match && match.length) {
            var finalLink = match[match.length - 1].replace(/src="/, "").replace(/"/, "");
            return finalLink;
        }
        throw new Error("_app url not found. report this issue pls!");
    }

    async getSecret() {
        const url = await this.getLatestApp();

        // headers directly from a Fiddler capture
        const headers = {
            'Host': 's.mxmcdn.net',
            'Connection': 'keep-alive',
            'sec-ch-ua-platform': '"Windows"',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', //needs different UA for windows? other req works with macOS UA
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
            'sec-ch-ua-mobile': '?0',
            'Accept': '*/*',
            'Sec-GPC': '1',
            'Accept-Language': 'en-US,en;q=0.7',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Dest': 'script',
            'Sec-Fetch-Storage-Access': 'none',
            'Referer': 'https://www.musixmatch.com/',
            'Accept-Encoding': 'gzip, deflate, br, zstd'
        };
        const response = await fetch(url, { headers });
        const jsCode = await response.text();
        const match = jsCode.match(/from\(\s*"(.*?)"\s*\.split/);
        if (match) {
            const reversed = match[1].split("").reverse().join("");
            const decoded = Buffer.from(reversed, "base64").toString("utf8");
            return decoded;
        }
        throw new Error("Encoded string not found in the JavaScript code.");
    }

    generateSignature(url) {
        const now = new Date();
        const y = String(now.getFullYear());
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const message = Buffer.from(url + y + m + d);
        const key = Buffer.from(this.secret);
        const hash = crypto.createHmac("sha256", key).update(message).digest();
        const encoded = encodeURIComponent(hash.toString("base64"));
        return `&signature=${encoded}&signature_protocol=sha256`;
    }

    async makeRequest(url) {
        url = url.replace(/%20| /g, "+");
        const fullUrl = this.baseUrl + url;
        const signedUrl = fullUrl + this.generateSignature(fullUrl);
        // console.log(signedUrl);
        const response = await fetch(signedUrl, { headers: this.headers });
        return response.json();
    }

    makeSignedRequestUrl(relativeUrl) {
        return relativeUrl;
    }

    searchTracks(trackQuery, page = 1, maxTracks = 100) {
        const query = encodeAllSymbols(trackQuery);
        const url = `${EndPoints.SEARCH_TRACK}?app_id=web-desktop-app-v1.0&format=json&q=${query}&f_has_lyrics=true&page_size=${maxTracks}&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    searchTracksSpecific(trackName, trackArtist, page = 1, maxTracks = 100) {
        const trackNameEncoded = encodeAllSymbols(trackName);
        const trackArtistEncoded = encodeAllSymbols(trackArtist);
        const url = `${EndPoints.SEARCH_TRACK}?app_id=web-desktop-app-v1.0&format=json&q_artist=${trackArtistEncoded}&q_track=${trackNameEncoded}&f_has_lyrics=true&page_size=${maxTracks}&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    searchTracksCustom(params) {
        const url = `${EndPoints.SEARCH_TRACK}?app_id=web-desktop-app-v1.0&format=json${params}&f_has_lyrics=true&page_size=100&page=1`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrack({ track_id = null, track_isrc = null } = {}) {
        if (!track_id && !track_isrc) {
            throw new Error("Either track_id or track_isrc must be provided.");
        }
        const param = track_id
            ? `track_id=${encodeAllSymbols(track_id)}`
            : `track_isrc=${encodeAllSymbols(track_isrc)}`;
        const url = `${EndPoints.GET_TRACK}?app_id=web-desktop-app-v1.0&format=json&${param}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrackLyrics({ track_id = null, track_isrc = null } = {}) {
        if (!track_id && !track_isrc) {
            throw new Error("Either track_id or track_isrc must be provided.");
        }
        const param = track_id
            ? `track_id=${encodeURIComponent(track_id)}`
            : `track_isrc=${encodeURIComponent(track_isrc)}`;
        const url = `${EndPoints.GET_TRACK_LYRICS}?app_id=web-desktop-app-v1.0&format=json&${param}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrackSubtitles({ track_id = null, track_isrc = null } = {}) {
        if (!track_id && !track_isrc) {
            throw new Error("Either track_id or track_isrc must be provided.");
        }
        const param = track_id
            ? `track_id=${encodeURIComponent(track_id)}`
            : `track_isrc=${encodeURIComponent(track_isrc)}`;
        const url = `${EndPoints.GET_TRACK_SUBTITLE}?app_id=web-desktop-app-v1.0&format=json&f_subtitle_length=1000&${param}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getArtistChart(country = "US", page = 1) {
        const url = `${EndPoints.GET_ARTIST_CHART}?app_id=web-desktop-app-v1.0&format=json&page_size=100&country=${encodeURIComponent(country)}&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrackChart(country = "US", page = 1) {
        const url = `${EndPoints.GET_TRACT_CHART}?app_id=web-desktop-app-v1.0&format=json&page_size=100&country=${encodeURIComponent(country)}&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    searchArtist(query, page = 1) {
        const q = encodeAllSymbols(query);
        const url = `${EndPoints.SEARCH_ARTIST}?app_id=web-desktop-app-v1.0&format=json&q_artist=${q}&page_size=100&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getArtist(artistId) {
        const url = `${EndPoints.GET_ARTIST}?app_id=web-desktop-app-v1.0&format=json&artist_id=${encodeURIComponent(artistId)}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getArtistAlbums(artistId, page = 1) {
        const url = `${EndPoints.GET_ARTIST_ALBUMS}?app_id=web-desktop-app-v1.0&format=json&artist_id=${encodeURIComponent(artistId)}&page_size=100&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getAlbum(albumId) {
        const url = `${EndPoints.GET_ALBUM}?app_id=web-desktop-app-v1.0&format=json&album_id=${encodeURIComponent(albumId)}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getAlbumTracks(albumId, page = 1) {
        const url = `${EndPoints.GET_ALBUM_TRACKS}?app_id=web-desktop-app-v1.0&format=json&album_id=${encodeURIComponent(albumId)}&page_size=100&page=${page}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrackLyricsTranslation(trackId, selectedLanguage) {
        const url = `${EndPoints.GET_TRACK_LYRICS_TRANSLATION}?app_id=web-desktop-app-v1.0&format=json&track_id=${encodeURIComponent(trackId)}&selected_language=${encodeURIComponent(selectedLanguage)}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }

    getTrackRichsync({
        commontrack_id = null,
        track_id = null,
        track_isrc = null,
        f_richsync_length = null,
        f_richsync_length_max_deviation = null,
    } = {}) {
        let url = `${EndPoints.GET_TRACK_RICHSYNC}?app_id=web-desktop-app-v1.0&format=json`;
        if (commontrack_id) url += `&commontrack_id=${encodeURIComponent(commontrack_id)}`;
        if (track_id) url += `&track_id=${encodeURIComponent(track_id)}`;
        if (track_isrc) url += `&track_isrc=${encodeURIComponent(track_isrc)}`;
        if (f_richsync_length) url += `&f_richsync_length=${encodeURIComponent(f_richsync_length)}`;
        if (f_richsync_length_max_deviation)
            url += `&f_richsync_length_max_deviation=${encodeURIComponent(f_richsync_length_max_deviation)}`;
        return this.makeRequest(this.makeSignedRequestUrl(url));
    }
}

export default MusixMatchAPI;

// debug demo usage
// const mmApi = new MusixMatchAPI();
// mmApi.init().then(() => {
//     mmApi.searchTracksCustom('&f_has_rich_sync=1&s_track_rating=desc').then((z)=>{
//         console.log(z.message.body.track_list.map(t => `${t.track.track_name} - ${t.track.artist_name} (${t.track.track_id})`));
//     })
// });