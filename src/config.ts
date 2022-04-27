/* eslint-disable @typescript-eslint/semi */
import * as fs from "fs";
import * as vscode from "vscode";

export interface Profile {
    name: string;
    description?: string;
    detail?: string;
    hidden: string[];
    peek?: string[];
}

export interface Configuration {
    profiles: Profile[];
}

export enum ConfigurationLocation {
    Local,
    Global,
}
export interface ConfigurationFile {
    location: ConfigurationLocation;
    config: Configuration;
}

export const setData = async (config: Configuration) => {};

export const getData = async (): Promise<ConfigurationFile | undefined> => {
    let data;

    const workspaceConfig = await vscode.workspace.getConfiguration();
    const hidefilesConfig = workspaceConfig.inspect(
        "hidefiles.configurationType"
    );
    let location = ConfigurationLocation.Local;
    if (hidefilesConfig.workspaceValue === "global") {
        data = await getDataByConfig(true);
        location = ConfigurationLocation.Global;
    } else {
        data = await getDataByConfig(false);
    }
    if (data) {
        data.profiles = [
            {
                description: "",
                hidden: [],
                name: "Show All Files",
                detail: "Shows all files without exception.",
            },
            ...data.profiles,
        ];
    }
    return {
        location: location,
        config: data,
    };
};
export const getDataUnmodified = async (): Promise<
    ConfigurationFile | undefined
> => {
    let data;

    const workspaceConfig = await vscode.workspace.getConfiguration();
    const hidefilesConfig = workspaceConfig.inspect(
        "hidefiles.configurationType"
    );
    let location = ConfigurationLocation.Local;
    if (hidefilesConfig.workspaceValue === "global") {
        data = await getDataByConfig(true, false);
        location = ConfigurationLocation.Global;
    } else {
        data = await getDataByConfig(false, false);
    }

    return {
        location: location,
        config: data,
    };
};
const getDataByConfig = async (
    global: boolean,
    modified = true
): Promise<Configuration | undefined> => {
    try {
        const workspaceConfig = await vscode.workspace.getConfiguration();
        const hidefilesConfig = workspaceConfig.inspect(
            "hidefiles.globalConfig"
        );

        if (hidefilesConfig.globalValue && global) {
            const res = hidefilesConfig.globalValue as Configuration;
            return modified ? getDataByConfigFile(res) : res;
        } else if (hidefilesConfig.workspaceValue && !global) {
            const res = hidefilesConfig.workspaceValue as Configuration;
            return modified ? getDataByConfigFile(res) : res;
        }
    } catch (e) {
        console.error(e);
    }
};
const getDataByConfigFile = (
    fileContent: Configuration
): Configuration | undefined => {
    let err = false;
    fileContent.profiles.some((profile) => {
        if (!profile.detail) {
            let hasLinks = false;

            profile.detail = "$(extensions-star-empty)Extends: ";
            profile.hidden.forEach((s) => {
                if (s.startsWith("$")) {
                    hasLinks = true;
                    profile.detail += s.substr(1) + " ‎ ‎ ";
                }
            });
            if (!hasLinks) {
                profile.detail = "";
            }

            profile.detail +=
                "Hides: " +
                profile.hidden
                    .map((s) => {
                        if (s.startsWith("$")) {
                            return "";
                        }

                        if (s.endsWith("/")) {
                            return "$(folder)" + s + "    ";
                        } else {
                            return "$(symbol-file)" + s + "   ";
                        }
                    })
                    .join(" ");
        }
        const newHidden = recursivelyResolveHidden(fileContent, profile, []);
        if (!newHidden) {
            err = true;
            return true;
        }

        profile.hidden = newHidden;
    });
    if (err) {
        return undefined;
    }
    return fileContent;
};

const recursivelyResolveHidden = (
    conf: Configuration,
    profile: Profile,
    touchedProfiles: Profile[]
): string[] | undefined => {
    if (touchedProfiles.find((t) => profile.name === t.name)) {
        vscode.window.showErrorMessage(
            "You have either defined a recursion in your configuration or defined multiple profiles with the same name!"
        );

        return undefined;
    }

    const newHidden: string[] = [];
    profile.hidden.forEach((s) => {
        if (s.startsWith("$")) {
            const replacement = conf.profiles.find(
                (curProfile) => s.substr(1) === curProfile.name
            );
            if (replacement) {
                newHidden.push(
                    ...recursivelyResolveHidden(conf, replacement, [
                        ...touchedProfiles,
                        profile,
                    ])
                );
            }
        } else {
            newHidden.push(s);
        }
    });

    return newHidden;
};

export const writeConfig = async (config: ConfigurationFile) => {
    const workspaceConfig = await vscode.workspace.getConfiguration();
    if (config.location === ConfigurationLocation.Local) {
        try {
            await workspaceConfig.update(
                "hidefiles.globalConfig",
                config.config,
                vscode.ConfigurationTarget.Workspace
            );
        } catch (e) {
            console.error(e);
        }
    } else {
        try {
            await workspaceConfig.update(
                "hidefiles.globalConfig",
                config.config,
                vscode.ConfigurationTarget.Global
            );
        } catch (e) {
            console.error(e);
        }
    }
};

export const configExists = (): boolean => {
    const folders = vscode.workspace.workspaceFolders;
    if (fs.existsSync(`${folders[0].uri.fsPath}/hide-files.json`)) {
        return true;
    }
    return false;
};
