const jsonfile = require('jsonfile');
const path = require('path');
const challonge = require('challonge');
const moment = require('moment');
const chalk = require('chalk');
const out = require('./output');
const jsonQuery = require('json-query');

const apiKeys = {
    sundowns : "PT1KemvjhEPtVhWhBEKg2oJjxAajf3aUwLRPZiIZ",
    curtinsmash: "hp2vQxBqA0xiAAUHztoDga8QlUVWqEnZUQAkiPyg",
    perthsmash: "7OJcveK8mQpw4uFaPo6LVsXR5uGnYKxZmbZi7zNN"
};
const meleeId = "394";
const currentSeasonStartDate = "2016-09-08"; //YYYY-MM-DD
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
        out.Log(chalk.bold.white("Scraped " + chalk.green("[" + count + "]") + " new tournaments"));
        out.Log(chalk.bold.green("Run again with " + chalk.magenta("tournaments") + " command to see all saved tournaments"));
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
            //console.log(record);
            for(var key in record.participants) {
                //TODO: Query to see if participant already exists by name, if so add their ID to list of IDs. If not flag for review/potential merge'players[name=' + record.participants[key].participant.name + ']'

                var existing_player = jsonQuery(["players[name=?]", record.participants[key].participant.name], {
                    data : matches
                });

                if (existing_player.value) {
                    console.log(existing_player);
                    return false;
                }

                //console.log(record.participants[key].participant);
                playersCount++;
                var player = record.participants[key].participant;
                var new_player = {
                    "ids" : [],
                    "name" : player.name.toLowerCase(),
                    "aliases" : [],
                    "new" : 1
                }
                new_player.aliases.push(player.name);
                new_player.ids.push(player.id);
                out.Success("new player " + player.name);
                matches.players.push(new_player);
            }

            for (var index in record.matches) {
                if (matches.scraped.includes(record.matches[index].match.id) < 0
                && record.matches[index].match.state === "complete") {
                    matchesCount++;
                    var match = record.matches[index].match;
                    var new_match = {
                        "id" : match.id,
                        "tournamentId" : match.tournamentId,
                        "player1" : match.player1Id,
                        "player2" : match.player2Id,
                        "winner" : match.winnerId,
                        "loser" : match.loserId,
                        "date" : match.completedAt,
                        "score" : match.scoresCsv
                    }
                    matches.records.push(new_match);
                    matches.scraped.push(new_match.id);
                }
            }

            var tournament = jsonQuery('records[id=' + record.id + ']', {
                data : tournaments
            });

            if (tournament && tournament.id != null) {
                out.Success("Updated tournament status to scraped"); //TODO: Dont think this ever gets hit!!
                tournaments.records[tournament.id].matchesScraped = 1;
            } else {
                out.Warning("Failed to find tournament: " + record.id);
            }
        }
    }
    if (matchesCount > 0 || playersCount > 0) {
        saveMatchesData();
        saveTournamentData();
        if (matchesCount > 0) {
            out.Log(chalk.bold.white("Scraped " + chalk.green("[" + matchesCount + "]") + " new matches"));
            out.Log(chalk.bold.green("Run again with " + chalk.magenta("\'matches\'") + " to see all saved matches"));
        }
        if (playersCount > 0) {
            out.Log(chalk.bold.white("Scraped " + chalk.green("[" + playersCount + "]") + " new players"));
            out.Log(chalk.bold.green("Run again with " + chalk.magenta("\'players\'") + " to see all saved players"));
        }
    } else {
        out.Log(chalk.bold.white("Proccessed empty tournament"));
    }
    return matchesCount;
}

module.exports = {
    Init: function(in_config) {
        matches = jsonfile.readFileSync(matchesFilePath);
        tournaments = jsonfile.readFileSync(tournamentsFilePath);
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

        if (tournaments.lastrun[config.currentApiUser]) {
            request.created_after = tournaments.lastrun[config.currentApiUser];
        }
        client.tournaments.index(request);
    },
    Scrape : function(tournamentsToScrape) {
        var owned = 0;
        var not_owned = 0
        var matches_count = 0;
        var other_owners = [];
        for (var i = 0; i < tournamentsToScrape.length; i++) {
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
            } else {
                other_owners.push(tournamentsToScrape[i].owner);
                not_owned;
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
