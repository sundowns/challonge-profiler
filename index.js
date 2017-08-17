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
let fetchTournaments = function() {
    scraper.ScrapeNewTournaments();
}

let matchup = function(player1, player2) {
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

    var results = manager.Matchup(player1, player2, program.all);
    var period = program.all ? "All-Time" : config.seasons[config.currentSeason].name;
    if (results && results.length > 0) {
        out.Log("Matchup data for " + chalk.yellow(player1) + " vs. " + chalk.yellow(player2) + chalk.magenta(" [" + period + "]"));
        out.Divider();
        out.DisplayMatchupData(results, player1);

    } else {
        out.Warning("No existing data for " + chalk.yellow(player1) + " vs. " + chalk.yellow(player2) + " from " + chalk.magenta(period));
        if (!program.all) out.Log("Run again with --all for results from all-time");
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
        out.Log(chalk.bold.white("Run again with " + chalk.magenta("\'players\'") + " to see all saved players"));
        out.Log(chalk.bold.white("Run again with " + chalk.magenta("\'matches\'") + " to see all saved matches"));
    } else {
        out.Log("There are no outstanding tournaments to scrape for current user: " + chalk.yellow(config.currentApiUser));
    }
}

let listMatches = function() {
    var matchesList = manager.ListMatches();
    if (matchesList && matchesList.length > 0) {
        out.NewLine();
        out.DisplayMatchList(matchesList);
    }
}

let listPlayers = function() {
    var playersList = manager.ListPlayers();
    if (playersList && playersList.length > 0) {
        playersList.sort(function(a, b) {
            return b.tournamentsEntered - a.tournamentsEntered
        });
        out.NewLine();
        out.Log(chalk.bold.yellow(out.PadStringToSize("Name", 25)) + chalk.white(" | ") + chalk.green("#Tournaments"));
        out.Divider();
        for (var i = 0; i < playersList.length; i++) {
            var player = playersList[i];
            out.Log(chalk.yellow(out.PadStringToSize(player.name, 25)) + chalk.white(" | ") + chalk.green(" " + player.tournamentsEntered));
        }
    }
}

let playerSummary = function(playerName) {
    var player = manager.GetPlayerByName(playerName);
    if (player.value) {
        var matches = manager.GetMatchesForPlayer(playerName);
        matches.sort(function(a,b) {
            if (a.tournamentId === b.tournamentId) {
                if (a.ordinal === b.ordinal) return 0;
                if (a.ordinal > b.ordinal) return 1
                else return -1;
            } else {
                if (moment(a.date, "DD-MM-YYYY").isAfter(moment(b.date, "DD-MM-YYYY"))) return -1
                else return 1;
            }
        })
        out.DisplayPlayerSummary(player, matches);
    } else {
        out.Warning("Failed to find player: " + playerName);
    }
}

program.version('0.0.1').option('-a, --all', 'All-time data');

out.Log(chalk.rgb(255,127,0)("=======[ ") + chalk.yellow("Challonge Scraper v" + program._version) + chalk.rgb(255,127,0)(" ]=======") );
out.Log(chalk.white("Run again with '-help' flag for list of available commands"))
out.NewLine();

program.command('fetch')
    .description('Fetch new tournaments')
    .action(fetchTournaments);

program.command('fetchmatches')
    .description("Fetch matches for the current season and API user")
    .action(fetchMatches);

program.command('tournaments')
    .description('List all tournaments.')
    .action(listTournaments);

program.command('matches')
    .description("List all matches")
    .action(listMatches);

program.command('players')
    .description("List all players")
    .action(listPlayers);

program.command('player [name]')
    .description("Display data summary for 1 player")
    .action(playerSummary);

program.command('mu [player1] [player2]')
    .description('Get head-to-head data for 2 players')
    .action(matchup);

program.command('user')
    .description("Display current user")
    .action(currentUser);

program.command('users')
    .description('List all registered API users')
    .action(listUsers);

program.command('changeuser [id]')
    .description("Change to specified registered user")
    .action(changeUser);

program.command('season')
    .description("Display current season")
    .action(currentSeason);

program.command('seasons')
    .description("List all seasons")
    .action(listSeasons);

program.command('changeseason [season]')
    .description("Change current seasons")
    .action(changeSeason);

program.parse(process.argv);
