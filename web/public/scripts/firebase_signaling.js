
'use strict';

///////////////////////////////////////////////////////////////////////////////
//
// Firebase Signaling Channel
//
///////////////////////////////////////////////////////////////////////////////

function FirebaseSignalingChannel(deviceId, remoteVideo ) {
    // firebase logging
    // firebase.database.enableLogging(true);

    // If the server time diff value of the message is greater than 
    // the specified threshold, the message is ignored.
    this.signalingMessageTimeout_ = 10000;   // 10 seconds

    this.deviceId_ = deviceId;
    this.remoteVideo_ = remoteVideo;

    // firebase signaling channel need two firebase module
    this.auth_ = firebase.auth();
    this.database_ = firebase.database();
    if( this.checkUserSignedIn() == false ) {
        return new Error('User need to sign in before using FirebaseSignalingChannel');
    };
};

FirebaseSignalingChannel.prototype.checkUserSignedIn = function () {
    // Return true if the user is signed in Firebase
    if (firebase.auth().currentUser) {
        trace('Current UserID : ' + this.auth_.currentUser.uid);
        return true;
    }
    return false;
};

FirebaseSignalingChannel.prototype.initSignaling_ = function () {
    if( this.checkUserSignedIn() == false ) return;

    // initialize the firebase server time offset
    this.offsetRef_ = firebase.database().ref(".info/serverTimeOffset");
    this.serverTimeOffset_ = 0; // initial offset value is zero
    this.offsetRef_.on("value", function(snap) {
        this.serverTimeOffset_ = snap.val();
    }.bind(this));

    trace("device Id : " + this.deviceId_ );
    trace("current userid : " + this.auth_.currentUser.uid );

    // Create a database ref of device presence information
    this.devicePresenceRef_ = this.database_.ref('devices/' + 
            this.auth_.currentUser.uid + '/' + this.deviceId_);
    this.devicePresenceRef_.off();
    this.devicePresenceRef_.on('value', this.onRecvDevicePresence_.bind(this));
    trace("device presence ref : " + this.devicePresenceRef_ );

    //  Create a database ref for exchanging device and signaling messages
    this.messagesRef_ = this.database_.ref('messages/' + 
            this.auth_.currentUser.uid + '/' + this.deviceId_);

    // Make sure we remove all previous listeners.
    this.messagesRef_.off();
    this.messagesRef_.on('child_added', this.onRecvDatabaseMessage_.bind(this));
    trace("message ref : " + this.messagesRef_ );

    // enable periodic transmission of keepalive messages
    this.keepalive_interval = window.setInterval(this.sendKeepAliveMessage.bind(this), 1000);
};


FirebaseSignalingChannel.prototype.sendDatabaseMessage_ = function (message) {
    if (this.auth_.currentUser) {
        this.messagesRef_.push({
            to: 'device',
            roomid: this.roomId_,
            clientid: this.clientId_,
            deviceid: this.deviceId_,
            message: message,
            timestamp : firebase.database.ServerValue.TIMESTAMP
        });
    } else {
        trace('user does not signed in.');
        return false;
    };
    return true;
};


FirebaseSignalingChannel.prototype.sendKeepAliveMessage = function () {
    if (this.auth_.currentUser) {
        var message = JSON.stringify({
            cmd: 'keepalive',
            msg: ''
        });
        this.sendDatabaseMessage_( message );
    }
};

FirebaseSignalingChannel.prototype.isDatabaseConnected_ = function () {
    var connectedRef = this.database_.ref(".info/connected");
    connectedRef.on("value", function(snap) {
        if (snap.val() === true) {
            // database is connected
            return true;
        } else {
            // database is disconnected
            return false;
        }
    });
};


// If the device presence status changes to disconnected, 
// stop all signaling and streaming services.
FirebaseSignalingChannel.prototype.onRecvDevicePresence_ = function (snap) {
    var val = snap.val();
    trace('Snaphot Val : ' + JSON.stringify(val) );
    var updateTimeDiff = new Date().getTime() -  val.timestamp;
    trace('Message : DB Connection: ' + val.dbconn + ', deviceid: ' + val.deviceid + 
            ', Sesssion: ' + val.session + ', Timestamp Diff' + updateTimeDiff );

    // stops the streaming when it's status changed to 'disconnected'
    if( val.dbconn == 'disconnected' || val.session == 'disconnected' ) {
        this.doSignalingDisconnnect();
    }
};

