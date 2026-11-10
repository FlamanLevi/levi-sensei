import React, { useState } from 'react';
import { getFlagTwemojiUrl } from '@/types/roster';
import { getAuraStyle } from '@/services/shopCatalog';

interface AvatarDisplayProps {
  avatar: string;
  className?: string;
  sizeClassName?: string;
  frameId?: string;
  auraId?: string;
  showBadge?: boolean;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatar,
  className = '',
  sizeClassName = 'w-6 h-6',
  frameId,
  auraId,
  showBadge = true
}) => {
  const [loadError, setLoadError] = useState(false);
  const flagUrl = getFlagTwemojiUrl(avatar);
  const aura = getAuraStyle(frameId || auraId);

  const innerElement = flagUrl && !loadError ? (
    <img
      src={flagUrl}
      alt={avatar}
      className={`inline-block ${sizeClassName} object-contain rounded-xs select-none pointer-events-none drop-shadow-xs ${className}`}
      loading="lazy"
      onError={() => setLoadError(true)}
    />
  ) : (
    <span className={className}>{avatar}</span>
  );

  if (!aura) {
    return innerElement;
  }

  return (
    <span className={`relative inline-flex items-center justify-center rounded-2xl p-0.5 ${aura.ringClass} ${aura.shadowClass} transition-all duration-300`}>
      {innerElement}
      {showBadge && aura.particleEmoji && (
        <span className="absolute -top-1.5 -right-1.5 text-[11px] leading-none pointer-events-none drop-shadow-md select-none animate-bounce">
          {aura.particleEmoji}
        </span>
      )}
    </span>
  );
};
