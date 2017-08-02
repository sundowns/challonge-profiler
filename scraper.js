const jsonfile = require('jsonfile');
const path = require('path');

const apiKeys = {
    sundowns : "PT1KemvjhEPtVhWhBEKg2oJjxAajf3aUwLRPZiIZ"
};

const currentSeason = "1"
const matchesFilePath = __dirname + path.normalize('/data/matches-season' + currentSeason + '.json');
const tournamentsFilePath = __dirname + path.normalize('/data/tournaments.json');
var matches = {};
var tournaments = {}

module.exports = {
    Init: function() {
        matches = jsonfile.readFileSync(matchesFilePath);
    },
    Scrape : function() {
        return apiKeys.sundowns;
    },
    Matchup : function(player1, player2) {
        //TODO query the matches.record collection (https://www.npmjs.com/package/json-query)
        return matches.records;
    }
}
