import type { Scene } from './HardwareAdapter';

/**
 * Compact berichtformaat voor een (toekomstige) ESP32. Kort gehouden voor kleine JSON-buffers.
 * Voorbeeld: {"v":1,"cmd":"scene","b":3,"z":[1,0,1,1],"r":1,"c":"p","bat":0,"net":"s"}
 */
export interface SceneMessage {
  v: 1;
  cmd: 'scene';
  /** Blokindex 0 t/m 5. */
  b: number;
  /** Lichtzones in vaste volgorde: homes, seniors, hospital, square (1 = aan). */
  z: [0 | 1, 0 | 1, 0 | 1, 0 | 1];
  /** IJsbaan open (1) of dicht (0). */
  r: 0 | 1;
  /** Laadplein: c = laden, p = gepauzeerd, x = extra laden. */
  c: 'c' | 'p' | 'x';
  bat: 100 | 50 | 0;
  /** Net: s = veilig, o = overbelast. */
  net: 's' | 'o';
}

export interface ResetMessage {
  v: 1;
  cmd: 'reset';
}

export type HardwareMessage = SceneMessage | ResetMessage;

const bit = (on: boolean): 0 | 1 => (on ? 1 : 0);

export function toSceneMessage(scene: Scene): SceneMessage {
  const { homes, seniors, hospital, square } = scene.zoneLightsOn;
  return {
    v: 1,
    cmd: 'scene',
    b: scene.blockIndex,
    z: [bit(homes), bit(seniors), bit(hospital), bit(square)],
    r: bit(scene.rinkOpen),
    c: scene.chargers === 'paused' ? 'p' : scene.chargers === 'extra-charging' ? 'x' : 'c',
    bat: scene.batteryPercent,
    net: scene.netStatus === 'overload' ? 'o' : 's',
  };
}

export const RESET_MESSAGE: ResetMessage = { v: 1, cmd: 'reset' };
