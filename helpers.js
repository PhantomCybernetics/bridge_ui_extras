import { execSync } from 'child_process';

export function GetGitCommitHash() {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    return hash;
  } catch (error) {
    return null;
  }
}