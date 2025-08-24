import { Button, ColorPaletteProp, Tooltip, VariantProp } from "@mui/joy";
import { ReactNode } from "react";

export default function CircleButton({
    icon,
    onClick,
    className = '',
    color = 'primary',
    size = 30,
    disabled = false,
    appearance = 'solid',
    sizeMultiplier = 0.5,
    tooltip = undefined,
    tooltipPlacement = 'top',
    tooltipAppearance = 'solid',
    tooltipColor = 'neutral',
}: {
    icon: string;
    onClick?: () => void;
    className?: string;
    color?: ColorPaletteProp,
    size?: number;
    disabled?: boolean;
    appearance?: VariantProp;
    sizeMultiplier?: number;
    tooltip?: ReactNode;
    tooltipPlacement?: "top" | "bottom" | "left" | "right" | "bottom-end" | "bottom-start" | "left-end" | "left-start" | "right-end" | "right-start" | "top-end" | "top-start";
    tooltipAppearance?: VariantProp;
    tooltipColor?: ColorPaletteProp;
}) {
    const iconContent = icon.includes('|') ? (
        <span className="fa-stack">
            {icon.split('|').map((part, index) => (
                <i key={index} className={part.trim() + ` fa-stack-1x`} />
            ))}
        </span>
    ) : (
        <i className={icon} />
    );

    const button = (
        <Button
            variant={appearance}
            className={`circle-button ${className}`}
            onClick={onClick}
            color={color}
            disabled={disabled}
            sx={{
                minWidth: size,
                width: size,
                height: size,
                minHeight: size,
                padding: 0,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * sizeMultiplier,
            }}
        >
            {iconContent}
        </Button>
    );

    return tooltip ? (
        <Tooltip title={tooltip} placement={tooltipPlacement} arrow variant={tooltipAppearance} color={tooltipColor}>
            {button}
        </Tooltip>
    ) : button;
}
