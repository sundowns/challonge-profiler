const chalk = require('chalk');
const moment = require('moment');
let log = console.log;
module.exports = {
    Warning : function(text) {
        log(chalk.bold.red("[WARNING] " + text));
    },
    Success : function(text) {
        log(chalk.bold.green(text));
    },
    Results : function(text) {
        log(chalk.blue(text));
    },
    Divider : function() {
        log(chalk.gray("===================================================="));
    },
    SmallDivider : function() {
            log(chalk.white.bgBlack.bold("<><><><><><><><><><><>"))
    },
    NewLine : function() {
        log("");
    },
    Log : function(text) {
        log(chalk.white(text));
    },
    PadStringToSize : function(text, length, padder) {
        if (!padder) padder = ' ';
        if (text.length >= length) return text.substring(0, length);
        else {
            var difference = length - text.length;
            for (var i = 0; i < difference; i++) {
                text += padder;
            }
            return text;
        }
    },
    DisplayMatchList : function(matches) {
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            if (match.player1 === match.winner) {
                this.Log(
                    chalk.green(this.PadStringToSize(match.player1, 20) + "[W] ")  +
                    chalk.yellow(match.score) + " " +
                    chalk.red(this.PadStringToSize(match.player2, 20) + "[L]")
                );
            } else { //p2 is winner
                this.Log(
                    chalk.red(this.PadStringToSize(match.player1, 20) + "[L] ")  +
                    chalk.yellow(match.score) + " " +
                    chalk.green(this.PadStringToSize(match.player2, 20) + "[W]")
                );
            }
        }
    },
    DisplayMatchupData: function(matches, player1) { //Always shows player 1 first
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            if (match.player1 === player1) {
                if (match.winner === player1) {
                    this.Log(
                        chalk.green(this.PadStringToSize(match.player1, 12) + "[W] ")  +
                        chalk.yellow(match.score) + " " +
                        chalk.red(this.PadStringToSize(match.player2, 12) + "[L]") + " " +
                        chalk.cyan(this.PadStringToSize(match.tournamentName, 30))
                    );
                } else {
                    this.Log(
                        chalk.red(this.PadStringToSize(match.player1, 12) + "[L] ")  +
                        chalk.yellow(match.score) + " " +
                        chalk.green(this.PadStringToSize(match.player2, 12) + "[W]") + " " +
                        chalk.cyan(this.PadStringToSize(match.tournamentName, 30))
                    );
                }
            } else { //p2 first, reverse the scores??
                if (match.winner === player1) {
                    this.Log(
                        chalk.green(this.PadStringToSize(match.player2, 12) + "[W] ")  +
                        chalk.yellow(match.score.split("").reverse().join("")) + " " +
                        chalk.red(this.PadStringToSize(match.player1, 12) + "[L]") + " " +
                        chalk.cyan(this.PadStringToSize(match.tournamentName, 30))
                    );
                } else {
                    this.Log(
                        chalk.red(this.PadStringToSize(match.player2, 12) + "[L] ")  +
                        chalk.yellow(match.score.split("").reverse().join("")) + " " +
                        chalk.green(this.PadStringToSize(match.player1, 12) + "[W]") + " " +
                        chalk.cyan(this.PadStringToSize(match.tournamentName, 30))
                    );
                }
            }
        }
    },
    DisplayPlayerSummary: function(player, matches, stats) {
        this.Log(chalk.bold.magenta(player.name.substring(0,1).toUpperCase() + player.name.substring(1)) + chalk.green(" [" + player.tournamentsEntered + " events]"));
        this.Divider();
        this.Log(chalk.bold.white("Sets: ") + chalk.cyan(stats.matchesTotal) + " (" + chalk.green(stats.matchesWon) + "/" + chalk.red(stats.matchesLost) + ")");
        this.Log(chalk.bold.white("Victim: ") + chalk.cyan(stats.victim) + " (" + chalk.green(stats.victimWins + " wins" ) + ")")
        this.Log(chalk.bold.white("Demon: ") + chalk.cyan(stats.demon) + " (" + chalk.green(stats.demonLosses + " losses" ) + ")")
        this.Divider();
        if (matches && matches.length > 0) {
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                var score = match.score;
                if (match.player1 !== player.name) score = score.split("").reverse().join("");
                if (match.winner === player.name) {
                    this.Log(
                        chalk.green.bold("[W] " + score + " ")  +
                        chalk.yellow.bold(this.PadStringToSize(match.loser, 20) + " ") +
                        chalk.cyan(moment(match.date).format("DD-MM-YYYY"))
                    );
                } else { //p2 is winner
                    this.Log(
                        chalk.red.bold("[L] " + score + " ")  +
                        chalk.yellow.bold(this.PadStringToSize(match.winner, 20) + " ") +
                        chalk.cyan(moment(match.date).format("DD-MM-YYYY"))
                    );
                }
            }
        }
    }
}
