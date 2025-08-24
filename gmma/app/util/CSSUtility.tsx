import { CSSProperties } from "react";

export function css(css: CSSProperties & any): CSSProperties {
    return css as CSSProperties;
}