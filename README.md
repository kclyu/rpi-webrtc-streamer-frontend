
# Web Front-End and Proxy for Rpi WebRTC streamer

Notice:  This is a work in progress, 
Current development status is PoC level.


## Web Front-End

In order to use WebRTC streaming function in web browser, various things are basically required. To simplify this, Web Front-End implements basic Authentication/Messaging/HTTP and WebRTC Signaling functions using Google's Firebase, and supports WebRTC streaming and other features provided by Rpi-WebRTC-Streamer (RWS) Function.

To setup Web Front End, please refer to the [READM_frontend_seutp.md guide](https://github.com/kclyu/rpi-webrtc-streamer-frontend/blob/master/READM_frontend_seutp.md).
  
## Proxy for Web Front-End
It is installed in Raspberry PI and is responsible for exchanging signaling messages between Web Front-End and RWS and proxying various functions in the middle.

To install the proxy, please refer to the [READM_frontend_seutp.md guide](https://github.com/kclyu/rpi-webrtc-streamer-frontend/blob/master/READM_frontend_seutp.md).

## Feature

- [x] WebRTC signaling message exchange
- [ ] Email verification
- [ ] User Group Management
- [ ] motion detection message
- [ ] motion detection email notification
- [ ] RWS configuration management
- [ ] log management

## License

## Version History

 * 2018/04/25 v0.10 : Initial Repo Upload

 

