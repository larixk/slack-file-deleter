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
  .option('-l, --list', 'List all files on Slack ordered by filesize')
  .option('-x, --types <items>', 'A list of filetypes (e.g. "png,jpg,mp3") which will be deleted', list)
  .option('-d, --dry', 'Perform a dry run only')
  .parse(process.argv);

if (!program.token) {
  console.error('Slack API token required. Run with option -h for more info.');
  process.exit(1);
}

if (!(program.list || program.types)) {
  console.error('Please specify a list of types to delete or choose to display a list of all files. Run with option -h for more info.')
  process.exit(1);
}

if (program.types) {
  console.log('All files with these filetypes will be deleted:', program.types.join(','));
  if (program.dry) {
    console.log('DRY RUN: No files will actually be deleted.');
  }
}


var allFiles = [];

continueFromPage(1);

function continueFromPage(pageNumber) {
  request.post({
    url: 'https://slack.com/api/files.list',
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

    console.log("Fetching files:", Math.round(100 * body.paging.page / body.paging.pages) + '%');
    allFiles = allFiles.concat(body.files);
    if (body.paging.page === body.paging.pages) {
      if (program.list) {
        prettyPrint(allFiles);
        return;
      }
      if (program.types && program.types.length) {
        cleanFiles(allFiles);
      }
      return;
    }
    getFromPage(pageNumber + 1);
  });
}


function prettyPrint(files) {
  var filesWithSizes = _(files)
    .sortBy('size')
    .reverse()
    .map(function(file) {
      return {
        size: filesize(file.size),
        name: file.name
      };
    })
    .value();
  console.table(filesWithSizes);

  var totalSize = _(files).reduce(function (total, file) {
    return total + (file.size * 1);
  }, 0);

  console.log('Total:', filesize(totalSize));
}

function cleanFiles(files) {
  var deletedSize = 0;
  var deletedCount = 0;
  var deletedFiletypes = program.types;
  console.log('Deleting files with filetypes: ', program.types.join(','));
  files.forEach(function (file) {
    if (_.contains(deletedFiletypes, file.filetype)) {
      deletedSize += file.size;
      deletedCount++;
      deleteFile(file);
    }
  });
  console.log('Deleted:', deletedCount + ' files (' + filesize(deletedSize) + ')');
  if (program.dry) {
    console.log('DRY RUN: No files were actually deleted.');
  }
}

function deleteFile(file) {
  console.log('Deleting: ', file.filetype, file.name);
  if (program.dry) {
    return;
  }
  request.post({
    url: 'https://slack.com/api/files.delete',
    form: {
      file: file.id,
      token: program.token
    }
  }, function (error, response, body) {
    // @TODO handle errors here
    if (error) {
      console.log(error);
    }
  });
}
