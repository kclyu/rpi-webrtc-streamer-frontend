'use strict';

const fs = require('fs');
const firebase = require("firebase");
const logger = require("./logger");
const AppClient = require("./app_client");


///////////////////////////////////////////////////////////////////////////////
//
// Firebase Client 
//
///////////////////////////////////////////////////////////////////////////////
module.exports  = class FirebaseClientEmail {
    constructor ( params ) {

        if( params == undefined ) {
            logger.error('No Configuration parameters to initialize Firebase Client');
        }
        this.params_ = params;
        logger.debug('Firebase Config file path: ' 
                + params.firebase_client_config_file );
        let firebase_config = JSON.parse(require('fs')
                .readFileSync(params.firebase_client_config_file, 'utf8'));
        logger.debug('Firebase Config : ' + JSON.stringify(firebase_config ));

        // If the server time diff value of the message is greater than 
        // the specified threshold, the message is ignored.
        this.message_timeout_ = params.firebase_message_timeout;

        // firebase App Initialization
        firebase.initializeApp(firebase_config);

        // Short cut to firebase auth and database
        this.auth_ = firebase.auth();
        this.database_ = firebase.database();
        firebase.auth().onAuthStateChanged( this.onAuthStateChanged_.bind(this));

        // signin to google firebase with email/password method.
        firebase.auth().signInWithEmailAndPassword(params.email, params.password).then(function(result) {
            // signin successed
            logger.info('Signing In successful.');
            logger.debug('User uid: ' + result.uid );
            logger.info('User email: ' + result.email );
            logger.info('User emailVerified: ' + result.emailVerified );
        }).catch(function(error) {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            // The email of the user's account used.
            let email = error.email;
            // The firebase.auth.AuthCredential type that was used.
            let credential = error.credential;
            logger.error(error);
        });
    }

    onAuthStateChanged_  (user) {
        if (user) {
            this.uid_ = user.uid;
            // User signed in!
            logger.info("AuthStatueChanged User : " + this.uid_ + " Signed In");
            this.initFirebaseClient();

        }  else {
            logger.info('AuthStatueChanged User : SignOut');
            if( this.uid_  ) {
                this.unInitFirebaseClient();
            };
        };
    }

    initFirebaseClient () {

        this.app_client_ =  new AppClient(this.params_.url,
                this.sendDataseMessage.bind(this), 
                this.updateDeviceInfoSession.bind(this));
        this.deviceId_ = this.app_client_.getDeviceId();
        logger.info('App Client Device Id: ' + this.deviceId_);
        this.initDeviceInfo();

        // initialize the firebase server time offset
        this.offsetRef_ = firebase.database().ref(".info/serverTimeOffset");
        this.serverTimeOffset_ = 0; // initial offset value is zero
        this.offsetRef_.on("value", function(snap) {
            this.serverTimeOffset_ = snap.val();
        }.bind(this));

        // start to listen the client message 
        this.messagesRef_ = this.database_.ref('messages/' + this.uid_ + '/' + this.deviceId_);
        logger.debug('Message Ref: ' + this.messagesRef_ );
        // Make sure we remove all previous listeners.
        this.messagesRef_.off();

        let onNewDatabaseMessage = function(snap) {
            let val = snap.val();
            let messageTimeDiff = new Date().getTime() + this.serverTimeOffset_  -  val.timestamp;
            logger.debug('New DB: To: ' + val.to + ', did: ' + val.deviceid + 
                    ', rid: ' + val.roomid + ', cid: ' + val.clientid + 
                    ', Timstamp: ' + val.timestamp + '(' + messageTimeDiff + ')');
            // Make sure the timestamp is not timeed out and valid message.
            // to : 'device' : means message sent to device from server
            // to : 'server' : means message sent to server from device

            // only care about messages to device
            if( val.to == 'device' ) {
                // Make sure that message is not a message that has passed timeout.
                if( messageTimeDiff < this.message_timeout_ ){ 
                    // logger.debug('message Svr -> C: ' + val.message );
                    this.app_client_.doSendToDevice( val );
                } else {
                    logger.debug('Remove timeout message: ' + val.message );
                }
                // remove the current message
                snap.ref.remove();
            };
        };
        this.messagesRef_.on('child_added', onNewDatabaseMessage.bind(this));

        // connect device
        this.app_client_.deviceConnect();
    }

    initDeviceInfo () {
        // dbconn : firebase database connnection status
        //      'connected',
        //      'disconncted'
        //
        // session : connection between proxy and rpi-webrtc-streamer
        //      'connected'   
        //      'disconncted'
        //      'busy'
        //
        this.deviceInfo_ = {
            deviceid: String(this.deviceId_),
            dbconn: 'connected',
            session: 'available',
            title: this.params_.title,
            description: this.params_.description
        };
        // initialize presence reference
        this.presenceRef_ = this.database_.ref('devices/' + this.uid_ + '/' + this.deviceId_);

        // setting object for onDisconnect 
        this.deviceInfo_.dbconn = 'disconnected';
        this.deviceInfo_.session = 'disconnected';
        this.presenceRef_.onDisconnect().remove();  // remove previous onDisconnect
        this.presenceRef_.onDisconnect().set(this.deviceInfo_);

        // update current device Info 
        this.deviceInfo_.dbconn = 'connected';
        this.deviceInfo_.session = 'not available'; // default init value
        this.presenceRef_.update(this.deviceInfo_);
    }

    //  Updating Device Info ( database reference is '/devices/$uid/$deviceid' )
    // 
    // conn_status : 
    //      'connected' : WebSocket connected
    //      'disconnected' : WebSocket disconnected
    //      'session_connected' : streaming session connected
    //      'session_disconnected' : streaming session disconnected
    updateDeviceInfoSession (conn_status) {
        if( conn_status == this.previous_connection_status ) {
            // do not update when the conn_status is same as previous connection status
            return;
        };

        let  update_deviceinfo = {};

        // updating previous connection status with  new connection value
        this.previous_connection_status = conn_status;
        logger.info('AppClient Connection status : ' + conn_status );
        switch ( conn_status ) {
            case 'connected':
                update_deviceinfo.dbconn = 'connected';
                update_deviceinfo.update_timestamp = 
                    firebase.database.ServerValue.TIMESTAMP
                update_deviceinfo.session = 'available';
                break;
            case 'disconnected':
                update_deviceinfo.dbconn = 'disconnected';
                update_deviceinfo.update_timestamp = 
                    firebase.database.ServerValue.TIMESTAMP
                update_deviceinfo.session = 'not_available';
                break;
            case 'session_connected':
                update_deviceinfo.session = 'busy';
                update_deviceinfo.access_timestamp = 
                    firebase.database.ServerValue.TIMESTAMP
                break;
            case 'session_disconnected':
                update_deviceinfo.session = 'available';
                update_deviceinfo.access_timestamp = 
                    firebase.database.ServerValue.TIMESTAMP
                break;
            default:
                logger.error('Unknown AppClient Connection status: ' + conn_status );
                return;
        };
        this.presenceRef_.update(update_deviceinfo);
    }


    unInitFirebaseClient () {
        this.deviceId_ = null;
        this.app_client_ =  null;
        this.messagesRef_.off();
        this.presenceRef_ = null;
        this.messagesRef_ = null;
    }

    sendDataseMessage (message) {
        if (this.auth_.currentUser) {
            message['timestamp'] = firebase.database.ServerValue.TIMESTAMP
                this.messagesRef_.push(message);
        } else {
            logger.error('ERROR: user does not signed in.');
            return false;
        };
        return true;
    }
};


