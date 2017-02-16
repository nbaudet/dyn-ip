yaml = require('js-yaml');
fs = require('fs');
const publicIp = require('public-ip');
var nodeFtp = require('ftp');

// Get config Yaml content, or throw exception on error
function readYaml(fileName) {
    fileName = fileName || 'config.yml';
    try {
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        console.log(e);
    }
}

// Save content to yaml file
function writeYaml(fileName, content) {
    try {
        fs.writeFileSync(fileName, yaml.safeDump(content))
    } catch (e) {
        console.log(e);
    }
}

// Save content to json file
function writeJson(fileName, content) {
    try {
        fs.writeFileSync(fileName, JSON.stringify(content), 'utf8')
    } catch (e) {
        console.log(e);
    }
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
        }];

        var ftp = new nodeFtp();

        ftp.on('greeting', function(msg) {
            console.log("FTP server is greeting with:")
            console.log(msg);
        }).on('ready', function() {
            // Tests existence of destination folder and creates it if needed
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
    var config = readYaml();

    // Get the public IP
    publicIp.v4({ https: true }).then(ip => {
        console.log(ip);

        let pubConfig = {
            redirectIp: ip,
            oldIps: []
        };

        writeJson("pub/redirect.json", pubConfig);

        // If there is a new IP...
        /*if (ip != config.currentIp) {
            console.log("Writing new IP to config file.");
            config.currentIp = ip;
            // Updates the config files (local and public)
            writeYaml('config.yml', config);
            // ... public file*/

        // Updates the redirector
        uploadFiles(config);
    });
}

main();
