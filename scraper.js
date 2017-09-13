const jsonfile = require('jsonfile');
const path = require('path');
const challonge = require('challonge');
const moment = require('moment');
const chalk = require('chalk');
const filemanager = require('./filemanager');
const out = require('./output');
const jsonQuery = require('json-query');
const manager = require('./manager');

const meleeId = "394";

var client = {};
var Matches = {};
var Tournaments = {};
var Config = {};
var Players = {};

let processTournamentData = function(data) {
    var count = 0;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var record = data[key].tournament;
            if (record.gameId == meleeId &&
            !record.name.toLowerCase().includes("doubles") &&
            !record.name.toLowerCase().includes("crew") &&
            !record.name.toLowerCase().includes("dubs") &&
            Tournaments.scraped.indexOf(record.id) < 0) {
                count++;
                var new_tournament = {
                    "id": record.id,
                    "name" : record.name,
                    "startDate" : record.startedAt,
                    "startDate" : record.startedAt,
                    "endDate" : record.completedAt,
                    "participants": record.participantsCount,
                    "owner" : Config.currentApiUser,
                    "matchesScraped": 0
                }
                Tournaments.records.push(new_tournament);
                Tournaments.scraped.push(new_tournament.id);
            }
        }
    }
    if (count > 0) {
        Tournaments.lastrun[Config.currentApiUser] = moment().format("YYYY-MM-DD");
        filemanager.WriteTournamentsFile(Config.currentSeason, Tournaments);
        out.Log(chalk.bold.white("Scraped " + chalk.green("[" + count + "]") + " new " + chalk.green("tournament(s)")));
        out.Log(chalk.bold.white("Run again with " + chalk.magenta("tournaments") + " command to see all saved tournaments"));
    } else {
        out.Log(chalk.bold.white("No new tournaments found"));
    }
}

let processMatchesData = function(data) {
    var matchesCount = 0;
    var playersCount = 0;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var record = data[key];
            out.Divider();
            out.Log("Processing " + chalk.magenta(record.name));
            /*Scrape Players*/
            for(var key in record.participants) {
                var queryParamName = record.participants[key].participant.name.toLowerCase();

                var existingPlayer = jsonQuery('records[:hasUsedAlias]', {
                    data : Players,
                    locals: {
                        hasUsedAlias: function(player) {
                            return player.name == queryParamName || player.aliases.indexOf(queryParamName) > -1;
                        }
                    }
                });

                if (existingPlayer.value) {
                    filemanager.WritePlayersFile(Config.currentSeason, Players); //save what we have for manager to deal with
                    manager.UpdatePlayer(existingPlayer.value.name, {
                        ids: existingPlayer.value.ids.concat([record.participants[key].participant.id]),
                        lastTournamentId: record.id,
                        tournamentsEntered: existingPlayer.value.tournamentsEntered + 1
                    });
                    loadPlayersData(); //reload post-manager update
                    continue;
                }

                playersCount++;
                var player = record.participants[key].participant;
                var newPlayer = {
                    "ids" : [],
                    "name" : player.name.toLowerCase(),
                    "aliases" : [],
                    "new" : 1,
                    "tournamentsEntered" : 1,
                    "lastTournamentId" : record.id
                }
                newPlayer.aliases.push(player.name);
                newPlayer.ids.push(player.id);
                out.Success("+ created player " + newPlayer.name);
                Players.records.push(newPlayer);
            }
            if (playersCount > 0) {
                filemanager.WritePlayersFile(Config.currentSeason, Players);
                out.Log(chalk.bold.white("Scraped " + chalk.yellow("[" + playersCount + "]") + " new " + chalk.yellow("players")));
            }
            /*Scrape Matches*/
            for (var index in record.matches) {
                if (Matches.scraped.indexOf(record.matches[index].match.id) === -1
                && record.matches[index].match.state === "complete") {
                    matchesCount++;
                    var match = record.matches[index].match;

                    var playerOne = jsonQuery('records[:isPlayerOne]', {
                        data : Players,
                        locals: {
                            isPlayerOne: function(player) {
                                return player.ids.indexOf(match.player1Id) > -1;
                            }
                        }
                    });
                    if (!playerOne.value) {
                        out.Warning("Failed to find player one with id: " + match.player1Id)
                        continue;
                    }
                    var playerTwo = jsonQuery('records[:isPlayerTwo]', {
                        data : Players,
                        locals: {
                            isPlayerTwo: function(player) {
                                return player.ids.indexOf(match.player2Id) > -1;
                            }
                        }
                    });
                    if (!playerTwo.value) {
                        out.Warning("Failed to find player two with id: " + match.player2Id)
                        continue;
                    }
                    var winner = "";
                    var loser = "";
                    if (match.winnerId === match.player1Id) winner = playerOne.value.name;
                    if (match.loserId === match.player1Id) loser = playerOne.value.name;
                    if (match.winnerId === match.player2Id) winner = playerTwo.value.name;
                    if (match.loserId === match.player2Id) loser = playerTwo.value.name;
                    var new_match = {
                        "id" : match.id,
                        "tournamentId" : match.tournamentId,
                        "tournamentName" : "",
                        "player1" : playerOne.value.name,
                        "player2" : playerTwo.value.name,
                        "winner" : winner,
                        "loser" : loser,
                        "date" : match.completedAt,
                        "score" : match.scoresCsv,
                        "ordinal" : match.suggestedPlayOrder
                    }

                    var tournament = jsonQuery(['records[id=?]', new_match.tournamentId], {
                        data: Tournaments
                    })

                    if (tournament.value) {
                        new_match.tournamentName = tournament.value.name;
                        Matches.records.push(new_match);
                        Matches.scraped.push(new_match.id);
                    } else {
                        out.Warning("Failed to lookup tournament " + new_match.tournamentId + " for newly scraped match " + new_match.id + ". Will not be saved.")
                    }
                }
            }
            manager.UpdateTournament(record.id, {matchesScraped: 1});
        }
    }
    if (matchesCount > 0) {
        filemanager.WriteMatchesFile(Config.currentSeason, Matches);
        out.Log(chalk.bold.white("Scraped " + chalk.yellow("[" + matchesCount + "]") + " new " + chalk.yellow("matches")));
    }
    return matchesCount;
}

