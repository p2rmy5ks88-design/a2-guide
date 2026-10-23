// Wraps the app binary in a small launcher so it always starts with --no-sandbox (needed when Steam starts
// it in Gaming Mode on Steam Deck) and writes a log to ~/.skyline-estates.log for troubleshooting.
const fs = require('node:fs'); const path = require('node:path');
exports.default = async (ctx) => {
  if (ctx.electronPlatformName !== 'linux') return;
  const name = ctx.packager.executableName, dir = ctx.appOutDir, bin = path.join(dir, name), real = path.join(dir, name + '.bin');
  fs.renameSync(bin, real);
  fs.writeFileSync(bin, `#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
LOG="$HOME/.skyline-estates.log"
echo "--- $(date) start $*" >> "$LOG"
unset LD_PRELOAD
# plain keyboard handling: the Steam on-screen keyboard otherwise types every letter twice through the input method
export GTK_IM_MODULE=gtk-im-context-simple
export XMODIFIERS=@im=none
exec "$HERE/${name}.bin" --no-sandbox --disable-gpu-sandbox "$@" >> "$LOG" 2>&1
`);
  fs.chmodSync(bin, 0o755);
};
