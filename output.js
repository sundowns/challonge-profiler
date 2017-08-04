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
        log(text);
    }
}
