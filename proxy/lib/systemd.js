'use strict';

const fs = require('fs');
const format = require("string-template");

/**
 *
 * Systemd RWS-Proxy Unit File Template 
 *
 */
const SystemdTemplate = `[Unit] 
Description=Rpi-WebRTC-Streamer Firebase Proxy Module
After=syslog.target

[Service]
Type=simple
PIDFile=/var/run/rws-proxy.pid
ExecStart={node} {proxy}
StandardOutput=journal
StandardError=journal
Restart=always
RestartSec=5
User={user}
Group={group}
WorkingDirectory={working_dir}

[Install]
WantedBy=multi-user.target
`;

// Raspbian Systemd Unit file path/filename 
const SystemdServiceUnitFilePath = '/lib/systemd/system/';
const ServiceUnitFileName = 'rws-proxy.service';

/**
 * 
 */
function installSystemdService(node_path, app_name, user, group) {
    let sevice_unit_contents = format(SystemdTemplate, {
        node: node_path,
        proxy: app_name, 
        working_dir: process.cwd(),
        user: user,
        group: group
    });

    let service_unit_file = SystemdServiceUnitFilePath  + ServiceUnitFileName;
    try {
        fs.writeFileSync(service_unit_file, sevice_unit_contents );
    } catch (err) {
        console.error('Failed to make systemd unit file : ' + err );
        return false;
    }
    console.log('Rws Proxy Service Unit file installed: ' + service_unit_file);
    return true;
}

function removeSystemdService(app_name, user, group) {
    let service_unit_file = SystemdServiceUnitFilePath  + ServiceUnitFileName;
    try {
        fs.unlinkSync(service_unit_file);
    } catch (err) {
        console.error('Failed to remove systemd unit file : ' + err );
        return false;
    }
    console.log('Rws Proxy Service Unit file removed: ' + service_unit_file);
}

module.exports.installSystemdService = installSystemdService;
module.exports.removeSystemdService = removeSystemdService;


