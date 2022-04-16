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
    let data = getDataByLocalFile();
    let location = ConfigurationLocation.Local;

    if (!data) {
        data = await getDataByGlobalConfig();
        location = ConfigurationLocation.Global;
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
    let data = getDataByLocalFile(false);
    let location = ConfigurationLocation.Local;

    if (!data) {
        data = await getDataByGlobalConfig(false);
        location = ConfigurationLocation.Global;
    }

    return {
        location: location,
        config: data,
    };
};
const getDataByGlobalConfig = async (
    modified = true
): Promise<Configuration | undefined> => {
    try {
        const workspaceConfig = await vscode.workspace.getConfiguration();
        const hidefilesConfig = workspaceConfig.inspect(
            "hidefiles.globalConfig"
        );

        if (hidefilesConfig.globalValue) {
            const res = hidefilesConfig.globalValue as Configuration;
            return modified ? getDataByConfigFile(res) : res;
        }
    } catch (e) {
        console.error(e);
    }
};

const getDataByLocalFile = (modified = true): Configuration | undefined => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        const path = `${folders[0].uri.fsPath}/hide-files.json`;
        if (fs.existsSync(path)) {
            try {
                delete require.cache[require.resolve(path)];
                const res = require(path) as Configuration;
                return modified ? getDataByConfigFile(res) : res;
            } catch (er) {
                console.log(er);
            }
        }
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
    if (config.location === ConfigurationLocation.Local) {
        const folders = vscode.workspace.workspaceFolders;
        fs.writeFile(
            `${folders[0].uri.fsPath}/hide-files.json`,
            JSON.stringify(config.config),
            () => {}
        );
    } else {
        try {
            const workspaceConfig = await vscode.workspace.getConfiguration();
            const workspace = workspaceConfig.inspect(
                "hidefiles.globalConfig"
            ).workspaceValue;

            let target = vscode.ConfigurationTarget.Global;

            if (global) {
                target = vscode.ConfigurationTarget.Workspace;
            }

            workspaceConfig.update(
                "hidefiles.globalConfig",
                config.config,
                target
            );
        } catch (e) {
            console.error(e);
        }
    }
};
