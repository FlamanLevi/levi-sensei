import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRACK_THEME_ID,
  TRACK_THEMES,
  TRACK_THEME_LIST,
  isValidTrackThemeId,
  getTrackTheme,
  resolveTrackThemeId,
  SuzukaTrackThemeId,
} from './trackThemes';

test('isValidTrackThemeId validates exact track biome IDs and rejects RANDOM/invalid inputs', () => {
  const validIds: SuzukaTrackThemeId[] = [
    'SUZUKA_SPRING_DAY',
    'TOKYO_NIGHT_LIGHTS',
    'AUTUMN_MOMIJI_SUNSET',
    'HOKKAIDO_WINTER_SNOW',
  ];

  for (const id of validIds) {
    assert.equal(isValidTrackThemeId(id), true);
  }

  assert.equal(isValidTrackThemeId('RANDOM'), false);
  assert.equal(isValidTrackThemeId(''), false);
  assert.equal(isValidTrackThemeId(null), false);
  assert.equal(isValidTrackThemeId(undefined), false);
  assert.equal(isValidTrackThemeId('UNKNOWN_BIOME'), false);
});

test('getTrackTheme returns matching config and falls back safely to DEFAULT_TRACK_THEME_ID', () => {
  assert.equal(getTrackTheme('TOKYO_NIGHT_LIGHTS').id, 'TOKYO_NIGHT_LIGHTS');
  assert.equal(getTrackTheme('AUTUMN_MOMIJI_SUNSET').id, 'AUTUMN_MOMIJI_SUNSET');
  assert.equal(getTrackTheme('HOKKAIDO_WINTER_SNOW').id, 'HOKKAIDO_WINTER_SNOW');

  assert.equal(getTrackTheme(undefined).id, DEFAULT_TRACK_THEME_ID);
  assert.equal(getTrackTheme(null).id, DEFAULT_TRACK_THEME_ID);
  assert.equal(getTrackTheme('INVALID').id, DEFAULT_TRACK_THEME_ID);
});

test('resolveTrackThemeId preserves explicit picks and excludes prior biome when rolling RANDOM', () => {
  assert.equal(
    resolveTrackThemeId('AUTUMN_MOMIJI_SUNSET', 'AUTUMN_MOMIJI_SUNSET'),
    'AUTUMN_MOMIJI_SUNSET',
    'Explicit teacher theme selection must always be honored'
  );

  for (const prior of TRACK_THEME_LIST) {
    for (let step = 0; step < 25; step++) {
      const fakeRng = () => step / 25;
      const picked = resolveTrackThemeId('RANDOM', prior.id, fakeRng);
      assert.equal(isValidTrackThemeId(picked), true);
      assert.notEqual(
        picked,
        prior.id,
        `RANDOM roll should rotate away from prior biome ${prior.id}`
      );
    }
  }

  for (let i = 0; i < 100; i++) {
    const picked = resolveTrackThemeId('RANDOM', 'TOKYO_NIGHT_LIGHTS');
    assert.equal(isValidTrackThemeId(picked), true);
    assert.notEqual(picked, 'TOKYO_NIGHT_LIGHTS');
  }

  // Unset selection behaves like RANDOM
  const defaultPick = resolveTrackThemeId(undefined, 'SUZUKA_SPRING_DAY', () => 0.0);
  assert.equal(isValidTrackThemeId(defaultPick), true);
  assert.notEqual(defaultPick, 'SUZUKA_SPRING_DAY');
});

test('TRACK_THEME_LIST invariants: 4 distinct biomes, safe exposures, night stars, emoji-free Canvas2D text', () => {
  assert.equal(TRACK_THEME_LIST.length, 4);
  const seenIds = new Set<string>();

  for (const theme of TRACK_THEME_LIST) {
    assert.ok(!seenIds.has(theme.id), `Duplicate theme ID ${theme.id}`);
    seenIds.add(theme.id);
    assert.ok(theme.exposure >= 0.85 && theme.exposure <= 1.5, `Unexpected exposure on ${theme.id}`);
    assert.ok(theme.hemiIntensity > 0 && theme.dirIntensity > 0);
    assert.ok(theme.nameEn.length > 0 && theme.nameJa.length > 0);
    assert.ok(theme.shortEn.length > 0 && theme.shortJa.length > 0);
    assert.ok(theme.gantrySubText.length > 0);
    assert.equal(theme.mountainColors.length, 5);
    assert.equal(theme.turfSpeckles.length, 3);
    // Avoid Extended_Pictographic Unicode emojis inside Canvas2D textures for Linux/headless safety
    assert.equal(
      /\p{Extended_Pictographic}/u.test(theme.gantrySubText),
      false,
      `Canvas2D text on ${theme.id} should not contain emoji glyphs`
    );
  }

  assert.ok(TRACK_THEMES.TOKYO_NIGHT_LIGHTS.starIntensity > 0.5);
  assert.equal(TRACK_THEMES.SUZUKA_SPRING_DAY.starIntensity, 0);
  assert.equal(TRACK_THEMES.AUTUMN_MOMIJI_SUNSET.starIntensity, 0);
  assert.equal(TRACK_THEMES.HOKKAIDO_WINTER_SNOW.starIntensity, 0);
});
