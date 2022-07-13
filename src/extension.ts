/* eslint-disable @typescript-eslint/semi */
import * as vscode from "vscode";
import {
    configExists,
    Configuration,
    ConfigurationLocation,
    getData,
    getDataUnmodified,
    writeConfig,
} from "./config";
import * as fs from "fs";
import { hideFiles } from "./core";
import { getConfigs } from "./create";
import { HiddenFilesProvider } from "./tree";

export async function activate(context: vscode.ExtensionContext) {
    const provider = new HiddenFilesProvider();
    vscode.window.registerTreeDataProvider("hidden-files", provider);
    vscode.window.createTreeView("hidden-files", {
        treeDataProvider: provider,
    });

    try {
        let configuration = await vscode.workspace.getConfiguration();
        const moveLocalConfig = async () => {
            const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath; // gets the path of the first workspace folder
            const path = `${wsPath}/hide-files.json`;
            const filePath = vscode.Uri.file(path);
            if (fs.existsSync(filePath.fsPath)) {
                try {
                    delete require.cache[require.resolve(path)];
                    const res = require(path) as Configuration;

                    const existingValue = configuration.inspect(
                        "hidefiles.globalConfig"
                    );
                    if (existingValue.workspaceValue) {
                        vscode.window.showWarningMessage(
                            "HideFiles uses the VSCode workspace config now, but a hide-files.json was detected. This file is no longer needed and can be deleted. Move the content of the file to the workspace config to preserve it!"
                        );
                    } else {
                        await configuration.update(
                            "hidefiles.globalConfig",
                            res,
                            vscode.ConfigurationTarget.Workspace
                        );
                        configuration =
                            await vscode.workspace.getConfiguration();
                        const newRes = (
                            await configuration.inspect(
                                "hidefiles.globalConfig"
                            )
                        ).workspaceValue as Configuration;
                        const equal = newRes.profiles.every((p, i) => {
                            const other = res.profiles[i];
                            if (
                                p.description !== other.description ||
                                p.detail !== other.detail ||
                                p.name !== other.name ||
                                p.hidden.length !== other.hidden.length
                            ) {
                                console.log("Other not equal!!");
                                return false;
                            }
                            let equal = true;
                            p.hidden.forEach((h, j) => {
                                const oh = other.hidden[j];
                                if (h !== oh) {
                                    console.log("not equal!", h, oh);
                                    equal = false;
                                }
                            });
                            return equal;
                        });
                        if (!equal) {
                            vscode.window.showWarningMessage(
                                'Could not move HideFiles config to VSCode workspace config! Please move the content of hide-files.json manually to .vscode/settings.json -> "hidefiles.globalConfig"!'
                            );
                        } else {
                            fs.rmSync(path);
                            vscode.window.showInformationMessage(
                                "HideFiles config moved to VSCode workspace config!"
                            );
                        }
                    }
                } catch (er) {
                    console.log(er);
                }
            }
        };
        try {
            await moveLocalConfig();
        } catch (e) {}

        const version = configuration.inspect("hidefiles.version");
        if (!version.globalValue || version.globalValue !== "2.0.0") {
            const result = await vscode.window.showInformationMessage(
                "HideFiles got an update!",
                "Show more!",
                "Don't show again!"
            );
            if (result === "Show more!") {
                vscode.env.openExternal(
                    vscode.Uri.parse(
                        "https://marketplace.visualstudio.com/items?itemName=JeremyFunk.hidefiles"
                    )
                );
            } else if (result === "Don't show again!") {
                configuration.update(
                    "hidefiles.version",
                    "2.0.0",
                    vscode.ConfigurationTarget.Global
                );
            }
        } else {
            const configuration = await vscode.workspace.getConfiguration();
            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );
            if (selectedProfile && selectedProfile !== "") {
                try {
                    const data = await getData();
                    hideFiles(
                        data.config.profiles.find(
                            (c) => c.name === selectedProfile
                        )
                    );
                } catch {}
            }
        }
    } catch {}

    const refreshHideFiles = async (profile) => {
        const data = await getData();
        let activeProfile = data.config.profiles.find(
            (c) =>
                c.name ===
                (profile.endsWith(" (Active)")
                    ? profile.substring(0, profile.length - 8)
                    : profile)
        );
        if (!activeProfile) {
            activeProfile = data.config.profiles[0];
        }
        hideFiles(activeProfile);
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
                    if (process.platform === "win32") {
                        formattedWorkspace = formattedWorkspace.split(":")[1];
                        formattedFilePath = formattedFilePath.split(":")[1];
                    }
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
            await configuration.update(
                "hidefiles.selectedProfile",
                selected.name,
                vscode.ConfigurationTarget.Workspace
            );

            try {
                refreshHideFiles(selection.label);
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
            profile.peek.push(a.command.arguments[0]);

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (!unmodifiedProfile.peek) {
                unmodifiedProfile.peek = [];
            }
            unmodifiedProfile.peek.push(a.command.arguments[0]);

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
            if (
                !profile.peek ||
                !profile.peek.includes(a.command.arguments[0])
            ) {
                return;
            }
            profile.peek = profile.peek.filter(
                (b) => b !== a.command.arguments[0]
            );

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === selectedProfile
            );
            if (
                !unmodifiedProfile.peek ||
                !unmodifiedProfile.peek.includes(a.command.arguments[0])
            ) {
                return;
            }
            unmodifiedProfile.peek = unmodifiedProfile.peek.filter(
                (b) => b !== a.command.arguments[0]
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
            const clickedProfile = a.command.arguments[1];

            const profile = config.config.profiles.find(
                (p) => p.name === clickedProfile
            );

            profile.hidden = profile.hidden.filter(
                (b) => b !== a.command.arguments[0]
            );

            const unmodifiedProfile = configUnmodified.config.profiles.find(
                (p) => p.name === clickedProfile
            );
            unmodifiedProfile.hidden = unmodifiedProfile.hidden.filter(
                (b) => b !== a.command.arguments[0]
            );

            try {
                await writeConfig(configUnmodified);
                const configuration = vscode.workspace.getConfiguration();
                const selectedProfile = configuration.get(
                    "hidefiles.selectedProfile"
                );
                refreshHideFiles(selectedProfile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
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
                    (p) => p.name !== a.command.arguments[1]
                );
            configUnmodified.config.profiles.forEach((p) => {
                p.hidden = p.hidden.filter((h) => {
                    if (
                        h.startsWith("$") &&
                        h.substring(1) === a.command.arguments[1]
                    ) {
                        return false;
                    }
                    return true;
                });
            });

            try {
                await writeConfig(configUnmodified);
                const configuration = await vscode.workspace.getConfiguration();
                const selectedProfile = await configuration.get(
                    "hidefiles.selectedProfile"
                );
                refreshHideFiles(selectedProfile);
            } catch (error) {
                vscode.window.showInformationMessage(
                    "An error occurred while trying to hide files!"
                );
            }
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

            if (!name || name.trim() === "") {
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

                const configuration = vscode.workspace.getConfiguration();
                const selectedProfile = configuration.get(
                    "hidefiles.selectedProfile"
                );
                refreshHideFiles(selectedProfile);
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
            let value = "";
            let type: vscode.ConfigurationTarget;
            if (a === "Setup Hide Files Globally") {
                value = "global";
                type = vscode.ConfigurationTarget.Global;
            } else if (a === "Setup Hide Files") {
                value = "local";
                type = vscode.ConfigurationTarget.Workspace;
            } else {
                return;
            }

            const configuration = await vscode.workspace.getConfiguration(
                "hidefiles"
            );
            await configuration.update(
                "configurationType",
                value,
                vscode.ConfigurationTarget.Workspace
            );

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
                    await configuration.update(
                        "globalConfig",
                        getConfigs()[0].content,
                        type
                    );
                }
            }
            refreshHideFiles("Show All Files");

            const version = configuration.inspect("version");
            if (!version.globalValue || version.globalValue !== "2.0.0") {
                configuration.update(
                    "version",
                    "2.0.0",
                    vscode.ConfigurationTarget.Global
                );
            }
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
    context.subscriptions.push(disposableHideFile);
    context.subscriptions.push(disposableHiddenFiles);
}
