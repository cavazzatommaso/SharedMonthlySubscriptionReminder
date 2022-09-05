const creds = require('../config/googleSheetService.json');
const config = require("../config/config.json")

const { GoogleSpreadsheet } = require('google-spreadsheet');

const connectToGoogleSpreadSheet = async () => {
    const doc = new GoogleSpreadsheet(config.googleSpreadsheetId);
    await doc.useServiceAccountAuth(creds);
    return doc;
}

module.exports = {
    connectToGoogleSpreadSheet
}