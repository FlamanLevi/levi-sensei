import test from 'node:test';
import assert from 'node:assert/strict';
import { isColorQuestion, resolveColorQuestionStyle } from './colorOptionStyle';

const colorOptions = [
  { id: '1', english: 'red' },
  { id: '2', english: 'blue' },
  { id: '3', english: 'yellow' },
  { id: '4', english: 'purple' },
];

test('isColorQuestion detects color units without false-positiving on a single fruit overlap', () => {
  assert.equal(isColorQuestion({ options: colorOptions as any }), true);
  assert.equal(
    isColorQuestion({
      options: [
        { id: '1', english: 'apple' },
        { id: '2', english: 'orange' },
        { id: '3', english: 'banana' },
        { id: '4', english: 'grape' },
      ] as any,
    }),
    false
  );
});

test('resolveColorQuestionStyle neutralizes visual/text prompts and color-matches AUDIO_ONLY', () => {
  const imagePrompt = { promptType: 'IMAGE_ONLY' as const, options: colorOptions as any };
  const audioPrompt = { promptType: 'AUDIO_ONLY' as const, options: colorOptions as any };

  const imgStyle = resolveColorQuestionStyle(imagePrompt, { english: 'red' });
  assert.ok(imgStyle);
  assert.equal(imgStyle.bg.includes('slate-100'), true);
  assert.equal(imgStyle.textClass.includes('text-slate-950'), true);

  const audioRed = resolveColorQuestionStyle(audioPrompt, { english: 'red' });
  assert.ok(audioRed);
  assert.equal(audioRed.bg, 'bg-red-600');
  assert.equal(audioRed.textClass, 'text-white');

  const audioWhite = resolveColorQuestionStyle(audioPrompt, { english: 'white' });
  assert.ok(audioWhite);
  assert.equal(audioWhite.bg, 'bg-white');
  assert.equal(audioWhite.textClass, 'text-slate-950');
});
