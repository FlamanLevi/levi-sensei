import { JankenCardData, JankenGeneratorOptions, JankenLayoutMode, JankenPageData } from './types';

export function getCardsPerPage(layoutMode: JankenLayoutMode): number {
  if (layoutMode === 'slips_2') return 2;
  if (layoutMode === 'slips_4') return 4;
  return 1;
}

export function getEffectiveRoundsPerCard(
  layoutMode: JankenLayoutMode,
  requestedRounds: 1 | 2 | 3 | 4
): 1 | 2 | 3 | 4 {
  if (layoutMode === 'slips_4') return 1;
  if (layoutMode === 'slips_2') return requestedRounds > 2 ? 2 : requestedRounds;
  return requestedRounds;
}

export function generateJankenPages(options: JankenGeneratorOptions): {
  cards: JankenCardData[];
  pages: JankenPageData[];
  cardsPerPage: number;
} {
  const {
    layoutMode,
    studentCount,
    startAttendanceNumber = 1,
    autoNumberAttendance,
    masterCopyPage,
    className
  } = options;

  const cardsPerPage = getCardsPerPage(layoutMode);
  const safeCount = masterCopyPage
    ? cardsPerPage
    : Math.max(1, Math.min(60, Math.floor(studentCount) || 1));

  const cards: JankenCardData[] = [];
  for (let i = 0; i < safeCount; i++) {
    const studentNumber =
      !masterCopyPage && autoNumberAttendance ? startAttendanceNumber + i : 0;

    cards.push({
      id: `janken-card-${i + 1}`,
      cardIndex: i + 1,
      studentNumber,
      className: className.trim()
    });
  }

  const totalPages = Math.ceil(cards.length / cardsPerPage);
  const pages: JankenPageData[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageCards: (JankenCardData | null)[] = [];
    for (let slot = 0; slot < cardsPerPage; slot++) {
      pageCards.push(cards[pageIdx * cardsPerPage + slot] || null);
    }
    pages.push({
      pageIndex: pageIdx,
      cards: pageCards
    });
  }

  return { cards, pages, cardsPerPage };
}
