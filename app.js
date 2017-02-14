yaml = require('js-yaml');
fs = require('fs');
const publicIp = require('public-ip');

// Get config Yaml content, or throw exception on error
function readYaml(fileName) {
    fileName = fileName || 'config.yml';
    try {
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        console.log(e);
    }
}

// Save current config to file
function writeYaml(fileName, content) {
    fileName = fileName || 'config.yml';
    try {
        fs.writeFileSync(fileName, yaml.safeDump(content)) //.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        console.log(e);
    }
}

function main() {
    var config = readYaml();

    // Get the public IP
    publicIp.v4({ https: true }).then(ip => {
        console.log(ip);
        if (ip != config.currentIp) {
            console.log("Writing new IP to config file.");
            config.currentIp = ip;
            writeYaml('config.yml', config);
        }
    });
}

main();
