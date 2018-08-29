/*
 * Copyright (c) 2015-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
require('bedrock-views');
require('./server');
// TODO: get optimize to work, there are webpack issues with
// chart.js and other deps in bedrock-ledger-test-dashboard
// require('bedrock-webpack');

// load config
require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--cloud', 'Configure for Openstack/AWS'));

bedrock.events.on('bedrock-cli.ready', async () => {
  if(bedrock.program.cloud) {
    // aws and openstack offer the same meta-data API
    const awsInstanceMetadata = require('aws-instance-metadata');
    // require('./config-aws');
    // const lhn = await awsInstanceMetadata.fetch('local-hostname');
    // const phn = await awsInstanceMetadata.fetch('public-hostname');
    const localIp = await awsInstanceMetadata.fetch('local-ipv4');
    const publicIp = await awsInstanceMetadata.fetch('public-ipv4');
    config.server.bindAddr = [localIp];
    config.server.domain = publicIp;
    return;
  }
});

bedrock.start();
