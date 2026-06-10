// Sport selection for NODE contexts only (test scripts) — switched via the
// VITE_SPORT env var. Vite builds never use this file: vite.config.js
// aliases './sport.js' to sport.nfl.js or sport.cfb.js per mode, so each
// bundle contains exactly one sport's config and nothing of the other.

import nfl from './sports/nfl.js'
import cfb from './sports/cfb.js'

export default globalThis.process?.env?.VITE_SPORT === 'cfb' ? cfb : nfl
