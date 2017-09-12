var Config = {}
const out = require('./output');
const filemanager = require('./filemanager');
const chalk = require('chalk');
const path = require ('path');
const jsonfile = require('jsonfile');
const moment = require('moment');
const jsonQuery = require('json-query');
const aliasesFilePath = __dirname + path.normalize('/data/aliases.json');
var CurrentSeason = {};
var Tournaments = {};
var Matches = {};
var Aliases = {};


let saveAliasesData = function () {
    jsonfile.writeFileSync(aliasesFilePath, Aliases);
}

let loadTournamentData = function() {
    Tournaments = filemanager.GetTournamentsForSeason(Config.currentSeason);
}

let loadMatchesData = function () {
    Matches = filemanager.GetMatchesForSeason(Config.currentSeason);
}

let reloadAllData = function() {
    loadTournamentData();
    loadMatchesData();
    Aliases = jsonfile.readFileSync(aliasesFilePath);
}

module.exports = {
    Init : function(in_config) {
        Config = in_config;
        CurrentSeason = Config.seasons[Config.currentSeason];
        loadTournamentData();
        loadMatchesData();
        Aliases = jsonfile.readFileSync(aliasesFilePath);
    },
    DisplayCurrentSeason : function(text) {
        out.NewLine();
        out.Log(chalk.bold.underline.white("Current season: ") + chalk.magenta(CurrentSeason.name));
    },
    ListSeasons : function() {
        out.NewLine();
        out.Log(chalk.bold.underline.white("All seasons: "));
        out.Divider();
        for (var i = 0; i < Config.seasons.length; i++) {
            var season = Config.seasons[i];
            var text = chalk.magenta("[" + (i+1) + "] ") + season.name
            if (i == Config.currentSeason) { text = text + chalk.red(" (active)") }
            text = text + "\n" + moment(season.startDate).format("Do MMM YYYY") + " => " + moment(season.endDate).format("Do MMM YYYY");
            out.Success(text);
            out.SmallDivider();
        }
    },
    ChangeSeason : function(index) {
        if (!Config.seasons[index-1]) {
            out.Warning("season does not exist");
            return;
        }
        Config.currentSeason = index-1;
        CurrentSeason = Config.seasons[Config.currentSeason];
        filemanager.WriteConfig(Config);
        out.Success("Active season: " + CurrentSeason.name);
    },
    ListTournaments : function(all) {
        if (!Tournaments || !Tournaments.records || Tournaments.records.length < 1)  {
            out.Warning("No existing tournaments saved.");
            return null;
        }

        out.NewLine();
        if (all) {
            return Tournaments.records;
        } else {
            var results = jsonQuery('records[*:inCurrentSeason]', {
                data : Tournaments,
                locals: {
                    inCurrentSeason: function(tournament) {
                        return moment(tournament.startDate, "YYYY-MM-DD").isAfter(CurrentSeason.startDate)
                            && moment(tournament.endDate, "YYYY-MM-DD").isBefore(CurrentSeason.endDate);
                    }
                }
            });
            return results.value;
        }
    },
    ListMatches : function(all) {
        if (!Matches || !Matches.records || Matches.records.length < 1) {
            out.Warning("No existing matches saved.");
            return null;
        }
        return Matches.records;
    },
    ListPlayers : function(all) {
        if (!Matches || !Matches.players || Matches.players.length < 1) {
            out.Warning("No existing players saved.")
            return null;
        }
        return Matches.players;
    },
    Matchup : function(player1, player2, allTime) {
        query = allTime ? 'records[*:containsBothPlayers]' : 'records[*:containsBothPlayersInSeason]'
        var results = jsonQuery(query, {
            data : Matches,
            locals: {
                containsBothPlayers: function(match) {
                    return ((match.player1 === player1 && match.player2 === player2) ||
                    (match.player1 === player2 && match.player2 === player1))
                },
                containsBothPlayersInSeason: function(match) {
                    return ((match.player1 === player1 && match.player2 === player2)
                        || (match.player1 === player2 && match.player2 === player1))
                    && (moment(match.date, "YYYY-MM-DD").isAfter(CurrentSeason.startDate)
                        && moment(match.date, "YYYY-MM-DD").isBefore(CurrentSeason.endDate));
                }
            }
        });
        return results.value;
    },
    UpdateTournament: function(id, updatedData) {
        loadTournamentData();
        var found = false;
        var updated = false;
        for (var i = 0; i< Tournaments.records.length; i++) {
            if (Tournaments.records[i].id === id) {
                found = true;
                for (var key in updatedData) {
                    if (Tournaments.records[i].hasOwnProperty(key)) {
                        Tournaments.records[i][key] = updatedData[key];
                        updated = true;
                    }
                }
            }
        }

        if (found) {
            if (updated) {
                filemanager.WriteTournamentsFile(Config.currentSeason, Tournaments);
            } else {
                out.Warning("Found tournament: " + id + " but no fields were updated");
            }
        } else {
            out.Warning("Failed to find tournament to update: " + id);
        }
    },
    UpdatePlayer: function(name, updatedData) {
        loadMatchesData();
        var found = false;
        var updated = false;
        for (var i = 0; i< Matches.players.length; i++) {
            if (Matches.players[i].name === name) {
                found = true;
                for (var key in updatedData) {
                    if (Matches.players[i].hasOwnProperty(key)) {
                        Matches.players[i][key] = updatedData[key];
                        updated = true;
                    }
                }
            }
        }

        if (found) {
            if (updated) {
                out.Log(chalk.yellow("= updated player " + chalk.bold(name)));
                filemanager.WriteMatchesFile(Config.currentSeason, Matches);

            } else {
                out.Warning("Found player: " + id + " but no fields were updated");
            }
        } else {
            out.Warning("Failed to find player to update: " + id);
        }
    },
    GetPlayerByName: function(playerName) {
        return jsonQuery(['players[name=?]', playerName], {
            data: Matches
        });
    },
    GetMatchesForPlayer: function(playerName) {
        return jsonQuery('records[*:involvesPlayer]', {
            data: Matches,
            locals: {
                involvesPlayer: function(match) {
                    return match.player1 === playerName || match.player2 === playerName;
                }
            }
        }).value;
    },
    GetPlayerByAlias : function(alias) { //TODO:MULTIPLE PLAYERS COULD HAVE THE SAME ALIAS, HANDLE THAT !!!
        var record = jsonQuery(['data[alias=?]', alias.toLowerCase()], {
            data : { data : Aliases }
        })
        if (record.value) {
            return record.value;
        }
        else {
            return null;
        }
    },
    AddAliasToPlayer : function(player, alias) { //TODO: UPDATE INTO MERGE FUNCTION!!
        var existingPlayer = this.GetPlayerByAlias(alias);
        if (existingPlayer) {
            out.Warning("Alias already belongs to " + existingPlayer.player);
        } else {
            Aliases.push({"player" : player, "alias" : alias});
            saveAliasesData();
            out.Log("Added alias " + chalk.magenta(alias) + " to " + chalk.green(player));
        }
    },
    ListNewPlayers : function() {
        return jsonQuery(['players[*new=1]'], {
            data: Matches
        });
    }
}
