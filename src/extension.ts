/* eslint-disable @typescript-eslint/semi */
import * as vscode from 'vscode';
import { getData } from './config';
import { hideFiles } from './core';


export function activate(context: vscode.ExtensionContext) {
	//vscode.workspace.getConfiguration("files").update('exclude', )

	let disposableReload = vscode.commands.registerCommand('hidefiles.reloadConfig', () => {
		const config = getData()

		if(!config){
			return
		}

		vscode.window.showInformationMessage('Hello World from HideFiles!');

		let items: vscode.QuickPickItem[] = [];

		for (let index = 0; index < config.profiles.length; index++) {
			let item = config.profiles[index];
			items.push({ 
				label: item.name, 
				description: item.description,
				detail: item.detail,
			});
		}
		
		vscode.window.showQuickPick(items).then(selection => {
			// the user canceled the selection
			if (!selection) {
				return;
			}
			
			const selected = config.profiles.find(s => s.name === selection.label)

			if(!selected){
				return
			}

			hideFiles(selected)
		});
	});


	context.subscriptions.push(disposableReload);
}

export function deactivate() {}
