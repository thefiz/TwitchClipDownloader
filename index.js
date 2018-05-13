const keypress = require("keypress");
const config = require("./config.json");
const request = require("request");
const fs = require("fs");
const base_clip_path = "https://clips-media-assets.twitch.tv/";
var slugs = [];
keypress(process.stdin);
const sanitize = require("sanitize-filename");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var readTextFile = function() {
  return new Promise(function(resolve, reject) {
    var inputText = fs.readFileSync("clips.txt").toString("utf-8");
    var textByLine = inputText.split("\n");
    var i;
    for (i = 0; i < textByLine.length; i++) {
      var parts = textByLine[i].split("/");
      var slug = parts[parts.length - 1];
      slug = slug.replace(/(\r\n|\n|\r)/gm, "");
      slugs.push(slug);
    }
    resolve();
  });
};

var getClipInfo = function(slug) {
  return new Promise(function(resolve, reject) {
    request.get(
      {
        headers: {
          "Client-ID": config.clientid,
          Accept: "application/vnd.twitchtv.v5+json"
        },
        url: "https://api.twitch.tv/kraken/clips/" + slug
      },
      function(error, response, body) {
        if (response.statusCode == 200) {
          let jsonContent = JSON.parse(body);
          resolve(jsonContent);
        } else {
          reject(
            "Error getting clip info for " +
              slug +
              " -- Please check the URL and try again."
          );
        }
      }
    );
  });
};

var downloadClip = function(clipID, clipTitle, clipGame) {
  return new Promise(function(resolve, reject) {
    var dirtyFileName = clipTitle + " - " + clipGame + ".mp4";
    var cleanFileName = sanitize(dirtyFileName);
    var url = base_clip_path + clipID + ".mp4";
    get_filesize(url).then(function(size) {
      if (!isNaN(size)) {
        var r = request(url).pipe(
          fs.createWriteStream("./downloads/" + cleanFileName)
        );
        console.log("Starting Download - " + cleanFileName);
        r.on("close", function() {
          resolve("Download Complete - " + cleanFileName);
        });
      } else {
        console.log("ERROR!! " + cleanFileName + " is unable to download.  This is a bug with the Twitch API and cannot be corrected until they update")
      }
    });
  });
};

var pressKey = function() {
  return new Promise(function(resolve, reject) {
    console.log(
      "Clips Downloading.  Once finished, Type 'exit' to exit\n\nThis software is provided free of charge.  If you use and like it, you can send a tip to TheFiz at https://streamlabs.com/thefiz\n\n"
    );
    process.stdin.on("keypress", function(ch, key) {
      process.exit();
    });
  });
};

var processClips = function() {
  return new Promise(function(resolve, reject) {
    var i;
    for (i = 0; i < slugs.length; i++) {
      getClipInfo(slugs[i])
        .then(function(clipInfo) {
          if (clipInfo.thumbnails.medium.indexOf("offset") >= 0) {
            var parts = clipInfo.thumbnails.medium.split("/");
            var offsetURL = parts[parts.length - 1];
            var offsetParts = offsetURL.split("-");
            var offset = offsetParts[2];
            clipInfo.tracking_id = clipInfo.broadcast_id.concat(
              "-offset-" + offset
            );
          }
          downloadClip(
            clipInfo.tracking_id,
            clipInfo.title,
            clipInfo.game
          ).then(function(value) {
            console.log(value);
          });
        })
        .catch(function(error) {
          console.log(error);
        });
    }
    resolve();
  });
};

var get_filesize = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, true);
    xhr.onreadystatechange = function() {
      if (this.readyState == this.DONE) {
        resolve(parseInt(xhr.getResponseHeader("Content-Length")));
      }
    };
    xhr.send();
  });
};

readTextFile()
  .then(processClips)
  .then(pressKey)
  .catch(function(error) {
    console.log(error);
  });
