import { exec } from 'child_process';
import { promisify } from 'util';
import { InstalledApp } from '../types';
import { getEnvWithBrewPath } from './path';

const execAsync = promisify(exec);

export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    const env = getEnvWithBrewPath();

    // Get installed casks (brew list --casks returns space-separated list)
    const { stdout: casksOutput } = await execAsync('brew list --casks', {
      env,
    });
    const installedCasks = casksOutput
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((cask) => cask.trim());

    // Get installed formulas
    const { stdout: formulasOutput } = await execAsync('brew list --formula', {
      env,
    });
    const installedFormulas = formulasOutput
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((formula) => formula.trim());

    // Get installed taps
    const { stdout: tapsOutput } = await execAsync('brew tap', {
      env,
    });
    const installedTaps = tapsOutput
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((tap) => tap.trim());

    return [
      ...installedCasks.map((cask: string) => ({
        name: cask,
        type: 'cask' as const,
      })),
      ...installedFormulas.map((formula: string) => ({
        name: formula,
        type: 'formula' as const,
      })),
      ...installedTaps.map((tap: string) => ({
        name: tap,
        type: 'tap' as const,
      })),
    ];
  } catch (error) {
    return [];
  }
}
