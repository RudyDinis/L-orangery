import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDataDir } from '../utils';

export interface SettingsData {
  ramMin: number;          // en Go
  ramMax: number;          // en Go
  closeOnLaunch: boolean;
}

export const DEFAULTS: SettingsData = {
  ramMin: 2,
  ramMax: 4,
  closeOnLaunch: false,
};

export const MIN_RAM = 2;

// Mémoire du PC moins 1 Go pour le système, plafonnée à 32 Go
export const maxAllowedRam = () => {
  const totalGB = Math.floor(os.totalmem() / 1024 ** 3);
  return Math.max(MIN_RAM, Math.min(totalGB - 1, 32));
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const SETTINGS_FILE = path.join(getDataDir(), 'settings.json');

class Settings {
  private data: SettingsData;

  constructor() {
    this.data = this.load();
  }

  private load(): SettingsData {
    try {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return this.sanitize({ ...DEFAULTS, ...raw });
    } catch {
      return { ...DEFAULTS };
    }
  }

  // Le renderer envoie ce qu'il veut : on ne garde que des valeurs valides
  private sanitize(d: SettingsData): SettingsData {
    const max = maxAllowedRam();
    const ramMax = clamp(Math.round(Number(d.ramMax)) || DEFAULTS.ramMax, MIN_RAM, max);
    const ramMin = clamp(Math.round(Number(d.ramMin)) || DEFAULTS.ramMin, MIN_RAM, ramMax);
    return { ramMin, ramMax, closeOnLaunch: Boolean(d.closeOnLaunch) };
  }

  private save() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.data, null, 4));
  }

  get(): SettingsData {
    return { ...this.data };
  }

  set(partial: Partial<SettingsData>): SettingsData {
    const next = { ...this.data };
    if (partial.ramMin !== undefined) next.ramMin = partial.ramMin;
    if (partial.ramMax !== undefined) next.ramMax = partial.ramMax;
    if (partial.closeOnLaunch !== undefined) next.closeOnLaunch = partial.closeOnLaunch;

    this.data = this.sanitize(next);
    this.save();
    return this.get();
  }

  reset(): SettingsData {
    this.data = { ...DEFAULTS };
    this.save();
    return this.get();
  }
}

export default new Settings();