let loadTournamentData = function() {
    Tournaments = filemanager.GetTournamentsForSeason(Config.currentSeason);
}

let loadMatchesData = function () {
    Matches = filemanager.GetMatchesForSeason(Config.currentSeason);
}

let loadPlayersData = function () {
    Players = filemanager.GetPlayersForSeason(Config.currentSeason);
}

let reloadAllData = function() {
    loadTournamentData();
    loadMatchesData();
    loadPlayersData();
}

module.exports = {
    Init: function(in_config) {
        Config = in_config;
        loadTournamentData();
        loadMatchesData();
        loadPlayersData();
        client = challonge.createClient({ apiKey : Config.apiKeys[Config.currentApiUser] });
    },
    ScrapeNewTournaments : function() {
        var request = {
            state: "ended",
            callback: (err, data) => {
                if (err) {
                    out.Warning(JSON.stringify(err));
                } else {
                    processTournamentData(data);
                }
            }
        }
        request.created_after = Config.seasons[Config.currentSeason].startDate;
        client.tournaments.index(request);
    },
    Scrape : function(tournamentsToScrape) {
        var owned = 0;
        var matches_count = 0;
        for (var i = 0; i < tournamentsToScrape.length; i++) {
            if (tournamentsToScrape[i].matchesScraped === 1) {
                continue;
            }
            if (tournamentsToScrape[i].owner == Config.currentApiUser) {
                owned++;
                var request = {
                    id: tournamentsToScrape[i].id,
                    include_matches: 1,
                    include_participants: 1,
                    callback: (err, data) => {
                        if (err) {
                            out.Warning(JSON.stringify(err))
                            return false;
                        }
                        matches_count = matches_count + processMatchesData(data);
                    }
                };
                client.tournaments.show(request);
            }
        }
    },
    ChangeActiveUser : function(user) {
        if (!Config.apiKeys[user]) {
            out.Warning("User " + user + " does not exist");
        } else {
            Config.currentApiUser = user;
            filemanager.WriteConfig(Config);
            out.Success("Switched to user: " + user);
        }
    },
    ListRegisteredApiUsers: function() {
        out.Log(chalk.blue("User") + chalk.white("  |  ") + chalk.yellow("API Key"))
        for(var user in Config.apiKeys) {
            if (Config.apiKeys.hasOwnProperty(user)) {
                var output = user + " " + chalk.yellow(Config.apiKeys[user]);
                if (user === Config.currentApiUser) {
                    output = output + " " + chalk.red("(active)")
                }
                out.Results(output);
            }
        }
    },
    DisplayActiveUser: function() {
        out.Results(Config.currentApiUser);
    }
}
