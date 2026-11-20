import React, { useState } from 'react';
import { StudentProfile } from '@/types/roster';
import { updateStudentProfileInfo } from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import confetti from 'canvas-confetti';
import { ProfileSetupWizardModal, ProfileWizardResult } from './ProfileSetupWizardModal';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: StudentProfile;
  onClose: () => void;
  onUpdated: (newProfile: StudentProfile) => void;
  onResetSeat?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdated,
  onResetSeat,
}) => {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (result: ProfileWizardResult) => {
    setSaving(true);
    try {
      soundEffects.playCorrect();
      const updated = await updateStudentProfileInfo(
        profile.schoolId,
        profile.classId,
        profile.attendanceNumber,
        {
          nickname: result.nickname,
          callsign: result.callsign,
          avatar: result.avatar,
          secretCharm: result.secretCharm,
        }
      );
      if (updated) {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.6 },
        });
        onUpdated(updated);
        onClose();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileSetupWizardModal
      isOpen={isOpen}
      mode="edit"
      seatNumber={profile.attendanceNumber}
      classId={profile.classId}
      initialNickname={profile.nickname}
      initialAvatar={profile.avatar}
      initialSecretCharm={profile.secretCharm}
      initialCallsign={profile.callsign}
      frameId={profile.equipped?.frame}
      unlockedRareAvatars={profile.inventory?.unlockedAvatars || []}
      submitting={saving}
      onClose={onClose}
      onResetSeat={onResetSeat}
      onSubmit={handleSubmit}
    />
  );
};
