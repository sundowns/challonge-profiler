#!/usr/bin/env node
'use strict';
const program = require('commander');
const out = require('./output');
const chalk = require("chalk");
const scraper = require('./scraper');
const moment = require('moment');

/* Command Handlers */
let fetchTournamentsFunction = function() {
    LoadFiles();
    scraper.ScrapeNewTournaments();
}

let matchupFunction = function(player1, player2) {
    LoadFiles();

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

    var results = scraper.Matchup(player1, player2);
    if (results) {
        out.Success("Matchup data for " + player1 + " vs. " + player2);
        out.Results(JSON.stringify(results));
    }
}

let listTournaments = function() {
    LoadFiles();
    var existingTournaments = scraper.ListExistingTournaments();
    if (existingTournaments.length > 0) {
        out.NewLine();
        out.Log(chalk.yellow("    Name") + chalk.white("      |  ") + chalk.green("Entrants") + chalk.white("  |  ") + chalk.blue("Completed") + chalk.white("  |  ") + chalk.red("Owner"));
        out.Divider();
        for(var index in existingTournaments) {
            var record = existingTournaments[index];
            out.Results(chalk.bold.yellow(record.name) + chalk.white(" | ") + chalk.green(record.participants) + chalk.white(" | ") + chalk.blue(moment(record.endDate).format("DD-MM-YYYY")) + chalk.white(" | ") + chalk.red(record.owner));
        }
        out.Divider();
    } else {
        out.Warning("No existing tournaments saved.");
    }
}

let LoadFiles = function() {
    var err = scraper.Init();
    if (err) {
        out.Warning(err);
        return false;
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

program.version('0.0.1');

program.command('tournaments')
    .description('List all tournaments')
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

program.command('switch [id]')
    .description("Change to specified registered user")
    .action(changeUser);

program.command('users')
    .description('List all registered API users')
    .action(listUsers);

program.parse(process.argv);
