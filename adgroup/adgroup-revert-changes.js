/*
Copyright (c) 2013, Growth
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Reverts the adGroups that were modified from a budget optimization script.
// The adGroups modified need to be stored in the first column of a spreadsheet in the following formats:
// If the adGroup is paused: "Pausing adGroup: {id} {name}"
// If the adGroup default maxCPC is changed: "Changing adGroup: {id} {name} from:{before-value} to:{after-value}"
// Each change needs to be in a different row.
// The spreadsheet in which the log messages of the modified keywords are stored.
var SPREADSHEET_REVERT_ADGROUPS_URL = 'URL';

var campaigns = {
    'Some Campaign': true
};

// Stores all of the to be reverted adGroups
var toRevert = [];

function main() {
    var adGroups = getAdGroups();
    fillRevert();
    for (var i = 0; i < toRevert.length; i++) {
        var obj = toRevert[i];
        var adGroup = adGroups[obj.id];
        if (adGroup) {
            if (obj.command == 'pause') {
                revertPause(adGroup);
            } else {
                revertChange(adGroup, obj.before);
            }
        } else {
            Logger.log('Could not revert adGroup: ' + obj.id);
        }
    }
    clean();
}

// Get all of the adGroups of the specified campaigns.
function getAdGroups() {
    var adGroups = {};
    var campaignIt = AdWordsApp.campaigns()
        .withCondition("Status = ENABLED ")
        .get();
    while (campaignIt.hasNext()) {
        var campaign = campaignIt.next();
        var name = campaign.getName();
        if (campaigns[name]) {
            var adGroupIt = campaign.adGroups()
                .get();

            while (adGroupIt.hasNext()) {
                var adGroup = adGroupIt.next();
                var id = adGroup.getId().toString();
                adGroups[id] = adGroup;
            }
        }
    }
    return adGroups;
}

// Fill the "toRevert" array with the to be reverted adGroups.
function fillRevert() {
    var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_REVERT_ADGROUPS_URL);
    var sheet = spreadsheet.getActiveSheet();
    var range = sheet.getRange(1, 1, sheet.getLastRow(), 1);
    var lines = range.getValues();
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i][0];
        var obj = parse(line);
        toRevert.push(obj);
    }
}

// Parse each message and return an object that contains the revert command.
function parse(str) {
    var newObj = {};
    var tokens = str.split(" ");
    var command = tokens[0];
    if (command == 'Pausing') {
        newObj.command = 'pause';
        newObj.id = tokens[2];
    } else {
        newObj.command = 'change';
        var last = str.lastIndexOf('from:');
        newObj.id = tokens[2];
        newObj.before = Number(str.charAt(last + 5));
    }
    return newObj;
}

function revertPause(adGroup) {
    Logger.log(adGroup.getCampaign() + ' ' + adGroup.getId() + ' ' + adGroup.getName() + ' UNPAUSED');
    adGroup.enable();
}

function revertChange(adGroup, value) {
    Logger.log(adGroup.getCampaign() + ' ' + adGroup.getId() + ' ' + adGroup.getName() + ' RESET - ' + value);
    adGroup.setKeywordMaxCpc(value);
}

// Removes all occupied cells from the sheet
function clean() {
    var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_REVERT_ADGROUPS_URL);
    var sheet = spreadsheet.getActiveSheet();
    sheet.clear();
}