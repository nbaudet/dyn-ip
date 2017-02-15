yaml = require('js-yaml');
fs = require('fs');
const publicIp = require('public-ip');
var JSFtp = require("jsftp");

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

// Upload a single file to the server
function uploadSingleFile(ftp, sourcePath, destPath, callback) {
    ftp.put(sourcePath, destPath, function(hadError) {
        if (!hadError) {
            console.log("Successfully uploaded " + sourcePath + " to " + destPath);
        }
        if (callback) callback(ftp);
    });
}

// Uploads the files to the server
function uploadFiles(config) {
    try {
        let ftp = new JSFtp({
            host: config.server.host,
            //port: 3331, // defaults to 21
            user: config.server.username, // defaults to "anonymous"
            pass: config.server.password, // defaults to "@anonymous"
            debugMode: true
        });
        ftp.on('progress', function(progress) {
            console.log(progress);
        })
        ftp.on('jsftp_debug', function(eventType, data) {
            console.log('DEBUG: ', eventType);
            console.log(JSON.stringify(data, null, 2));
        });

        // Tests existence of destination folder and creates it if needed
        // ...

        // Uploads the file
        uploadSingleFile(ftp, "pub/index.html", config.server.path + "/index.html",
            uploadSingleFile(ftp, "pub/redirect.json", config.server.path + "/redirect.json")
        );

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
        //uploadFiles(config);

        let ftp = new JSFtp({
            host: config.server.host,
            port: 21,
            user: config.server.username, // defaults to "anonymous"
            pass: config.server.password, // defaults to "@anonymous"
            debugMode: true
        });

        uploadSingleFile(ftp, "pub/index.html", config.server.path + "/index.html");
        uploadSingleFile(ftp, "pub/redirect.json", config.server.path + "/redirect.json")
        //}
    });
}

main();
