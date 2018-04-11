#!/usr/bin/env node

// CONFIG START

const token = "YOUR_TOKEN";

const domain = "YOUR_DOMAIN_NAME";

// CONFIG END

const program = require('commander');
const request = require('request');
const humanFormat = require('human-format');
const _ = require('lodash');
require('console.table');
const async = require('async');
const apiURL = "https://" + domain + ".slack.com/api/";
let time = 0;
function list(val) {
  return val.split(',');
}

program
  .version('0.0.2')
  .option('-l, --list', 'List all files on Slack ordered by filesize')
  .option('-x, --types <items>', 'A list of filetypes (e.g. "png,jpg,mp3") which will be deleted', list)
  .option('-s, --size <size>','All files above the specified size will be deleted')
  .option('-d, --date <days>','All files before XX Days will be deleted')
  .option('-t, --dry', 'Perform a dry run only')
  .parse(process.argv);

program.token = token;

if (!program.token) {
  console.error('Slack API token required. Run with option -h for more info.');
  process.exit(1);
}

if (!(program.list || program.types||program.size || program.date)) {
  console.error('Please specify a list of types to delete or choose to display a list of all files. Run with option -h for more info.')
  process.exit(1);
}

if (program.types) {
  console.log('All files with these filetypes will be deleted:', program.types.join(','));
  if (program.dry) {
    console.log('DRY RUN: No files will actually be deleted.');
  }
}

if(program.size) {
  try {
    var parsed=humanFormat.parse.raw(program.size);
  } catch (e) {
    console.error('\'',program.size,'\' is not a valid file size (examples: 100MiB, 42kB).')
    process.exit(1);
  }
  if (!(parsed.unit == '' || parsed.unit.toLowerCase() == 'b' || parsed.unit.toLowerCase() == 'ib')) {
    console.error('\'',parsed.unit,'\' is not a valid unit for file sizes (valid examples: 100MiB, 42kB).');
    process.exit(1);
  }
  if (parsed.unit.toLowerCase()=='b')
    program.size=parsed.value*parsed.factor;
  else
    program.size=parsed.value*Math.pow(1024,Math.log(parsed.factor)/Math.log(1000))

  console.log('All files with a filesize above this value will be deleted:', humanFormat(program.size, {scale: 'binary',  unit: 'B'}));
  if (program.dry) {
    console.log('DRY RUN: No files will actually be deleted.');
  }
}



var allFiles = [];
continueFromPage(1);


function continueFromPage(pageNumber) {
  if(program.date){
    let d = new Date();
    let daysAgo = d.setDate(d.getDate() - program.date);
    request.post({
      url: 'https://slack.com/api/files.list',
      form: {
        count: 100,
        page: pageNumber,
        token: program.token,
        ts_to: Math.round(daysAgo / 1000),
      }
    }, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        console.error("Error connecting to slack:", error);
        process.exit(1);
        return;
      }
      body = JSON.parse(body);
      let maxPages = body.paging.pages;
      if(maxPages === 0){
        console.error("No Files found");
        process.exit(1);
        return;
      }
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
        if(program.data){
          cleanFiles(allFiles);
        }
        if (program.types && program.types.length) {
          cleanFiles(allFiles);
        }
        if (program.size) {
          cleanFilesAboveSize(allFiles);  
        }
        return;
      }
      continueFromPage(pageNumber + 1);
    });
  }else{
    request.post({
      url: 'https://slack.com/api/files.list',
      form: {
        count: 100,
        page: pageNumber,
        token: program.token,
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
        if (program.size) {
          cleanFilesAboveSize(allFiles);  
        }
        return;
      }
      continueFromPage(pageNumber + 1);
    });
  }
}


function prettyPrint(files) {
  var filesWithSizes = _(files)
    .sortBy('size')
    .reverse()
    .map(function(file) {
      return {
        size: humanFormat(file.size, {scale: 'binary',  unit: 'B'}),
        name: file.name
      };
    })
    .value();
  console.table(filesWithSizes);

  var totalSize = _(files).reduce(function (total, file) {
    return total + (file.size * 1);
  }, 0);

  console.log('Total:', humanFormat(totalSize, {scale: 'binary',  unit: 'B'}));
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
  console.log('Deleted:', deletedCount + ' files (' + humanFormat(deletedSize, {scale: 'binary',  unit: 'B'}) + ')');
  if (program.dry) {
    console.log('DRY RUN: No files were actually deleted.');
  }
}

function cleanFilesAboveSize(files) {
  var deletedSize = 0;
  var deletedCount = 0;
  console.log('Deleting files larger than',humanFormat(program.size, {scale: 'binary',  unit: 'B'}));
  files.forEach(function (file) {
    if (file.size >= program.size) {
      deletedSize += file.size;
      deletedCount++;
      deleteFile(file);
    }
  });
  console.log('Deleted:', deletedCount + ' files (' + humanFormat(deletedSize, {scale: 'binary',  unit: 'B'}) + ')');
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
    if (error) {
      console.log(error);
    }
  });
}
