
import { useState } from "react";
import { UserRound } from "lucide-react";

import "./Avatar.css";

// Round profile picture: the photo when there is one, otherwise the person's initial (or a generic icon).
// If the photo fails to load it falls back the same way instead of showing a broken image.
export default function Avatar({
  src,
  name = "",
  size = 40,
  alt = "",
  className = "",
}) {
  // Remembers which link failed, so a new link gets a fresh try
  const [failedSrc, setFailedSrc] = useState(null);

  const showImage = Boolean(src) && failedSrc !== src;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ "--avatar-size": `${size}px` }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="avatar__image"
          onError={() => setFailedSrc(src)}
        />
      ) : initial ? (
        <span className="avatar__initial" aria-hidden="true">
          {initial}
        </span>
      ) : (
        <UserRound size={Math.round(size * 0.5)} aria-hidden="true" />
      )}
    </span>
  );
}
