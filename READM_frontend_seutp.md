
#  Setup Guide

## Web Front-End setup


RWS Web Front-End uses Google's Firebase.  If you have not joined FireBase before, please sign up and choose Spark 'Firebase pricing plans'. As a private developer, it appears to be free to use to some extent, though there is a capacity limit. To use Front-End, you first need to create a project for use after joining Google Firebase. Please refer to the following document for how to create and set up a project.

### Create Google Firebase and Setup new project for Web Front-End

Select a new project from the [Google Firebase Console](https://console.firebase.google.com/) as shown below,
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_CreateProject.png" alt="Drawing" style="width: 400px;" align="middle"/>



In the figure below, a new project is created when you enter the information of the project to be newly created.
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_NewProjectWindow.png" alt="Drawing" style="width: 400px;" align="middle"/>

Select 'Authentification' of the project and select 'SIGN-IN-METHOD' as shown below.
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_MainMenu.png" alt="Drawing" style="width: 600px;" align="middle"/>

On the 'Sign-In-Provider' screen, enable 'Email-Password' and disable all other providers except 'Email-Password'.  
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_SignInMethod.png" alt="Drawing" style="width: 800px;" align="middle"/>

Select 'USERS' of Authentification and click 'Add and Email / Password user' as below. Enter your desired email and password to create a new user. (Currently only one user is allowed.) 

<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_UserAdd.png" alt="Drawing" style="width: 700px;" align="middle"/>

### Web Front-End Deploy

To setup the Front-End Web Repo on a Firebase, you need the nodejs package and the firebase-tools package.
Please download the nodejs according to the OS used in [Node JS Download](https://nodejs.org/en/download/).

After you install nodejs, you can do this by using the following command.

### Firebase Database/Stroage/Hosting
Web Front-End uses Firebase's Realtime Database (not Firestore) and Stroage/Hosting features. Please select each Database/Storage/Hosting from the DEVELOP menu of the Firebase Console to enable it.

### Deploy
 
```
git clone https://github.com/kclyu/rpi-webrtc-streamer-frontend
cd rpi-webtc-streamer-frontend/web
npm -g install firebase-tools
firebase login  # firebase login will prompt new browser window to ask you to confirm
firebase use --add  # select your new firebase project id
firebase deploy  # this command will deploy the Rws Web Front-End on your project
```


## Proxy  setup
Proxy will run on Raspberry PI. All commands or settings below must be run on Raspberry Pi.


### NodeJS Download
Node.js for Raspberry PI is required to run Proxy. Please download ARMv7 for Raspberry PI2 or later version from [Node JS Download](https://nodejs.org/en/download/).

### Repo clone and Node Module install
```sh
mkdir Workspace
cd Workspace 
git clone https://github.com/kclyu/rpi-webrtc-streamer-frontend
cd rpi-webrtc-streamer-frontend/proxy
npm install
```

### Proxy Configuration File Setup
There are two configuration files for the Proxy.

#### proxy_config.json configuration setup
```
cd ~/Workspace/rpi-webrtc-streamer-frontend/proxy/etc
cp proxy_config.json.template proxy_config.json
vi proxy_config.json.template # Use a text editor that is easy to use.
```
In the "email-password" section, change your email and password to the email and password registered on the Firebase.
In the local-device-config entry, the URL must be the WS URL to connect to RWS. If you are using a different port, you must use the modified port number.

### firebase_config.json setup

firebase_config.json sets the information for connecting to the newly created Firebase Project by the proxy as client. To get the settings for each item, select 'Project Settings' in Firebase Project as shown below.
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_ProjectSetting.png" alt="Drawing" style="width: 600px;" align="middle"/>

Select 'Project Settings' and select 'Add Firebase to your web app' under 'Your apps' as shown below.
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_ProjectSettingAddYourApp.png" alt="Drawing" style="width: 600px;" align="middle"/>


If you select 'Add Firebase to your web app', you can see the project config information required for the config item as shown below.
You need to make the same config in firebase_config.json.
<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/Firebase_AddFirebaseToYourWeb2.png" alt="Drawing" style="width: 600px;" align="middle"/>

Please refer to the example below.

```
cd ~/Workspace/rpi-webrtc-streamer-frontend/proxy/etc
cp firebase_config.json.template firebase_config.json
vi proxy_config.json.template # Use a text editor that is easy to use.
```

### Firebase connection verification
This is a procedure to check whether the proxy is working properly with the newly added Firebase Project. You will need to verify that Firebase is authenticated properly, as in the example below.

Run the proxy in the terminal window as shown in the following example.
```
node rws-proxy.js
```
Once the proxy is set up properly, the following log will appear on the terminal console.

```
Config-File option not specified.
debug: Config: {"auth_type":"email-password","firebase_client_config_file":"etc/firebase_config.json","firebase_message_timeout":10000}
debug: Auth Type: email-password
info: Using Email-Password of Firebase Auth
debug: Params: {"auth_type":"email-password","firebase_client_config_file":"etc/firebase_config.json","firebase_message_timeout":10000,"email":"your@firebase-email-address","password":"xxxxxxxx","url":"ws://127.0.0.1:8889/rws/ws","title":"Livinging Room","description":""}
debug: Firebase Config file path: etc/firebase_config.json
debug: Firebase Config : {"apiKey":"xxxxxxxxxxxx","authDomain":"firebase-proect-url","databaseURL":"https://firebase-proejct.firebaseio.com","projectId":"firebase-project","storageBucket":"firebase-project.appspot.com","messagingSenderId":"................."}
info: AuthStatueChanged User : SignOut
info: Signing In successful.
debug: User uid: j8F1EVZrnSM1he2Iax9SHLFDpGk2
info: User email: your@firebase-email-address
info: User emailVerified: false
info: AuthStatueChanged User : j8F1EVZrnSM1he2Iax9SHLFDpGk2 Signed In
info: Using Device ID: 000000005b8879cc
info: App Client Device Id: 000000005b8879cc
debug: Message Ref: https://firebase-project.firebaseio.com/messages/j8F1EVZrnSM1he2Iax9SHLFDpGk2/000000005b8879cc
info: Trying to connenct device through WebSocket
debug: Create new websocket object
```

In the middle of the above log, you should see 'debug: Signing In successful.' Should be shown. Message that Firebase Project and Proxy are normally connected.
This confirms that the Firebase Project settings and Web Front-End were deployed normally.

### Verifying connectivity using Browser
If you connect to https://your-project-id.firebasdapp.com/ URL using Browser, login screen should be displayed as below.

<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/FrontEnd_Login.png" alt="Drawing" style="width: 600px;" align="middle"/>

When you log in using the email and password you added when creating the project, the 'Device List' screen will appear as shown in the screen below.

<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/FrontEnd_DeviceList.png" alt="Drawing" style="width: 600px;" align="middle"/>

Device LIst shows the device ID of the Raspberry PI in which the connected proxy is running and the 'connection' value showing the connection status as Available. Clink the 'Connect' button next to it and you will see RWS's WebRTC video stream with DialogBox and everything is done.

<img src="https://github.com/kclyu/rpi-webrtc-streamer-frontend/raw/docs_images/images/FrontEnd_RemoteVideo.png" alt="Drawing" style="width: 600px;" align="middle"/>

## Register / terminate Proxy on systemd

### systemd registration

The following command registers proxy as systemd service.

```
 sudo /home/pi/tools/node/bin/node rws-proxy.js --systemd-install # note1
 sudo systemctl  enable rws-proxy
 sudo systemctl  start rws-proxy
```
note1: If you want to run the node with sudo, use the full path of the node binary.
###  Unregister systemd

The following command will unregister proxy from systemd.
```
 sudo systemctl  stop rws-proxy
 sudo systemctl  disable rws-proxy
 sudo /home/pi/tools/node/bin/node rws-proxy.js --systemd-remove # note 1
```
