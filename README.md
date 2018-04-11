# slack-file-deleter
Delete files through the Slack API through node.js

## Installing

(Requires node.js and npm)

1. Download or checkout this repo. 
2. Run `npm install` from the folder containing the repo

## Usage

Before using, you need to create an access token for your Slack at https://api.slack.com/web and put it into the index.js
In the Config part:


```const token = "YOUR_TOKEN";```
```const domain = "YOUR_DOMAIN_NAME";```


```
Usage: ./index.js [options]

Options:

-V, --version        output the version number
-l, --list           List all files on Slack ordered by filesize
-x, --types <items>  A list of filetypes (e.g. "png,jpg,mp3") which will be deleted
-s, --size <size>    All files above the specified size will be deleted
-d, --date <days>    All files before XX Days will be deleted
-t, --dry            Perform a dry run only
-h, --help           output usage information

```

## Examples

Perform a dry run deleting all files with filetypes jpg, png or gif:

`./index.js -x jpg,png,gif --dry`

Delete all files larger than 100 megabytes:

`./index.js -s 100M`

List all files visible to the user associated with the token:

`./index.js -l`

List all files older than 30 Days with dry run

`./index.js -l -d 30 --dry`

Delete all files older than 30 Days

`./index.js -d 30`


