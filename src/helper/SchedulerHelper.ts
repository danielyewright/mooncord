import {MoonrakerClient} from "../clients/MoonrakerClient";
import {ConfigHelper} from "./ConfigHelper";
import {findValue, getEntry, setData, updateData} from "../utils/CacheUtil";
import {StatusHelper} from "./StatusHelper";
import {UsageHelper} from "./UsageHelper";
import {clearInterval} from "timers";
import {TempHelper} from "./TempHelper";

export class SchedulerHelper {
    protected configHelper = new ConfigHelper()
    protected functionCache = getEntry('function')
    protected statusHelper = new StatusHelper()
    protected moonrakerClient: MoonrakerClient
    protected highScheduler: NodeJS.Timer
    protected moderateScheduler: NodeJS.Timer
    protected statusScheduler: NodeJS.Timer
    protected loadScheduler: NodeJS.Timer
    protected usageHelper = new UsageHelper()
    protected tempHelper = new TempHelper()

    public init(moonrakerClient: MoonrakerClient) {
        this.moonrakerClient = moonrakerClient

        this.scheduleModerate()
        this.scheduleHigh()
        this.scheduleLoad()
        this.scheduleStatus()

        this.usageHelper.updateDiskUsage()
    }

    public clear() {
        clearInterval(this.highScheduler)
        clearInterval(this.moderateScheduler)
        clearInterval(this.statusScheduler)
        clearInterval(this.loadScheduler)
    }

    protected scheduleHigh() {
        this.highScheduler = setInterval(() => {
            this.functionCache = getEntry('function')

            if (typeof this.moonrakerClient.getWebsocket() === 'undefined') {
                return
            }

            updateData('moonraker_client', {
                'event_count': this.moonrakerClient.getWebsocket().underlyingWebsocket['_eventsCount']
            })

            if (this.functionCache.poll_printer_info) {
                void this.pollServerInfo()
            }
        }, 250)
    }

    protected scheduleLoad() {
        this.loadScheduler = setInterval(() => {
            this.usageHelper.updateMemoryUsage()
            this.usageHelper.updateKlipperLoad()
            this.usageHelper.updateSystemLoad()

            void this.tempHelper.notifyHeaterTargetNotifications()

            this.updateThrottleCooldown()
        }, 1000)
    }

    protected scheduleModerate() {
        this.moderateScheduler = setInterval(async () => {
            const machineInfo = await this.moonrakerClient.send({"method": "machine.system_info"})

            setData('machine_info', machineInfo.result)

            await this.usageHelper.updateDiskUsage()
        }, 60000)
    }

    protected scheduleStatus() {
        this.statusScheduler = setInterval(async () => {
            if (this.configHelper.isStatusPerPercent()) {
                this.updateStatusCooldown()
            } else {
                this.postPrintProgress()
            }
        }, this.getStatusInterval())
    }

    protected updateThrottleCooldown() {
        const currentThrottleState = getEntry('throttle')

        if (currentThrottleState.cooldown === 0) {
            currentThrottleState.throttle_states = []
        } else {
            currentThrottleState.cooldown--
        }

        setData('throttle', currentThrottleState)
    }

    protected postPrintProgress() {
        if (this.functionCache.current_status !== 'printing') {
            return
        }

        this.statusHelper.update('printing')
    }

    protected updateStatusCooldown() {
        const statusCooldown = this.functionCache.status_cooldown
        if (statusCooldown === 0) {
            return
        }

        this.functionCache.status_cooldown--

        updateData('function', this.functionCache)
    }

    protected getStatusInterval() {
        if (this.configHelper.isStatusPerPercent()) {
            return this.configHelper.getStatusMinInterval() * 1000
        } else {
            return this.configHelper.getStatusInterval() * 1000 * 60
        }
    }

    protected async pollServerInfo() {
        if (this.functionCache.server_info_in_query) {
            return
        }

        updateData('function', {
            'server_info_in_query': true
        })

        const currentStatus = findValue('function.current_status')
        const serverInfo = await this.moonrakerClient.send({"method": "server.info"})

        if (typeof serverInfo.result === 'undefined') {
            return
        }
        if (typeof serverInfo.result.klippy_state === 'undefined') {
            return
        }

        if (currentStatus !== serverInfo.result.klippy_state) {
            await this.requestPrintInfo()
        }

        updateData('server_info', serverInfo.result)

        updateData('function', {
            'server_info_in_query': false
        })

        if (serverInfo.result.klippy_state === 'ready') {
            return
        }

        await this.statusHelper.update()
    }

    protected async requestPrintInfo() {
        const printerInfo = await this.moonrakerClient.send({"method": "printer.info"})

        updateData('printer_info', printerInfo.result)
    }
}