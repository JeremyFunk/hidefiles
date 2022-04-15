import {
    Command,
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
} from "vscode";
import { getData } from "./config";
import { getConfigs } from "./create";

interface RecursiveFile {
    file: string;
    children: RecursiveFile[];
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
            const files = await getData();
            files.config.profiles.splice(0, 1);
            this.transformedFiles = [];
            files.config.profiles.forEach((c) => {
                const curRecursive: RecursiveFile = {
                    file: c.name,
                    children: [],
                };

                c.hidden.forEach((h) => {
                    const parts = h.split("/");
                    const lastPart: RecursiveFile = curRecursive;
                    parts.forEach((p) => {
                        if (p === "") {
                            return;
                        }
                        const newFile = lastPart.children.find(
                            (c) => c.file === p
                        );
                        if (!newFile) {
                            lastPart.children.push({ file: p, children: [] });
                        }
                    });
                });

                this.transformedFiles.push(curRecursive);
            });

            return this.transformedFiles.map((file) => {
                const item = new File(
                    file.file,
                    {
                        command: "hide-files.show",
                        title: "Show",
                        arguments: [file.file],
                    },
                    file.children
                );

                return item;
            });
        } else {
            return element.children.map(
                (c) =>
                    new File(
                        c.file,
                        {
                            command: "hide-files.show",
                            title: "Show",
                            arguments: [c.file],
                        },
                        c.children
                    )
            );
        }
        return [];
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
        children: RecursiveFile[]
    ) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this.children = children;
        this.command = command;
    }
}
