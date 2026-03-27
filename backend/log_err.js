const fs = require('fs');
try {
  require('./dist/index.js');
} catch (e) {
  fs.writeFileSync('true_error.txt', e.stack || e.toString(), 'utf8');
}
