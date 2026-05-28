import React from 'react';
import { shopData } from '../data/shop';

export function Avatar({ profile, className = "" }) {
  if (!profile) return null;

  // Find equipped avatar
  let avatarValue = profile.name ? profile.name.charAt(0).toUpperCase() : "?";
  let isEmoji = false;
  
  if (profile.equippedAvatar) {
    // Search for it in the pools
    for (const category of shopData.avatars) {
      const item = category.items.find(i => i.id === profile.equippedAvatar);
      if (item) {
        avatarValue = item.value;
        isEmoji = true;
        break;
      }
    }
  }

  // Use a fallback background if they don't have a color equipped
  return (
    <div className={`flex items-center justify-center rounded-full shadow-inner ${isEmoji ? 'bg-white/80 dark:bg-gray-800' : 'bg-[var(--border-color)]'} ${className}`}>
      {avatarValue}
    </div>
  );
}

export function PlayerCard({ profile, children, className = "", style = {} }) {
  if (!profile) return null;
  
  let colorClass = shopData.colors[0].value; // default Slate
  if (profile.equippedColor) {
    const c = shopData.colors.find(col => col.id === profile.equippedColor);
    if (c) colorClass = c.value;
  }

  // We ensure border-2 and rounded-xl as a base
  return (
    <div className={`border-4 rounded-2xl flex flex-col items-center justify-center shadow-sm relative ${colorClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
