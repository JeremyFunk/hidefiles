/* eslint-disable @typescript-eslint/semi */
import * as fs from "fs";
import * as vscode from "vscode";

export interface Profile {
    name: string;
    description?: string;
    detail?: string;
    hidden: string[];
}

export interface Configuration {
    profiles: Profile[];
}

export const getData = async (): Promise<Configuration | undefined> => {
    let data = getDataByLocalFile();

    if (!data) {
        console.log("lets get it globally");
        data = await getDataByGlobalConfig();
    }

    if (data) {
        data.profiles = [
            {
                description: "",
                hidden: [],
                name: "Show all files $(globe)",
                detail: "Shows all files without exception.",
            },
            ...data.profiles,
        ];
    }
    return data;
};

const getDataByGlobalConfig = async (): Promise<Configuration | undefined> => {
    try {
        const workspaceConfig = await vscode.workspace.getConfiguration();
        const hidefilesConfig = workspaceConfig.inspect(
            "hidefiles.globalConfig"
        );

        if (hidefilesConfig.globalValue) {
            const res = getDataByConfigFile(
                hidefilesConfig.globalValue as Configuration
            );
            return res;
        }
    } catch (e) {
        console.error(e);
    }
};

const getDataByLocalFile = (): Configuration | undefined => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        const path = `${folders[0].uri.fsPath}/hide-files.json`;
        if (fs.existsSync(path)) {
            try {
                delete require.cache[require.resolve(path)];
                const res = require(path) as Configuration;
                return getDataByConfigFile(res);
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
