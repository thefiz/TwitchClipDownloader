const keypress = require("keypress");
const config = require("./config.json");
const request = require("request");
const fs = require("fs");
const base_clip_path = "https://clips-media-assets.twitch.tv/";
var slugs = [];
keypress(process.stdin);
const sanitize = require("sanitize-filename");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
global.downloads = 0;

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

var getClipInfov2 = function(slug) {
  return new Promise(function(resolve, reject) {
    request.get(
      { url: "https://clips.twitch.tv/api/v2/clips/" + slug + "/status" },
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

var downloadClip = function(clipID, clipTitle, clipGame, slug) {
  return new Promise(function(resolve, reject) {
    let dirtyFileName = clipTitle + " - " + clipGame + ".mp4";
    let cleanFileName = sanitize(dirtyFileName);
    let url = base_clip_path + clipID + ".mp4";
    get_filesize(url).then(function(size) {
      if (!isNaN(size)) {
        let r = request(url).pipe(
          fs.createWriteStream("./downloads/" + cleanFileName)
        );
        console.log("Starting Download - " + cleanFileName);
        r.on("close", function() {
          global.downloads--;
          resolve("Download Complete - " + cleanFileName);
        });
      } else {
        getClipInfov2(slug).then(function(info) {
          downloadClipv2(info.quality_options[0].source, cleanFileName).then(
            function(value) {
              console.log(value);
            }
          );
        });
      }
    });
  });
};

var downloadClipv2 = function(url, fileName) {
  return new Promise(function(resolve, reject) {
    let r = request(url).pipe(fs.createWriteStream("./downloads/" + fileName));
    console.log("Starting Download - " + fileName);
    r.on("close", function() {
      global.downloads--
      resolve("Download Complete - " + fileName);
    });
  });
};

var pressKey = function() {
  return new Promise(function(resolve, reject) {
    console.log(
      "Clips Downloading.  Once finished, Type 'exit' to exit"
    );
    process.stdin.on("keypress", function(ch, key) {
      process.exit();
    });
  });
};

var processClips = function() {
  return new Promise(function(resolve, reject) {
    var i;
    if (global.downloads < 5) {
      if (slugs.length > 0) {
        global.downloads++;
        let slug = slugs.shift();
        getClipInfo(slug)
          .then(function(clipInfo) {
            if (clipInfo.thumbnails.medium.indexOf("offset") >= 0) {
              let parts = clipInfo.thumbnails.medium.split("/");
              let offsetURL = parts[parts.length - 1];
              let offsetParts = offsetURL.split("-");
              let offset = offsetParts[2];
              clipInfo.tracking_id = clipInfo.broadcast_id.concat(
                "-offset-" + offset
              );
            }
            downloadClip(
              clipInfo.tracking_id,
              clipInfo.title,
              clipInfo.game,
              slug
            ).then(function(value) {
              console.log(value);
            });
          })
          .catch(function(error) {
            console.log(error);
          });

        resolve();
      } else {
        if (global.downloads == 0) {
          return console.log("\n\n\nAll Downloads Complete!!! \n\nThis software is provided free of charge.  \nIf you use and like it, you can send a tip to TheFiz at https://streamlabs.com/thefiz\n\n");
        } 
      }
    }
    setTimeout(function() {
      processClips();
    }, 1000);
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
