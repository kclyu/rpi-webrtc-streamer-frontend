
'use strict';

const WebSocket = require('ws');
const logger = require("./logger");

// constant variables
const kConstantreconnectInterval_ = 10000; // 10 seconds

///////////////////////////////////////////////////////////////////////////////
//
// WebSocket Client 
//
///////////////////////////////////////////////////////////////////////////////
module.exports  = class WebSocketClient {
    constructor ( url, messageCallback, observerCallback, reconnectInterval ) {
        // message queue to keep mesages if there is no connection
        this.message_queue_ = [];
        this.messageCallback_ = messageCallback;    
        this.isConnected_  = false;
        this.url_ = url;
        if( observerCallback ) {
            this.observerCallback_ = observerCallback;  // observer callback
        } else {
            this.observerCallback_ = this.dummyObserverCallback_;  // dummy observer 
        }
        if( reconnectInterval ) {
            this.reconnectInterval_ = reconnectInterval;
        } else {
            // using default reconnectInterval value;
            this.reconnectInterval_ = kConstantreconnectInterval_;  
        }
    }
    
    // Trying to reconnect when websocket is disconnected or failed to connect
    dummyObserverCallback_(conn_status, data) {
        logger.info('connection: ' + conn_status + ', Error: ' + data );
    }

    initWebSocket () {
        logger.debug('Create new websocket object');
        // clear the queue before create websocket
        this.message_queue_.length = 0;
        delete this.websocket_;
        this.websocket_ = new WebSocket(this.url_);

        this.websocket_.on('open', this.onOpen_.bind(this));
        this.websocket_.on('close',this.onClose_.bind(this));
        this.websocket_.on('error',this.onError_.bind(this));
    }

    isConnected () {
        return this.isConnected_;
    }

    onOpen_ () {
        logger.info("Websocket connnected: " + this.websocket_.url);
        this.observerCallback_('connected',this.websocket_.url);
        clearTimeout(this.reInitTimerObj_);
        this.isConnected_ = true;
        this.queueSend_();
        // register onMessage callback when websocket connected
        this.websocket_.on('message',this.onMessage_.bind(this));
    }

    onClose_ () {
        logger.info('Websocket Disconnected, Trying to reconnect.');
        this.observerCallback_('disconnected',this.websocket_.url);
        this.isConnected_ = false;
        // create the reinit timer
        this.reInitTimerObj_ = setTimeout(this.initWebSocket.bind(this),this.reconnectInterval_);
    }

    onMessage_  (message) {
        this.messageCallback_(message);
    }

    onError_ (error) {
        logger.debug("An error occured : " + error);
        this.observerCallback_('error', error);
    }

    doSendMessage (message) {
        if( this.isConnected_ == true && this.websocket_.readyState == WebSocket.OPEN ){
            logger.debug('Message to Device : ' + message );
            this.websocket_.send(message);
        } // else {
        //     this.queuePush_(message);
        // }
    }

    doDisconnect () {
        logger.info('Diconnecting websocket.');
        this.websocket_.close();
    }

    queuePush_ (message) {
        this.message_queue_.push(message);
        logger.debug("queuing message : " + this.message_queue_.length);
    }

    queueSend_ () {
        while (this.message_queue_.length > 0) {
            let message = this.message_queue_.shift();
            logger.debug('Send Queue Proxy --> Device: ' + message );
            this.websocket_.send(message, function(error) {
                if( error )  {
                    this.message_queue_.unshift(message);
                    return new Error('Error in resending message');
                }
            }.bind(this));
        }
    }
};




