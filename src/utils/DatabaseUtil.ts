import {ConfigHelper} from '../helper/ConfigHelper'
import {logEmpty, logError, logRegular, logSuccess, logWarn} from '../helper/LoggerHelper'
import {getMoonrakerClient} from "../Application";
import path from "path";
import {writeFile} from "fs/promises";

const defaultDatabase = {
    'guilds': {},
    'notify': [],
    'invite_url': ''
}

let database: any

export class DatabaseUtil {
    protected config = new ConfigHelper()
    protected moonrakerClient = getMoonrakerClient()
    protected nameSpace = (this.config.useDevDatabase() ? 'mooncord_dev' : 'mooncord')

    public async retrieveDatabase() {
        logEmpty()
        logSuccess('Retrieve Database...')

        const databaseRequest = await this.moonrakerClient.send({
            "method": "server.database.get_item",
            "params": {"namespace": this.nameSpace, "key": "dataset"}
        })

        if (typeof databaseRequest.error !== 'undefined') {
            await this.handleDatabaseMissing()
            return
        }

        database = databaseRequest.result.value
    }

    public async resetDatabase() {
        void await this.moonrakerClient.send({
            "method": "server.database.delete_item",
            "params": {"namespace": this.nameSpace, "key": "dataset"}
        })

        logWarn('Database wiped')

        void await this.handleDatabaseMissing()
    }

    public async updateDatabase() {
        const updateRequest = await this.moonrakerClient.send({
            "method": "server.database.post_item",
            "params": {"namespace": this.nameSpace, "key": "dataset", "value": database}
        })

        if (typeof updateRequest.error !== 'undefined') {
            logError(`Database Update failed: ${updateRequest.error.message}`)
            return
        }

        logSuccess('Database updated')
    }

    public getDatabaseEntry(key: string) {
        return database[key]
    }

    public updateDatabaseEntry(key: string, value: any) {
        database[key] = value
        this.updateDatabase()
    }

    public isReady() {
        return typeof database !== 'undefined'
    }

    public async dump() {
        void await this.writeDump()
        return database
    }

    protected async writeDump() {
        await writeFile(path.resolve(__dirname, '../database_dump.json'), JSON.stringify(database, null, 4), {
            encoding: 'utf8',
            flag: 'w+'
        })
        logSuccess('Dumped Database!')
    }

    private async handleDatabaseMissing() {
        logRegular('generate Database Structure...')

        database = defaultDatabase

        await this.updateDatabase()
    }
}