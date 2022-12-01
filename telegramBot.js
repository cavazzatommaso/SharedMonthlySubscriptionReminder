const { saveFile,
    getMembersName,
    isNotificationOn,
    getMembers,
    getMainInlineKeyboard,
    getAddMonthsInlineKeyboard,
    addPaymentsToMember,
    getAdminPanelInlineKeyboard } = require("./util/helpers")


const config = require("./config/config.json")
const { Telegraf, session, Markup } = require('telegraf')


const sessionDefault = { username: null, alredyChecked: false }
const NAMESPACE = "[TELEGRAM_BOT]"


const bot = new Telegraf(config.telegram.telegramBotToken)
bot.use(session());

// Custom middleware
bot.use(async (ctx, next) => {
    const start = new Date();
    ctx.session ??= Object.assign({}, sessionDefault);
    if (ctx.session.username == null && !ctx.session.alredyChecked) {
        let members = await getMembers();
        for (let member of Object.keys(members)) {
            if (members[member].telegramID == ctx.from.id){
                ctx.session.username = member
            }
        }
    }
    ctx.session.alredyChecked = true;
    await next();
    const ms = new Date() - start;
    console.log(`${NAMESPACE} User: ${ctx.from.first_name}\tAction: ${ctx.message ? ctx.message.text : ctx.callbackQuery.data}\tResponse time: ${ms}ms`);
});


// Start command
bot.start(async (ctx) => {
    if (ctx.session.username !== null && ctx.session.alredyChecked) {
        return ctx.reply(`Ehi bentornato. Per ${isNotificationOn(ctx.session.username) ? "disabilitare" : "abilitare"} le notifiche premi il pulsante qui sotto`, getMainInlineKeyboard(ctx))
    }
    ctx.reply(config.telegram.welcomeMessage.replace("$user", ctx.chat.first_name), Markup.inlineKeyboard([Markup.button.callback("Set Username", "set-username")]))
})

// ---- Username ----
bot.action(config.telegram.usernameAction, (ctx) => {
    let availableMembers = getMembersName();
    let keyboard = availableMembers.map((member) => Markup.button.callback(member, `username-${member}`));
    return ctx.editMessageText(config.telegram.usernameSelectMessage, Markup.inlineKeyboard(keyboard))
})

bot.action(/(?<=username-).*$/, async ctx => {
    let chosenUsername = ctx.match[0]
    let members = getMembers();
    let thisIdAlredyChoosen = members[chosenUsername].telegramID !== null;
    if (thisIdAlredyChoosen) {
        return ctx.editMessageText(config.telegram.usernameSelectErrorMessage);
    }
    ctx.session.username = chosenUsername;
    members[ctx.session.username].telegramID = ctx.from.id;
    await saveFile("./config/members.json", members)
    ctx.answerCbQuery(config.telegram.usernameSelectCallback.replace("$user", chosenUsername));
    return ctx.editMessageText(`Per ${isNotificationOn(ctx.session.username) ? "disabilitare" : "abilitare"} le notifiche premi il pulsante qui sotto`, getMainInlineKeyboard(ctx))

});

// Reset username
bot.action(config.telegram.resetAction, async (ctx) => {
    let members = getMembers();
    members[ctx.session.username].telegramID = null;
    members[ctx.session.username].notify = false;
    ctx.session.alredyChecked = false;
    ctx.session.username = null;
    await saveFile("./config/members.json", members)
    ctx.answerCbQuery(config.telegram.resetUsernameCallback);
    return ctx.reply(config.telegram.welcomeMessage.replace("$user", ctx.chat.first_name), Markup.inlineKeyboard([Markup.button.callback("Set Username", "set-username")]))
})

// ---- Notification ----
// Notification On
bot.action(config.telegram.notificationOnAction, async ctx => {
    let members = getMembers();
    members[ctx.session.username].notify = true;
    await saveFile("./config/members.json", members)
    ctx.answerCbQuery(config.telegram.notificationOnCallback);
    return ctx.editMessageText(config.telegram.notificationOnMessage, getMainInlineKeyboard(ctx))

});

