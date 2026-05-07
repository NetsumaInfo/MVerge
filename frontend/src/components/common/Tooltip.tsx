import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";

type TooltipSide = "top" | "bottom" | "left" | "right";

type TooltipProps = PropsWithChildren<{
  label: string;
  side?: TooltipSide;
  className?: string;
  disabled?: boolean;
}>;

const OFFSET_PX = 10;
const VIEWPORT_MARGIN_PX = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSideOrder(preferred: TooltipSide): TooltipSide[] {
  switch (preferred) {
    case "top":
      return ["top", "bottom", "right", "left"];
    case "bottom":
      return ["bottom", "top", "right", "left"];
    case "left":
      return ["left", "right", "top", "bottom"];
    case "right":
      return ["right", "left", "top", "bottom"];
    default:
      return ["top", "bottom", "right", "left"];
  }
}

function getFit(
  triggerRect: DOMRect,
  bubbleRect: DOMRect,
  side: TooltipSide
): boolean {
  switch (side) {
    case "top":
      return triggerRect.top - bubbleRect.height - OFFSET_PX >= VIEWPORT_MARGIN_PX;
    case "bottom":
      return (
        triggerRect.bottom + bubbleRect.height + OFFSET_PX <=
        window.innerHeight - VIEWPORT_MARGIN_PX
      );
    case "left":
      return triggerRect.left - bubbleRect.width - OFFSET_PX >= VIEWPORT_MARGIN_PX;
    case "right":
      return (
        triggerRect.right + bubbleRect.width + OFFSET_PX <=
        window.innerWidth - VIEWPORT_MARGIN_PX
      );
    default:
      return true;
  }
}

function getPosition(
  triggerRect: DOMRect,
  bubbleRect: DOMRect,
  side: TooltipSide
): { top: number; left: number } {
  switch (side) {
    case "top":
      return {
        top: triggerRect.top - bubbleRect.height - OFFSET_PX,
        left: triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2,
      };
    case "bottom":
      return {
        top: triggerRect.bottom + OFFSET_PX,
        left: triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2,
      };
    case "left":
      return {
        top: triggerRect.top + triggerRect.height / 2 - bubbleRect.height / 2,
        left: triggerRect.left - bubbleRect.width - OFFSET_PX,
      };
    case "right":
      return {
        top: triggerRect.top + triggerRect.height / 2 - bubbleRect.height / 2,
        left: triggerRect.right + OFFSET_PX,
      };
    default:
      return { top: 0, left: 0 };
  }
}

export default function Tooltip({
  label,
  side = "top",
  className = "",
  disabled = false,
  children,
}: TooltipProps) {
  if (!label) return <>{children}</>;

  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [resolvedSide, setResolvedSide] = useState<TooltipSide>(side);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const tooltipId = useId();

  const updatePosition = () => {
    const triggerEl = triggerRef.current;
    const bubbleEl = bubbleRef.current;
    if (!triggerEl || !bubbleEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const bubbleRect = bubbleEl.getBoundingClientRect();
    const sideOrder = getSideOrder(side);
    const bestSide = sideOrder.find((candidate) =>
      getFit(triggerRect, bubbleRect, candidate)
    ) ?? side;

    const next = getPosition(triggerRect, bubbleRect, bestSide);
    const clamped = {
      top: clamp(
        next.top,
        VIEWPORT_MARGIN_PX,
        window.innerHeight - bubbleRect.height - VIEWPORT_MARGIN_PX
      ),
      left: clamp(
        next.left,
        VIEWPORT_MARGIN_PX,
        window.innerWidth - bubbleRect.width - VIEWPORT_MARGIN_PX
      ),
    };

    setResolvedSide(bestSide);
    setCoords(clamped);
    setIsPositioned(true);
  };

  const schedulePositionUpdate = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updatePosition();
      rafRef.current = null;
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || disabled) return;
    setIsPositioned(false);
    schedulePositionUpdate();
  }, [isOpen, disabled, label, side]);

  useEffect(() => {
    if (!isOpen || disabled) return;

    const onViewportChange = () => schedulePositionUpdate();

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen, disabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (_event: MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleMouseLeave = (_event: MouseEvent<HTMLSpanElement>) => {
    setIsOpen(false);
  };

  const handleFocusCapture = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLSpanElement>) => {
    const nextFocusTarget = event.relatedTarget as Node | null;
    const current = triggerRef.current;
    if (current && nextFocusTarget && current.contains(nextFocusTarget)) {
      return;
    }
    setIsOpen(false);
  };

  const tooltipClassName = `amv-tooltip amv-tooltip--${side}${
    className ? ` ${className}` : ""
  }`;

  return (
    <span
      ref={triggerRef}
      className={tooltipClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      aria-describedby={isOpen && !disabled ? tooltipId : undefined}
    >
      {children}
      {isOpen &&
        !disabled &&
        createPortal(
          <span
            ref={bubbleRef}
            id={tooltipId}
            role="tooltip"
            className={`amv-tooltip__bubble amv-tooltip__bubble--${resolvedSide}${
              isPositioned ? " is-visible" : ""
            }`}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
