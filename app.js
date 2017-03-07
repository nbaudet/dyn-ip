const schedule = require('node-schedule');
const yaml = require('js-yaml');
const fs = require('fs');
const argv = require('yargs')
    .usage('Usage: node $0 <once>')
    .describe('once', 'Run only the script once. Without this parameter, dyn-ip will run as a cron, as specified in config.yml')
    .help('h')
    .alias('h', 'help')
    .argv;
const publicIp = require('public-ip');
const nodeFtp = require('ftp');

const defaultRedirect = {
    lastIp: '',
    log: []
};

const path = '/home/volumio/dyn-ip/';

/**
 * Get config Yaml content, or throw exception on error
 * @param {string} fileName The file name
 * @param {boolean} killOnError Kill the process in case of error. Default: true
 */
function readYaml(fileName, killOnError) {
    killOnError = (typeof killOnError !== 'undefined') ? killOnError : true;
    try {
        fileName = path + fileName;
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        if (e.code == 'ENOENT') {
            if (fileName == "config.yml"){
                console.error("ERROR: The file " + fileName + " does not exist.");
                console.error("Create one from 'config.example.yml'.");
            } else if (fileName == "history.yml"){
                return defaultRedirect;
            } else console.error("ERROR: The file " + fileName + " does not exist.");
        } else console.error(e);

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
        fileName = path + fileName;
        fs.writeFileSync(fileName, yaml.safeDump(content))
    } catch (e) {
        console.error(e);
    }
}

/**
 * Save content to json file
 * @param {string} fileName The file name
 * @param {object} content Any object can be the content
 */
function writeJson(fileName, content) {
    try {
        fileName = path + fileName;
        fs.writeFileSync(fileName, JSON.stringify(content), 'utf8')
    } catch (e) {
        console.error(e);
    }
}

/**
 * Return a cron schedule from the config file
 * @param {object} config The program's configuration
 */
function getRule(config){
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
            source: path + "pub/index.html",
            target: config.server.path + "/index.html"
        }, {
            source: path + "pub/redirect.json",
            target: config.server.path + "/redirect.json"
        }, {
            source: path + "pub/style.min.css",
            target: config.server.path + "/style.min.css"
        }, {
            source: path + "pub/logo-dyn-ip.png",
            target: config.server.path + "/logo-dyn-ip.png"
        }];

        var ftp = new nodeFtp();

        ftp.on('greeting', function(msg) {
            console.log("FTP server is greeting with:")
            console.log(msg);
        }).on('ready', function() {
            // TODO: Tests existence of destination folder and create it if needed
            // ...

            files.forEach(function(element) {
                ftp.put(element.source, element.target, function(err) {
                    if (err) throw err;
                    else console.log(element.source + " was uploaded to " + element.target);
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
        console.error(e);
    }
}

/**
 * Main program
 */
function main() {
    var history = readYaml('history.yml', false);

    // Get the public IP
    publicIp.v4({ https: true }).then(currentIp => {
        console.log('Current IP : ' + currentIp + " @ " + new Date());

        // If there is a new IP...
        if (currentIp != history.lastIp) {
            console.log("Writing a new IP to config file and uploading...");

            history.log.unshift({ ip: currentIp, date: new Date() });
            history.lastIp = currentIp;

            // ... updates the history (local and public)
            writeYaml('history.yml', history);
            writeJson("pub/redirect.json", history);

            // ... and uploads the file
            uploadFiles(config);
        } else {
            console.log('Nothing to update');
        }
    });
}

var config = readYaml('config.yml');

// Checks if the argument 'once' is set or launches the cron
if(argv._ == 'once'){
    console.log('Launching dyn-ip ONCE')
    main();
} else {
    console.log('Launching dyn-ip as a CRON')
    schedule.scheduleJob(getRule(config), main);
}
