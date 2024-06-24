'use strict';

const logger = require('sonos-discovery/lib/helpers/logger');
require('sonos-discovery/lib/polyfills/Array.includes');

function playerHasProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function setVolume(system, playerPresets) {
  const initialPromise = Promise.resolve();

  return playerPresets.reduce((promise, playerInfo) => {
    const player = system.getPlayer(playerInfo.roomName);
    if (!player) {
      return promise;
    }

    return promise
      .then(() => {
        if (this.playerHasProperty(playerInfo, 'volume')) {
          logger.debug(`setting volume ${playerInfo.volume} on ${player.roomName}`);
          return player.setVolume(playerInfo.volume);
        }
        return Promise.resolve();
      })
      .then(() => {
        if (this.playerHasProperty(playerInfo, 'mute')) {
          logger.debug(`setting mute state ${playerInfo.mute} on ${player.roomName}`);
          const muteFunc = playerInfo.mute
            ? player.mute.bind(player)
            : player.unMute.bind(player);
          return muteFunc();
        }
        return Promise.resolve();
      });
  }, initialPromise);
}

function applyPresetWithoutGrouping(system, preset) {
  let promise = Promise.resolve();
  const players = [];

  promise = promise.then(() => {
    preset.players.forEach((playerInfo) => {
      players.push(system.getPlayer(playerInfo.roomName));
    });
  });

  // if (preset.pauseOthers) {
  //     promise = promise.then(() => pauseOthers(this, players));
  // }

  if (preset.favorite) {
    promise = promise.then(() =>
      players.forEach(player =>
        player.replaceWithFavorite(preset.favorite)));
  } else if (preset.playlist) {
    promise = promise.then(() =>
      players.forEach(player =>
        player.replaceWithPlaylist(preset.playlist)));
  } else if (preset.uri) {
    promise = promise.then(() =>
      players.forEach(player =>
        player.setAVTransport(preset.uri, preset.metadata)));
  }

  promise = promise.then(() => setVolume(system, preset.players));

  if (!preset.state || preset.state.toLowerCase() === 'playing') {
    promise = promise.then(() =>
      players.forEach(player =>
        player.play()));
  }

  return promise;
}

module.exports = applyPresetWithoutGrouping;
