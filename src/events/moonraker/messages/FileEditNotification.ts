import {FileListHelper} from "../../../helper/FileListHelper";
import {getMoonrakerClient} from "../../../Application";
import {logNotice} from "../../../helper/LoggerHelper";

export class FileEditNotification {
    protected moonrakerClient = getMoonrakerClient()
    protected fileListHelper = new FileListHelper(this.moonrakerClient)

    public parse(message) {
        if (typeof (message.method) === 'undefined') {
            return
        }
        if (typeof (message.params) === 'undefined') {
            return
        }

        if (message.method !== 'notify_filelist_changed') {
            return
        }

        const fileData = message.params[0]

        logNotice(`File ${fileData.item.path} changed: ${fileData.action}`)

        if (typeof fileData.source_item !== 'undefined') {
            logNotice(`Source File: ${fileData.source_item.path}`)
        }

        this.fileListHelper.retrieveFiles('config', 'config_files')
        this.fileListHelper.retrieveFiles('gcodes', 'gcode_files')
        this.fileListHelper.retrieveFiles('timelapse', 'timelapse_files', /(.*\.mp4)/g)
    }
}