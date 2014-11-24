
// global exports
var Exhibitor = require('./exhibitor');
exports.Exhibitor = Exhibitor;
exports.bootstrap = function(element) {
  return new Exhibitor(element);
};


if (process.browser) {
  // exports only for browser bundle
  exports.version = '{{package-version}}';
  exports.homepage = '{{package-homepage}}';
} else {
  // exports only for node.js
  var packageInfo = require('../pack' + 'age.json');
  exports.version = packageInfo.version;
  exports.homepage = packageInfo.homepage;
}
