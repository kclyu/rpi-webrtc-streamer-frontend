'use strict';

const fs = require('fs');
const logger = require("./logger");
const WebSocketClient = require('./websocket_client.js');


const STATE_CONNECTED = 'CONNECTED';
const STATE_DISCONNECTED = 'DISCONNECTED';
const SESSION_CONNECTED = 'CONNECTED';
const SESSION_DISCONNECTED = 'DISCONNECTED';
const MSG_CMD_REGISTER = 'register';
const MSG_CMD_SEND = 'send';
const MSG_CMD_STATUS = 'status';
const MSG_CMD_STATUS_REPORT = 'status-report';
const MSG_CMD_KEEPALIVE = 'keepalive';


///////////////////////////////////////////////////////////////////////////////
//
//  App Client (RWS)
//
//      AppMessage Json
//          to : 'server' or 'device'
//          deviceid : hardware device id string
//          message : string message(app_client string) to deliver
//
///////////////////////////////////////////////////////////////////////////////

module.exports  = class AppClient {
    constructor ( url, sendMessage, onAppClientObserver, deviceId ) {
        this.url_ = url;
        this.state_ = STATE_DISCONNECTED;
        this.session_state_ = SESSION_DISCONNECTED;
        this.keepalive_timestamp_ = 0;
        if( onAppClientObserver ) {
            this.onAppClientObserver_ = onAppClientObserver;
        } else {
            this.onAppClientObserver_ = this.onDummyAppClientObserver_;
        }
        //
        if( deviceId == undefined )  {
            // getting hardware deviceId from '/proc/cpuinfo'
            this.deviceId_ = this.getHardwareDeviceId_();
        } else {
            // using deviceId optional parameter
            this.deviceId_ = this.deviceId;
        }
        logger.info('Using Device ID: ' + this.deviceId_ );
        this.sendMessage_ = sendMessage;
        this.websocketClient_ = new WebSocketClient(this.url_,
            this.doSendToServer.bind(this), this.onWebSocketObserver.bind(this) );
    }

    isConnected () {
        if( this.state_ == STATE_CONNECTED ) return true;
        return false;
    }

    activateSession_ (roomid, clientid) {
        this.roomId_ = roomid;
        this.clientId_ = clientid;

        // change session state to CONNECTED
        this.session_state_ = SESSION_CONNECTED;
        this.keepalive_interval_ = setInterval(this.onKeepAliveInterval.bind(this), 1000 );
        this.onAppClientObserver_('session_connected');
        logger.info('Activating session state :  ' + this.session_state_ );
    }

    deactivateSession_ () {
        this.roomId_ = '0';
        this.clientId_ = '0';

        // change session state to DISCONNECTED
        this.session_state_ = SESSION_DISCONNECTED;
        clearInterval(this.keepalive_interval_);
        this.onAppClientObserver_('session_disconnected');
        logger.info('Deactivating session state :  ' + this.session_state_ );
    }

    validateSession_ (roomid, clientid) {
        // Validate session_state, roomid, clientid
        if( this.session_state_ == SESSION_CONNECTED  ) {
            //   roomid and clientid should be same with internal value
            //   when the session state is CONNECTED
            if( this.roomId_ == roomid && this.clientId_ == clientid) {
                logger.info('Connection State: ' + this.session_state_ );
                return true;
            } else {
                logger.error('Invalid Session Client id(Session): R:' +
                        this.roomId_ + ', C:' + this.clientId_ );
                logger.error('Invalid Session Client id(Message): R:' +
                        roomid + ', C:' + clientid );
                return false;
            }
        }
        else if( this.session_state_ == SESSION_DISCONNECTED  ) {
            //   roomid and clientid should be different with internal value
            //   when the session state is CONNECTED
            if( this.roomId_ == roomid && this.clientId_ == clientid) {
                logger.error('Invalid Session Client id(Session): R:' +
                        this.roomId_ + ', C:' + this.clientId_ );
                logger.error('Invalid Session Client id(Message): R:' +
                        roomid + ', C:' + clientid );
                return false;
            } else {
                return true;
            }
        }
        else {
            logger.error('Invalid session state during validating session: ' +
                    this.session_state_ ) ;
        }
        return false;
    }

    getDeviceId () {
        return this.deviceId_;
    }

    doSendToServer ( message ) {
        let send_message = {
            to: 'server',
            deviceid: String(this.deviceId_),
            roomid: String(this.roomId_),
            clientid: String(this.clientId_),
            message: message
        };
        logger.info('Device -> Server : ' + JSON.stringify(send_message) );
        this.sendMessage_( send_message );
    }

    // dummy Observer callback
    onDummyAppClientObserver_(conn_status) {
        logger.debug('DummyAppClientObserver called: ' + conn_status);
    }

    // Start WebSocket connection
    deviceConnect() {
        logger.info('Trying to connenct device through WebSocket');
        this.websocketClient_.initWebSocket();
    }

    // It is called when the connection state of websocket changes.
    onWebSocketObserver(conn_status, data) {
        if( conn_status == 'connected' )  {
            this.state_ = STATE_CONNECTED;
            this.onAppClientObserver_('connected');
        }
        else if( conn_status == 'disconnected' )  {
            this.state_ = STATE_DISCONNECTED;
            this.onAppClientObserver_('disconnected');
        }
        else {
            logger.info('Error : ' + data );
        }
    }

    // If the difference between the keepalive timestamp value and the current time
    // is greater than the specified threshold value, the proxy determines that
    // the device no longer needs to do the streaming service.
    onKeepAliveInterval() {
        let update_difference = Date.now() - this.keepalive_timestamp_;

        // The valid threshold value is 3 to 7 seconds.
        // A value greater than 7 seconds is considered as a previous session
        // or other garbage value.
        if( update_difference >  4000  &&  update_difference < 7000) {
            logger.error('Sending bye command triggered by KeepAlive timeout : ' + update_difference);

            // send bye message to device
            this.websocketClient_.doSendMessage(JSON.stringify({ cmd: 'send',
                msg: JSON.stringify({type:'bye'}),
                error: ""
            }));

            // reset the connection state
            this.deactivateSession_();
        }
    }

    // Send a message to device via websocket
    doSendToDevice (app_message) {
        // validate device id
        if( app_message.deviceid !== this.deviceId_ ) {
            logger.error('ERROR: Device ID mismatch: ' + app_message.deviceid );
            return;
        }

        if( app_message.to !== 'device' ) {
            logger.error('ERROR: unknown to value' + app_message.to );
            return;
        }

        let json_message = JSON.parse( app_message.message );
        switch( json_message.cmd ) {
            case MSG_CMD_REGISTER:
                if( this.validateSession_(json_message.roomid, json_message.clientid) == true){
                    // sending message
                    this.activateSession_(json_message.roomid, json_message.clientid );
                    if( this.websocketClient_.isConnected() ) {
                        logger.info('Server -> Device : ' + JSON.stringify(app_message.message) );
                        this.websocketClient_.doSendMessage(app_message.message);
                    } else {
                        logger.error('WebSocketClient is not ready to send register command');
                    };
                } else {
                    // print validation result
                    logger.error('Invalid Session Message : ' + JSON.stringify(app_message ));
                    return;
                }
                break;

            case MSG_CMD_SEND:
                // Validate session_state
                if(this.validateSession_(app_message.roomid, app_message.clientid ) == true ){
                    let send_msg = JSON.parse( json_message.msg );
                    if( send_msg.type == 'bye' ) {
                        logger.info('Sending Command Bye');
                        this.deactivateSession_();
                    };

                    if( this.websocketClient_.isConnected() ) {
                        logger.info('Server -> Device : ' + JSON.stringify(app_message.message) );
                        this.websocketClient_.doSendMessage(app_message.message);
                    } else {
                        logger.info('WebSocketClient is not ready to send(send)');
                    }
                } else  {
                    // print validation result
                    logger.error('Invalid Session Message : ' + JSON.stringify(app_message ));
                };
                break;
            case MSG_CMD_KEEPALIVE:
                // do not sent keepalive message to device.
                // modify the timestamp value to the current time.
                this.keepalive_timestamp_ = Date.now();
                break;
        };
    };

    getHardwareDeviceId_ () {
        let cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
        let ci_array = cpuinfo.split("\n");
        let serial_line = ci_array[ci_array.length-2];
        let serial = serial_line.split(":");
        //  Using testing serial
        if( serial.length < 2 )
            return '000000005b8879cc';
        return serial[1].slice(1);
    };
}
