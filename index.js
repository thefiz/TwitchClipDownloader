const keypress = require("keypress");
const config = require("./config.json");
const request = require("request");
const fs = require("fs");
const base_clip_path = "https://clips-media-assets.twitch.tv/";
var slugs = [];
keypress(process.stdin);

var readTextFile = function() {
  return new Promise(function(resolve, reject) {
    var inputText = fs.readFileSync("clips.txt").toString("utf-8");
    var textByLine = inputText.split("\n");
    var i;
    for (i = 0; i < textByLine.length; i++) {
      var parts = textByLine[i].split("/");
      var slug = parts[parts.length - 1];
      slug.replace(/[\n\r]/g, "");
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
  request(base_clip_path + clipID + ".mp4").pipe(
    fs.createWriteStream("./downloads/" + clipTitle + " - " + clipGame + ".mp4")
  );
  console.log(
    "Downloading Complete - " + clipTitle + " - " + clipGame + ".mp4"
  );
};

var pressKey = function() {
  return new Promise(function(resolve, reject) {
    console.log("Clips Downloading.  Once finished, Type 'exit' to exit\n\nThis software is provided free of charge.  If you use and like it, you can send a tip to TheFiz at https://streamlabs.com/thefiz");
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
          downloadClip(clipInfo.tracking_id, clipInfo.title, clipInfo.game);
          console.log(
            "Downloading Clip - " + clipInfo.title + " - " + clipInfo.game
          );
        })
        .catch(function(error) {
          console.log(error);
        });
    }
    resolve();
  });
};

readTextFile()
  .then(processClips)
  .then(pressKey)
  .catch(function(error) {
    console.log(error);
  });
