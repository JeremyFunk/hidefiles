/* eslint-disable @typescript-eslint/semi */
import * as vscode from "vscode";
import {
    ConfigurationLocation,
    getData,
    getDataUnmodified,
    writeConfig,
} from "./config";
import { hideFiles } from "./core";
import { createConfig, getConfigs } from "./create";
import { HiddenFilesProvider } from "./tree";

export async function activate(context: vscode.ExtensionContext) {
    const provider = new HiddenFilesProvider();
    vscode.window.registerTreeDataProvider("hidden-files", provider);
    vscode.window.createTreeView("hidden-files", {
        treeDataProvider: provider,
    });

    const refreshHideFiles = async (profile) => {
        const data = await getData();
        hideFiles(data.config.profiles.find((c) => c.name === profile));
        provider.refresh();
    };

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
                    refreshHideFiles(selectedProfile);
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
            if (!selected) {
                vscode.window.showErrorMessage(
                    "Could not find profile " + selection.label + "!"
                );
                return;
            }

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
                refreshHideFiles(selectedProfile);
            } catch (error) {
                console.error(error);
                vscode.window.showInformationMessage(
                    "An error occurred while trying to refresh hide files!"
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
                vscode.ConfigurationTarget.Workspace
            );

            try {
                refreshHideFiles(selected);
            } catch (error) {
                console.error(error);
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
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
                vscode.ConfigurationTarget.Workspace
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
            const selectedProfile = a.command.arguments[1];

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
                await writeConfig(configUnmodified);
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
            const selectedProfile = a.command.arguments[1];

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
                await writeConfig(configUnmodified);
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
            const selectedProfile = a.command.arguments[1];

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
                await writeConfig(configUnmodified);
                hideFiles(profile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableAddProfile = vscode.commands.registerCommand(
        "hidefiles.hiddenfiles.add",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }

            const name = await vscode.window.showInputBox({
                placeHolder: "Profile Name",
                prompt: "Create New Profile - Profile Name",
            });

            if (
                !name ||
                name.trim() === "" ||
                configUnmodified.config.profiles.find((p) => p.name === name)
            ) {
                return;
            }

            configUnmodified.config.profiles.push({
                hidden: [],
                name: name,
                description: "",
                detail: "",
                peek: [],
            });
            try {
                await writeConfig(configUnmodified);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableDeleteProfile = vscode.commands.registerCommand(
        "hidefiles.tree.profile.delete",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }

            let items: vscode.QuickPickItem[] = [
                {
                    label: "Yes",
                },
                {
                    label: "No",
                },
            ];

            const selection = await vscode.window.showQuickPick(items, {
                title: "Delete Profile '" + a.label + "'",
            });
            // the user canceled the selection
            if (!selection || selection.label !== "Yes") {
                return;
            }

            configUnmodified.config.profiles =
                configUnmodified.config.profiles.filter(
                    (p) => p.name !== a.label
                );

            try {
                await writeConfig(configUnmodified);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableRenameProfile = vscode.commands.registerCommand(
        "hidefiles.tree.profile.rename",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }

            const name = await vscode.window.showInputBox({
                placeHolder: "New Name",
                prompt: "Rename Profile",
            });

            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const profile = configUnmodified.config.profiles.find((p) => {
                if (p.name === selectedProfile) {
                    return p.name === a.label.substring(0, a.label.length - 9);
                } else {
                    return p.name === a.label;
                }
            });

            if (selectedProfile === profile.name) {
                await configuration.update(
                    "hidefiles.selectedProfile",
                    name,
                    vscode.ConfigurationTarget.Global
                );
            }

            configUnmodified.config.profiles.forEach((p) => {
                p.hidden.forEach((h, i) => {
                    if (h === "$" + profile.name) {
                        p.hidden[i] = "$" + name;
                    }
                });
            });
            profile.name = name;
            try {
                await writeConfig(configUnmodified);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableRenoveSubprofile = vscode.commands.registerCommand(
        "hidefiles.subprofile.remove",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const selectedProfile = a.command.arguments[1];

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            unmodifiedProfile.hidden = unmodifiedProfile.hidden.filter(
                (b) => b !== "$" + a.label.substring(8)
            );

            try {
                await writeConfig(configUnmodified);

                let config = await getData();
                const profile = config.config.profiles.find(
                    (p) => p.name === selectedProfile
                );
                hideFiles(profile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }

            provider.refresh();
        }
    );

    let disposableAddSubprofile = vscode.commands.registerCommand(
        "hidefiles.tree.profile.add",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const profile = configUnmodified.config.profiles.find((p) => {
                if (p.name === selectedProfile) {
                    return p.name === a.label.substring(0, a.label.length - 9);
                } else {
                    return p.name === a.label;
                }
            });

            let remainingProfiles = configUnmodified.config.profiles
                .filter((p) => p.name !== profile.name)
                .filter(
                    (p) =>
                        profile.hidden.find((h) => h === "$" + p.name) ===
                        undefined
                );
            const dependencies = configUnmodified.config.profiles.map((p) => {
                return {
                    name: p.name,
                    dependencies: p.hidden
                        .filter((h) => h.startsWith("$"))
                        .map((s) => s.substring(1)),
                };
            });

            const dependenciesFlat = dependencies.map((d) => {
                const getFlat = (dependency: string): string[] => {
                    const deps = dependencies.find(
                        (d) => d.name === dependency
                    );
                    return [
                        ...deps.dependencies,
                        ...deps.dependencies.map((d) => getFlat(d)).flat(),
                    ];
                };

                return {
                    name: d.name,
                    dependencies: getFlat(d.name),
                };
            });

            const depsFlat = dependenciesFlat.find(
                (d) => d.name === profile.name
            );

            remainingProfiles = remainingProfiles.filter((p) => {
                const curDepsFlat = dependenciesFlat.find(
                    (d) => d.name === p.name
                );
                if (
                    depsFlat.dependencies.find((d) => d === p.name) ||
                    curDepsFlat.dependencies.find((d) => d === profile.name)
                ) {
                    return false;
                }

                return true;
            });

            if (remainingProfiles.length === 0) {
                vscode.window.showWarningMessage(
                    "There are now profiles that can be added to " +
                        profile.name +
                        "!"
                );
                return;
            }

            let items: vscode.QuickPickItem[] = remainingProfiles.map((p) => {
                return {
                    label: p.name,
                };
            });

            const selection = await vscode.window.showQuickPick(items, {
                title: "Add Subprofile to '" + a.label + "'",
            });
            // the user canceled the selection
            if (!selection || selection.label.trim() === "") {
                return;
            }

            const exists = configUnmodified.config.profiles.find(
                (c) => c.name === selection.label
            );
            if (!exists) {
                vscode.window.showErrorMessage(
                    "Could not find profile " + selection.label + "!"
                );
                return;
            }

            profile.hidden.push("$" + selection.label);

            try {
                await writeConfig(configUnmodified);
                refreshHideFiles(selectedProfile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
        }
    );

    let disposableUpProfile = vscode.commands.registerCommand(
        "hidefiles.tree.profile.up",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const index = configUnmodified.config.profiles.findIndex(
                (b) => b.name === a.command.arguments[1]
            );
            if (index === 0 || index === -1) {
                return;
            }
            const temp = configUnmodified.config.profiles[index];
            configUnmodified.config.profiles[index] =
                configUnmodified.config.profiles[index - 1];
            configUnmodified.config.profiles[index - 1] = temp;
            try {
                await writeConfig(configUnmodified);
                refreshHideFiles(selectedProfile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
        }
    );

    let disposableDownProfile = vscode.commands.registerCommand(
        "hidefiles.tree.profile.down",
        async (a) => {
            let configUnmodified = await getDataUnmodified();

            if (!configUnmodified.config) {
                vscode.window.showErrorMessage(
                    "An error occured while loading the hide-files.json config file! Make sure the file exists in the root directory of the workspace, not in a sub-folder and is called hide-files.json!"
                );
                return;
            }
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            const index = configUnmodified.config.profiles.findIndex(
                (b) => b.name === a.command.arguments[1]
            );
            if (
                index === configUnmodified.config.profiles.length - 1 ||
                index === -1
            ) {
                return;
            }
            const temp = configUnmodified.config.profiles[index];
            configUnmodified.config.profiles[index] =
                configUnmodified.config.profiles[index + 1];
            configUnmodified.config.profiles[index + 1] = temp;
            try {
                await writeConfig(configUnmodified);
                refreshHideFiles(selectedProfile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
        }
    );

    let disposableSetup = vscode.commands.registerCommand(
        "hidefiles.setup",
        async (a) => {
            let items: vscode.QuickPickItem[] = [
                {
                    label: "Global Setup",
                },
                {
                    label: "Local Setup",
                },
            ];

            const selection = await vscode.window.showQuickPick(items, {
                title: "Setup HideFiles",
            });
            // the user canceled the selection
            if (!selection) {
                return;
            }

            let value = "";
            let type: vscode.ConfigurationTarget;
            if (selection.label.trim() === "Global Setup") {
                value = "global";
                type = vscode.ConfigurationTarget.Global;
            } else if (selection.label.trim() === "Local Setup") {
                value = "local";
                type = vscode.ConfigurationTarget.Workspace;
            } else {
                return;
            }

            const configuration = await vscode.workspace.getConfiguration(
                "hidefiles"
            );
            const setup = configuration.inspect("configurationType");

            if (!setup.workspaceValue) {
                await configuration.update(
                    "configurationType",
                    value,
                    vscode.ConfigurationTarget.Workspace
                );
            }

            const configData = configuration.inspect("globalConfig");
            if (type === vscode.ConfigurationTarget.Global) {
                if (!configData.globalValue) {
                    await configuration.update(
                        "globalConfig",
                        getConfigs()[0].content,
                        type
                    );
                }
            } else {
                if (!configData.workspaceValue) {
                    await writeConfig({
                        config: getConfigs()[0].content,
                        location: ConfigurationLocation.Local,
                    });
                }
            }
            refreshHideFiles("Show All Files");
        }
    );

    context.subscriptions.push(disposableSetup);
    context.subscriptions.push(disposableDownProfile);
    context.subscriptions.push(disposableUpProfile);
    context.subscriptions.push(disposableRenoveSubprofile);
    context.subscriptions.push(disposableAddSubprofile);
    context.subscriptions.push(disposableDeleteProfile);
    context.subscriptions.push(disposableAddProfile);
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
