
'use strict';

///////////////////////////////////////////////////////////////////////////////
//
// Device List Updater
//
///////////////////////////////////////////////////////////////////////////////

function DeviceTable() {
    // firebase signaling channel need two firebase module
    this.auth_ = firebase.auth();
    this.database_ = firebase.database();
    this.deviceTable_ = document.getElementById('device_table');

};

DeviceTable.prototype.checkUserSignedIn = function () {
    // Return true if the user is signed in Firebase
    if (firebase.auth().currentUser) {
        trace('Current UserID : ' + this.auth_.currentUser.uid);
        return true;
    }
    return false;
};

DeviceTable.prototype.update = function () {
    if( this.checkUserSignedIn() == false ) return;
    var query = this.database_.ref('devices/' + this.auth_.currentUser.uid).orderByKey();
    query.once("value")
        .then( this.updateDom_.bind(this));

    // listen to the child update event
    this.devicePresenceRef_ = this.database_.ref('devices/' + this.auth_.currentUser.uid );
    this.devicePresenceRef_.on('value', this.updateDom_.bind(this));
    trace("device presence ref : " + this.devicePresenceRef_ );
};

// update list of device list
DeviceTable.prototype.updateDom_ = function(snapshot) {
    var childKey = snapshot.key;                             // first key : 'uid'
    var snapshotVal = snapshot.val();           

    // getting device node from snapshot value
    var deviceKey = Object.keys(snapshotVal)[0]; // second key : 'deviceid'
    var deviceVal = snapshotVal[deviceKey];
    var deviceElement;
    trace('Key :  ' + childKey + ', Device Key: ' + deviceKey + ', Data : ' + JSON.stringify(deviceVal));
    trace('Device Val :  ' + JSON.stringify(deviceVal));

    var deviceElement = document.getElementById(deviceVal.deviceid);
    // If an element for device element does not exists, we need to create it.
    if (deviceElement == null ) {
        if ('content' in document.createElement('template')) {
            // Instantiate the table with the existing HTML tbody and the row with the template
            var t = document.querySelector('#device_list_tmpl');
            // t.setAttribute('id', deviceVal.deviceid);
            var td = t.content.querySelectorAll("td");
            td[0].textContent = deviceVal.title;
            td[1].textContent = deviceVal.description;
            td[2].textContent = deviceVal.session;
            var button = t.content.getElementById("button")
            button.setAttribute('onclick', 'ShowDialogBox("' + deviceVal.deviceid + '")')

            var tr = t.content.querySelectorAll("tr");
            tr[0].setAttribute('id', deviceVal.deviceid);

            var clone = document.importNode(t.content, true);
            // clone.setAttribute('id', deviceVal.deviceid);
		    this.deviceTable_.appendChild(clone);
            console.log(clone);
        } else {
            // Find another way to add the rows to the table because 
            // the HTML template element is not supported.
            trace("HTML template  is not supporeted in this browser");
        }
    }
    else {
        var td = deviceElement.querySelectorAll("td");
        // update only session information
        td[2].textContent = deviceVal.session;
        console.log(td);
    }
    componentHandler.upgradeAllRegistered();
};

