import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRACK_THEME_ID,
  TRACK_THEMES,
  TRACK_THEME_LIST,
  TIME_OF_DAY_LIST,
  CLOUD_COVER_LIST,
  PRECIPITATION_LIST,
  isValidTrackThemeId,
  getTrackTheme,
  resolveTrackThemeId,
  resolveTimeOfDayId,
  resolveCloudCoverId,
  resolvePrecipitationId,
  evaluateSuzukaAtmosphere,
  getLeMansPhaseBadge,
  SuzukaTrackThemeId,
} from './trackThemes';

test('isValidTrackThemeId validates the 3 canonical biome IDs and rejects RANDOM/invalid inputs', () => {
  const validIds: SuzukaTrackThemeId[] = ['TEMPERATE', 'DESERT', 'SNOW'];

  for (const id of validIds) {
    assert.equal(isValidTrackThemeId(id), true);
  }

  assert.equal(isValidTrackThemeId('RANDOM'), false);
  assert.equal(isValidTrackThemeId(''), false);
  assert.equal(isValidTrackThemeId(null), false);
  assert.equal(isValidTrackThemeId(undefined), false);
  assert.equal(isValidTrackThemeId('UNKNOWN_BIOME'), false);
});

test('getTrackTheme returns matching biome and maps legacy biome IDs safely', () => {
  assert.equal(getTrackTheme('TEMPERATE').id, 'TEMPERATE');
  assert.equal(getTrackTheme('DESERT').id, 'DESERT');
  assert.equal(getTrackTheme('SNOW').id, 'SNOW');

  // Legacy room compatibility
  assert.equal(getTrackTheme('HOKKAIDO_WINTER_SNOW').id, 'SNOW');
  assert.equal(getTrackTheme('SUZUKA_SPRING_DAY').id, 'TEMPERATE');

  assert.equal(getTrackTheme(undefined).id, DEFAULT_TRACK_THEME_ID);
  assert.equal(getTrackTheme(null).id, DEFAULT_TRACK_THEME_ID);
  assert.equal(getTrackTheme('INVALID').id, DEFAULT_TRACK_THEME_ID);
});

