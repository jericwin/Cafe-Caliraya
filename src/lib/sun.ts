import * as THREE from 'three';

/** Caliraya Lake, Lumban / Cavinti, Laguna */
export const SITE_LAT = 14.29;
export const SITE_LON = 121.52;
export const SITE_TZ = 8; // Philippine Standard Time (UTC+8)

const D2R = Math.PI / 180;

export interface SolarPos {
  elevation: number; // radians above horizon
  azimuth: number; // radians clockwise from north
}

/** NOAA general solar position approximation (accurate to a fraction of a degree). */
export function solarPosition(hour: number, dayOfYear: number, lat = SITE_LAT, lon = SITE_LON, tz = SITE_TZ): SolarPos {
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eqTime + 4 * lon - 60 * tz;
  const ha = (tst / 4 - 180) * D2R;
  const phi = lat * D2R;
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(THREE.MathUtils.clamp(cosZ, -1, 1));
  let elevation = Math.PI / 2 - zen;
  // atmospheric refraction near the horizon (simple Bennett-style correction)
  const eDeg = elevation / D2R;
  if (eDeg > -1 && eDeg < 15) elevation += (1.02 / Math.tan((eDeg + 10.3 / (eDeg + 5.11)) * D2R) / 60) * D2R;
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
  return { elevation, azimuth: (az + 2 * Math.PI) % (2 * Math.PI) };
}

/** World direction pointing *towards* the sun. North = -Z, East = +X. */
export function sunDirection(p: SolarPos, out = new THREE.Vector3()) {
  const ce = Math.cos(p.elevation);
  return out.set(Math.sin(p.azimuth) * ce, Math.sin(p.elevation), -Math.cos(p.azimuth) * ce).normalize();
}

/** Find the clock time (in the afternoon or morning) at which the sun reaches a given elevation. */
export function timeForElevation(elevDeg: number, doy: number, afternoon = true) {
  let lo = afternoon ? 12 : 4.5;
  let hi = afternoon ? 20 : 12;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const e = solarPosition(mid, doy).elevation / D2R;
    if (afternoon ? e > elevDeg : e < elevDeg) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function dayOfYear(month: number, day: number) {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cum[month] + day;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

export function compass(azRad: number) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((azRad / D2R) % 360) / 22.5) % 16];
}

export type Weather = 'clear' | 'cloudy' | 'rainy';

const c = (hex: string) => new THREE.Color(hex);
/** smoothstep that also works with reversed edges (e0 > e1) */
export const ss = (x: number, e0: number, e1: number) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

export interface Atmosphere {
  sunDir: THREE.Vector3;
  elevDeg: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  moonIntensity: number;
  lightDir: THREE.Vector3; // dir of the shadow-casting light (sun or moon)
  lightColor: THREE.Color;
  lightIntensity: number;
  exposure: number;
  envIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  skyGain: number;
  skySat: number;
  skyBelt: THREE.Color;
  skyWarm: THREE.Color;
  night: number; // 0 day .. 1 full night (sky blend)
  lightsOn: number; // artificial lighting 0..1
  stars: number;
  cloudCover: number;
  cloudLit: THREE.Color;
  cloudShade: THREE.Color;
  rain: number;
  waterColor: THREE.Color;
}

const MOON_DIR = new THREE.Vector3(0.45, 0.75, 0.35).normalize();

