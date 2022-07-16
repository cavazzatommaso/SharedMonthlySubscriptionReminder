const fs = require('fs')


const saveFile = async (path,data) => {
    await fs.writeFileSync(path,JSON.stringify(data))
}


module.exports = {
    saveFile
}