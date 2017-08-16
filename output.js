const chalk = require('chalk');
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
    }
}
