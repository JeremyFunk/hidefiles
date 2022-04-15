/* eslint-disable @typescript-eslint/semi */
import * as vscode from "vscode";
import { getData, writeConfig } from "./config";
import { hideFiles } from "./core";
import { createConfig, getConfigs } from "./create";
import { HiddenFilesProvider } from "./tree";

export async function activate(context: vscode.ExtensionContext) {
    const provider = new HiddenFilesProvider();
    vscode.window.registerTreeDataProvider("hidden-files", provider);
    vscode.window.createTreeView("hidden-files", {
        treeDataProvider: provider,
    });

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
            const text = await vscode.env.clipboard.readText();
            await vscode.commands.executeCommand("copyFilePath");
            const paths = (await vscode.env.clipboard.readText()).split(
                /\r?\n/
            );
            await vscode.env.clipboard.writeText(text);

            const config = await getData();
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );
            if (!selectedProfile || selectedProfile === "") {
                await vscode.window.showErrorMessage(
                    "Please select a hide files profile first!"
                );
                return;
            }
            const profile = config.config.profiles.find(
                (c) => c.name === selectedProfile
            );
            try {
                if (!config.config) {
                    await vscode.window.showErrorMessage(
                        "Please generate a config first!"
                    );
                    return;
                }
                for (let filepath of paths) {
                    const file = await vscode.workspace.fs.stat(
                        vscode.Uri.file(filepath)
                    );

                    const folders = vscode.workspace.workspaceFolders;
                    if (!folders) {
                        await vscode.window.showErrorMessage(
                            "Please open a workspace to use HideFiles!"
                        );
                        return;
                    }
                    let formattedFilePath = filepath
                        .replaceAll("\\\\", "/")
                        .replaceAll("\\", "/");
                    let formattedWorkspace = folders[0].uri.fsPath
                        .replaceAll("\\\\", "/")
                        .replaceAll("\\", "/");
                    formattedWorkspace = formattedWorkspace.split(":")[1];
                    formattedFilePath = formattedFilePath.split(":")[1];
                    formattedFilePath = formattedFilePath.replace(
                        formattedWorkspace,
                        ""
                    );
                    if (formattedFilePath.startsWith("/")) {
                        formattedFilePath = formattedFilePath.slice(
                            1,
                            formattedFilePath.length
                        );
                    }

                    console.log(folders[0].uri.fsPath, filepath);

                    if (file.type === vscode.FileType.File) {
                        //Add file
                        profile.hidden.push(formattedFilePath);
                    } else if (file.type === vscode.FileType.Directory) {
                        //Add directory
                        profile.hidden.push(formattedFilePath + "/");
                    } else {
                        continue;
                    }
                }
                config.config.profiles.splice(0, 1);
                writeConfig(config);
                try {
                    hideFiles(profile);
                } catch (error) {
                    vscode.window.showInformationMessage(
                        "An error occurred while trying to hide files!"
                    );
                }
            } catch (e) {
                console.error(e);
            }
        }
    );

    let disposableHiddenFiles = vscode.commands.registerCommand(
        "hidefiles.hiddenfiles",
        async () => {}
    );

    let disposableDeactivate = vscode.commands.registerCommand(
        "hidefiles.deactivate",
        async () => {
            const files = await (await getData()).config;
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

            if (!config.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }

            let items: vscode.QuickPickItem[] = [];

            for (
                let index = 0;
                index < config.config.profiles.length;
                index++
            ) {
                let item = config.config.profiles[index];
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

            const selected = config.config.profiles.find(
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
