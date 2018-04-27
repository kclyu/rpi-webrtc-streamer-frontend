
'use strict';

var kConstant_LoginPage='login.html';


// Initializes FirebaseBase.
function FirebaseBase() {
    // Shortcuts to DOM Elements.
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signOutButton = document.getElementById('sign-out');

    this.initFirebase();
    // binding signOut button with signOut function
    this.signOutButton.addEventListener('click', this.signOut.bind(this));

    // 
    this.deviceTable_ = new DeviceTable();

    document.addEventListener('DOMContentLoaded', function() {
        // this.initFirebase();
        try {
            let app = firebase.app();
            let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
            trace('Firebase SDK loaded with ' + features.join(', '));
        } catch (e) {
            window.alert('Error loading the Firebase SDK, check the console.');
            trace(e);
        }
    });
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
FirebaseBase.prototype.initFirebase = function() {
    // Shortcuts to Firebase SDK features.
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Signs-out of Rpi WebRTC Streamer Firebase
FirebaseBase.prototype.signOut = function() {
    // Sign out of Firebase.
    this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
FirebaseBase.prototype.onAuthStateChanged = function(user) {
    if (user) { 
        // User is signed in!
        this.signOutButton.removeAttribute('hidden');

        // We save the Firebase Messaging Device token and enable notifications.
        this.saveMessagingDeviceToken();
        
        //  Update the contents of the device table in the Device Tab. 
        //  At the first initial loading main page, add all registered devices, 
        //  and then update the state value according to the new presence updates.
        this.deviceTable_.update();
    } else { // User is signed out!
        // Hide sign-out button.
        this.signOutButton.setAttribute('hidden', 'true');

        // Move to login page 
        window.location.href= kConstant_LoginPage;
    }
};

// Returns true if user is signed-in. Otherwise false 
FirebaseBase.prototype.checkSignedIn = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) {
    return true;
  }
  return false;
};

// Saves the messaging device token to the datastore.
FirebaseBase.prototype.saveMessagingDeviceToken = function() {
    firebase.messaging().getToken().then(function(currentToken) {
        if (currentToken) {
            trace('Got FCM device token:', currentToken);
            // Saving the Device Token and Email to the database.
            var tokenRef = 
                firebase.database().ref( 'users/' + firebase.auth().currentUser.uid);
            tokenRef.set( { 
                email: firebase.auth().currentUser.email, 
                fcmToken: currentToken });

        } else {
            // Need to request permissions to show notifications.
            this.requestNotificationsPermissions();
        }
    }.bind(this)).catch(function(error){
        console.error('Unable to get messaging token.', error);
    });
};

// Requests permissions to show notifications.
FirebaseBase.prototype.requestNotificationsPermissions = function() {
    trace('Requesting notifications permission...');
    firebase.messaging().requestPermission().then(function() {
        // Notification permission granted.
        this.saveMessagingDeviceToken();
    }.bind(this)).catch(function(error) {
        console.error('Unable to get permission to notify.', error);
    });
};

// Checks that the Firebase SDK has been correctly setup and configured.
FirebaseBase.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' );
    }
};

window.onload = function() {
    window.firebaseBase = new FirebaseBase();
};



