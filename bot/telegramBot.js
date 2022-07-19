const members = require("../config/members.json")
const util = require("../util/helpers")

const config = require("../config/config.json")
const { Telegraf, session } = require('telegraf')


const sessionDefault = { username: undefined, waitingForUsername: false }
const NAMESPACE = "[TELEGRAM_BOT]"


const bot = new Telegraf(config.telegram.telegramBotToken)
bot.use(session())

// Logger middleware
bot.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${NAMESPACE} User: ${ctx.from.first_name}\tAction: ${ctx.message.text}\tResponse time: ${ms}ms`);
  });


// Start command
bot.start((ctx) => {
    ctx.session ??= sessionDefault
    ctx.reply(config.telegram.welcomeMessage.replace("$user", ctx.chat.first_name).replace("$command",`/${config.telegram.usernameCommand}`))
})

// ---- Username ----
bot.command(config.telegram.usernameCommand, (ctx) => {
    try {
        ctx.session.waitingForUsername = true;
    } catch (error) {
        ctx.reply(config.telegram.genericErrorMessage)
        return;
    }
    ctx.reply(config.telegram.usernameMessage)
})


// ---- Notification ----
// Notification On
bot.command(config.telegram.notificationOnCommand, async (ctx) => {
    try {
        if(ctx.session.username != undefined){
            members[ctx.session.username].telegramID = ctx.from.id;
            await util.saveFile("./config/members.json",members)
            console.log(`${NAMESPACE} Notification On`);
            ctx.reply(config.telegram.notificationOnMessage.replace("$command",`/${config.telegram.notificationOffCommand}`))
            return;
        }
        ctx.reply(config.telegram.initErrorMessage.replace("$command",`/${config.telegram.usernameCommand}`))
    } catch (error) {
        console.log(error);
        ctx.reply(config.telegram.genericErrorMessage)
        return;
    }
})
// Notification Off
bot.command(config.telegram.notificationOffCommand, async (ctx) => {
    try {
        if(ctx.session.username != undefined){
            members[ctx.session.username].telegramID = null;
            await util.saveFile("./config/members.json",members)
            console.log(`${NAMESPACE} Notification Off`);
            ctx.reply(config.telegram.notificationOffMessage.replace("$command",`/${config.telegram.notificationOnCommand}`))
            return;
        }
        ctx.reply(config.telegram.initErrorMessage.replace("$command",`/${config.telegram.usernameCommand}`))
    } catch (error) {
        ctx.reply(config.telegram.genericErrorMessage)
        return;
    }
})


// ---- Handler ----
bot.on('message', async (ctx) => {
    // Setting Username
    if (ctx.session.waitingForUsername) {
        ctx.session.waitingForUsername = false;
        // refactoring member array
        let refactorArrayMember = Object.keys(members).map((member) => member.toLowerCase())
        let indexOfMember = refactorArrayMember.indexOf(ctx.message.text.toLowerCase())
        
        // Check if username is in the Google Sheet
        if(indexOfMember >= 0){
            console.log(`${NAMESPACE} Username Found`);
            ctx.session.username = Object.keys(members)[indexOfMember]
            ctx.reply(config.telegram.usernameSuccessMessage.replace("$command",`/${config.telegram.notificationOnCommand}`))
            return ;
        }
        ctx.reply(config.telegram.usernameErrorMessage)
        return ;
    }
})

bot.launch()

console.log(`${NAMESPACE} Telegram bot running`);

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))