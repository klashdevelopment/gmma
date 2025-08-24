"use client";
import { useRef, useEffect, useState, CSSProperties } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { usePlaying } from "../hooks/usePlaying";
import useServer from "../hooks/useServer";
import { Button } from "@mui/joy";
import "./tunnel.css";
import { LyricFetch } from "../lyrics/page";
import { RichSyncLyrics, SyncedLyrics } from "../lyrics/types";

export default function Tunnel() {
    const playing = usePlaying();
    const [server] = useServer();
    const router = useRouter();
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [lyrics, setLyrics] = useState<LyricFetch | null>(null);

    const [reloadKey, setReloadKey] = useState(0);

    function Do() {
        let renderer: THREE.WebGLRenderer | null = null;
        let scene: THREE.Scene | null = null;
        let camera: THREE.OrthographicCamera | null = null;
        let material: THREE.ShaderMaterial | null = null;
        let animationId: number | null = null;
        const clock = new THREE.Clock();

        var keep = true;
        if (playing.song) {
            fetch(`${server}/lyrics/${playing.song.uuid}`)
                .then((res) => {
                    if (!res.ok) {
                        if (res.status === 404) {
                            console.log("No lyrics found for this song.");
                            setLyrics(null);
                            keep = false;
                            return;
                        }
                        throw new Error(`Failed to fetch lyrics: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    if (!keep) return;
                    setLyrics(data || null);
                })
                .catch((err) => {
                    setLyrics(null);
                });
        } else {
            setLyrics(null);
        }

        const fragmentShader = `
precision mediump float;

const float kPi = 3.1415927;

uniform float u_time;
uniform float u_speed;
uniform float u_blend;
uniform bool u_square;
uniform bool u_center;
uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
uniform vec2 u_resolution;
uniform vec3 u_center_color;
uniform float u_center_radius;
uniform float u_blur_intensity;

varying vec2 vUv;

// Function to get tunnel UV coordinates
vec2 getTunnelUV(vec2 p) {
    float a = atan(p.y, p.x);
    if (p.x < 0.0) {
        a = -a;
    }
    
    float r = 0.;
    if(u_square) {
        // square tunnel
        vec2 p2 = p * p, p4 = p2 * p2, p8 = p4 * p4;
        r = pow(p8.x + p8.y, 1.0 / 8.0);
    } else {
        // cylindrical tunnel
        r = length(p);
    }
    
    float tunnelSpeed = u_speed;
    float tunnelPos = 0.3 / r + u_time * tunnelSpeed;
    return vec2(mod(tunnelPos, 1.0), mod(0.5 + a / kPi, 1.0));
}

void main() {
    // normalized coordinates
    vec2 p = (2. * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    
    // Calculate distance from center for blur effect
    float centerDistance = length(p);
    
    // Calculate blur amount based on distance from center (inverted - more blur at center)
    float blurAmount = u_blur_intensity * (1.0 - smoothstep(0.0, 1.5, centerDistance));
    
    vec3 col = vec3(0.0);
    
    if (blurAmount > 0.001) {
        // Apply blur by sampling multiple points
        float totalWeight = 0.0;
        int samples = 8;
        
        for (int i = 0; i < 8; i++) {
            float angle = float(i) * kPi * 2.0 / 8.0;
            vec2 offset = vec2(cos(angle), sin(angle)) * blurAmount * 0.01;
            vec2 sampleP = p + offset;
            
            vec2 uv = getTunnelUV(sampleP);
            
            // Sample both textures
            vec3 sampleCol = texture2D(u_tex0, uv).xyz;
            vec3 sampleCol1 = texture2D(u_tex1, uv).xyz;
            vec3 blendedCol = mix(sampleCol, sampleCol1, u_blend);
            
            // Weight samples (center sample gets more weight)
            float weight = 1.0 - (length(offset) / (blurAmount * 0.01));
            col += blendedCol * weight;
            totalWeight += weight;
        }
        
        // Add center sample with higher weight
        vec2 centerUV = getTunnelUV(p);
        vec3 centerCol = texture2D(u_tex0, centerUV).xyz;
        vec3 centerCol1 = texture2D(u_tex1, centerUV).xyz;
        vec3 centerBlended = mix(centerCol, centerCol1, u_blend);
        
        col += centerBlended * 2.0;
        totalWeight += 2.0;
        
        col /= totalWeight;
    } else {
        // No blur - regular sampling
        vec2 uv = getTunnelUV(p);
        col = texture2D(u_tex0, uv).xyz;
        vec3 col1 = texture2D(u_tex1, uv).xyz;
        col = mix(col, col1, u_blend);
    }

    if(u_center) {
        // fade out from center
        float fadeAmount = 1.0 - smoothstep(0.0, u_center_radius, centerDistance);
        col = mix(col, u_center_color, fadeAmount);
    }

    gl_FragColor = vec4(col, 1.);
}
    `;

        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight-60);
        renderer.setClearColor(0x000000, 1);
        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const textureLoader = new THREE.TextureLoader();

        // Fix: Ensure artwork path is valid
        const artworkPath = playing.song?.artwork
            ? server + playing.song.artwork
            : "/default-artwork.png";
        const defaultTexture = textureLoader.load(artworkPath, () => {
            if (renderer && material) {
                renderer.render(scene!, camera!);
            }
        });

        material = new THREE.ShaderMaterial({
            uniforms: {
                u_tex0: { value: defaultTexture },
                u_tex1: { value: defaultTexture },
                u_time: { value: 0.0 },
                u_blend: { value: 0.0 },
                u_speed: { value: 0.15 },
                u_square: { value: false },
                u_center: { value: false },
                u_center_radius: { value: 1.0 },
                u_center_color: { value: new THREE.Color(0x000000) },
                u_blur_intensity: { value: 2.0 }, // Controls how much blur to apply
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight-60) }
            },
            fragmentShader,
            vertexShader
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        // Reset clock on component mount
        clock.start();

        function animate() {
            if (material) {
                material.uniforms.u_time.value = clock.getElapsedTime();
            }
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
            animationId = requestAnimationFrame(animate);
        }
        animate();

        // Handle resizing
        const handleResize = () => {
            if (renderer && material) {
                renderer.setSize(window.innerWidth, window.innerHeight-60);
                material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight-60);
            }
        };
        window.addEventListener("resize", handleResize);

        // Cleanup
        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            window.removeEventListener("resize", handleResize);
            if (renderer) {
                renderer.dispose();
                if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
                    mountRef.current.removeChild(renderer.domElement);
                }
            }
            // Stop the clock
            clock.stop();
        };
    }
    useEffect(() => {
        var c: any, t: any;
        if (playing.song) {
            t = setTimeout(() => {
                if(c) c();
                c = Do();
            }, 10);
        } else {
            if (mountRef.current) {
                mountRef.current.innerHTML = '';
            }
        }

        return () => {
            if (mountRef.current) {
                mountRef.current.innerHTML = '';
            }
            clearTimeout(t);
            if (c) c();
        };
    }, [playing.song, reloadKey]);

    var lyricStyle: CSSProperties = {
        position: "absolute",
        bottom: 100, left: 0, width: '100%', height: '60px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    var lyricPstyle: CSSProperties = { display: 'flex', };

    return (
        <div style={{ width: "100%", height: "100%", inset: 0, zIndex: 0, position: "relative", overflow: 'hidden' }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
            <div className="tunnel-song">
                {playing.song ? (<>
                    <img src={`${server}${playing.song.artwork}`} alt="Song Artwork" />
                </>) : <></>}
                {lyrics?.richsync ? <RichSyncLyrics lyrics={lyrics} playing={playing} style={lyricStyle} p_style={lyricPstyle} onlyCurrentLine /> : (
                    lyrics?.synced ? <SyncedLyrics lyrics={lyrics} playing={playing} style={lyricStyle} p_style={lyricPstyle} onlyCurrentLine /> : null
                )}
            </div>
            <Button
                onClick={() => { router.push('/') }}
                sx={{ position: "absolute", top: 10, left: 10, zIndex: 2, background: 'rgba(0,0,0,0.4)' }}
                variant="outlined"
                color="neutral"
            >
                <i className="fa-solid fa-arrow-left"></i>
            </Button>
            <Button
                onClick={() => setReloadKey(k => k + 1)}
                sx={{ position: "absolute", top: 10, left: 65, zIndex: 2, background: 'rgba(0,0,0,0.4)' }}
                variant="outlined"
                color="neutral"
            >
                <i className="fa-solid fa-refresh"></i>
            </Button>
        </div>
    );
}