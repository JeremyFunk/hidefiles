/* eslint-disable @typescript-eslint/semi */
import * as vscode from "vscode";
import { getData } from "./config";
import { hideFiles } from "./core";
import { createConfig, getConfigs } from "./create";

export async function activate(context: vscode.ExtensionContext) {
    const configuration = await vscode.workspace.getConfiguration();

    const selectedProfile = configuration.get("hidefiles.selectedProfile");

    const myStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    myStatusBarItem.command = "hidefiles.reloadConfig";
    context.subscriptions.push(myStatusBarItem);
    if (selectedProfile && selectedProfile !== "") {
        myStatusBarItem.text = "Hide Files: " + selectedProfile;
        myStatusBarItem.show();
    }

    let disposableHideFile = vscode.commands.registerCommand(
        "hidefiles.hidefile",
        async (args: any) => {
            const filepath = args.path as string;

            try {
                const test = await vscode.workspace.fs.stat(
                    vscode.Uri.file(filepath)
                );

                if (test.type === vscode.FileType.File) {
                    //Add file
                } else if (test.type === vscode.FileType.Directory) {
                    //Add directory
                }
            } catch (e) {
                console.error(e);
            }
            console.log(test);

            console.log("Hidefile");
        }
    );

    let disposableHiddenFiles = vscode.commands.registerCommand(
        "hidefiles.hiddenfiles",
        async () => {
            console.log("Hidden files");
        }
    );

    let disposableDeactivate = vscode.commands.registerCommand(
        "hidefiles.deactivate",
        async () => {
            const files = await getData();
            hideFiles(files.profiles[0]);
        }
    );

    let disposableCreate = vscode.commands.registerCommand(
        "hidefiles.createConfig",
        async () => {
            const files = getConfigs();

            let items: vscode.QuickPickItem[] = [];

            files.forEach((f) => {
                items.push({
                    label: f.name,
                    description: f.description || "Create config file",
                    detail: f.details,
                });
            });

            const selection = await vscode.window.showQuickPick(items);
            if (!selection) {
                return;
            }

            const selected = files.find((s) => s.name === selection.label);

            await createConfig(selected);
        }
    );

    let disposableReload = vscode.commands.registerCommand(
        "hidefiles.reloadConfig",
        async () => {
            let config = await getData();

            if (!config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
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

            const selection = await vscode.window.showQuickPick(items);
            // the user canceled the selection
            if (!selection) {
                return;
            }

            const selected = config.profiles.find(
                (s) => s.name === selection.label
            );

            if (!selected) {
                return;
            }

            try {
                hideFiles(selected);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            if (selected.hidden.length !== 0) {
                myStatusBarItem.text = "Hide Files: " + selected.name;
                myStatusBarItem.show();
                const configuration = await vscode.workspace.getConfiguration();
                configuration.update(
                    "hidefiles.selectedProfile",
                    selected.name,
                    vscode.ConfigurationTarget.Global
                );
            } else {
                myStatusBarItem.hide();
                const configuration = await vscode.workspace.getConfiguration();
                configuration.update(
                    "hidefiles.selectedProfile",
                    "",
                    vscode.ConfigurationTarget.Global
                );
            }
        }
    );

    context.subscriptions.push(disposableReload);
    context.subscriptions.push(disposableCreate);
    context.subscriptions.push(disposableDeactivate);
    context.subscriptions.push(disposableHideFile);
    context.subscriptions.push(disposableHiddenFiles);
}

export function deactivate() {}
