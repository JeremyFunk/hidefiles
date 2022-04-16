/* eslint-disable @typescript-eslint/semi */
import * as vscode from "vscode";
import { getData, getDataUnmodified, writeConfig } from "./config";
import { hideFiles } from "./core";
import { createConfig, getConfigs } from "./create";
import { HiddenFilesProvider } from "./tree";

export async function activate(context: vscode.ExtensionContext) {
    const provider = new HiddenFilesProvider();
    vscode.window.registerTreeDataProvider("hidden-files", provider);
    vscode.window.createTreeView("hidden-files", {
        treeDataProvider: provider,
    });

    let disposableHideFile = vscode.commands.registerCommand(
        "hidefiles.hidefile",
        async (args: any) => {
            const text = await vscode.env.clipboard.readText();
            await vscode.commands.executeCommand("copyFilePath");
            const paths = (await vscode.env.clipboard.readText()).split(
                /\r?\n/
            );
            await vscode.env.clipboard.writeText(text);

            const config = await getDataUnmodified();
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
                let added = [];
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

                    if (file.type === vscode.FileType.File) {
                        //Add file
                        profile.hidden.push(formattedFilePath);
                        added.push(formattedFilePath);
                    } else if (file.type === vscode.FileType.Directory) {
                        //Add directory
                        profile.hidden.push(formattedFilePath + "/");
                        added.push(formattedFilePath + "/");
                    } else {
                        continue;
                    }
                }

                await writeConfig(config);
                try {
                    const data = await getDataUnmodified();
                    hideFiles(
                        data.config.profiles.find(
                            (c) => c.name === selectedProfile
                        )
                    );
                    provider.refresh();
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
    let disposableReloadView = vscode.commands.registerCommand(
        "hidefiles.hiddenfiles.refresh",
        async () => {
            let config = await getData();
            if (!config.config) {
                return;
            }
            try {
                const configuration = await vscode.workspace.getConfiguration();

                const selectedProfile = configuration.get(
                    "hidefiles.selectedProfile"
                );
                hideFiles(
                    config.config.profiles.find(
                        (p) => p.name === selectedProfile
                    )
                );
            } catch (error) {
                console.error(error);
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
            provider.refresh();
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
            const configuration = await vscode.workspace.getConfiguration();
            configuration.update(
                "hidefiles.selectedProfile",
                selected.name,
                vscode.ConfigurationTarget.Global
            );

            try {
                hideFiles(selected);
            } catch (error) {
                console.error(error);
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableProfileActivate = vscode.commands.registerCommand(
        "hidefiles.tree.profile.activate",
        async (a) => {
            let config = await getData();

            if (!config.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }

            const configuration = await vscode.workspace.getConfiguration();
            await configuration.update(
                "hidefiles.selectedProfile",
                a.label,
                vscode.ConfigurationTarget.Global
            );
            try {
                if (a.label.startsWith("Show All Files")) {
                    hideFiles(config.config.profiles[0]);
                } else {
                    hideFiles(
                        config.config.profiles.find((c) => c.name === a.label)
                    );
                }
            } catch (error) {
                console.error(error);
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableTreePeek = vscode.commands.registerCommand(
        "hidefiles.tree.peek",
        async (a) => {
            let config = await getData();
            let configUnmodified = await getDataUnmodified();

            if (!config.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const profile = config.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (!profile.peek) {
                profile.peek = [];
            }
            profile.peek.push(a.label);

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (!unmodifiedProfile.peek) {
                unmodifiedProfile.peek = [];
            }
            unmodifiedProfile.peek.push(a.label);

            try {
                writeConfig(configUnmodified);
                hideFiles(profile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableTreePeekUndo = vscode.commands.registerCommand(
        "hidefiles.tree.peek.undo",
        async (a) => {
            let config = await getData();
            let configUnmodified = await getDataUnmodified();

            if (!config.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const profile = config.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (!profile.peek || !profile.peek.includes(a.label)) {
                return;
            }
            profile.peek = profile.peek.filter((b) => b !== a.label);

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (
                !unmodifiedProfile.peek ||
                !unmodifiedProfile.peek.includes(a.label)
            ) {
                return;
            }
            unmodifiedProfile.peek = unmodifiedProfile.peek.filter(
                (b) => b !== a.label
            );

            try {
                writeConfig(configUnmodified);
                hideFiles(profile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableTreeRemove = vscode.commands.registerCommand(
        "hidefiles.tree.remove",
        async (a) => {
            let config = await getData();
            let configUnmodified = await getDataUnmodified();

            if (!config.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const profile = config.config.profiles.find(
                (p) => p.name === selectedProfile
            );

            profile.hidden = profile.hidden.filter((b) => b !== a.label);

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            unmodifiedProfile.hidden = unmodifiedProfile.hidden.filter(
                (b) => b !== a.label
            );

            try {
                writeConfig(configUnmodified);
                hideFiles(profile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );
    context.subscriptions.push(disposableTreeRemove);
    context.subscriptions.push(disposableTreePeekUndo);
    context.subscriptions.push(disposableTreePeek);
    context.subscriptions.push(disposableProfileActivate);
    context.subscriptions.push(disposableReloadView);
    context.subscriptions.push(disposableReload);
    context.subscriptions.push(disposableCreate);
    context.subscriptions.push(disposableDeactivate);
    context.subscriptions.push(disposableHideFile);
    context.subscriptions.push(disposableHiddenFiles);
}
