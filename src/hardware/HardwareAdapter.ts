import type { Scene } from '../domain/scene';

export type { Scene };

/** Alle aansturing van de fysieke miniatuur loopt via deze interface; de spelengine kent geen hardware. */
export interface HardwareAdapter {
  readonly name: string;
  setScene(scene: Scene): Promise<void>;
  reset(): Promise<void>;
}
