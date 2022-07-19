#!/usr/bin/env node
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const { checkDirExists, checkConfigFile } = require("./util/helpers")

const CONFIG_PATH = "./config/"
const NAMESPACE = "[INIT]";



(async () => {
    if (argv.init) {
        console.log(NAMESPACE);
        if (!checkDirExists(`${CONFIG_PATH}config.json`)) {
            console.log("Error config file not exists");
            return;
        }
        console.log(`${NAMESPACE} Config file found`);
        if (! await checkConfigFile(require(`${CONFIG_PATH}config.json`))) {
            return;
        }
        console.log(`${NAMESPACE} Config Seems OK NOICE`);

        //TODO Check Google Sheet File
        //TODO Create members.json file
    } else {
        let scheduler = require("./core/checker")

    }
})()