import { QuizPlayer, QuizQuestion, AwardCategoryToggles, ClassroomAward } from './types';

function getValidAnswers(player: QuizPlayer) {
  if (!player.answers) return [];
  return Object.values(player.answers).filter(
    (a): a is QuizPlayer['answers'][number] => Boolean(a && typeof a === 'object' && typeof a.questionIndex === 'number')
  );
}

export function calculateClassroomAwards(
  playersRecord: Record<string, QuizPlayer>,
  questions: QuizQuestion[],
  toggles: AwardCategoryToggles,
  troubleWordIds: string[] = []
): ClassroomAward[] {
  const players = Object.values(playersRecord);
  if (players.length === 0) return [];

  const awards: ClassroomAward[] = [];
  const totalQ = questions.length;
  const halfQ = Math.floor(totalQ / 2);

  // -------------------------------------------------------------
  // 1. CORE AWARDS (Always-On)
  // -------------------------------------------------------------

  // ⚡ Speed Star
  const correctPlayers = players.filter(p => p.correctCount > 0);
  if (correctPlayers.length > 0) {
    let bestAvg = 999999;
    let speedStar: QuizPlayer | null = null;

    for (const p of correctPlayers) {
      const correctTimes = getValidAnswers(p)
        .filter(a => a.isCorrect)
        .map(a => a.timeTakenMs);
      if (correctTimes.length > 0) {
        const avg = correctTimes.reduce((sum, t) => sum + t, 0) / correctTimes.length;
        if (avg < bestAvg) {
          bestAvg = avg;
          speedStar = p;
        }
      }
    }

    if (!speedStar) {
      const fastPlayers = correctPlayers
        .filter(p => p.fastestTimeMs && p.fastestTimeMs < 999999)
        .sort((a, b) => (a.fastestTimeMs || 999999) - (b.fastestTimeMs || 999999));
      if (fastPlayers.length > 0) {
        speedStar = fastPlayers[0];
        bestAvg = speedStar.fastestTimeMs || 1500;
      }
    }

    if (speedStar) {
      const avgSec = (bestAvg / 1000).toFixed(1);
      awards.push({
        id: 'speed_star',
        title: 'Speed Star',
        jaTitle: 'スピードスター賞',
        description: `平均 ${avgSec}秒で正解！電光石火の早押しマスター`,
        jaDescription: `平均 ${avgSec}秒で正解！電光石火の早押しマスター`,
        enDescription: `Answered correctly in an average of ${avgSec}s! Lightning-fast buzzer master`,
        icon: 'Zap',
        color: 'from-amber-400 to-orange-500',
        badge: '⚡',
        recipients: [speedStar.nickname]
      });
    }
  }

  // 🔥 On Fire
  let maxStreakVal = 0;
  players.forEach(p => {
    if (p.maxStreak > maxStreakVal) maxStreakVal = p.maxStreak;
  });

  if (maxStreakVal >= 2) {
    const streakHolders = players.filter(p => p.maxStreak === maxStreakVal).map(p => p.nickname);
    awards.push({
      id: 'on_fire',
      title: 'On Fire',
      jaTitle: '炎のストリーク賞',
      description: `怒涛の ${maxStreakVal}問連続正解！誰も止められない絶好調`,
      jaDescription: `怒涛の ${maxStreakVal}問連続正解！誰も止められない絶好調`,
      enDescription: `A sizzling streak of ${maxStreakVal} correct in a row! Unstoppable momentum`,
      icon: 'Flame',
      color: 'from-red-500 to-rose-600',
      badge: '🔥',
      recipients: streakHolders.slice(0, 3)
    });
  }

  // 🎯 Sniper (High Accuracy Precision)
  const sniperCandidates = players
    .filter(p => (p.totalAnswered || 0) >= 3 && (p.correctCount || 0) > 0)
    .sort((a, b) => {
      const accB = (b.correctCount / b.totalAnswered);
      const accA = (a.correctCount / a.totalAnswered);
      return accB - accA || b.correctCount - a.correctCount;
    });

  if (sniperCandidates.length > 0) {
    const topAcc = Math.round((sniperCandidates[0].correctCount / sniperCandidates[0].totalAnswered) * 100);
    if (topAcc >= 70) {
      const bestSnipers = sniperCandidates.filter(p => Math.round((p.correctCount / p.totalAnswered) * 100) === topAcc);
      awards.push({
        id: 'sniper',
        title: 'Sniper',
        jaTitle: 'スナイパー賞',
        description: `正解率 ${topAcc}%！ミスを恐れず的確に答え抜いた精密射撃手`,
        jaDescription: `正解率 ${topAcc}%！ミスを恐れず的確に答え抜いた精密射撃手`,
        enDescription: `${topAcc}% accuracy! Sharp precision aiming on every target`,
        icon: 'Crosshair',
        color: 'from-blue-500 to-indigo-600',
        badge: '🎯',
        recipients: bestSnipers.map(p => p.nickname).slice(0, 3)
      });
    }
  }

  // -------------------------------------------------------------
  // 2. EFFORT & GROWTH
  // -------------------------------------------------------------
  if (toggles.effortGrowth) {
    // 💫 Never Give Up (High Total Attempted / Relentless Grit)
    const maxAnswered = Math.max(...players.map(p => p.totalAnswered || 0));
    if (maxAnswered >= 3) {
      const topAnswerers = players.filter(p => (p.totalAnswered || 0) === maxAnswered);
      awards.push({
        id: 'never_give_up',
        title: 'Never Give Up',
        jaTitle: 'あきらめない心賞',
        description: `最後まであきらめずに ${maxAnswered}問挑戦！素晴らしい粘り強さ`,
        jaDescription: `最後まであきらめずに ${maxAnswered}問挑戦！素晴らしい粘り強さ`,
        enDescription: `Challenged ${maxAnswered} questions without ever giving up! Outstanding perseverance`,
        icon: 'Heart',
        color: 'from-pink-500 to-rose-500',
        badge: '💫',
        recipients: topAnswerers.map(p => p.nickname).slice(0, 3)
      });
    }

    // 🚀 Rising Star
    let maxSecondHalfGain = 0;
    let risingStar: QuizPlayer | null = null;

    for (const p of players) {
      const secondHalfPoints = getValidAnswers(p)
        .filter(a => a.questionIndex >= halfQ)
        .reduce((sum, a) => sum + a.pointsEarned, 0);

      if (secondHalfPoints > maxSecondHalfGain) {
        maxSecondHalfGain = secondHalfPoints;
        risingStar = p;
      }
    }

    if (risingStar && maxSecondHalfGain > 0) {
      awards.push({
        id: 'rising_star',
        title: 'Rising Star',
        jaTitle: 'ライジングスター賞',
        description: `後半戦で +${maxSecondHalfGain}点の大躍進！後半の追い上げトップ`,
        jaDescription: `後半戦で +${maxSecondHalfGain}点の大躍進！後半の追い上げトップ`,
        enDescription: `Huge leap of +${maxSecondHalfGain} points in the 2nd half! Best comeback drive`,
        icon: 'TrendingUp',
        color: 'from-emerald-400 to-teal-600',
        badge: '🚀',
        recipients: [risingStar.nickname]
      });
    }

    // 💎 Flawless Finish
    if (totalQ >= 3) {
      const final3Indices = [totalQ - 3, totalQ - 2, totalQ - 1];
      const finishStars = players.filter(p => {
        return final3Indices.every(idx => p.answers && p.answers[idx] && p.answers[idx].isCorrect);
      }).map(p => p.nickname);

      if (finishStars.length > 0) {
        awards.push({
          id: 'flawless_finish',
          title: 'Flawless Finish',
          jaTitle: '有終の美賞',
          description: 'ラスト3問をすべて完璧に正解！見事なフィニッシュ',
          jaDescription: 'ラスト3問をすべて完璧に正解！見事なフィニッシュ',
          enDescription: 'Answered the final 3 questions with 100% precision! Outstanding finish',
          icon: 'Award',
          color: 'from-violet-500 to-purple-600',
          badge: '💎',
          recipients: finishStars.slice(0, 3)
        });
      }
    }

    // 🏃 Last Spurt
    const finalQIdx = totalQ - 1;
    let fastestFinalTime = 999999;
    let lastSpurtWinner: QuizPlayer | null = null;

    for (const p of players) {
      const ans = p.answers && p.answers[finalQIdx];
      if (ans && ans.isCorrect && ans.timeTakenMs < fastestFinalTime) {
        fastestFinalTime = ans.timeTakenMs;
        lastSpurtWinner = p;
      }
    }

    if (lastSpurtWinner) {
      const spurtSec = (fastestFinalTime / 1000).toFixed(1);
      awards.push({
        id: 'last_spurt',
        title: 'Last Spurt',
        jaTitle: 'ラストスパート賞',
        description: `最後の1問をわずか ${spurtSec}秒で電撃正解！`,
        jaDescription: `最後の1問をわずか ${spurtSec}秒で電撃正解！`,
        enDescription: `Answered the final question in just ${spurtSec}s! Lightning sprint finish`,
        icon: 'Activity',
        color: 'from-cyan-400 to-blue-600',
        badge: '🏃',
        recipients: [lastSpurtWinner.nickname]
      });
    }
  }

  // -------------------------------------------------------------
  // 3. SKILL & CHALLENGE
  // -------------------------------------------------------------
  if (toggles.skillChallenge && questions.length > 0) {
    // 🛡️ Iron Defense
    if (troubleWordIds.length > 0) {
      const hardestWordId = troubleWordIds[0];
      const heroPlayers = players.filter(p => {
        return getValidAnswers(p).some(a => {
          const q = questions[a.questionIndex % questions.length];
          return q && q.targetWordId === hardestWordId && a.isCorrect;
        });
      }).map(p => p.nickname);

      if (heroPlayers.length > 0) {
        awards.push({
          id: 'iron_defense',
          title: 'Iron Defense',
          jaTitle: '鉄壁賞',
          description: 'クラスの半数が間違えた超難問を見事にクリア！',
          jaDescription: 'クラスの半数が間違えた超難問を見事にクリア！',
          enDescription: 'Conquered the trickiest question that challenged the rest of the class!',
          icon: 'Shield',
          color: 'from-amber-600 to-yellow-600',
          badge: '🛡️',
          recipients: heroPlayers.slice(0, 3)
        });
      }
    }

    // 🦉 Wise Owl
    const longQuestions = questions.filter(q => q.targetWordEnglish.length >= 7);
    if (longQuestions.length > 0) {
      let bestLongScore = 0;
      let wiseOwlWinner: QuizPlayer | null = null;

      for (const p of players) {
        const correctLong = getValidAnswers(p).filter(a => {
          const q = questions[a.questionIndex % questions.length];
          return q && q.targetWordEnglish.length >= 7 && a.isCorrect;
        }).length;

        if (correctLong > bestLongScore) {
          bestLongScore = correctLong;
          wiseOwlWinner = p;
        }
      }

      if (wiseOwlWinner && bestLongScore > 0) {
        awards.push({
          id: 'wise_owl',
          title: 'Wise Owl',
          jaTitle: 'ものしりフクロウ賞',
          description: `文字数の多い英語の難関単語を ${bestLongScore}問正解！高い語彙力`,
          jaDescription: `文字数の多い英語の難関単語を ${bestLongScore}問正解！高い語彙力`,
          enDescription: `Mastered ${bestLongScore} advanced long vocabulary words with exceptional vocabulary skill!`,
          icon: 'BookOpen',
          color: 'from-emerald-600 to-teal-700',
          badge: '🦉',
          recipients: [wiseOwlWinner.nickname]
        });
      }
    }

    // 🌟 All-Rounder
    const promptTypesUsed = new Set(questions.map(q => q.promptType));
    if (promptTypesUsed.size >= 2) {
      const allRounders = players.filter(p => {
        const correctTypes = new Set(
          getValidAnswers(p)
            .filter(a => a.isCorrect)
            .map(a => questions[a.questionIndex % questions.length]?.promptType)
            .filter(Boolean)
        );
        return correctTypes.size === promptTypesUsed.size;
      }).map(p => p.nickname);

      if (allRounders.length > 0) {
        awards.push({
          id: 'all_rounder',
          title: 'All-Rounder',
          jaTitle: '万能マスター賞',
          description: '文字・イラスト・音声リスニングの全出題形式でパーフェクト正解！',
          jaDescription: '文字・イラスト・音声リスニングの全出題形式でパーフェクト正解！',
          enDescription: 'Solved questions across all formats: listening audio, text, and illustrations!',
          icon: 'Compass',
          color: 'from-indigo-600 to-purple-600',
          badge: '🌟',
          recipients: allRounders.slice(0, 3)
        });
      }
    }

    // 🎯 Quick Draw
    if (questions.length > 0) {
      let q1Fastest = 999999;
      let q1Winner: QuizPlayer | null = null;

      for (const p of players) {
        const a1 = p.answers && p.answers[0];
        if (a1 && a1.isCorrect && a1.timeTakenMs < q1Fastest) {
          q1Fastest = a1.timeTakenMs;
          q1Winner = p;
        }
      }

      if (q1Winner) {
        const q1Sec = (q1Fastest / 1000).toFixed(1);
        awards.push({
          id: 'quick_draw',
          title: 'Quick Draw',
          jaTitle: 'ファーストタッチ賞',
          description: `開幕第1問目をわずか ${q1Sec}秒で電撃先取！`,
          jaDescription: `開幕第1問目をわずか ${q1Sec}秒で電撃先取！`,
          enDescription: `Claimed Question 1 in just ${q1Sec}s right off the opening buzzer!`,
          icon: 'Target',
          color: 'from-orange-500 to-red-600',
          badge: '🎯',
          recipients: [q1Winner.nickname]
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 4. FUN & SURPRISE
  // -------------------------------------------------------------
  if (toggles.funSurprise && questions.length > 0) {
    // 🌈 Rainbow Master
    const rainbowHolders = players.filter(p => {
      const colorsPicked = new Set(
        getValidAnswers(p).map(a => {
          const q = questions[a.questionIndex % questions.length];
          const opt = q?.options.find(o => o.id === a.optionId);
          return opt?.color;
        }).filter(Boolean)
      );
      return colorsPicked.size === 4;
    }).map(p => p.nickname);

    if (rainbowHolders.length > 0) {
      awards.push({
        id: 'rainbow_master',
        title: 'Rainbow Master',
        jaTitle: 'レインボー賞',
        description: '赤・青・黄・緑の全4色ボタンを使いこなして正解！カラフルマスター',
        jaDescription: '赤・青・黄・緑の全4色ボタンを使いこなして正解！カラフルマスター',
        enDescription: 'Answered correctly using all 4 button colors: Red, Blue, Yellow, and Green!',
        icon: 'Sun',
        color: 'from-pink-400 via-amber-400 to-blue-400',
        badge: '🌈',
        recipients: rainbowHolders.slice(0, 3)
      });
    }

    // ⏱️ Just-in-Time
    let clutchestTime = 0;
    let clutchWinner: QuizPlayer | null = null;

    for (const p of players) {
      for (const a of getValidAnswers(p)) {
        const q = questions[a.questionIndex % questions.length];
        if (q && a.isCorrect) {
          const remainingMs = q.timeLimitMs - a.timeTakenMs;
          if (remainingMs > 0 && remainingMs <= 1500 && remainingMs > clutchestTime) {
            clutchestTime = remainingMs;
            clutchWinner = p;
          }
        }
      }
    }

    if (clutchWinner) {
      const clutchSec = (clutchestTime / 1000).toFixed(1);
      awards.push({
        id: 'just_in_time',
        title: 'Just-in-Time',
        jaTitle: 'ギリギリセーフ賞',
        description: `残りわずか ${clutchSec}秒！ブザー寸前で見事に大逆転正解`,
        jaDescription: `残りわずか ${clutchSec}秒！ブザー寸前で見事に大逆転正解`,
        enDescription: `Answered with just ${clutchSec}s remaining on the clock right before the buzzer!`,
        icon: 'Clock',
        color: 'from-yellow-400 to-amber-500',
        badge: '⏱️',
        recipients: [clutchWinner.nickname]
      });
    }

    // 🤝 Twin Sync
    const scoreMap = new Map<number, string[]>();
    players.forEach(p => {
      if (p.score > 0) {
        const list = scoreMap.get(p.score) || [];
        list.push(p.nickname);
        scoreMap.set(p.score, list);
      }
    });

    for (const [, nicks] of scoreMap.entries()) {
      if (nicks.length === 2) {
        awards.push({
          id: 'twin_sync',
          title: 'Twin Sync',
          jaTitle: 'シンクロ賞',
          description: 'なんと同点ピッタリ！奇跡のスコアシンクロを達成',
          jaDescription: 'なんと同点ピッタリ！奇跡のスコアシンクロを達成',
          enDescription: 'Finished with the exact same score in perfect harmony!',
          icon: 'Users',
          color: 'from-blue-400 to-cyan-500',
          badge: '🤝',
          recipients: nicks
        });
        break;
      }
    }

    // 🍀 Median Hero
    if (players.length >= 5) {
      const sortedByScore = [...players].sort((a, b) => b.score - a.score);
      const medianIdx = Math.floor(sortedByScore.length / 2);
      const medianPlayer = sortedByScore[medianIdx];

      awards.push({
        id: 'median_hero',
        title: 'Median Hero',
        jaTitle: 'まんなかヒーロー賞',
        description: `クラス ${players.length}人中、ちょうど真ん中の ${medianIdx + 1}位！安定感バツグン`,
        jaDescription: `クラス ${players.length}人中、ちょうど真ん中の ${medianIdx + 1}位！安定感バツグン`,
        enDescription: `Right in the exact middle at rank ${medianIdx + 1} of ${players.length}! The reliable anchor`,
        icon: 'Smile',
        color: 'from-teal-400 to-emerald-500',
        badge: '🍀',
        recipients: [medianPlayer.nickname]
      });
    }
  }

  return awards;
}