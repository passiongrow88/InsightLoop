import React, { useEffect, useRef, useState } from "react";
import type { V5VideoAsset } from "../../src/v5/assetManifest";

interface Props extends React.VideoHTMLAttributes<HTMLVideoElement> {
  asset: V5VideoAsset;
  label: string;
  onAssetUnavailable?: () => void;
}

/**
 * V5 video loader.
 *
 * It tries the approved local static asset first. If animation playback fails,
 * the approved local poster remains visible instead of covering the study with
 * an error panel. We never replace an approved animation with fake motion.
 */
const V5AssetVideo: React.FC<Props> = ({
  asset,
  label,
  onAssetUnavailable,
  className,
  ...videoProps
}) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const sources = [asset.local, asset.previewFallback].filter(Boolean);

  useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
  }, [asset.local, asset.previewFallback]);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((x) => x + 1);
      return;
    }
    setFailed(true);
    onAssetUnavailable?.();
  };

  if (failed) {
    if (asset.poster) {
      return (
        <img
          src={asset.poster}
          alt={label}
          className={className}
        />
      );
    }

    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center bg-[#2b2119]/85 text-[#f4ead9] text-xs tracking-wide ${className || ""}`}
      >
        {label} 素材载入失败
      </div>
    );
  }

  return (
    <video
      ref={ref}
      {...videoProps}
      className={className}
      poster={asset.poster}
      src={sources[sourceIndex]}
      onError={handleError}
      aria-label={label}
    />
  );
};

export default V5AssetVideo;
