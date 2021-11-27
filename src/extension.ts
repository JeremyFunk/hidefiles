/* eslint-disable @typescript-eslint/semi */
import * as vscode from 'vscode';
import { getData } from './config';
import { hideFiles } from './core';


export function activate(context: vscode.ExtensionContext) {
	let disposableReload = vscode.commands.registerCommand('hidefiles.reloadConfig', () => {
		let config
		config = getData()

		if(!config){
			vscode.window.showInformationMessage('An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!');
			return
		}


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

			try {
				hideFiles(selected)	
			} catch (error) {
				vscode.window.showInformationMessage('An error occurred while trying to hide files!');
			}
		});
	});


	context.subscriptions.push(disposableReload);
}

export function deactivate() {}
