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

/**
 * Get config Yaml content, or throw exception on error
 * @param {string} fileName the Filename
 * @param {boolean} killOnError Kill the process in case of error. Default: true
 */
function readYaml(fileName, killOnError) {
    killOnError = (typeof killOnError !== 'undefined') ? killOnError : true;
    try {
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        if (e.code == 'ENOENT') {
            console.log("ERROR: The file " + fileName + " does not exist.");
            if (fileName == "config.yml")
                console.log("Create one from 'config.example.yml'.");
            else if (fileName == "history.yml")
                return defaultRedirect;
        } else console.log(e);

        if (killOnError) process.exit();
    }
}

/**
 * Save content to yaml file
 * @param {string} fileName 
 * @param {object} content 
 */
function writeYaml(fileName, content) {
    try {
        fs.writeFileSync(fileName, yaml.safeDump(content))
    } catch (e) {
        console.log(e);
    }
}

/**
 * Save content to json file
 * @param {string} fileName 
 * @param {string} content 
 */
function writeJson(fileName, content) {
    try {
        fs.writeFileSync(fileName, JSON.stringify(content), 'utf8')
    } catch (e) {
        console.log(e);
    }
}

/**
 * Return a cron schedule from the config file
 * @param {object} config 
 */
function getRule(config){
    var rule = "";
    rule += config.refreshTime.second != '*' ? config.refreshTime.second + " " : '* ';
    rule += config.refreshTime.minute != '*' ? config.refreshTime.minute + " " : '* ';
    rule += config.refreshTime.hour != '*' ? config.refreshTime.hour + " " : '* ';
    rule += config.refreshTime.day != '*' ? config.refreshTime.day + " " : '* ';
    rule += config.refreshTime.month != '*' ? config.refreshTime.month + " " : '* ';
    rule += config.refreshTime.year != '*' ? config.refreshTime.year : '*';
    return rule;
}

// Uploads the files to the server
function uploadFiles(config) {
    try {
        // List of files to upload
        var files = [{
            source: "pub/index.html",
            target: config.server.path + "/index.html"
        }, {
            source: "pub/redirect.json",
            target: config.server.path + "/redirect.json"
        }, {
            source: "pub/style.min.css",
            target: config.server.path + "/style.min.css"
        }, {
            source: "pub/logo-dyn-ip.png",
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
        console.log(e);
    }
}

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

if(argv._ == 'once'){
    console.log('Launching dyn-ip ONCE')
    main()
} else {
    console.log('Launching dyn-ip as a cron')
    schedule.scheduleJob(getRule(config), main)
}
