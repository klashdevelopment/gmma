export default function CustomTooltip({
    children,
    tooltip,
    open = false,
    className = "",
}: {
    children: React.ReactNode;
    tooltip: React.ReactNode;
    open?: boolean;
    className?: string;
}) {
    return (
        <div className={`custom-tooltip ${className}`}>
            {open && <div className="tooltip-content">{tooltip}</div>}
            {children}
        </div>
    );
}