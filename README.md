# slack-file-deleter
Delete files through the Slack API through node.js

```
Usage: ./index.js [options]

Options:

  -h, --help           output usage information
  -V, --version        output the version number
  -t, --token <token>  Your Slack API token (required)
  -x, --types <items>  A list of filetypes (e.g. "png,jpg,mp3") to delete
  -d, --dry            Perform a dry run only
  -l, --list           List all files on Slack ordered by filesize
```

## Examples

Perform a dry run deleting all files with filetypes jpg, png or gif:

`./index.js -t abcd-0123456789-0123456789-0123456789-0123456abc -x jpg,png,gif -d`

List all files visible to the user associated with the token

`./index.js -t abcd-0123456789-0123456789-0123456789-0123456abc -l`