/** Physically-motivated, art-directed atmosphere state from clock time, date and weather. */
export function computeAtmosphere(hour: number, doy: number, weather: Weather, sunMul = 1): Atmosphere {
  const pos = solarPosition(hour, doy);
  const sunDir = sunDirection(pos);
  const e = pos.elevation / D2R;

  const overcast = weather === 'clear' ? 0 : weather === 'cloudy' ? 0.6 : 0.9;
  const rain = weather === 'rainy' ? 1 : 0;

  // sun colour from deep red at the horizon to warm white at altitude
  const sunColor = new THREE.Color();
  if (e < 2) sunColor.copy(c('#ff5a24')).lerp(c('#ff7a35'), ss(e, -1, 2));
  else if (e < 8) sunColor.copy(c('#ff7a35')).lerp(c('#ffb06a'), ss(e, 2, 8));
  else if (e < 25) sunColor.copy(c('#ffb06a')).lerp(c('#ffe2bf'), ss(e, 8, 25));
  else sunColor.copy(c('#ffe2bf')).lerp(c('#fff6ec'), ss(e, 25, 55));
  sunColor.lerp(c('#d8dde3'), overcast * 0.7);

  const sunUp = ss(e, -1.2, 5);
  const sunIntensity = sunUp * lerp(2.6, 3.6, ss(e, 3, 35)) * (1 - overcast * 0.78) * sunMul;
  const night = 1 - ss(e, -9, -0.5);
  const moonIntensity = ss(e, -4, -10) * 0.6 * (1 - overcast * 0.6);

  const useSun = e > -3.5;
  const lightDir = useSun ? sunDir.clone() : MOON_DIR.clone();
  const lightColor = useSun ? sunColor.clone() : c('#9fb4dd');
  const lightIntensity = useSun ? sunIntensity : moonIntensity;

  // Exposure lifts as light fades so evening scenes stay readable but moody
  const exposure = lerp(0.52, 0.62, 1 - ss(e, 0, 30)) + night * 0.75 + overcast * 0.18;

  const envIntensity = lerp(0.6, 1.0, ss(e, -8, 12)) * (1 - overcast * 0.2);

  const hemiSky = new THREE.Color().copy(c('#2b3a5c')).lerp(c('#f0a577'), ss(e, -4, 3) * (1 - ss(e, 6, 22))).lerp(c('#bcd3ea'), ss(e, 10, 35));
  const hemiGround = new THREE.Color().copy(c('#151612')).lerp(c('#5d5236'), ss(e, -3, 15));
  const hemiIntensity = lerp(0.55, 0.5, ss(e, -6, 20)) + overcast * 0.25 + ss(e, -1, -4) * (1 - ss(e, -6, -11)) * 0.5;

  const fogColor = new THREE.Color()
    .copy(c('#141b2b'))
    .lerp(c('#c97e5e'), ss(e, -5, 1) * (1 - ss(e, 6, 20)))
    .lerp(c('#b7c7d6'), ss(e, 8, 30))
    .lerp(c('#8c96a0'), overcast * 0.7);
  if (e < -5) fogColor.lerp(c('#0b0f19'), ss(e, -5, -10));

  const fogDensity = 0.00055 + overcast * 0.0016 + rain * 0.0035 + (1 - ss(e, -2, 12)) * 0.00015;

  // sky model parameters — sunset gets more Rayleigh red-shift and haze
  const low = 1 - ss(e, 2, 22);
  const turbidity = lerp(3.2, 10, low) + overcast * 8;
  const rayleigh = lerp(1.5, 3.0, low) * (1 - overcast * 0.55);
  const mie = lerp(0.004, 0.005, low) + overcast * 0.006;
  const mieG = lerp(0.8, 0.72, low);

  // art-directed grade on top of the physical sky model (keeps sunsets saturated under ACES)
  const skyGain = lerp(0.95, 0.62, low) * (1 - overcast * 0.15);
  const skySat = lerp(1.15, 1.9, low) * (1 - overcast * 0.6);
  const skyBelt = c('#d0608a').multiplyScalar(0.16 * low * (1 - overcast) * ss(e, -5, 1));
  const skyWarm = c('#ff6a1c').multiplyScalar(0.55 * low * (1 - overcast) * ss(e, -4, 1));

  const lightsOn = 1 - ss(e, -1.5, 6) + overcast * 0.25 * (1 - ss(e, 20, 40));
  const stars = ss(e, -5, -12) * (1 - overcast);

  const cloudCover = weather === 'clear' ? 0.38 : weather === 'cloudy' ? 0.68 : 0.88;
  // sunset pinks / purples, white by day, grey-blue at night
  const cloudLit = new THREE.Color()
    .copy(c('#2a3048'))
    .lerp(c('#ff7a5c'), ss(e, -6, -1))
    .lerp(c('#ffb07a'), ss(e, 0, 6))
    .lerp(c('#ffffff'), ss(e, 6, 26))
    .lerp(c('#b9bec6'), overcast * 0.6);
  const cloudShade = new THREE.Color()
    .copy(c('#141826'))
    .lerp(c('#6a4d78'), ss(e, -6, 0) * (1 - ss(e, 8, 22)))
    .lerp(c('#9aa6b8'), ss(e, 8, 26))
    .lerp(c('#6d737c'), overcast * 0.7);

  const waterColor = new THREE.Color().copy(c('#04121a')).lerp(c('#0d2f3a'), ss(e, -4, 12)).lerp(c('#1d5566'), ss(e, 15, 45)).lerp(c('#1f2f33'), overcast * 0.5);

  return {
    sunDir,
    elevDeg: e,
    sunColor,
    sunIntensity,
    moonIntensity,
    lightDir,
    lightColor,
    lightIntensity,
    exposure,
    envIntensity,
    hemiSky,
    hemiGround,
    hemiIntensity,
    fogColor,
    fogDensity,
    turbidity,
    rayleigh,
    mie,
    mieG,
    skyGain,
    skySat,
    skyBelt,
    skyWarm,
    night,
    lightsOn: THREE.MathUtils.clamp(lightsOn, 0, 1),
    stars,
    cloudCover,
    cloudLit,
    cloudShade,
    rain,
    waterColor,
  };
}

export interface TimePreset {
  id: string;
  label: string;
  time: (doy: number) => number;
}

export const TIME_PRESETS: TimePreset[] = [
  { id: 'sunrise', label: 'Sunrise', time: (d) => Math.max(6, timeForElevation(1.5, d, false)) },
  { id: 'morning', label: 'Morning', time: () => 8.5 },
  { id: 'noon', label: 'Noon', time: () => 12 },
  { id: 'afternoon', label: 'Afternoon', time: () => 15 },
  { id: 'golden', label: 'Golden Hour', time: (d) => timeForElevation(9, d) },
  { id: 'sunset', label: 'Sunset', time: (d) => timeForElevation(1.2, d) },
  { id: 'blue', label: 'Blue Hour', time: (d) => timeForElevation(-4.5, d) },
  { id: 'night', label: 'Night', time: () => 20.5 },
];
