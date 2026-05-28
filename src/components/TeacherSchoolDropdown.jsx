import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { ref, update, onValue } from 'firebase/database';
import schoolsData from '../data/schools.json';

export function TeacherSchoolDropdown({ t, lang }) {
  const { user } = useAuth();
  const [activeSchoolId, setActiveSchoolId] = useState('');

  useEffect(() => {
    if (!user) return;
    const teacherRef = ref(db, `users/${user.uid}/teacherProfile`);
    const unsub = onValue(teacherRef, (snap) => {
      if (snap.exists() && snap.val().schoolId) {
        setActiveSchoolId(snap.val().schoolId);
      }
    });
    return () => unsub();
  }, [user]);

  const handleSchoolChange = async (e) => {
    const newSchoolId = e.target.value;
    setActiveSchoolId(newSchoolId);
    if (user) {
      await update(ref(db, `users/${user.uid}/teacherProfile`), { schoolId: newSchoolId });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-col sm:flex-row">
      <span className="text-sm font-bold text-[var(--primary-color)]">{t("Active School", "現在の学校")}</span>
      <select
        value={activeSchoolId}
        onChange={handleSchoolChange}
        className="appearance-none bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-2 border-[var(--primary-color)]/30 rounded-lg py-1 pl-3 pr-8 font-inherit text-sm font-bold cursor-pointer transition-colors duration-300 focus:outline-none focus:border-[var(--primary-color)] bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_12_12%22%3E%3Cpath_fill=%22%232563eb%22_d=%22M2_4l4_4_4-4z%22/%3E%3C/svg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_12_12%22%3E%3Cpath_fill=%22%2360a5fa%22_d=%22M2_4l4_4_4-4z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]"
      >
        <option value="" disabled>{t("Select...", "選択...")}</option>
        {schoolsData.schools.map(s => (
          <option key={s.id} value={s.id} className="bg-[var(--surface-color)] text-[var(--text-color)]">
            {lang === 'en' ? s.name_en : s.name_ja}
          </option>
        ))}
      </select>
    </div>
  );
}
