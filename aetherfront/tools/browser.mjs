// Shared headless Chrome launcher with a REAL WebGL context (SwiftShader/ANGLE).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
export async function launch() {
  const candidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const executablePath = candidates.find((p) => fs.existsSync(p));
  return chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}
