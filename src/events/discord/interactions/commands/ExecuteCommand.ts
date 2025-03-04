import {CommandInteraction} from "discord.js";
import {getDatabase} from "../../../../Application";
import {LocaleHelper} from "../../../../helper/LocaleHelper";
import {EmbedHelper} from "../../../../helper/EmbedHelper";
import {ConfigHelper} from "../../../../helper/ConfigHelper";
import {ServiceHelper} from "../../../../helper/ServiceHelper";
import {ModalHelper} from "../../../../helper/ModalHelper";
import {ConsoleHelper} from "../../../../helper/ConsoleHelper";

export class ExecuteCommand {
    protected databaseUtil = getDatabase()
    protected configHelper = new ConfigHelper()
    protected localeHelper = new LocaleHelper()
    protected locale = this.localeHelper.getLocale()
    protected syntaxLocale = this.localeHelper.getSyntaxLocale()
    protected embedHelper = new EmbedHelper()
    protected modalHelper = new ModalHelper()
    protected serviceHelper = new ServiceHelper()
    protected consoleHelper = new ConsoleHelper()

    public constructor(interaction: CommandInteraction, commandId: string) {
        if (commandId !== 'execute') {
            return
        }

        this.execute(interaction)
    }

    protected async execute(interaction: CommandInteraction) {
        const gcodeArgument = interaction.options.getString(this.syntaxLocale.commands.execute.options.gcode.name)

        if (gcodeArgument === null) {
            const modal = await this.modalHelper.generateModal('execute_modal')
            await interaction.showModal(modal)
            return
        }

        const gcodeValid = await this.consoleHelper.executeGcodeCommands([gcodeArgument], interaction.channel)

        let answer = this.locale.messages.answers.execute_successful
            .replace(/\${username}/g, interaction.user.tag)

        if (gcodeValid === 0) {
            answer = this.locale.messages.errors.execute_failed
                .replace(/\${username}/g, interaction.user.tag)
        }

        if (gcodeValid === -1) {
            answer = this.locale.messages.errors.execute_running
                .replace(/\${username}/g, interaction.user.tag)
        }

        await interaction.reply(answer)
    }
}