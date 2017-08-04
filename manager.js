var Config = {}
const out = require('./output');
const chalk = require('chalk');
var CurrentSeason = {}

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
            out.Success(season.name);
        }
    }
}