test('resolveTrackThemeId preserves explicit picks and excludes prior biome when rolling RANDOM', () => {
  assert.equal(
    resolveTrackThemeId('DESERT', 'DESERT'),
    'DESERT',
    'Explicit teacher biome selection must always be honored'
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
});

test('Independent Time of Day, Cloud Cover, and Precipitation resolvers honor all explicit combos and roll sensible RANDOMs', () => {
  // Explicit odd combo (e.g. heavy snow in the desert at midnight) must be 100% allowed
  assert.equal(resolvePrecipitationId('HEAVY_SNOW', 'DESERT'), 'HEAVY_SNOW');
  assert.equal(resolveTimeOfDayId('NIGHT', 'NIGHT'), 'NIGHT');
  assert.equal(resolveTimeOfDayId('LE_MANS_CYCLE', 'NOON'), 'LE_MANS_CYCLE');
  assert.equal(resolveCloudCoverId('OVERCAST', 'OVERCAST'), 'OVERCAST');

  // RANDOM rolls rotate and respect sensible biome pools for precipitation
  for (let i = 0; i < 20; i++) {
    const rng = () => i / 20;
    const snowPrecip = resolvePrecipitationId('RANDOM', 'SNOW', undefined, rng);
    assert.ok(['NONE', 'LIGHT_SNOW', 'HEAVY_SNOW'].includes(snowPrecip));

    const desertPrecip = resolvePrecipitationId('RANDOM', 'DESERT', undefined, rng);
    assert.ok(['NONE', 'LIGHT_RAIN'].includes(desertPrecip));

    const tod = resolveTimeOfDayId('RANDOM', 'NOON', rng);
    assert.notEqual(tod, 'NOON');

    const cloud = resolveCloudCoverId('RANDOM', 'CLEAR', rng);
    assert.notEqual(cloud, 'CLEAR');
  }
});

test('24 Hours of Le Mans dynamic lighting progresses smoothly from Sunrise to Noon, Sunset, and Starry Midnight', () => {
  const sunrise = evaluateSuzukaAtmosphere({
    biome: 'TEMPERATE',
    timeOfDay: 'LE_MANS_CYCLE',
    cloudCover: 'PARTLY_CLOUDY',
    precipitation: 'NONE',
    leMansProgress: 0.0,
  });
  const noon = evaluateSuzukaAtmosphere({
    biome: 'TEMPERATE',
    timeOfDay: 'LE_MANS_CYCLE',
    cloudCover: 'PARTLY_CLOUDY',
    precipitation: 'NONE',
    leMansProgress: 0.46,
  });
  const sunset = evaluateSuzukaAtmosphere({
    biome: 'TEMPERATE',
    timeOfDay: 'LE_MANS_CYCLE',
    cloudCover: 'PARTLY_CLOUDY',
    precipitation: 'NONE',
    leMansProgress: 0.82,
  });
  const midnight = evaluateSuzukaAtmosphere({
    biome: 'TEMPERATE',
    timeOfDay: 'LE_MANS_CYCLE',
    cloudCover: 'CLEAR',
    precipitation: 'NONE',
    leMansProgress: 1.0,
  });

  // Sun moves from east (+X) at sunrise -> high (+Y) at noon -> west (-X) at sunset
  assert.ok(sunrise.sunDir[0] > 300 && sunrise.sunDir[1] < 150, 'Sunrise sun starts low in the east');
  assert.ok(noon.sunDir[1] > 400, 'Noon sun reaches high zenith');
  assert.ok(sunset.sunDir[0] < -200 && sunset.sunDir[1] < 180, 'Sunset sun dips low in the west');

  // Night lights & stars ramp up at sunset and peak at midnight
  assert.equal(noon.nightLightFactor, 0);
  assert.ok(sunset.nightLightFactor > 0.4 && sunset.nightLightFactor < 0.8);
  assert.equal(midnight.nightLightFactor, 1.0);
  assert.ok(midnight.starIntensity > 0.8);
  assert.ok(midnight.floodEmissiveIntensity > noon.floodEmissiveIntensity);
  assert.ok(midnight.ferrisEmissiveIntensity > 0.7);
  assert.ok(midnight.towerWindowEmissiveIntensity > 0.8);

  // Ground & foliage tint darken at Sunset and Midnight so snow/sand/grass don't glow like noon
  assert.ok(noon.groundTintHex > 0xf0f0f0);
  assert.ok(sunset.groundTintHex < noon.groundTintHex);
  assert.ok(midnight.groundTintHex < sunset.groundTintHex);
  assert.ok(midnight.hemiIntensity < noon.hemiIntensity);
  assert.ok(midnight.dirIntensity < noon.dirIntensity);
  assert.ok(midnight.envIntensity < 0.35);

  // Phase badges match progression
  assert.equal(getLeMansPhaseBadge(0.0).labelEn, 'Sunrise');
  assert.equal(getLeMansPhaseBadge(0.45).labelEn, 'High Noon');
  assert.equal(getLeMansPhaseBadge(0.82).labelEn, 'Sunset');
  assert.equal(getLeMansPhaseBadge(1.0).labelEn, 'Midnight');

  // Rain lowers asphalt roughness for wet sheen
  const heavyRain = evaluateSuzukaAtmosphere({
    biome: 'DESERT',
    timeOfDay: 'NOON',
    cloudCover: 'OVERCAST',
    precipitation: 'HEAVY_RAIN',
  });
  assert.ok(heavyRain.roadRoughness < noon.roadRoughness);
  assert.ok(heavyRain.cloudCoverage > 0.8);
});

test('TRACK_THEME_LIST invariants: 3 distinct biomes, safe exposures, emoji-free Canvas2D text', () => {
  assert.equal(TRACK_THEME_LIST.length, 3);
  assert.equal(TIME_OF_DAY_LIST.length, 5);
  assert.equal(CLOUD_COVER_LIST.length, 3);
  assert.equal(PRECIPITATION_LIST.length, 5);

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
    assert.equal(
      /\p{Extended_Pictographic}/u.test(theme.gantrySubText),
      false,
      `Canvas2D text on ${theme.id} should not contain emoji glyphs`
    );
  }
});
