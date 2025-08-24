export function getCommonColors(image: HTMLImageElement | string, alpha=1) {
    return new Promise<string[]>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = typeof image === "string" ? image : image.src;
        
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            const colorCount: { [key: string]: number } = {};
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const colorKey = `${r},${g},${b}`;
                
                if (colorCount[colorKey]) {
                    colorCount[colorKey]++;
                } else {
                    colorCount[colorKey] = 1;
                }
            }
            
            // Extract two most common visually distinct and vibrant colors
            const entries = Object.entries(colorCount).sort((a, b) => b[1] - a[1]);
            const satThreshold = 0.5; // minimum saturation to consider vibrant
            // helper to compute saturation of an RGB key
            const getSaturation = (key: string) => {
                const [r, g, b] = key.split(',').map(n => parseInt(n, 10) / 255);
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const l = (max + min) / 2;
                const d = max - min;
                return d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
            };
            const vibrantEntries = entries.filter(([key]) => getSaturation(key) >= satThreshold);
            const source = vibrantEntries.length > 0 ? vibrantEntries : entries;
            const distinctColors: string[] = [];
            const threshold = 50; // minimum RGB distance to consider colors distinct

            if (source.length > 0) {
                const [firstKey] = source[0];
                distinctColors.push(`rgb(${firstKey},${alpha})`);
                const [r1, g1, b1] = firstKey.split(',').map(n => parseInt(n, 10));

                for (let i = 1; i < source.length && distinctColors.length < 2; i++) {
                    const [key] = source[i];
                    const [r2, g2, b2] = key.split(',').map(n => parseInt(n, 10));
                    const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
                    if (distance > threshold) {
                        distinctColors.push(`rgba(${key},${alpha})`);
                    }
                }

                // fallback to second most common if no visually distinct found
                if (distinctColors.length < 2 && entries.length > 1) {
                    const [, secondKey] = entries[1];
                    distinctColors.push(`rgba(${secondKey},${alpha})`);
                }
            }
            resolve(distinctColors);
        };
        
        img.onerror = (error) => {
            reject(error);
        };
    });
}

export function getForegroundFor(background: string) {
    if(background === "transparent" || background === "none") {
        return "#ffffff";
    }
    const rgb = background.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) || 
                background.match(/#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
    if (!rgb) return "#000000";

    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export function makeNotTooBright(color: string) {
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) ||
                color.match(/#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
    if (!rgb) return color;
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    const average = (r + g + b) / 3;
    const factor = 0.8;
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    return `rgb(${newR}, ${newG}, ${newB})`;
}