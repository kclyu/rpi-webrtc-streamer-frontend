
'use strict';

var kConstant_DeviceTableTemplate=  
    '<td id="title" class="mdl-data-table__cell--non-numeric">TMPL_TITLE</td>' +
    '<td id="description" >TMPL_DESCRIPTION</td>' + 
    '<td id="state">TMPL_STATE</td>' + 
    '<td>' + 
    '<button class="mdl-button mdl-js-button mdl-button--raised" onclick=ShowDialogBox("TMPL_DEVICEID")>Connect</button>' + 
    '</td>';

///////////////////////////////////////////////////////////////////////////////
//
// Device List Updater
//
///////////////////////////////////////////////////////////////////////////////

function DeviceTable() {
    // firebase signaling channel need two firebase module
    this.auth_ = firebase.auth();
    this.database_ = firebase.database();
    this.deviceTableTBody = document.getElementById('device_list');
};

DeviceTable.prototype.checkUserSignedIn = function () {
    // Return true if the user is signed in Firebase
    if (firebase.auth().currentUser) {
        trace('Current UserID : ' + this.auth_.currentUser.uid);
        return true;
    }
    return false;
};

DeviceTable.prototype.updateDeviceTable = function () {
    if( this.checkUserSignedIn() == false ) return;
    trace("current userid : " + this.auth_.currentUser.uid );

    var query = this.database_.ref('devices/' + this.auth_.currentUser.uid)
            .orderByKey();
    trace('Device list ref : ' + query );
    trace('Start Query ---------------');
    query.once("value")
        .then( this.updateDeviceTableDom_.bind(this));
    trace('End Query ---------------');
};

// update list of device list
DeviceTable.prototype.updateDeviceTableDom_ = function(snapshot) {
    var key = snapshot.key;
    var val = snapshot.val();
    trace('Key :  ' + key + ', Data : ' + JSON.stringify(val));

    trace('Device DOM Val :  ' + JSON.stringify(val));
    var table_record = document.getElementById(val.deviceid);
    // If an element for that message does not exists yet we need to create it.
    if (!table_record) {
        var table_record = document.createElement('tr');
        table_record.innerHTML = kConstant_DeviceTableTemplate;
        trace('New Table record 00: ' + table_record.innerHTML );
        table_record = table_record.firstChild;
        table_record.setAttribute('id', val.deviceid);
        table_record.innerHTML = table_record.innerHTML.replace(/TMPL_TITLE/g, val.title )
            .replace(/TMPL_DESCRIPTION/g, val.description )
            .replace(/TMPL_STATE/g, val.session )
            .replace(/TMPL_DEVICEID/g, val.deviceid )
        trace('New Table record 22: ' + table_record.innerHTML );
        this.deviceTableTBody.appendChild(table_record);

// var kConstant_DeviceTableTemplate=  
//     '<td class="mdl-data-table__cell--non-numeric">TMPL_TITLE</td>' +
//     '<td>TMPL_DESCRIPTION</td>' + 
//     '<td>TMPL_STATE</td>' + 
//     '<td>' + 
//     '<button class="mdl-button mdl-js-button mdl-button--raised" onclick=ShowDialogBox("TMPL_DEVICEID")>Connect</button>' + 
//     '</td>';

        // Replace Template Variable 
        trace('New Table record 11: ' + table_record.innerHTML );
    }
    else {
        table_record.innerHTML = messageElement.innerHTML.replace(/TMPL_DEVICEID/g, val.deviceid );
        table_record.querySelector('.title').textContent = val.title;
        table_record.querySelector('.description').textContent = val.description;
        table_record.querySelector('.state').textContent = val.session;
    }
};

