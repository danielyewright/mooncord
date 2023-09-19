import {ActivityType, Client, GatewayIntentBits, Partials} from 'discord.js'

import {getDatabase} from '../Application'
import {ConfigHelper} from '../helper/ConfigHelper'
import {logEmpty, logRegular, logSuccess} from '../helper/LoggerHelper'
import {dump, findValue, getEntry, setData} from '../utils/CacheUtil'
import {DiscordCommandGenerator} from "../generator/DiscordCommandGenerator";
import {DiscordInputGenerator} from '../generator/DiscordInputGenerator'
import {InteractionHandler} from "../events/discord/InteractionHandler";
import {DebugHandler} from "../events/discord/DebugHandler";
import {DiscordStatusGenerator} from "../generator/DiscordStatusGenerator";
import {LocaleHelper} from "../helper/LocaleHelper";
import {StatusHelper} from "../helper/StatusHelper";
import {MetadataHelper} from "../helper/MetadataHelper";
import {GCodeUploadHandler} from "../events/discord/GCodeUploadHandler";
import {VerifyHandler} from "../events/discord/VerifyHandler";
// @ts-ignore
import {REST} from 'discord.js';
import {ReconnectHandler} from "../events/discord/ReconnectHandler";

let interactionHandler: InteractionHandler
let reconnectHandler: ReconnectHandler
let debugHandler: DebugHandler
let gcodeUploadHandler: GCodeUploadHandler
let verifyHandler: VerifyHandler

export class DiscordClient {
    protected config = new ConfigHelper()
    protected database = getDatabase()
    protected commandGenerator = new DiscordCommandGenerator()
    protected inputGenerator = new DiscordInputGenerator()
    protected statusGenerator = new DiscordStatusGenerator()
    protected localeHelper = new LocaleHelper()
    protected statusHelper = new StatusHelper()
    protected metadataHelper = new MetadataHelper()
    protected discordClient: Client
    protected restClient: REST

    public async connect() {
        logEmpty()
        logSuccess('Load Discord Client...')

        this.close()

        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildIntegrations
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.GuildMember,
                Partials.User
            ],
            // restRequestTimeout: this.config.getDiscordRequestTimeout() * 1000
        })

        logRegular('Connect to Discord...')

        this.restClient = new REST().setToken(this.config.getDiscordToken())

        await this.discordClient.login(this.config.getDiscordToken())

        await this.registerCommands()

        await this.registerEvents()

        this.generateCaches()

        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${this.discordClient.user.id}&permissions=3422944320&scope=bot%20applications.commands`

        this.database.updateDatabaseEntry('invite_url', inviteUrl)

        setData('invite_url', inviteUrl)
        setData('discord_client', {
            'readySince': Date.now() / 1000,
            'applicationId': this.discordClient.application.id,
            'clientId': this.discordClient.user.id,
            'ping': this.discordClient.ws.ping,
            'event_count': this.discordClient['_eventsCount']
        })

        logSuccess('Discordbot Connected')
        logSuccess(`${'Name:'.green} ${(this.discordClient.user.tag).white}`)
        logSuccess('Invite:'.green)
        console.log(getEntry('invite_url').cyan)

        this.discordClient.user.setPresence({status: "idle"})

        this.discordClient.user.setActivity({
            name: this.localeHelper.getLocale().embeds.startup.activity,
            type: ActivityType.Listening
        })

        if (this.config.dumpCacheOnStart()) {
            await dump()
            await this.database.dump()
        }

        logSuccess('Discord Client is ready')
        logEmpty()
        logSuccess('MoonCord is ready')

        const currentPrintfile = findValue('state.print_stats.filename')

        await this.metadataHelper.updateMetaData(currentPrintfile)
    }

    public getRest() {
        return this.restClient
    }

    public unregisterEvents() {
        logRegular('Unregister Events...')
        this.discordClient.removeAllListeners()
    }

    public async registerCommands() {
        logRegular('Register Commands...')
        await this.commandGenerator.registerCommands()
    }

    public async registerEvents() {
        logRegular('Register Events...')
        interactionHandler = new InteractionHandler(this.discordClient)
        debugHandler = new DebugHandler(this.discordClient)
        gcodeUploadHandler = new GCodeUploadHandler(this.discordClient)
        verifyHandler = new VerifyHandler(this.discordClient)
        reconnectHandler = new ReconnectHandler(this.discordClient)
    }

    public generateCaches() {
        logRegular('Generate Caches...')
        this.inputGenerator.generateInputCache()
        this.statusGenerator.generateStatusCache()
    }

    public isConnected() {
        return this.discordClient.isReady()
    }

    public getClient() {
        return this.discordClient
    }

    public close() {
        if (typeof this.discordClient === 'undefined') {
            return
        }
        this.discordClient.removeAllListeners()
        this.discordClient.destroy()
    }
}