'use strict';

const fs = require('fs');
const {google} = require('googleapis');
const nconf = require('nconf');
const readline = require('readline');
const path = require('path');
const OAuth2Client = google.auth.OAuth2;


const scopes = require('./lib/scopes');

nconf.argv().env().file('client_secret.json');
const keys = nconf.get('installed');

var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'firebase_credential.json';

var SCOPES = [
    scopes.EMAIL,
    scopes.PROFILE,
    scopes.FIREBASE_PROJECTS_READONLY,
    scopes.FIREBASE_PLATFORM,
    scopes.CLOUD_PLATFORM
];

// Client ID and client secret are available at
// https://code.google.com/apis/console
const CLIENT_ID = keys.client_id;
const CLIENT_SECRET = keys.client_secret;
const REDIRECT_URL = keys.redirect_uris[0];

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

/**
 * Try to authorize the saved token at first.
 * if there is no saved token in credential file, it will try to get new token
 */
function authorizeToken(oauth2Client, callback) {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            var json_tokens = JSON.parse(token);
            oauth2Client.setCredentials({ 
                access_token: json_tokens.access_token,
                refresh_token: json_tokens.refresh_token
                // Optional, provide an expiry_date (milliseconds since the Unix Epoch)
                // expiry_date: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 7)
                });
            oauth2Client.refreshAccessToken(function(err, tokens) {
                // your access_token is now refreshed and stored in oauth2Client
                // store these new tokens in a safe place (e.g. database)
                if( err ) 
                    console.log('Error in Refresh Token: ', err);
                else {
                    // returned token is json format
                    storeToken(tokens);
                    callback(null, tokens);
                }
            });
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getNewToken (oauth2Client, callback) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // generate consent page url
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // will return a refresh token
        scope: SCOPES.join(' ')
    });

    console.log('Visit the url: ', url);
    rl.question('Enter the code here: ', code => {
        rl.close();
        // request access token
        oauth2Client.getToken(code, (err, tokens) => {
            if (err) {
                console.log('getToken Code error : ', err);
                return callback(err);
            }
            oauth2Client.setCredentials({ 
                token_id: tokens.token_id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
                // Optional, provide an expiry_date (milliseconds since the Unix Epoch)
                // expiry_date: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 7)
                });
            storeToken(tokens);
            callback(null, tokens);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('New Token stored to ' + TOKEN_PATH);
}


/**
 * Get authoriazed Token
 */
function getAuthorizedToken(callback){
    authorizeToken(oauth2Client, callback );
}

module.exports.getAuthorizedToken = getAuthorizedToken;

/**
// retrieve an access token
authorizeToken(oauth2Client, (err, tokens) => {
    // retrieve user profile
    //
    if( err )
        console.log('Failed to authorize the tokens');
    else 
        console.log('Autorization successed, token: ', JSON.parse(tokens));
}) ;
*/


