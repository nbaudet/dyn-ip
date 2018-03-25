const dirname = __dirname + '/';
const cron = require('node-cron');
const yaml = require('js-yaml');
const fs = require('fs');
const argv = require('yargs')
    .usage('Usage: node $0 <once> <nolog>')
    .describe('once', 'Run only the script once. Without this parameter, dyn-ip will run as a cron, as specified in config.yml')
    .describe('nolog', 'Does not log console outputs and errors in designated files.')
    .help('h')
    .alias('h', 'help')
    .argv;
const publicIp = require('public-ip');
const nodeFtp = require('ftp');
const winston = require('winston');

/**
 * Express routes to check if dyn-ip is still running.
 */
const express = require('express');
var xpres = express();
xpres.disable('x-powered-by');
xpres.get('/', function (req, res) {
    res.send('<html><body><h2>dyn-ip is running fine.</h2>\
    <p>Last check: ' + getLastCheckDate(true) + '</p>\
    </body></html>');
});
xpres.post('/', function (req, res) {
    res.send({
        'application': 'dyn-ip',
        'status': 'ok',
        'message': 'dyn-ip is running fine.',
        'lastCheck': getLastCheckDate()
    });
});

const defaultHistory = {
    lastIp: '',
    lastCheck: '',
    log: []
};

/**
 * Returns the last IP check date from history.yml or "No history file yet."
 * @param {boolean} format Formats the date in readable ISO format. Default: false
 */
function getLastCheckDate(format) {
    var lastChecked = "";
    format = format || false;
    try {
        var history = readYaml('history.yml', false);
        lastChecked = history.lastCheck.toISOString();
        if (format) {
            lastChecked = lastChecked.replace(/T/, ' '). // Replace T with a space
                replace(/\..+/, ''); // Delete the dot and everything after
        }
    } catch (e) {
        console.log(e);
        lastChecked = "No history file yet.";
    }
    return lastChecked;
}

/**
 * Get config Yaml content, or throw exception on error
 * @param {string} fileName The file name
 * @param {boolean} killOnError Kill the process in case of error. Default: true
 */
function readYaml(fileName, killOnError) {
    killOnError = (typeof killOnError !== 'undefined') ? killOnError : true;
    try {
        fileName = dirname + fileName;
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        if (e.code == 'ENOENT') {
            if (fileName.indexOf("config.yml") > -1) {
                logger.error("ERROR: The file " + fileName + " does not exist.");
                logger.error("Create one from 'config.example.yml'.");
            } else if (fileName.indexOf("history.yml") > -1) {
                return defaultHistory;
            } else logger.error("ERROR: The file " + fileName + " does not exist.");
        } else logger.error(e);

        if (killOnError) process.exit();
    }
}

/**
 * Save content to yaml file
 * @param {string} fileName The file name
 * @param {object} content Any object can be the content
 */
function writeYaml(fileName, content) {
    try {
        fileName = dirname + fileName;
        fs.writeFileSync(fileName, yaml.safeDump(content))
    } catch (e) {
        logger.error(e);
    }
}

/**
 * Save content to json file
 * @param {string} fileName The file name
 * @param {object} content Any object can be the content
 */
function writeJson(fileName, content) {
    try {
        fileName = dirname + fileName;
        fs.writeFileSync(fileName, JSON.stringify(content), 'utf8')
    } catch (e) {
        logger.error(e);
    }
}

/**
 * Return a cron schedule from the config file
 * @param {object} config The program's configuration
 */
function getCronSchedule(config) {
    var rule = "";
    rule += config.refreshTime.minute != '*' ? config.refreshTime.minute + " " : '* ';
    rule += config.refreshTime.hour != '*' ? config.refreshTime.hour + " " : '* ';
    rule += config.refreshTime.day != '*' ? config.refreshTime.day + " " : '* ';
    rule += config.refreshTime.month != '*' ? config.refreshTime.month + " " : '* ';
    rule += config.refreshTime.year != '*' ? config.refreshTime.year : '*';
    return rule;
}

/**
 * Uploads the files to the server
 * @param {object} config The program's configuration
 */
function uploadFiles(config) {
    try {
        // List of files to upload
        var files = [{
            source: dirname + "pub/index.html",
            target: config.server.path + "/index.html"
        }, {
            source: dirname + "pub/redirect.json",
            target: config.server.path + "/redirect.json"
        }, {
            source: dirname + "pub/style.min.css",
            target: config.server.path + "/style.min.css"
        }, {
            source: dirname + "pub/logo-dyn-ip.png",
            target: config.server.path + "/logo-dyn-ip.png"
        }];

        var ftp = new nodeFtp();

        ftp.on('greeting', function (msg) {
            logger.info("FTP server is greeting with:")
            logger.info(msg);
        }).on('ready', function () {
            // TODO: Tests existence of destination folder and create it if needed
            // ...

            files.forEach(function (element) {
                ftp.put(element.source, element.target, function (err) {
                    if (err) throw err;
                    else logger.info(element.source + " was uploaded to " + element.target);
                    ftp.end();
                });
            })
        });

        // Launch async uploads
        ftp.connect({
            host: config.server.host,
            user: config.server.username,
            password: config.server.password
        });
    } catch (e) {
        logger.error(e);
    }
}

/**
 * Main program
 */
function main() {
    var history = readYaml('history.yml', false);

    // Get the public IP
    publicIp.v4({ https: true }).then(currentIp => {
        logger.info('Current IP : ' + currentIp);

        // Updates last check date (local and distant)
        history.lastCheck = new Date();
        writeYaml('history.yml', history);

        // If there is a new IP
        if (currentIp != history.lastIp) {
            logger.info("Writing a new IP to config file and uploading...");

            history.log.unshift({ ip: currentIp, date: new Date() });
            history.lastIp = currentIp;
            writeJson("pub/redirect.json", history);

            // Updates the distant files
            uploadFiles(config);
        } else {
            logger.info('Nothing to update');
        }


    });
}

var config = readYaml('config.yml');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)()
    ]
});

// Enables file logging except if 'nolog' is set
if (argv._.indexOf('nolog') == -1) {
    logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(),
            new (winston.transports.File)({
                name: 'dyn-ip',
                filename: dirname + 'dyn-ip.log',
                level: 'info',
                json: false,
                timestamp: function () {
                    return new Date();
                },
                maxsize: 1000000, // 1MB
            }),
            new (winston.transports.File)({
                name: 'error',
                filename: dirname + 'error.log',
                level: 'error',
                json: false,
                timestamp: function () {
                    return new Date();
                }
            })
        ]
    });
}

// Checks if the argument 'once' is set or launches the cron
if (argv._.indexOf('once') > -1) {
    logger.info('Launching dyn-ip ONCE');
    main();
} else {
    logger.info('Launching dyn-ip as a CRON');
    cron.schedule(getCronSchedule(config), main);
    // Service 
    xpres.listen(config.service.port);
}