FirebaseSignalingChannel.prototype.onRecvDatabaseMessage_ = function (snap) {
    var val = snap.val();
    var messageTimeDiff = new Date().getTime() + this.serverTimeOffset_  -  val.timestamp;
    trace('Message : To: ' + val.to + ', deviceid: ' + val.deviceid + 
            ', Timetamp: ' + val.timestamp + '(' + messageTimeDiff + ')' );
    // Make sure the timestamp is not timeed out and valid message.
    // to : device : means message sent to device from server
    // to : server : means message sent to server from device
    //
    if( val.to == 'server' ) {
        if( messageTimeDiff < this.signalingMessageTimeout_ ){ 
            trace('message DB -> WebClient: ' + val.message );
            var dataJson = JSON.parse(val.message);
            if( dataJson["cmd"] == "send") {
                this.peerConnectionClient_.onReceivePeerMessage(dataJson["msg"]);
            } else {
                trace('Unknown signaling command from device: ' + val.message );
            }
        } else {
            trace('Remove timeout message: ' + val.message );
        }
        // remove the current message
        snap.ref.remove();
    };
};

FirebaseSignalingChannel.prototype.onError_ = function (event) {
    trace("An error occured while connecting : " + event.data);
    // TODO: need error handling
};


FirebaseSignalingChannel.prototype.doSignalingConnect = function () {

    // reset roomid and clientid  at the beginning of signailing connect
    this.roomId_  = this.randomString_(9);
    this.clientId_ = this.randomString_(8);
    trace('Using Room ID: ' + this.roomId_  + ', ClientId: ' + this.clientId_ );

    this.initSignaling_();
    // sending register command
    this.doSignalingRegister();
    this.peerConnectionClient_ = 
        new PeerConnectionClient(this.remoteVideo_, this.doSignalingSend.bind(this) );
};

// 
FirebaseSignalingChannel.prototype.doSignalingRegister = function () {
    // No Room concept, random generate room and client id.
    var register = { cmd: 'register',
        roomid: this.roomId_,
        clientid: this.clientId_
    };
    trace('Sending Register Room ID: ' + this.roomId_  + ', ClientId: ' + this.clientId_ );
    this.sendDatabaseMessage_( JSON.stringify(register));
};

// 
FirebaseSignalingChannel.prototype.doSignalingBye = function () {
    // Sending bye meessage to client
    var bye_message =  { cmd: 'send',
        msg: JSON.stringify({type:'bye'}),
        error: ""
    };
    this.sendDatabaseMessage_(JSON.stringify(bye_message));
};

FirebaseSignalingChannel.prototype.doSignalingSend = function (data) {
    var message = { cmd: "send",
        msg: JSON.stringify(data),
        error: ""
    };
    var data_message = JSON.stringify(message);
    if( this.sendDatabaseMessage_(data_message) == false ) {
		trace("Failed to send data: " + data_message);
        return false;
    };
    return true;
};

FirebaseSignalingChannel.prototype.doSignalingDisconnnect = function () {
    trace('Disconnecting device connection');
    this.doSignalingBye();

    this.peerConnectionClient_.close();
    this.deviceId_ = null;
    this.messagesRef_ = null;
    this.devicePresenceRef_ = null;
    this.peerConnectionClient_ = null;
    window.clearInterval(this.keepalive_interval);

};


///////////////////////////////////////////////////////////////////////////////
//
// Utility Helper functions
//
///////////////////////////////////////////////////////////////////////////////

FirebaseSignalingChannel.prototype.randomString_ = function (length) {
// Return a random numerical string.
    var result = [];
    var strLength = length || 5;
    var charSet = '0123456789';
    while (strLength--) {
        result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
    }
    return result.join('');
};


