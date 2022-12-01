const fs = require('fs')
const { Markup } = require('telegraf')
const { connectToGoogleSpreadSheet } = require("./excel")


const saveFile = async (path, data) => {
    await fs.writeFileSync(path, JSON.stringify(data))
}

const getMembers = () => {
    return require("../config/members.json");
}

const getMembersName = () => {
    let members = require("../config/members.json");
    return Object.keys(members);
}

const isNotificationOn = (member) => {
    let members = require("../config/members.json");
    return members[member].notify
}

const getMainInlineKeyboard = (ctx) => {
    let notification = isNotificationOn(ctx.session.username);
    let keyboard = [Markup.button.callback("🔔", `notify-on`, notification), Markup.button.callback("🔕", `notify-off`, !notification)]
    keyboard.push(Markup.button.callback("Reset username", "reset"));
    return Markup.inlineKeyboard(keyboard);
}

const getAdminPanelInlineKeyboard = () => {
    // TODO edit with custom action from config
    let keyboard = [Markup.button.callback("Status", `admin-status`), Markup.button.callback("Add Payments", `admin-payments`), Markup.button.callback("Send Gifts", `admin-gifts`)]
    return Markup.inlineKeyboard(keyboard,{columns:2});
}

const getAddMonthsInlineKeyboard = (ctx,action, username) => {
    let availableMonth = [1, 2, 3]
    let keyboard = availableMonth.map((month) => Markup.button.callback(`Add ${month} month`, `${action}-${month}-${username}`))
    return Markup.inlineKeyboard(keyboard);
}


const addPaymentsToMember = async (username, month) => {
    // TODO

    let doc = await connectToGoogleSpreadSheet()
    await doc.loadInfo()

    let sheet = doc.sheetsByIndex[0];

    const rows = await sheet.getRows();
    let rowChanged = 0

    for (let row of rows) {
        if (rowChanged < month && (row[username] == "" || row[username] == undefined)) {
            rowChanged++;
            row[username] = "X"
            await row.save();
        }
    }
}


module.exports = {
    saveFile,
    getMembersName,
    getMembers,
    isNotificationOn,
    getMainInlineKeyboard,
    getAdminPanelInlineKeyboard,
    getAddMonthsInlineKeyboard,
    addPaymentsToMember
}