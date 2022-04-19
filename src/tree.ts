import {
    Command,
    Event,
    EventEmitter,
    ThemeColor,
    ThemeIcon,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    workspace,
} from "vscode";
import { getDataUnmodified } from "./config";

interface RecursiveFile {
    activeProfile: boolean;
    file: string;
    fullFile: string;
    children: RecursiveFile[];
    isPeek: boolean;
    profile: string;
}

export class HiddenFilesProvider implements TreeDataProvider<TreeItem> {
    transformedFiles: RecursiveFile[] = [];
    constructor() {
        this.transformedFiles = [];
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    async getChildren(element?: File) {
        if (!element) {
            const files = await getDataUnmodified();
            const vscodeConfig = await workspace.getConfiguration("hidefiles");
            const setup = vscodeConfig.inspect("configurationType");
            if (!files.config || !setup.workspaceValue) {
                return [
                    new File(
                        "Setup Hide Files",
                        {
                            command: "hidefiles.setup",
                            title: "Show",
                            arguments: ["Setup Hide Files"],
                        },
                        [],
                        {
                            active: false,
                            showAll: true,
                            peek: false,
                            type: FileType.Setup,
                        }
                    ),
                    new File(
                        "Setup Hide Files Globally",
                        {
                            command: "hidefiles.setup",
                            title: "Show",
                            arguments: ["Setup Hide Files Globally"],
                        },
                        [],
                        {
                            active: false,
                            showAll: true,
                            peek: false,
                            type: FileType.Setup,
                        }
                    )
                ];
            }

            this.transformedFiles = [];
            const configuration = await workspace.getConfiguration();

            const selectedProfile = configuration.get(
                "hidefiles.selectedProfile"
            );

            files.config.profiles.forEach((c) => {
                const curRecursive: RecursiveFile = {
                    file: c.name,
                    children: [],
                    fullFile: c.name,
                    isPeek: false,
                    activeProfile: false,
                    profile: c.name,
                };

                c.hidden.forEach((h) => {
                    const parts = h.split("/").filter((a) => a !== "");
                    let lastPart: RecursiveFile = curRecursive;
                    let fullFile = "";
                    parts.forEach((p, i) => {
                        let last = i === parts.length - 1;
                        if (p === "") {
                            return;
                        }
                        fullFile += p;
                        if ((last && h.endsWith("/")) || !last) {
                            fullFile += "/";
                        }
                        let newFile = lastPart.children.find(
                            (c) => c.file === p
                        );
                        if (!newFile) {
                            let file = p;
                            if (last && h.endsWith("/")) {
                                file += "/";
                            }
                            newFile = {
                                activeProfile: c.name === selectedProfile,
                                file: file,
                                children: [],
                                fullFile: fullFile,
                                isPeek: c.peek
                                    ? c.peek.includes(fullFile)
                                    : false,
                                profile: c.name,
                            };
                            lastPart.children.push(newFile);
                        }
                        lastPart = newFile;
                    });
                });

                this.transformedFiles.push(curRecursive);
            });
            const profiles = this.transformedFiles.map((file) => {
                const item = new File(
                    file.file,
                    {
                        command: "hide-files.show",
                        title: "Show",
                        arguments: [file.fullFile, file.profile],
                    },
                    file.children,
                    {
                        active: file.file === selectedProfile,
                        showAll: false,
                        peek: false,
                        type: FileType.Profile,
                    }
                );

                return item;
            });
            return [
                new File(
                    "Show All Files",
                    {
                        command: "hide-files.show",
                        title: "Show",
                        arguments: ["Show All Files"],
                    },
                    [],
                    {
                        active: selectedProfile === "Show All Files",
                        showAll: true,
                        peek: false,
                        type: FileType.Profile,
                    }
                ),
                ...profiles,
            ];
        } else {
            return element.children
                .map(
                    (c) =>
                        new File(
                            c.file,
                            {
                                command: "hide-files.show",
                                title: "Show",
                                arguments: [c.file, c.profile],
                            },
                            c.children,
                            {
                                active: c.activeProfile,
                                showAll: false,
                                peek: c.isPeek,
                                type: c.file.startsWith("$")
                                    ? FileType.Subprofile
                                    : FileType.File,
                            }
                        )
                )
                .sort(
                    (a, b) =>
                        (b.label.startsWith("Profile") ? 10000 : 0) -
                        (a.label.startsWith("Profile") ? 10000 : 0) +
                        (b.children.length - a.children.length) * 10 +
                        ((b.label.endsWith("/") ? 1 : 0) -
                            (a.label.endsWith("/") ? 1 : 0))
                );
        }
    }

    private _onDidChangeTreeData: EventEmitter<
        TreeItem | undefined | null | void
    > = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

const enum FileType {
    Profile,
    File,
    Subprofile,
    Setup,
}
interface FileData {
    type: FileType;
    active: boolean; // If the profile is active
    showAll: boolean; // Is this profile the show-all profile (default)?
    peek: boolean; // Is this file visible (peeked)?
}

class File extends TreeItem {
    children: RecursiveFile[];
    constructor(
        public readonly label: string,
        command: Command,
        children: RecursiveFile[],
        data: FileData
    ) {
        super(
            label,
            children.length === 0
                ? TreeItemCollapsibleState.None
                : TreeItemCollapsibleState.Collapsed
        );
        this.children = children;
        this.command = command;

        if (data.type === FileType.Profile) {
            if (data.showAll) {
                this.iconPath = new ThemeIcon("globe");
                this.contextValue = data.active
                    ? "hidefiles.profile.showall.active"
                    : "hidefiles.profile.showall";
            } else {
                this.iconPath = new ThemeIcon("symbol-class");
                this.contextValue = data.active
                    ? "hidefiles.profile.active"
                    : "hidefiles.profile.inactive";
            }

            if (data.active) {
                this.label += " (Active)";
            }
        } else if (data.type === FileType.Subprofile) {
            this.iconPath = new ThemeIcon("symbol-class");
            this.label = "Profile " + label.substring(1);
            this.contextValue = "hidefiles.subprofile";
        } else if (data.type === FileType.File) {
            const activeStatus = data.active ? "active" : "inactive";

            this.contextValue = data.peek
                ? `hidefiles.file.${activeStatus}.visible`
                : `hidefiles.file.${activeStatus}`;

            const isFolder = children.length > 0 || label.endsWith("/");
            this.iconPath = isFolder
                ? new ThemeIcon("file-directory")
                : new ThemeIcon("file");
        } else if (data.type === FileType.Setup) {
            this.contextValue = "hidefiles.setup";
            this.iconPath = new ThemeIcon("gear");
        }
    }
}
