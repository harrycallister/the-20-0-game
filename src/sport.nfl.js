// Build-time alias target: NFL builds resolve './sport.js' to this file
// (see vite.config.js), so the CFB config never enters the NFL bundle.
import nfl from './sports/nfl.js'
export default nfl
