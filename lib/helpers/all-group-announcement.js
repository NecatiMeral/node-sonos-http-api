"use strict";
const logger = require("sonos-discovery/lib/helpers/logger");
const applyPresetWithoutGrouping = require("../helpers/applyPresetWithoutGrouping");
const isRadioOrLineIn = require("../helpers/is-radio-or-line-in");

function saveAll(system) {
  const backupPresets = system.zones.map((zone) => {
    const coordinator = zone.coordinator;
    const state = coordinator.state;
    const preset = {
      players: [{ roomName: coordinator.roomName, volume: state.volume }],
      state: state.playbackState,
      uri: coordinator.avTransportUri,
      metadata: coordinator.avTransportUriMetadata,
      playMode: {
        repeat: state.playMode.repeat,
      },
    };

    if (!isRadioOrLineIn(preset.uri)) {
      preset.trackNo = state.trackNo;
      preset.elapsedTime = state.elapsedTime;
    }

    zone.members.forEach(function (player) {
      if (coordinator.uuid != player.uuid)
        preset.players.push({
          roomName: player.roomName,
          volume: player.state.volume,
        });
    });

    return preset;
  });

  logger.trace("backup presets", backupPresets);
  return backupPresets.sort((a, b) => {
    return a.players.length < b.players.length;
  });
}

function announceAll(system, uri, volume, duration) {
  let abortTimer;

  // Save all players
  var backupPresets = saveAll(system);

  const zones = [];
  // find biggest group and all players
  const allPlayers = [];
  system.zones.forEach(function (zone) {
    allPlayers.push({ coordinator: zone.coordinator, volume });
    zones.push({ roomName: zone.coordinator.roomName, volume });
  });

  const preset = {
    players: zones,
    uri,
    playMode: {
      repeat: false,
    },
    pauseOthers: true,
    state: "STOPPED",
  };

  const restoreTimeout = duration + 2000;
  return applyPresetWithoutGrouping(system, preset)
    .then(() => {
      allPlayers.forEach(function (player) {
        player.coordinator.play();
      });

      return new Promise((resolve) => {
        const transportChange = (player, state) => {
          logger.debug(`Player ${player.coordinator.roomName} changed to state ${state.playbackState}`);
          if (state.playbackState === "STOPPED") {
            var index = zones.indexOf(player.coordinator.roomName);
            zones.splice(index, 1);

            if (zones.length === 0) {
              logger.debug('ALL ZONES COMPLETED; RESOLVING PROMISE')
              return resolve();
            }
          }

          player.coordinator.once("transport-state", state => transportChange(player, state));
        };

        allPlayers.forEach(function (player) {
          setTimeout(() => {
            player.coordinator.once("transport-state", state => transportChange(player, state));
          }, duration / 2);
        });

        logger.debug(`Setting restore timer for ${restoreTimeout} ms`);
        abortTimer = setTimeout(resolve, restoreTimeout);
      });
    })
    .then(() => {
      clearTimeout(abortTimer);
    })
    .then(() => {
      return backupPresets.reduce((promise, preset) => {
        logger.trace("Restoring preset", preset);
        return promise.then(() => system.applyPreset(preset));
      }, Promise.resolve());
    })
    .catch((err) => {
      logger.error(err.stack);
      throw err;
    });
}

module.exports = announceAll;
