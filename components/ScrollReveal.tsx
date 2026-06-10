"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "fade-up" | "fade-left" | "fade-right" | "scale-up";

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}

const HIDDEN: Record<Variant, React.CSSProperties> = {
  "fade-up":    { opacity: 0, transform: "translateY(56px)" },
  "fade-left":  { opacity: 0, transform: "translateX(72px)" },
  "fade-right": { opacity: 0, transform: "translateX(-72px)" },
  "scale-up":   { opacity: 0, transform: "scale(0.92)" },
};

const VISIBLE: React.CSSProperties = { opacity: 1, transform: "none" };

export function ScrollReveal({ children, variant = "fade-up", delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(visible ? VISIBLE : HIDDEN[variant]),
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
