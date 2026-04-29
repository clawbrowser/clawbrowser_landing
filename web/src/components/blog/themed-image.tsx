"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

interface ThemedImageProps {
  light: string;
  dark: string;
  alt: string;
  /** Skip the default wrapper div — use when embedding inside a custom container */
  bare?: boolean;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ThemedImage({
  light,
  dark,
  alt,
  bare,
  className,
  width = 1200,
  height = 630,
  priority,
}: ThemedImageProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = !mounted || resolvedTheme !== "dark" ? light : dark;

  if (bare) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className ?? "w-full object-cover"}
        priority={priority}
        unoptimized
      />
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className ?? "w-full object-cover"}
        priority={priority}
        unoptimized
      />
    </div>
  );
}
