import test from 'node:test';
import assert from 'node:assert/strict';
import { getCorrectSlot, arrangeOptions } from './optionOrder';

test('correct slot never repeats 3 times in a row', () => {
  for (const seed of ['a:1', 'a:2', 'room:xyz', 'q', 'host-abc']) {
    const slots = Array.from({ length: 200 }, (_, i) => getCorrectSlot(seed, i, 4));
    for (let i = 2; i < slots.length; i++) {
      assert.equal(slots[i] === slots[i - 1] && slots[i] === slots[i - 2], false);
    }
  }
});

test('layout is deterministic per student and differs between students', () => {
  const a = Array.from({ length: 30 }, (_, i) => getCorrectSlot('r:1', i, 4));
  const a2 = Array.from({ length: 30 }, (_, i) => getCorrectSlot('r:1', i, 4));
  const b = Array.from({ length: 30 }, (_, i) => getCorrectSlot('r:2', i, 4));
  assert.deepEqual(a, a2);
  assert.notDeepEqual(a, b);
});

test('arrangeOptions keeps every option and badges by position', () => {
  const opts = ['w', 'x', 'y', 'z'].map((id, i) => ({
    id, english: id, ja_kanji: '', ja_hiragana: '',
    symbol: (['triangle', 'diamond', 'circle', 'square'] as const)[i],
    color: (['red', 'blue', 'yellow', 'green'] as const)[i],
  })) as any[];
  const out = arrangeOptions(opts, 'y', 'seed', 5, true);
  assert.deepEqual(out.map((o) => o.id).sort(), ['w', 'x', 'y', 'z']);
  assert.deepEqual(out.map((o) => o.symbol), opts.map((o) => o.symbol));
});
