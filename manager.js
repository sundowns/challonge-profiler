var Config = {}
const out = require('./output');
const chalk = require('chalk');
const path = require ('path');
const jsonfile = require('jsonfile');
const moment = require('moment');
const jsonQuery = require('json-query');
const configFilePath = __dirname + path.normalize('/data/config.json');
const tournamentsFilePath = __dirname + path.normalize('/data/tournaments.json');
const matchesFilePath = __dirname + path.normalize('/data/matches-season1.json');
var CurrentSeason = {};
var Tournaments = {};
var Matches = {};

let saveConfig = function() {
    jsonfile.writeFileSync(configFilePath, Config);
}

module.exports = {
    Init : function(in_config) {
        Config = in_config;
        CurrentSeason = Config.seasons[Config.currentSeason];
        Tournaments = jsonfile.readFileSync(tournamentsFilePath);
        Matches = jsonfile.readFileSync(matchesFilePath);
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
        saveConfig();
        out.Success("Active season: " + CurrentSeason.name);
    },
    ListTournaments : function(all) {
        if (!Tournaments || !Tournaments.records || Tournaments.records.length < 1) return null;

        out.NewLine();
        if (all) {
            return Tournaments.records;
        } else {
            //https://www.npmjs.com/package/entityjs
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
         //json query to only get between current season dates
    },
    ListMatches : function(all) {
        if (!Matches || !Matches.records || Matches.records.length < 1) {
            out.Warning("No currently scraped matches")
            return null;
        }
        out.NewLine();
        out.Log(chalk.red(Matches.records.length));


        // if (all) {
        //     out.Log(chalk.rgb(199, 0, 214).bold("     Displaying match results for ALL-TIME     "));
        //     return Tournaments.records;
        // } else {
        //     var results = jsonQuery('records[*:inCurrentSeason]', {
        //         data : Tournaments,
        //         locals: {
        //             inCurrentSeason: function(tournament) {
        //                 return moment(tournament.startDate, "YYYY-MM-DD").isAfter(CurrentSeason.startDate)
        //                     && moment(tournament.endDate, "YYYY-MM-DD").isBefore(CurrentSeason.endDate);
        //             }
        //         }
        //     });
        //
        //     out.Log(chalk.rgb(199, 0, 214).bold("     Displaying results for " + CurrentSeason.name + "     "));
        //     return results.value;
        // }
         //json query to only get between current season dates
    },
    ListPlayers : function(all) {
        if (!Matches || !Matches.players || Matches.players.length < 1) return null;
        out.NewLine();
        for (var i = 0; i < Matches.players.length; i++) {
            out.Log(chalk.red(JSON.stringify(Matches.players[i])));
        }
    },
    Matchup : function(player1, player2) {
        //TODO query the matches.record collection (https://www.npmjs.com/package/json-query)
        return Matches.records;
    }
}
