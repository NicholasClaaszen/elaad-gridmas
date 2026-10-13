import type { HardwareAdapter, Scene } from './HardwareAdapter';
import { RESET_MESSAGE, toSceneMessage, type HardwareMessage } from './protocol';

/** Een hardware-aanroep zoals een echte ESP32-adapter die zou versturen. */
export interface HardwareCall {
  sequence: number;
  method: 'POST';
  url: string;
  body: HardwareMessage;
  outcome: 'simulated-ok' | 'simulated-offline';
}

export interface DummyEsp32Options {
  /** Adres waar de ESP32 later zou luisteren. Wordt nooit echt aangeroepen. */
  baseUrl?: string;
}

/**
 * Dummy-connector voor de fysieke miniatuur (fase 2-voorbereiding).
 * Bouwt exact de HTTP-aanroepen die een ESP32-adapter zou doen en legt ze vast,
 * maar maakt geen netwerkverbinding. Met `offline = true` kan een verbindingsfout worden gesimuleerd.
 */
export class DummyEsp32Connector implements HardwareAdapter {
  readonly name = 'ESP32 (dummy-connector)';
  readonly baseUrl: string;
  readonly calls: HardwareCall[] = [];
  offline = false;

  constructor(options: DummyEsp32Options = {}) {
    this.baseUrl = options.baseUrl ?? 'http://gridmas-esp32.local';
  }

  async setScene(scene: Scene): Promise<void> {
    this.record('/api/scene', toSceneMessage(scene));
  }

  async reset(): Promise<void> {
    this.record('/api/reset', RESET_MESSAGE);
  }

  private record(path: string, body: HardwareMessage): void {
    this.calls.push({
      sequence: this.calls.length + 1,
      method: 'POST',
      url: `${this.baseUrl}${path}`,
      body,
      outcome: this.offline ? 'simulated-offline' : 'simulated-ok',
    });
    if (this.offline) throw new Error(`Geen verbinding met ${this.baseUrl} (gesimuleerd).`);
  }
}
