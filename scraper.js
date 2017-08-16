const jsonfile = require('jsonfile');
const path = require('path');
const challonge = require('challonge');
const moment = require('moment');
const chalk = require('chalk');
const out = require('./output');
const jsonQuery = require('json-query');
const manager = require('./manager');

const apiKeys = {
    sundowns : "PT1KemvjhEPtVhWhBEKg2oJjxAajf3aUwLRPZiIZ",
    curtinsmash: "hp2vQxBqA0xiAAUHztoDga8QlUVWqEnZUQAkiPyg",
    perthsmash: "7OJcveK8mQpw4uFaPo6LVsXR5uGnYKxZmbZi7zNN"
};
const meleeId = "394";
const matchesFilePath = __dirname + path.normalize('/data/matches-season1.json');
const tournamentsFilePath = __dirname + path.normalize('/data/tournaments.json');
const configFilePath = __dirname + path.normalize('/data/config.json');

var client = {};
var matches = {};
var tournaments = {};
var config = {};

let saveTournamentData = function() {
    jsonfile.writeFileSync(tournamentsFilePath, tournaments);
}

let saveMatchesData = function () {
    jsonfile.writeFileSync(matchesFilePath, matches)
}

let saveConfig = function() {
    jsonfile.writeFileSync(configFilePath, config);
}

let processTournamentData = function(data) {
    var count = 0;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var record = data[key].tournament;
            if (record.gameId == meleeId &&
            !record.name.toLowerCase().includes("doubles") &&
            !record.name.toLowerCase().includes("crew") &&
            tournaments.scraped.indexOf(record.id) < 0) {
                count++;
                var new_tournament = {
                    "id": record.id,
                    "name" : record.name,
                    "startDate" : record.startedAt,
                    "endDate" : record.completedAt,
                    "participants": record.participantsCount,
                    "owner" : config.currentApiUser,
                    "matchesScraped": 0
                }
                tournaments.records.push(new_tournament);
                tournaments.scraped.push(new_tournament.id);
            }
        }
    }
    if (count > 0) {
        tournaments.lastrun[config.currentApiUser] = moment().format("YYYY-MM-DD");
        saveTournamentData();
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

                var existingPlayer = jsonQuery('players[:hasUsedAlias]', {
                    data : matches,
                    locals: {
                        hasUsedAlias: function(player) {
                            return player.name == queryParamName || player.aliases.indexOf(queryParamName) > -1;
                        }
                    }
                });

                if (existingPlayer.value) { //Player already exists, TODO: update their list of IDs
                    saveMatchesData();
                    manager.UpdatePlayer(existingPlayer.value.name, {
                        ids: existingPlayer.value.ids.concat([record.participants[key].participant.id]),
                        lastTournamentId: record.id,
                        tournamentsEntered: existingPlayer.value.tournamentsEntered + 1
                    });
                    reloadMatchesData();
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
                matches.players.push(newPlayer);
            }
            if (playersCount > 0) {
                saveMatchesData();
                out.Log(chalk.bold.white("Scraped " + chalk.yellow("[" + playersCount + "]") + " new " + chalk.yellow("players")));
            }
            /*Scrape Matches*/
            for (var index in record.matches) {
                if (matches.scraped.indexOf(record.matches[index].match.id) === -1
                && record.matches[index].match.state === "complete") {
                    matchesCount++;
                    var match = record.matches[index].match;

                    var playerOne = jsonQuery('players[:isPlayerOne]', {
                        data : matches,
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
                    var playerTwo = jsonQuery('players[:isPlayerTwo]', {
                        data : matches,
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
                        "player1" : playerOne.value.name,
                        "player2" : playerTwo.value.name,
                        "winner" : winner,
                        "loser" : loser,
                        "date" : match.completedAt,
                        "score" : match.scoresCsv,
                        "ordinal" : match.suggestedPlayOrder
                    }
                    matches.records.push(new_match);
                    matches.scraped.push(new_match.id);
                }
            }
            manager.UpdateTournament(record.id, {matchesScraped: 1});
        }
    }
    if (matchesCount > 0) {
        saveMatchesData();
        out.Log(chalk.bold.white("Scraped " + chalk.yellow("[" + matchesCount + "]") + " new " + chalk.yellow("matches")));
    }
    return matchesCount;
}

let reloadTournamentData = function() {
    tournaments = jsonfile.readFileSync(tournamentsFilePath);
}

let reloadMatchesData = function () {
    matches = jsonfile.readFileSync(matchesFilePath);
}

let reloadAllData = function() {
    tournaments = jsonfile.readFileSync(tournamentsFilePath);
    matches = jsonfile.readFileSync(matchesFilePath);
}

module.exports = {
    Init: function(in_config) {
        tournaments = jsonfile.readFileSync(tournamentsFilePath);
        matches = jsonfile.readFileSync(matchesFilePath);
        config = in_config;
        client = challonge.createClient({ apiKey : apiKeys[config.currentApiUser] });
        if (!tournaments) tournaments = {};
        if (!tournaments.scraped) tournaments.scraped = [];
        if (!tournaments.lastrun) {
            tournaments.lastrun = {};
            for (var key in apiKeys) {
                tournaments.lastrun[key] = moment("2012-01-01","YYYY-MM-DD");
            }
        }
        if (!tournaments.records) tournaments.records = [];
        saveTournamentData();
        if (!matches) matches = {};
        if (!matches.scraped) matches.scraped = [];
        if (!matches.players) matches.players = [];
        if (!tournaments.records) tournaments.records = [];
        saveMatchesData();
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
        request.created_after = config.seasons[config.currentSeason].startDate;
        client.tournaments.index(request);
    },
    Scrape : function(tournamentsToScrape) {
        var owned = 0;
        var matches_count = 0;
        for (var i = 0; i < tournamentsToScrape.length; i++) {
            if (tournamentsToScrape[i].matchesScraped === 1) {
                continue;
            }
            if (tournamentsToScrape[i].owner == config.currentApiUser) {
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
        if (!apiKeys[user]) {
            out.Warning("User " + user + " does not exist");
        } else {
            config.currentApiUser = user;
            saveConfig();
            out.Success("Switched to user: " + user);
        }
    },
    ListRegisteredApiUsers: function() {
        out.Log(chalk.blue("User") + chalk.white("  |  ") + chalk.yellow("API Key"))
        for(var user in apiKeys) {
            if (apiKeys.hasOwnProperty(user)) {
                var output = user + " " + chalk.yellow(apiKeys[user]);
                if (user === config.currentApiUser) {
                    output = output + " " + chalk.red("(active)")
                }
                out.Results(output);
            }
        }
    },
    DisplayActiveUser: function() {
        out.Results(config.currentApiUser);
    }
}
