#!/usr/bin/env node
'use strict';
const program = require('commander');
const out = require('./output');
const chalk = require('chalk');
const scraper = require('./scraper');
const moment = require('moment');
const manager = require('./manager');
const jsonfile = require('jsonfile');
const path = require('path')
const configFilePath = __dirname + path.normalize('/data/config.json');
var config = jsonfile.readFileSync(configFilePath);

scraper.Init(config);
manager.Init(config);
/* Command Handlers */
let fetchTournamentsFunction = function() {
    scraper.ScrapeNewTournaments();
}

let matchupFunction = function(player1, player2) {
    if (!player1) {
        out.Warning("Player 1 not supplied");
        return false;
    }
    if (!player2) {
        out.Warning("Player 2 not supplied");
        return false;
    }

    /*Sanitise inputs*/
    player1 = player1.toLowerCase().replace(/\W/g, '');
    player2 = player2.toLowerCase().replace(/\W/g, '');

    var results = manager.Matchup(player1, player2);
    if (results) {
        out.Success("Matchup data for " + player1 + " vs. " + player2);
        out.Results(JSON.stringify(results));
    }
}

let listTournaments = function() {
    var existingTournaments = manager.ListTournaments(program.all);
    if (existingTournaments && existingTournaments.length > 0) {
        if (program.all) {
            out.Log(chalk.rgb(199, 0, 214).bold("     Displaying results for ALL-TIME     "));
        } else {
            out.Log(chalk.rgb(199, 0, 214).bold("     Displaying results for " + config.seasons[config.currentSeason].name + "     "));
        }
        out.NewLine();
        out.Log(chalk.yellow("    Name") + chalk.white("      |  ") + chalk.green("Entrants") + chalk.white("  |  ") + chalk.blue("Completed") + chalk.white("  |  ") + chalk.red("Owner"));
        out.Divider();
        for(var index in existingTournaments) {
            var record = existingTournaments[index];
            var msg = chalk.bold.yellow(record.name) + chalk.white(" | ") + chalk.green(record.participants) + chalk.white(" | ") + chalk.blue(moment(record.endDate).format("DD-MM-YYYY")) + chalk.white(" | ") + chalk.red(record.owner);
            if (record.matchesScraped === 0) msg = chalk.red("[!]") + msg;
            out.Results(msg);
        }
        out.Divider();
    } else {
        out.Warning("No existing tournaments saved.");
    }
}

let listUsers = function() {
    scraper.ListRegisteredApiUsers();
}

let currentUser = function() {
    scraper.DisplayActiveUser();
}

let changeUser = function(id) {
    if (!id){ out.Warning("Must supply user id eg. user <id>"); }
    else {
        scraper.ChangeActiveUser(id);
    }
}

let currentSeason = function() {
    manager.DisplayCurrentSeason();
}

let listSeasons = function() {
    manager.ListSeasons();
}

let changeSeason = function(season) {
    manager.ChangeSeason(season);
}

let fetchMatches = function() {
    var existingTournaments = manager.ListTournaments(false);
    if (existingTournaments && existingTournaments.length > 0) {
        scraper.Scrape(existingTournaments);
        //iterate over them scraping if they are not already recorded
    }
}

let listMatches = function() {
    manager.ListMatches();
}

let listPlayers = function() {
    manager.ListPlayers();
}

program.version('0.0.1').option('-a, --all', 'All-time data');

program.command('tournaments')
    .description('List all tournaments.')
    .action(listTournaments);

program.command('fetch')
    .description('Fetch new tournaments')
    .action(fetchTournamentsFunction);

program.command('mu [player1] [player2]')
    .description('Get head-to-head data for 2 players')
    .action(matchupFunction);

program.command('user')
    .description("Display current user")
    .action(currentUser);

program.command('changeuser [id]')
    .description("Change to specified registered user")
    .action(changeUser);

program.command('users')
    .description('List all registered API users')
    .action(listUsers);

program.command('season')
    .description("Display current season")
    .action(currentSeason);

program.command('seasons')
    .description("List all seasons")
    .action(listSeasons);

program.command('changeseason [season]')
    .description("Change current seasons")
    .action(changeSeason);

program.command('fetchmatches')
    .description("Fetch matches for the current season and API user")
    .action(fetchMatches);

program.command('matches')
    .description("List all matches")
    .action(listMatches);

program.command('players')
    .description("List all players")
    .action(listPlayers);

program.parse(process.argv);
