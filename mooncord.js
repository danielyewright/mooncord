'use strict'
const systemInfo = require('systeminformation')
const consoleColor = require("node-console-colors");

const discordClient = require('./clients/discordclient')
const moonrakerClient = require('./clients/moonrakerclient')

const hsUtil = require('./utils/hsUtil')

const pjson = require('./package.json')

systemInfo.osInfo().then(async data => {
  console.log(`\n
   __  __                     ${consoleColor.set('fg_dark_cyan','____              _')}
  |  \\/  | ___   ___  _ __   ${consoleColor.set('fg_dark_cyan','/ ___|___  _ __ __| |')}
  | |\\/| |/ _ \\ / _ \\| '_ \\ ${consoleColor.set('fg_dark_cyan','| |   / _ \\| \'__/ _\` |')}
  | |  | | (_) | (_) | | | |${consoleColor.set('fg_dark_cyan','| |__| (_) | | | (_| |')}
  |_|  |_|\\___/ \\___/|_| |_| ${consoleColor.set('fg_dark_cyan','\\____\\___/|_|  \\__,_|')}
                                                    
  Version: ${consoleColor.set('fg_dark_cyan', pjson.version)}
  Author: ${consoleColor.set('fg_dark_cyan', pjson.author)}
  Homepage: ${consoleColor.set('fg_dark_cyan', pjson.homepage)}
  OS: ${consoleColor.set('fg_dark_cyan', data.platform)}
  Distro: ${consoleColor.set('fg_dark_cyan', data.distro)}
  Kernel: ${consoleColor.set('fg_dark_cyan', data.kernel)}
  Arch: ${consoleColor.set('fg_dark_cyan', data.arch)}`)
  const ram = await systemInfo.mem()

  if (ram.free <= 419430400000000) {
    console.log(
      `${consoleColor.set('fg_red', '' +
      '  _  _____ _____ _____ _   _ _____ ___ ___  _   _ \n' +
      '    / \\|_   _|_   _| ____| \\ | |_   _|_ _/ _ \\| \\ | |\n' +
      '   / _ \\ | |   | | |  _| |  \\| | | |  | | | | |  \\| |\n' +
      '  / ___ \\| |   | | | |___| |\\  | | |  | | |_| | |\\  |\n' +
      ' /_/   \\_\\_|   |_| |_____|_| \\_| |_| |___\\___/|_| \\_|\n' +
      '                                                  \n' +
      'There might be to few free memory! Mooncord need atleast 40MB RAM\n' +
      'Current free Ram: ')}${(ram.used / (1024 ** 2)).toFixed(2)}MB`)
    process.exit(5)
  }

  await discordClient.init()

  await moonrakerClient.init()
  
  await hsUtil.init()
})
module.exports.getDiscordClient = function () {
  return discordClient.getClient()
}
