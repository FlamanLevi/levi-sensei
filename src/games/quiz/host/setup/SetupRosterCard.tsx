import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { SchoolId } from '@/types/roster';

interface ScheduleSuggestionInfo {
  period: {
    period: number;
    name: string;
    jaName: string;
  };
  classId: string;
}

interface SetupRosterCardProps {
  activeSchool: SchoolId;
  activeGrade: string;
  activeClassId: string;
  selectedClassId: string;
  recordRoster: boolean;
  classGradeTab: string;
  availableClassesForGrade: string[];
  suggestedClass: string | null;
  scheduleSuggestion: ScheduleSuggestionInfo | null;
  isMismatchWithTimetable: boolean;
  onSelectClass: (classId: string) => void;
  onSelectTestMode: () => void;
  onToggleRecordRoster: (shouldRecord: boolean) => void;
  onSetClassGradeTab: (gradeNum: string) => void;
  onSwitchToSuggestedClass: (suggestedClass: string) => void;
}

export const SetupRosterCard: React.FC<SetupRosterCardProps> = ({
  activeSchool,
  activeGrade,
  selectedClassId,
  recordRoster,
  classGradeTab,
  availableClassesForGrade,
  suggestedClass,
  scheduleSuggestion,
  isMismatchWithTimetable,
  onSelectClass,
  onSelectTestMode,
  onToggleRecordRoster,
  onSetClassGradeTab,
  onSwitchToSuggestedClass,
}) => {
  const { t, language } = useLanguage();
  const gradeDigit = activeGrade.replace('ES_G', '');

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{selectedClassId === 'TEST' || !recordRoster ? '🧪' : '🏫'}</span>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>
                {activeSchool === 'toyogaoka'
                  ? language === 'ja'
                    ? '豊ヶ丘小学校'
                    : 'Toyogaoka Elementary'
                  : language === 'ja'
                    ? '二子玉川小学校'
                    : 'Futakotamagawa Elementary'}
              </span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t('Target Roster:', '記録先クラス:')}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-white font-black text-[11px] ${
                  selectedClassId === 'TEST' || !recordRoster ? 'bg-purple-600' : 'bg-indigo-600'
                }`}
              >
                {selectedClassId === 'TEST' || !recordRoster
                  ? t('🧪 TEST (PIN: 9xxx)', '🧪 お試しテスト (9xxx)')
                  : selectedClassId}
              </span>
              {selectedClassId !== 'TEST' && recordRoster && selectedClassId.split('-')[0] !== gradeDigit && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {language === 'ja' ? `出題: ${activeGrade} 単元` : `Deck: ${activeGrade}`}
                </span>
              )}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {selectedClassId === 'TEST' || !recordRoster
                ? t(
                    'Test Mode: Room PIN is 9xxx. Scores & roster are NOT saved.',
                    'お試しテストモード: PINは9xxxになります。クラス記録やXPは保存されません。'
                  )
                : recordRoster
                  ? t('Student XP & attendance sync is ENABLED (Roster Sync ON)', '児童のXP・出席番号のセーブが有効です')
                  : t('Guest / Practice Mode (Scores not saved)', 'お試しモード・スコアは記録されません')}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 self-start sm:self-auto">
          <input
            type="checkbox"
            checked={recordRoster && selectedClassId !== 'TEST'}
            onChange={(e) => onToggleRecordRoster(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
          />
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
            {t('Save Attendance & XP', '出席番号・XPを記録')}
          </span>
        </label>
      </div>

      {/* 1-Tap Class Selection with Grade Tabs */}
      <div className="flex flex-col gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
        {/* Grade Tabs (1-6) */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="text-sm">🏫</span>
            {language === 'ja' ? <ruby>学年<rt>がくねん</rt></ruby> : 'Grade:'}
          </span>
          {['1', '2', '3', '4', '5', '6'].map((gNum) => {
            const isTabActive = classGradeTab === gNum;
            const hasSelectedClass = selectedClassId.startsWith(`${gNum}-`);
            return (
              <button
                key={gNum}
                type="button"
                onClick={() => onSetClassGradeTab(gNum)}
                className={`h-7 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  isTabActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : hasSelectedClass
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>
                  {gNum}
                  {language === 'ja' ? '年' : 'G'}
                </span>
                {hasSelectedClass && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
              </button>
            );
          })}
        </div>

        {/* Class Buttons for Active Grade Tab */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 mr-1 shrink-0 whitespace-nowrap">
            {language === 'ja' ? (
              <>
                <ruby>{classGradeTab}年<rt>ねん</rt></ruby>クラス<ruby>選択<rt>せんたく</rt></ruby>:
              </>
            ) : (
              `G${classGradeTab} Classes:`
            )}
          </span>
          {availableClassesForGrade.map((cId) => {
            const isSelected = selectedClassId === cId && recordRoster;
            const isSuggested = suggestedClass === cId;
            return (
              <button
                key={cId}
                type="button"
                onClick={() => onSelectClass(cId)}
                className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 dark:ring-indigo-500 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{cId}</span>
                {isSuggested && (
                  <span
                    className={`text-[10px] px-1 py-0.5 rounded font-black leading-none ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    🔔 {scheduleSuggestion?.period.period}
                    {language === 'ja' ? '校時' : 'P'}
                  </span>
                )}
              </button>
            );
          })}

          {/* Dedicated Test Game Pill (PIN 9xxx, unrecorded) */}
          <button
            type="button"
            onClick={onSelectTestMode}
            className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              selectedClassId === 'TEST' || !recordRoster
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400 dark:ring-purple-500 scale-105'
                : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
            }`}
            title={t('Test game (Room PIN 9xxx, unrecorded)', 'お試しテスト (PIN: 9xxx、記録なし)')}
          >
            <span>🧪</span>
            <span>{t('Test Game (9xxx)', 'お試しテスト (9xxx)')}</span>
          </button>
        </div>
      </div>

      {/* Timetable Mismatch Notice & 1-Tap Fast Switch */}
      {isMismatchWithTimetable && suggestedClass && (
        <div className="flex items-center justify-between gap-3 p-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🔔</span>
            <span className="truncate">
              {language === 'ja' ? (
                <>
                  <ruby>時間割<rt>じかんわり</rt></ruby>（{scheduleSuggestion?.period.name} {scheduleSuggestion?.period.jaName}）の<ruby>予定<rt>よてい</rt></ruby>は{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">{suggestedClass}</strong> です。
                </>
              ) : (
                <>
                  Timetable for <strong>{scheduleSuggestion?.period.name}</strong> ({scheduleSuggestion?.period.jaName}) is <strong>{suggestedClass}</strong>.
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchToSuggestedClass(suggestedClass)}
            className="h-7 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
          >
            <span>⚡</span>
            <span>{language === 'ja' ? `${suggestedClass} に切替` : `Switch to ${suggestedClass}`}</span>
          </button>
        </div>
      )}
    </div>
  );
};
