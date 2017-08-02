#!/usr/bin/env node
'use strict';
//https://www.npmjs.com/package/local-json-db
//https://www.npmjs.com/package/challonge

const program = require('commander');
const chalk = require('chalk');
const scraper = require('./scraper');

/* Output functions */
let Warning = function(text) {
    console.log(chalk.bold.red("[WARNING] " + text));
};
let Success = function(text) {
    console.log(chalk.green(text));
};
let Results = function(text) {
    console.log(chalk.blue(text));
};

/* Command Handlers */
let scrapeFunction = function() {
    var err = scraper.Init();
    if (err) {
        Warning(err);
        return false;
    }
    var results = scraper.Scrape();
    if (results) {Results(results);}
}

let matchupFunction = function(player1, player2) {
    var err = scraper.Init();
    if (err) {
        Warning(err);
        return false;
    }

    if (!player1) {
        Warning("Player 1 not supplied");
        return false;
    }
    if (!player2) {
        Warning("Player 2 not supplied");
        return false;
    }

    /*Sanitise inputs*/
    player1 = player1.toLowerCase().replace(/\W/g, '');
    player2 = player2.toLowerCase().replace(/\W/g, '');

    var results = scraper.Matchup(player1, player2);
    if (results) {
        Success("Matchup data for " + player1 + " vs. " + player2);
        Results(JSON.stringify(results));
    }
}

program.version('0.0.1');

program.command('scrape')
    .description('Fetch new tournaments')
    .action(scrapeFunction);

program.command('mu [player1] [player2]')
    .description('Get head-to-head data for 2 players')
    .action(matchupFunction);

program.parse(process.argv);
