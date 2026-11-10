import React, { useState } from 'react';
import { ConcentrationPairGame } from './ConcentrationPairGame';
import { ConcentrationTournamentHost } from './ConcentrationTournamentHost';

interface ConcentrationGameProps {
  onExit?: () => void;
}

export const ConcentrationGame: React.FC<ConcentrationGameProps> = ({ onExit }) => {
  const [viewMode, setViewMode] = useState<'PAIR' | 'SPECTATOR_TV'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('mode') === 'tv' ||
        params.get('spectator') === '1' ||
        params.get('host') === '1'
      ) {
        return 'SPECTATOR_TV';
      }
    }
    return 'PAIR';
  });

  const [activeRoomCode, setActiveRoomCode] = useState<string>('');

  if (viewMode === 'SPECTATOR_TV') {
    return (
      <ConcentrationTournamentHost
        initialRoomCode={activeRoomCode}
        onExit={() => setViewMode('PAIR')}
      />
    );
  }

  return (
    <ConcentrationPairGame
      initialRoomCode={activeRoomCode}
      onOpenSpectatorTV={(code) => {
        if (code) setActiveRoomCode(code);
        setViewMode('SPECTATOR_TV');
      }}
      onExit={onExit}
    />
  );
};
