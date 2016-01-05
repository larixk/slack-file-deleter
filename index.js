#!/usr/bin/env node

var program = require('commander');
var request = require('request');
var filesize = require('filesize');
var _ = require('lodash');
require('console.table');

function list(val) {
  return val.split(',');
}

program
  .version('0.0.1')
  .option('-t, --token <token>', 'Your Slack API token')
  .parse(process.argv);

if (!program.token) {
  console.error('Slack API token required. Run with option -h for more info.');
  process.exit(1);
}



var allMembers = [];

continueFromPage(1);

function showResults(activeMembers) {
  activeMembers = _.sortBy(activeMembers, 'lastMessage').reverse();
  activeMembers = activeMembers.map(function (member) {
    return {
      name: member.name,
      totalMessages: member.totalMessages,
      lastMessage: member.lastMessage > 0 ? new Date(member.lastMessage * 1000) : 'nev'
    }
  })
  console.log(activeMembers);

  console.table(activeMembers);
}

function continueFromPage(pageNumber) {
  request.post({
    url: 'https://slack.com/api/users.list',
    form: {
      count: 100,
      page: pageNumber,
      token: program.token
    }
  }, function (error, response, body) {
    if (error || response.statusCode !== 200) {
      console.error("Error connecting to slack:", error);
      process.exit(1);
      return;
    }
    body = JSON.parse(body);
    if (body.error) {
      console.error("Error connecting to slack:", body.error);
      process.exit(1);
    }

    var activeMembers = _(body.members)
      .filter('deleted', false)
      .value();

    activeMembers
      .forEach(function (user) {
        request.post({
          url: 'https://slack.com/api/search.messages',
          form: {
            query: 'from:' + user.name,
            token: program.token
          }
        }, function (error, response, body) {
          body = JSON.parse(body);
          if (!body.messages || !body.messages.matches || !body.messages.matches.length) {
            user.totalMessages = 0;
            user.lastMessage = -1;
            return;
          }
          user.totalMessages = body.messages.total;
          user.lastMessage = body.messages.matches[0].ts * 1;

          console.log('.');
          var allDone = _.every(activeMembers, 'lastMessage');
          if(allDone) {
            showResults(activeMembers);
          }
        });
      });
  });
}
