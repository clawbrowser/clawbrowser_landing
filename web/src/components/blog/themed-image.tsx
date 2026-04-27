"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

interface ThemedImageProps {
  light: string;
  dark: string;
  alt: string;
}

export function ThemedImage({ light, dark, alt }: ThemedImageProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = !mounted || resolvedTheme !== "dark" ? light : dark;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={630}
        className="w-full object-cover"
        unoptimized
      />
    </div>
  );
}
