import {CommandInteraction, User} from "discord.js";
import {getMoonrakerClient} from "../../../../Application";
import {LocaleHelper} from "../../../../helper/LocaleHelper";

export class RestartCommand {
    protected localeHelper = new LocaleHelper()
    protected locale = this.localeHelper.getLocale()
    protected syntaxLocale = this.localeHelper.getSyntaxLocale()
    protected moonrakerClient = getMoonrakerClient()
    protected user: User

    public constructor(interaction: CommandInteraction, commandId: string) {
        if (commandId !== 'restart') {
            return
        }

        this.execute(interaction)
    }

    protected async execute(interaction: CommandInteraction) {
        const service = interaction.options.getString(this.syntaxLocale.commands.restart.options.service.name)

        await interaction.deferReply()

        this.user = interaction.user

        let result

        if (service === 'FirmwareRestart') {
            result = await this.restartFirmware()
        } else {
            result = await this.restartService(service)
        }

        await interaction.editReply(result)
    }

    protected async restartService(service: string) {
        const result = await this.moonrakerClient.send({"method": "machine.services.restart", "params": {service}})

        if (typeof result.error !== 'undefined') {
            return this.locale.messages.errors.restart_failed
                .replace(/(\${service})/g, service)
                .replace(/(\${reason})/g, result.error.message)
                .replace(/(\${username})/g, this.user.tag)
        }
        return this.locale.messages.answers.restart_successful
            .replace(/(\${service})/g, service)
            .replace(/(\${username})/g, this.user.tag)
    }

    protected async restartFirmware() {
        void await this.moonrakerClient.send({"method": "printer.firmware_restart"})

        return this.locale.messages.answers.firmware_restart_successful
            .replace(/(\${username})/g, this.user.tag)
    }
}