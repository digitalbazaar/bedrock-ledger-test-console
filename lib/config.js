/*
 * Copyright (c) 2015-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const path = require('path');
const {config} = require('bedrock');

// add pseudo packages
const rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});
// TODO: get optimization working
config.views.vars.minify = false;

config['ledger-test-console'] = {};

config['ledger-test-console'].routes = {
  newNode: '/ledger-test/nodes',
  peers: '/ledger-test/peers',
  peerHistory: '/ledger-test/peers/:peerId',
};
