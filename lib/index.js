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
  const os = require('os');
  const ifaces = os.networkInterfaces();

  Object.keys(ifaces).forEach(ifname => {
    let alias = 0;

    ifaces[ifname].forEach(iface => {
      if('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if(alias >= 1) {
        // this single interface has multiple ipv4 addresses
        // console.log(ifname + ':' + alias, iface.address);
      } else {
        // this interface has only one ipv4 adress
        // console.log(ifname, iface.address);
        // FIXME: this algo can get confused by VPN `tun` interfaces
        config.server.bindAddr = [iface.address];
        config.server.domain = iface.address;
      }
      ++alias;
    });
  });
});

bedrock.start();
