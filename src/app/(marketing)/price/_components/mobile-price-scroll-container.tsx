"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MobilePriceScrollContainer({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        // Find the highlighted card
        const highlightedCard = container.querySelector('[data-highlight="true"]');

        if (highlightedCard) {
            // Calculate center position
            const containerWidth = container.clientWidth;
            const cardWidth = (highlightedCard as HTMLElement).offsetWidth;
            const cardLeft = (highlightedCard as HTMLElement).offsetLeft;

            const scrollLeft = cardLeft - containerWidth / 2 + cardWidth / 2;

            container.scrollTo({
                left: scrollLeft,
                behavior: "smooth",
            });
        }
    }, []);

    return (
        <div className="relative">
            <div className="md:hidden mb-2 text-center text-xs text-muted-foreground animate-pulse">
                Swipe left or right to view more options
            </div>
            <div
                ref={scrollRef}
                className={cn(
                    "flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 -mx-4 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:mx-0 md:pb-0 scrollbar-hide",
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}
