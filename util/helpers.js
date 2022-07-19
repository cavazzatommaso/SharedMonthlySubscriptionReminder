const fs = require('fs')
const fetch = require("node-fetch")


const saveFile = async (path,data) => {
    await fs.writeFileSync(path,JSON.stringify(data))
}

const checkDirExists = (path) => {
    return fs.existsSync(path);
}

const checkConfigFile = async (config) => {
    const NAMESPACE = "[CONFIG]"
    let {renewDate, phrases, googleSpreadsheetId} = config;

    // ----- RENEW DATE -----
    if(isNaN(renewDate) || typeof renewDate != 'number'){
        console.log(`${NAMESPACE} ERROR Renew Date is not a number`);
        return false;
    }

    if(renewDate <= 0 || renewDate > 31){
        console.log(`${NAMESPACE} ERROR Renew Date is not a valid Day`);
        return false;
    }

    console.log(`${NAMESPACE} Renew Date OK`);
    
    // ----- PHRASES -----
    if(phrases.length === 0){
        console.log(`${NAMESPACE} ERROR Phrases can't be 0`);
        return false;
    }

    if(!Object.keys(phrases).every(val => parseInt(val) <= 31)){
        console.log(`${NAMESPACE} ERROR Check Days of Phrases something is wrong`);
        return false;
    }

    console.log(`${NAMESPACE} Phrases OK`);


    // ----- SpreadSheet -----
    if(googleSpreadsheetId === null || googleSpreadsheetId === undefined){
        console.log(`${NAMESPACE} ERROR Google SpreadSheet is not correct`);
        return false;
    }

    console.log(`${NAMESPACE} SpreadSheet OK`);


    // ----- TELEGRAM -----
    if(config.telegram){
        if(!Object.keys(config.telegram).every(val => typeof config.telegram[val] === 'string')){
            console.log(`${NAMESPACE} ERROR Telegram config`);
            return false;
        }

        let response = await fetch(`https://api.telegram.org/bot${config.telegram.telegramBotToken}/getMe`);
        let json = await response.json()
        if(!json.ok){
            console.log(`${NAMESPACE} ERROR Telegram Bot Token not valid`);
            return false;
        }
        
        console.log(`${NAMESPACE} Telegram BOT OK`);

    }


    return true;
}


module.exports = {
    saveFile,
    checkDirExists,
    checkConfigFile
}