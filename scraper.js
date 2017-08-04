const jsonfile = require('jsonfile');
const path = require('path');
const challonge = require('challonge');
const moment = require('moment');
const chalk = require('chalk');
const out = require('./output');

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
            !record.name.toLowerCase().includes("crew")) {
                count++;
                var new_tournament = {
                    "id": record.id,
                    "name" : record.name,
                    "startDate" : record.startedAt,
                    "endDate" : record.completedAt,
                    "participants": record.participantsCount,
                    "owner" : config.currentApiUser
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

module.exports = {
    Init: function(_config) {
        matches = jsonfile.readFileSync(matchesFilePath);
        tournaments = jsonfile.readFileSync(tournamentsFilePath);
        client = challonge.createClient({ apiKey : apiKeys[config.currentApiUser] });
        config = _config;

        if (!tournaments.scraped) tournaments.scraped = [];
        if (!tournaments.lastrun) {
            tournaments.lastrun = {};
            for (var key in apiKeys) {
                tournaments.lastrun[key] = currentSeasonStartDate;
            }
        }
        if (!tournaments.records) tournaments.records = [];
    },
    ListExistingTournaments : function() {
        return tournaments.records;
    },
    ScrapeNewTournaments : function() {
        client.tournaments.index({
            state: "ended",
            created_after: tournaments.lastrun[config.currentApiUser],
            callback: (err, data) => {
                if (err) {
                    out.Warning(err);
                } else {
                    processTournamentData(data);
                }
            }
        });
    },
    Scrape : function() {
        return "To be implemented";
    },
    Matchup : function(player1, player2) {
        //TODO query the matches.record collection (https://www.npmjs.com/package/json-query)
        return matches.records;
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
