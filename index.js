const config = require("./config.json");
const request = require("request");
const fs = require("fs");

const base_clip_path = "https://clips-media-assets.twitch.tv/";
var slugs = [];

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
          reject("Error getting clip info for " + slug);
        }
      }
    );
  });
};

var downloadClip = function(clipID, clipTitle, clipGame) {
  request(base_clip_path + clipID + ".mp4").pipe(
    fs.createWriteStream("./downloads/" + clipTitle + " - " + clipGame + ".mp4")
  );
};

readTextFile().then(function() {
  var i;
  for (i = 0; i < slugs.length; i++) {
    getClipInfo(slugs[i]).then(function(clipInfo) {
      downloadClip(clipInfo.tracking_id, clipInfo.title, clipInfo.game);
    });
  }
});
