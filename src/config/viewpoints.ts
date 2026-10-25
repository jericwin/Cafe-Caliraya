import { FFL0, FFL1 } from './layout';

type V3 = [number, number, number];

export interface Viewpoint {
  id: string;
  label: string;
  group: 'Sunset' | 'Exterior' | 'Interior' | 'Site';
  pos: V3;
  target: V3;
  fov?: number;
}

const E0 = FFL0 + 1.55;
const E1 = FFL1 + 1.55;

export const VIEWPOINTS: Viewpoint[] = [
  // sunset presentation
  { id: 'cinematic', label: 'Cinematic Sunset (wide)', group: 'Sunset', pos: [44, 11, -2], target: [-12, 3.5, 1] },
  { id: 'cinematic-high', label: 'Sunset Over the Site (aerial)', group: 'Sunset', pos: [46, 24, 30], target: [-14, 2, -2] },
  { id: 'balcony-sunset', label: 'Balcony Sunset View (2F)', group: 'Sunset', pos: [-8.6, E1, 3.2], target: [-30, E1 + 1.4, 7.6] },
  { id: 'deck-sunset', label: 'Lakeside Deck Seating (GF)', group: 'Sunset', pos: [-10.2, E0 + 0.05, -2.2], target: [-34, E0 + 1.6, 3.6] },
  { id: 'jetty', label: 'Jetty — Looking Back at the Café', group: 'Sunset', pos: [-45, 1.4, 1.2], target: [-8, 4.2, 0] },
  { id: 'lake-aerial', label: 'Over the Lake (golden façade)', group: 'Sunset', pos: [-60, 16, 26], target: [-4, 3.5, 0] },
  // façades
  { id: 'front', label: 'Front · South (Entrance)', group: 'Exterior', pos: [4, 5.5, 34], target: [-1, 3.2, 0] },
  { id: 'back', label: 'Back · North', group: 'Exterior', pos: [-6, 7, -34], target: [0, 3.2, 0] },
  { id: 'left', label: 'Left · West (Lake Façade)', group: 'Exterior', pos: [-42, 7, 6], target: [-6, 3.5, 0] },
  { id: 'right', label: 'Right · East (Service Side)', group: 'Exterior', pos: [36, 6, -3], target: [4, 3.2, 0] },
  { id: 'aerial', label: 'Aerial Three-Quarter', group: 'Exterior', pos: [34, 46, 46], target: [6, 0, 0] },
  // site
  { id: 'parking', label: 'Parking & Drop-off', group: 'Site', pos: [38, 10, 20], target: [22, 0, -1] },
  { id: 'plaza', label: 'Entrance Plaza', group: 'Site', pos: [10, 3.2, 14], target: [-2, 1.8, 6] },
  { id: 'site-overview', label: 'Site Overview', group: 'Site', pos: [-10, 120, 70], target: [6, 0, 0] },
  // interiors (orbit around a near target = look-around)
  { id: 'dining', label: 'GF Dining & Lounge', group: 'Interior', pos: [-0.8, E0 + 0.2, 4.6], target: [-5.5, 1.2, -1.5] },
  { id: 'counter', label: 'Coffee Bar & Counter', group: 'Interior', pos: [-1.8, E0, 0.6], target: [1.6, 1.2, -1.6] },
  { id: 'kitchen', label: 'Commercial Kitchen', group: 'Interior', pos: [3.6, E0 + 0.2, -0.6], target: [6.4, 0.9, -4.4] },
  { id: 'storage', label: 'Dry Storage', group: 'Interior', pos: [3.3, E0, 0.35], target: [4.6, 1.0, 2.0] },
  { id: 'cr', label: 'Accessible CR', group: 'Interior', pos: [3.35, E0 + 0.3, 2.75], target: [5.0, 0.7, 5.2] },
  { id: 'utility', label: 'Staff, Utility & Electrical', group: 'Interior', pos: [5.8, E0 + 0.2, 5.4], target: [7.0, 1.2, 1.0] },
  { id: 'stair', label: 'Feature Staircase', group: 'Interior', pos: [-5.0, E0, -2.2], target: [1.0, 2.6, -5.3] },
  { id: 'lounge2', label: '2F Lounge', group: 'Interior', pos: [3.6, E1 + 0.2, 4.8], target: [-5, FFL1 + 0.9, -1.5] },
  { id: 'group', label: '2F Function Room', group: 'Interior', pos: [7.6, E1 + 0.2, -0.5], target: [5.6, FFL1 + 0.7, -4.4] },
];

export const DEFAULT_VIEW = VIEWPOINTS[0];

/** Portrait screens see a much narrower horizontal field: pull the default camera back so the café still fits. */
export function defaultViewFor(aspect: number): Viewpoint {
  if (aspect >= 1) return DEFAULT_VIEW;
  const k = Math.min(2.2, Math.pow(1 / aspect, 0.85));
  const [px, py, pz] = DEFAULT_VIEW.pos;
  const [tx, ty, tz] = DEFAULT_VIEW.target;
  // turn the view slightly south so both the café and the setting sun (WSW) fit the narrow frame
  return { ...DEFAULT_VIEW, pos: [tx + (px - tx) * k, ty + (py - ty) * k + 2, tz + (pz - tz) * k + 3.6], target: [tx, ty, tz + 9] };
}

export interface WalkStart {
  id: string;
  label: string;
  pos: [number, number];
  yaw: number; // 0 = facing north (-Z), +PI/2 = facing west
  level: 0 | 1;
}

export const WALK_STARTS: WalkStart[] = [
  { id: 'entrance', label: 'Entrance Plaza', pos: [-1, 9.4], yaw: 0, level: 0 },
  { id: 'dining', label: 'Dining Hall', pos: [-1.2, 3.5], yaw: Math.PI * 0.3, level: 0 },
  { id: 'counter', label: 'Ordering Counter', pos: [-0.6, -1.0], yaw: -Math.PI / 2, level: 0 },
  { id: 'kitchen', label: 'Kitchen', pos: [4.2, -1.6], yaw: -Math.PI * 0.75, level: 0 },
  { id: 'cr', label: 'CR Lobby', pos: [1.8, 4.6], yaw: -Math.PI / 2, level: 0 },
  { id: 'stair', label: 'Foot of the Stair', pos: [-3.6, -5.3], yaw: -Math.PI / 2, level: 0 },
  { id: 'lounge2', label: '2F Lounge', pos: [3.6, -3.5], yaw: Math.PI * 0.6, level: 1 },
  { id: 'balcony', label: 'Sunset Balcony', pos: [-9.2, 3.0], yaw: Math.PI * 0.55, level: 1 },
  { id: 'deck', label: 'Lakeside Deck', pos: [-9.5, 0.5], yaw: Math.PI / 2, level: 0 },
  { id: 'jetty', label: 'Jetty', pos: [-33, 0], yaw: Math.PI / 2, level: 0 },
  { id: 'parking', label: 'Parking', pos: [20, -1], yaw: Math.PI / 2, level: 0 },
];
