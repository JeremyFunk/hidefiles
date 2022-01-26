/* eslint-disable @typescript-eslint/semi */
import * as vscode from 'vscode';
import { getData } from './config';
import { hideFiles } from './core';
import { createConfig, getConfigs } from './create';


export function activate(context: vscode.ExtensionContext) {
	let disposableCreate = vscode.commands.registerCommand('hidefiles.createConfig', async () => {
		const files = getConfigs()

		let items: vscode.QuickPickItem[] = [];

		files.forEach(f => {
			items.push({
				label: f.name,
				description: f.description || 'Create config file',
				detail: f.details
			})
		})

		const selection = await vscode.window.showQuickPick(items)
		if (!selection) {
			return;
		}

		const selected = files.find(s => s.name === selection.label)

		await createConfig(selected)

		console.log("ah")
	});

	let disposableReload = vscode.commands.registerCommand('hidefiles.reloadConfig', async () => {
		let config
		config = getData()

		if(!config){
			vscode.window.showErrorMessage('An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!');
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
		
		const selection = await vscode.window.showQuickPick(items)
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


	context.subscriptions.push(disposableReload);
	context.subscriptions.push(disposableCreate);
}

export function deactivate() {}
