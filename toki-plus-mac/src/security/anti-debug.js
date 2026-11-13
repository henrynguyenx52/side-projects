'use strict';

const { app } = require('electron');

function init(options = {}) {
  const { log = () => {} } = options;
  log('info', '[anti-debug] Custom security layer active.');
}

function stop() {}

function checkIntegrity() {
  return true;
}

module.exports = {
  init,
  stop,
  checkIntegrity
};