// Notification Off
bot.action(config.telegram.notificationOffAction, async ctx => {
    let members = getMembers();
    members[ctx.session.username].notify = false;
    await saveFile("./config/members.json", members)
    ctx.answerCbQuery(config.telegram.notificationOffCallback);
    return ctx.editMessageText(config.telegram.notificationOffMessage, getMainInlineKeyboard(ctx))

});

// ----- Admin panels -----
bot.command(config.telegram.adminPanelCommand, async (ctx) => {
    if (ctx.from.id !== config.telegram.adminId)
        return;
    return ctx.reply(config.telegram.adminPanelMessage, getAdminPanelInlineKeyboard())
})

// ----- Handle payments -----
// TODO add removePayments
bot.action(config.telegram.addPaymentAction, async (ctx) => {
    let availableMembers = getMembersName();
    let keyboard = availableMembers.map((member) => Markup.button.callback(member, `payments-user-${member}`));
    return ctx.reply(config.telegram.addPaymentUserChoiceMessage, Markup.inlineKeyboard(keyboard))
})

bot.action(/(?<=payments-user-).*$/, async ctx => {
    let chosenUsername = ctx.match[0]
    return ctx.editMessageText(config.telegram.addPaymentMonthChoiceMessage, getAddMonthsInlineKeyboard(ctx, "add", chosenUsername))
});

bot.action(/(?<=add-)(\d{1})-(.*$)/, async ctx => {
    let month = parseInt(ctx.match[1])
    let username = ctx.match[2]
    await addPaymentsToMember(username, month);
    await ctx.answerCbQuery(config.telegram.addPaymentCallback.replace("$user", username).replace("$month", month));
    await ctx.deleteMessage();
});

// ----- Handle status -----
bot.action(config.telegram.statusAction, async (ctx) => {
    let members = getMembers();

    let response = Object.keys(members).reduce((message, user) => {
        if (members[user].contactBy == "Telegram" && members[user].notify)
            message += `<b>${user}</b>: ${members[user].telegramID}\n`
        return message;
    }, "User with notification on: \n\| Username \t\| Account Id \t\|\n")

    ctx.reply(response, { parse_mode: "HTML" })

})

// ----- Handle gifts -----
bot.action(config.telegram.giftsAction, async (ctx) => {
    let availableMembers = getMembersName();
    let keyboard = availableMembers.map((member) => Markup.button.callback(member, `gifts-user-${member}`));
    keyboard.push(Markup.button.callback("All", `gifts-user-all`));
    return ctx.reply(config.telegram.giftsUserChoiceMessage, Markup.inlineKeyboard(keyboard, { columns: 2 }))
})

bot.action(/(?<=gifts-user-).*$/, async ctx => {
    let chosenUsername = ctx.match[0]
    return ctx.editMessageText(config.telegram.giftsMonthChoiceMessage, getAddMonthsInlineKeyboard(ctx, "gifts", chosenUsername))
});

bot.action(/(?<=gifts-)(\d{1})-(.*$)/, async ctx => {
    let month = parseInt(ctx.match[1])
    let username = ctx.match[2]
    let membersToSend = getMembers()[username] ? [getMembers()[username]] : Object.values(getMembers());

    for (member of membersToSend) {
        if (member.contactBy === "Telegram" && member.telegramID != null) {

            await ctx.telegram.sendPhoto(member.telegramID,
                "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80",
                {
                    "reply_markup": {
                        "inline_keyboard": [[
                            { "text": "🎁", "callback_data": `redeem-${month}`}
                        ]]
                    },
                    caption: config.telegram.redeemGiftMessage,
                    parse_mode: "MarkdownV2"
                })


        }
    }
    await ctx.deleteMessage();
});

bot.action(/(?<=redeem-).*$/, async ctx => {
    let month = ctx.match[0]
    await addPaymentsToMember(ctx.session.username, month);
    await ctx.answerCbQuery(config.telegram.redeemGiftCallback);
    await ctx.deleteMessage();
});


bot.launch()

console.log(`${NAMESPACE} Telegram bot running`);


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))