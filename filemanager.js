const jsonfile = require('jsonfile');
const path = require ('path');
const out = require("./output");
const chalk = require ("chalk");
const fs = require('fs');
const moment = require('moment');
const configFilePath = __dirname + path.normalize('/data/config.json');
var Config = {};

/* Helpers */
let buildMatchesPath = function(season) {
    return __dirname + path.normalize('/data/' + season + '/matches.json');
}

let buildTournamentsPath = function(season) {
    return __dirname + path.normalize('/data/' + season + '/tournaments.json');
}

let checkSeasonDirectoryExists = function(season) {
    if (!fs.existsSync(__dirname + path.normalize('/data/' + season + '/'))) {
        out.Success("Creating directory for season " + season);
        fs.mkdirSync(__dirname + path.normalize('/data/' + season + '/'));
    }
}

//TODO: soon
// let buildPlayersPath = function(season) {
//     return __dirname + path.normalize('/data/' + season + '/players.json');
// }

module.exports = {
    Init : function() {
        Config = this.GetConfig();
        return Config;
    },
    GetConfig : function() {
        var config = jsonfile.readFileSync(configFilePath);
        if (!config) {
            out.Warning("Failed to locate config file");
        } else {
            return config;
        }
    },
    WriteConfig : function(config) {
        jsonfile.writeFileSync(configFilePath, config);
    },
    GetMatchesForSeason : function(season) {
        checkSeasonDirectoryExists(season);
        var matches = null;

        if (!fs.existsSync(buildMatchesPath(season))) {  //check season matches file exists (if not, create)
            out.Success("Creating matches file for: " + chalk.magenta(Config.seasons[Config.currentSeason].name));
            matches = {
                "players" : [],
                "records" : [],
                "scraped" : []
            }
            this.WriteMatchesFile(season, matches);
        } else {
            matches = jsonfile.readFileSync(buildMatchesPath(season));
        }

        return matches;
    },
    WriteMatchesFile : function(season, matches) {
        jsonfile.writeFileSync(buildMatchesPath(season), matches);
    },
    GetTournamentsForSeason : function(season) {
        checkSeasonDirectoryExists(season);
        var tournaments = null;

        if (!fs.existsSync(buildTournamentsPath(season))) {
            out.Success("Creating tournaments file for: " + chalk.magenta(Config.seasons[Config.currentSeason].name));
            tournaments = {
                "lastrun" : {},
                "records" : [],
                "scraped" : []
            }
            for (var key in Config.apiKeys) {
                tournaments.lastrun[key] = moment("2012-01-01","YYYY-MM-DD");
            }
            this.WriteTournamentsFile(season, tournaments);
        } else {
            tournaments = jsonfile.readFileSync(buildTournamentsPath(season));
        }
        return tournaments;
    },
    WriteTournamentsFile : function(season, tournaments) {
        jsonfile.writeFileSync(buildTournamentsPath(season), tournaments);
    }
}
