const { SlashCommand, CommandOptionType } = require('slash-create')
const logSymbols = require('log-symbols')

const discordClient = require('../../clients/discordclient')
const moonrakerClient = require('../../clients/moonrakerclient')
const handlers = require('../../utils/handlerUtil')
const permission = require('../../utils/permissionUtil')
const variables = require('../../utils/variablesUtil')
const metadata = require('../commands-metadata/printjob.json')
const locale = require('../../utils/localeUtil')

const messageLocale = locale.commands.printjob
const syntaxLocale = locale.syntaxlocale.commands.printjob

let commandFeedback
let connection

let timeout = 0

module.exports = class PrintJobCommand extends SlashCommand {
    constructor(creator) {
        console.log('  Load Print Job Command'.commandload)
        super(creator, {
            name: syntaxLocale.command,
            description: messageLocale.description,
            options: [{
                type: CommandOptionType.SUB_COMMAND,
                name: syntaxLocale.options.pause.name,
                description: messageLocale.options.pause.description
            },{
                type: CommandOptionType.SUB_COMMAND,
                name: syntaxLocale.options.cancel.name,
                description: messageLocale.options.cancel.description
            },{
                type: CommandOptionType.SUB_COMMAND,
                name: syntaxLocale.options.resume.name,
                description: messageLocale.options.resume.description
            },{
                type: CommandOptionType.SUB_COMMAND,
                name: syntaxLocale.options.start.name,
                description: messageLocale.options.start.description,
                options: [{
                    type: CommandOptionType.STRING,
                    name: syntaxLocale.options.start.options.file.name,
                    description: messageLocale.options.start.options.file.description,
                    required: true
                }]
            }]
        })
        this.filePath = __filename
    }

    async run(ctx) {
        if (!await permission.hasAdmin(ctx.user, ctx.guildID, discordClient.getClient())) {
            return locale.getAdminOnlyError(ctx.user.username)
        }
        const subcommand = ctx.subcommands[0]
        const currentStatus = variables.getStatus()
        const id = Math.floor(Math.random() * parseInt('10_000')) + 1

        connection = moonrakerClient.getConnection()

        if (typeof (commandFeedback) !== 'undefined') {
            return locale.getCommandNotReadyError(ctx.user.username)
        }

        console.log(subcommand)
        console.log(syntaxLocale.answer)

        const key = getKeyByValue(syntaxLocale.answer, subcommand)

        console.log(key)
        if (Object.keys(metadata).includes(subcommand)) {
            const subcommandmeta = metadata[subcommand]
            const lang_command_meta = messageLocale.answer[subcommand]
            if (subcommand === currentStatus) {
                return lang_command_meta.statusSame.replace(/(\${username})/g, ctx.user.username)
            }

            if (!subcommandmeta.requiredStatus.includes(currentStatus)) {
                return lang_command_meta.statusNotValid.replace(/(\${username})/g, ctx.user.username)
            }
            connection.send(`{"jsonrpc": "2.0", "method": "printer.gcode.script", "params": {"script": "${subcommandmeta.macro}"}, "id": ${id}}`)
            return lang_command_meta.statusValid.replace(/(\${username})/g, ctx.user.username)
        }
        
        if (subcommand === 'start') {
            ctx.defer(false)

            startPrintJob(ctx)
        }
    }
    onUnload() {
        return 'okay'
    }
    onError(error, ctx) {
        console.log(logSymbols.error, `Printjob Command: ${error}`.error)
        ctx.send(locale.errors.command_failed)
        connection.removeListener('message', handler)
        commandFeedback = undefined
    }
}

async function addEmotes(commandContext, commandMessage) {
    const channel = await discordClient.getClient().channels.fetch(commandContext.channelID)
    const message = await channel.messages.fetch(commandMessage.id)
    message.react('✅')
    message.react('❌')
}

async function postStart(message, commandContext) {
    const commandmessage = await commandContext.send(message)
    
    commandFeedback = undefined

    if (typeof (message.embeds) === 'undefined') { return }

    addEmotes(commandContext, commandmessage)
}

function startPrintJob(commandContext) {
    const id = Math.floor(Math.random() * parseInt('10_000')) + 1
    const gcodefile = commandContext.options.start[syntaxLocale.options.start.options.file.name]
    connection.on('message', handler)
    connection.send(`{"jsonrpc": "2.0", "method": "server.files.metadata", "params": {"filename": "${gcodefile}"}, "id": ${id}}`)

    const feedbackHandler = setInterval(() => {
        if (timeout === 4) {
            clearInterval(feedbackHandler)
            postStart({
                content: locale.errors.command_timeout
            }, commandContext)
            return
        }

        timeout++

        if (typeof (commandFeedback) === 'undefined') { return }

        if (commandFeedback === 'Not Found!') {
            clearInterval(feedbackHandler)
            postStart({
                content: locale.errors.file_not_found
            }, commandContext)
            return
        }
        if (commandFeedback.files.length === 0) {
            clearInterval(feedbackHandler)
            postStart({
                embeds: [commandFeedback.toJSON()]
            }, commandContext)
            return
        }
        const thumbnail = commandFeedback.files[0]
        const files = {
            name: thumbnail.name,
            file: thumbnail.attachment
        }
        clearInterval(feedbackHandler)
        postStart({
            file: files,
            embeds: [commandFeedback.toJSON()]
        }, commandContext)
    }, 500)
}

async function handler (message) {
    commandFeedback = await handlers.printFileHandler(message, messageLocale.embed.title, '#0099ff')
    connection.removeListener('message', handler)
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  }