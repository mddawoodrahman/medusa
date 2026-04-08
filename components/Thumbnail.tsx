import React from "react";
import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";

interface Props {
  type: string;
  extension: string;
  url?: string;
  imageClassName?: string;
  className?: string;
}

export const Thumbnail = ({
  type,
  extension,
  url = "",
  imageClassName,
  className,
}: Props) => {
  const isImage = type === "image" && extension !== "svg";
  const isProtectedInternalImage =
    isImage && url.startsWith("/api/files/download/");
  const protectedFileId = isProtectedInternalImage
    ? url.match(/\/api\/files\/download\/([^?]+)/)?.[1]
    : null;
  const imageSrc = protectedFileId
    ? `/api/files/download/${protectedFileId}?mode=thumbnail&w=160&h=160`
    : isImage
      ? url
      : getFileIcon(extension, type);

  return (
    <figure className={cn("thumbnail", className)}>
      <Image
        src={imageSrc}
        alt="thumbnail"
        width={100}
        height={100}
        loading="lazy"
        unoptimized={isProtectedInternalImage}
        className={cn(
          "size-8 object-contain",
          imageClassName,
          isImage && "thumbnail-image",
        )}
      />
    </figure>
  );
};
export default Thumbnail;
