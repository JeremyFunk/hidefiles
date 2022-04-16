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
    file: string;
    fullFile: string;
    children: RecursiveFile[];
    isPeek: boolean;
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
                                file: file,
                                children: [],
                                fullFile: fullFile,
                                isPeek: c.peek
                                    ? c.peek.includes(fullFile)
                                    : false,
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
                        arguments: [file.fullFile],
                    },
                    file.children,
                    true,
                    file.file === selectedProfile
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
                    true,
                    false,
                    true
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
                                arguments: [c.file],
                            },
                            c.children,
                            false,
                            false,
                            false,
                            c.isPeek
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
class File extends TreeItem {
    children: RecursiveFile[];
    constructor(
        public readonly label: string,
        command: Command,
        children: RecursiveFile[],
        profile?: boolean,
        active?: boolean,
        showAll?: boolean,
        peek?: boolean
    ) {
        super(
            label,
            children.length === 0
                ? TreeItemCollapsibleState.None
                : TreeItemCollapsibleState.Collapsed
        );
        this.children = children;
        this.command = command;
        if (showAll) {
            this.iconPath = new ThemeIcon("globe");
            this.contextValue = "hidefiles.profile.showall";
        } else if (profile) {
            this.iconPath = new ThemeIcon("symbol-class");
            if (!active) {
                this.contextValue = "hidefiles.profile.inactive";
            } else {
                this.label += " (Active)";
                this.contextValue = "hidefiles.profile.active";
            }
        } else if (label.startsWith("$")) {
            this.iconPath = new ThemeIcon("archive");
            this.label = "Profile " + label.substring(1);
            this.contextValue = "hidefiles.subprofile";
        } else if (children.length > 0 || label.endsWith("/")) {
            this.iconPath = new ThemeIcon("file-directory");
            if (peek) {
                this.contextValue = "hidefiles.file.visible";
            } else {
                this.contextValue = "hidefiles.file";
            }
        } else {
            this.iconPath = new ThemeIcon("file");
            if (peek) {
                this.contextValue = "hidefiles.file.visible";
            } else {
                this.contextValue = "hidefiles.file";
            }
        }
    }
}
