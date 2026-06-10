// Build-time alias target: CFB builds resolve './sport.js' to this file
// (see vite.config.js), so the NFL config never enters the CFB bundle.
import cfb from './sports/cfb.js'
export default cfb
