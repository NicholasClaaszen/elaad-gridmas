import type { HardwareAdapter, Scene } from './HardwareAdapter';

/** Standaardadapter zonder fysieke hardware: onthoudt alleen welke scenes zijn verstuurd. */
export class MockHardwareAdapter implements HardwareAdapter {
  readonly name = 'Gesimuleerde miniatuur';
  readonly scenes: Scene[] = [];
  resets = 0;

  async setScene(scene: Scene): Promise<void> {
    this.scenes.push(JSON.parse(JSON.stringify(scene)) as Scene);
  }

  async reset(): Promise<void> {
    this.resets++;
  }
}
