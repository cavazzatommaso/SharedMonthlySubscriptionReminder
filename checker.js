const creds = require('./config/googleSheetService.json');
const members = require("./config/members.json")
const config = require("./config/config.json")

const { GoogleSpreadsheet } = require('google-spreadsheet');
const fetch = require("node-fetch")
const schedule = require('node-schedule');

const renewDate = config.renewDate
const NAMESPACE = "[CHECKER]"


// TODO Move to Helper
const connectToGoogleSpreadSheet = async () => {
    const doc = new GoogleSpreadsheet(config.googleSpreadsheetId);
    await doc.useServiceAccountAuth(creds);
    return doc;
}

// TODO Move to Helper
const calculateNextRenew = () => {
    let today = new Date()
    let beforeRenew = today.getDate() <= renewDate ? true : false;
    let nextRenewDate = new Date(today.getFullYear(), today.getMonth(), renewDate)
    if (!beforeRenew)
        nextRenewDate = new Date(nextRenewDate.setMonth(nextRenewDate.getMonth() + 1));
    return nextRenewDate
}

// TODO Move to Helper
const calculateDaysBefore = (nextRenewDate) => {
    let today = new Date()
    let differenceInMs = nextRenewDate - today;
    return Math.ceil(differenceInMs / (24 * 60 * 60 * 1000));
}

// TODO Move to Helper
const handleNotification = async (member, message) => {
    // Telegram as notification
    if (members[member].contactBy == 'Telegram' && members[member].telegramID) {
        let response = await fetch(`https://api.telegram.org/bot${config.telegram.telegramBotToken}/sendMessage?chat_id=${members[member].telegramID}&text=${encodeURIComponent(message)}&parse_mode=html`)
        console.log(`${NAMESPACE} Request url: ${response.url}`);
        console.log(`${NAMESPACE} Request status: ${response.status}`);
        console.log(await response.json());
        console.log(`${NAMESPACE} ------------------------------------\n`);

        return;
    }
    console.log(`${NAMESPACE} Error for member ${member} no notification handler set or notification for this member are not on`);
}

const checkForMembers = async (nextRenewDate, daysBefore) => {
    let doc = await connectToGoogleSpreadSheet()
    await doc.loadInfo()

    let sheet = doc.sheetsByIndex[0];

    const rows = await sheet.getRows();

    for (let row of rows) {
        let [sheetDay, sheetMonth, sheetYear] = row.Data.split("/")
        let sheetDate = new Date(sheetYear, sheetMonth, sheetDay)

        if (sheetDate.toDateString() === nextRenewDate.toDateString()) {
            for (let member of Object.keys(members)) {
                // Members didn't pay
                if ((row[member] == '' || row[member] == undefined) && config.phrases[daysBefore]) {
                    console.log(`${NAMESPACE} ${member}: handle message`);
                    await handleNotification(member, config.phrases[daysBefore])
                }

                //New Month send notification if had paid
                if (row[member] == 'X' && daysBefore == 0) {
                    console.log(`${NAMESPACE} ${member}: handle message`);
                    await handleNotification(member, config.phrases[daysBefore])
                }
            }
        }


    }
}

const startCheck = async () => {

    let nextRenewDate = calculateNextRenew()
    let daysBefore = calculateDaysBefore(nextRenewDate)
    console.log(`${NAMESPACE} Days before renew: ${daysBefore}`);

    if (daysBefore <= 7) {
        await checkForMembers(nextRenewDate, daysBefore)
    }

}


const job = schedule.scheduleJob('0 13 * * *', function () {
    console.log(`${NAMESPACE} Running scheduler ${new Date().toLocaleString()}`);
    startCheck()
});

console.log(`${NAMESPACE} Scheduler started`)
console.log(`${NAMESPACE} Next run ${job.nextInvocation().toLocaleString()}`);

// startCheck()





