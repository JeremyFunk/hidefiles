import { Configuration } from './config';
import {configs} from './configs/configs.json';
import * as vscode from 'vscode';
import * as fs from 'fs';

interface Config {
    name: string,
    description?: string,
    details: string
    content: Configuration
}

export const getConfigs = (): Config[] => {
    return configs.map(c => {
        return c
    })
}

export const createConfig = async (config: Config) => {
    const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath; // gets the path of the first workspace folder
    const filePath = vscode.Uri.file(wsPath + '/hide-files.json');
    
    if(fs.existsSync(filePath.fsPath)){
        let items: vscode.QuickPickItem[] = [{label: 'Yes', detail: 'Overwrite existing config'}, {label: 'No', detail: `Don't overwrite existing config`}]
        // const selection = await vscode.window.showQuickPick(items)

        const answer = await vscode.window.showWarningMessage("Do you want to overwrite the existing config?",...["Yes", "No"])
        
        if (answer === "No") {
            return
        }
    }

    await createFile(config, filePath)
}

const createFile = async (config: Config, filePath: vscode.Uri) => {
    const wsedit = new vscode.WorkspaceEdit();
    wsedit.createFile(filePath, { ignoreIfExists: false });
    await vscode.workspace.applyEdit(wsedit);

    const d = await vscode.workspace.openTextDocument(filePath)
    await vscode.window.showTextDocument(d)
    await vscode.window.activeTextEditor.edit(e => {
        e.replace(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)), JSON.stringify(config.content, null, 4))
    })

    vscode.window.showInformationMessage('Created hide-files.json');
}