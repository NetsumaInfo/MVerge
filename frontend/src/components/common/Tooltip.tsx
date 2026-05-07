import type { PropsWithChildren } from "react";

type TooltipSide = "top" | "bottom" | "left" | "right";

type TooltipProps = PropsWithChildren<{
  label: string;
  side?: TooltipSide;
  className?: string;
  disabled?: boolean;
}>;

export default function Tooltip({
  label,
  side = "top",
  className = "",
  disabled = false,
  children,
}: TooltipProps) {
  if (!label) return <>{children}</>;

  const tooltipClassName = `amv-tooltip amv-tooltip--${side}${
    className ? ` ${className}` : ""
  }`;

  return (
    <span className={tooltipClassName}>
      {children}
      {!disabled && (
        <span role="tooltip" className="amv-tooltip__bubble">
          {label}
        </span>
      )}
    </span>
  );
}
