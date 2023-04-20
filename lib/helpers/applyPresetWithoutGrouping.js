"use strict";
const logger = require("sonos-discovery/lib/helpers/logger");
require("sonos-discovery/lib/polyfills/Array.includes");

function setVolume(system, playerPresets) {
  let initialPromise = Promise.resolve();

  return playerPresets.reduce((promise, playerInfo) => {
    let player = system.getPlayer(playerInfo.roomName);
    if (!player) {
      return promise;
    }

    return promise
      .then(() => {
        if (playerInfo.hasOwnProperty("volume")) {
          logger.debug(
            `setting volume ${playerInfo.volume} on ${player.roomName}`
          );
          return player.setVolume(playerInfo.volume);
        }
      })
      .then(() => {
        if (playerInfo.hasOwnProperty("mute")) {
          logger.debug(
            `setting mute state ${playerInfo.mute} on ${player.roomName}`
          );
          const muteFunc = playerInfo.mute
            ? player.mute.bind(player)
            : player.unMute.bind(player);
          return muteFunc();
        }
      });
  }, initialPromise);
}

function applyPresetWithoutGrouping(system, preset) {
  let promise = Promise.resolve();
  const players = [];

  promise = promise.then(() => {
    preset.players.forEach(function (playerInfo) {
      players.push(system.getPlayer(playerInfo.roomName));
    });
  });

  // if (preset.pauseOthers) {
  //     promise = promise.then(() => pauseOthers(this, players));
  // }

  if (preset.favorite) {
    promise = promise.then(() =>
      players.forEach((player) => player.replaceWithFavorite(preset.favorite))
    );
  } else if (preset.playlist) {
    promise = promise.then(() =>
      players.forEach((player) => player.replaceWithPlaylist(preset.playlist))
    );
  } else if (preset.uri) {
    promise = promise.then(() =>
      players.forEach((player) =>
        player.setAVTransport(preset.uri, preset.metadata)
      )
    );
  }

  promise = promise.then(() => setVolume(system, preset.players));

//   if (preset.playMode) {
//     promise = promise.then(() =>
//       coordinator
//         .setPlayMode(preset.playMode)
//         .catch((err) => logger.warn(err, "setPlayMode failed"))
//     );
//   }

//   if (preset.trackNo) {
//     promise = promise.then(() =>
//       coordinator
//         .trackSeek(preset.trackNo)
//         .catch((err) => logger.warn(err, "trackSeek failed"))
//     );
//   }

//   if (preset.elapsedTime) {
//     promise = promise.then(() =>
//       coordinator
//         .timeSeek(preset.elapsedTime)
//         .catch((err) => logger.warn(err, "timeSeek failed"))
//     );
//   }

//   if (preset.sleep) {
//     promise = promise.then(() => coordinator.sleep(preset.sleep));
//   }

  if (!preset.state || preset.state.toLowerCase() === "playing") {
    promise = promise.then(() =>
      players.forEach((player) =>
        player.play()
      )
    );
  }

  return promise;
}

module.exports = applyPresetWithoutGrouping;
