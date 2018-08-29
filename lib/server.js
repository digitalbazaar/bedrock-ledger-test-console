/*
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const {config} = bedrock;
const database = require('bedrock-mongodb');
const logger = require('./logger');
const {promisify} = require('util');

const brOpenCollections = promisify(database.openCollections);
bedrock.events.on('bedrock-mongodb.ready', async () => {
  await brOpenCollections(['peer-public-addresses']),
  await database.createIndexes([{
    collection: 'peer-public-addresses',
    fields: {id: 1, 'peer.timeStamp': 1},
    options: {unique: true, background: false}
  }, {
    collection: 'peer-public-addresses',
    fields: {'peer.timeStamp': 1, id: 1},
    options: {unique: true, background: false}
  }]);
});

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test-console'].routes;

  // peers
  app.get(routes.peers, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .aggregate([
          {$sort: {'peer.timeStamp': 1}},
          {$group: {_id: "$id", last: {$last: "$peer"}}}
        ], callback)
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.peers);
    })
  }));

  // peer history
  app.get(routes.peerHistory, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .find({id: req.params.peerId}, {
          _id: 0, 'peer.label': 1, 'peer.status': 1, 'peer.timeStamp': 1
        }).sort({'peer.timeStamp': -1})
        // .limit(60)
        .toArray((err, result) => {
          if(err) {
            return callback(err);
          }
          return callback(null, result.map(p => p.peer).reverse());
        })
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.peers);
    })
  }));

  app.post(routes.newNode, brRest.when.prefers.ld, async (req, res, next) => {
    const {
      baseUri, label, ledgerNodeId, /*logGroupName,*/ logUrl, mongoUrl,
      privateHostname, publicHostname, status
    } = req.body;
    // using the ledgerNodeId as key
    const peerId = database.hash(ledgerNodeId);
    const record = {
      id: peerId,
      peer: {
        baseUri,
        mongoUrl,
        label,
        ledgerNodeId,
        // logGroupName,
        logUrl,
        privateHostname,
        publicHostname,
        status,
        timeStamp: Date.now(),
      }
    };
    try {
      await database.collections['peer-public-addresses']
        .insert(record, database.writeOptions);
    } catch(err) {
      if(err && !database.isDuplicateError(err)) {
        logger.error('Error storing node information.', err);
        return next(err);
      }
    }
    res.status(204).end();
  });
});
