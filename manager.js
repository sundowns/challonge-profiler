var Config = {}
const out = require('./output');
const chalk = require('chalk');
const path = require ('path');
const jsonfile = require('jsonfile');
const configFilePath = __dirname + path.normalize('/data/config.json');
var CurrentSeason = {}

let saveConfig = function() {
    jsonfile.writeFileSync(configFilePath, Config);
}

module.exports = {
    Init : function(in_config) {
        Config = in_config;
        CurrentSeason = Config.seasons[Config.currentSeason]
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
            out.Success(text);
        }
    },
    ChangeSeason : function(index) {
        if (!Config.seasons[index-1]) {
            out.Warning("season does not exist");
            return;
        }
        Config.currentSeason = index-1;
        CurrentSeason = Config.seasons[Config.CurrentSeason];
        saveConfig();
    }
}
