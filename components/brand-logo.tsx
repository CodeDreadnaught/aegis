import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "grid size-11 place-items-center overflow-hidden rounded-md shadow-lg shadow-slate-950/18",
        className
      )}
    >
      <Image
        alt="AEGIS logo"
        className={cn("size-full object-contain", imageClassName)}
        height={512}
        priority={priority}
        src="/logo.png"
        width={512}
      />
    </div>
  );
}
