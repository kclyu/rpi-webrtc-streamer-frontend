'use strict';

const nconf = require('nconf');
const fs = require('fs');
const commander = require('commander');
const systemd = require('./lib/systemd');

/*
 * RWS Proxy command line parsing parts
 */
commander
    .version('RWS Proxy Version: 0.10.0')
    .option('--systemd-install', 'install systemd service unit file on system')
    .option('--systemd-remove', 'remove systemd service unit file on system')
    .option('--config-file [config]', 'specify the path of the config file in the option')
    .parse(process.argv);

/*
 * Sytemd Service file installl/remove options
 */
if( commander.systemdInstall ) {
    systemd.installSystemdService(process.argv[0], process.argv[1], 'pi', 'pi');
    process.exit(0);
} else if ( commander.systemdRemove ) {
    systemd.removeSystemdService(process.argv[1]);
    process.exit(0);
};


/*
 * RWS Proxy Main Parts
 */
// importing logger module from here
const logger = require("./lib/logger");

// if the 'config-file' parameter is not in command line,
// the below defaut config value will be used
let rws_config_filenam;
if( commander.configFile === undefined ) {
    // using default rws-config file in the 'etc' directory
    console.log('Config-File option not specified.');
    rws_config_filenam = './etc/proxy_config.json';
} else {
    console.log('Config-File option specified : ' + commander.configFile );
    rws_config_filenam = commander.configFile;
};

if (!fs.existsSync(rws_config_filenam)) {
    logger.error('Configuration file not found! : ' 
            + rws_config_filenam );
    process.exit(-1)
};
    
// Read the configuration settings from JSON file 
nconf.file({
  file: rws_config_filenam,
  // Setting the separator as dot for nested objects
  logicalSeparator: '.'
});



let config_ = nconf.get('config');
let firebaseClient_;

logger.debug('Config: ' + JSON.stringify(config_));
logger.debug('Auth Type: ' + config_.auth_type);

if( config_.auth_type === "email-password" ) {
    const FirebaseClientEmail = require('./lib/firebase_client_email');
    logger.info('Using Email-Password of Firebase Auth');
    let proxy_config = nconf.get('config');
    let auth_params_ = nconf.get('email-password');
    let device_params_ = nconf.get('local-device-config');
    let local_params = Object.assign(proxy_config, auth_params_, device_params_);
    logger.debug('Params: ' + JSON.stringify(local_params) );
    firebaseClient_ = new FirebaseClientEmail(local_params);
}
else if( config_.auth_type == 'google-auth' ) {
    // TODD
    // logger.error('Using Google Auth OAuth2 of Firebase Auth');
    // let params_ = nconf.get('google-auth');
    logger.error('Not supported Google Auth OAuth2');
}
else {
    logger.error('Not supported auth type in proxy_config.json :' + config_.auth_type);
}


