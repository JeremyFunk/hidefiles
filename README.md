# hidefiles README

Hide files easily hides files. Define the folders to hide in a file called hide-files.json in the root folder of the workspace.

An example config is:

```json
{
    "profiles": [
        {
            "name": "Default",
            "detail": "Hides huge, annoying folders",
            "hidden": [
                "node_modules/",
                ".vscode/",
                ".storybook/",
                ".github/"
            ]
        },
        {
            "name": "Strict",
            "detail": "Hide everything not immediately required",
            "hidden": [
                "$Default",
                "electron-builder.yml",
                "graphql.schema.json",
                "import-sorter.json",
                "jest.config.ts",
                "plopfile.ts",
                "generators/"
            ]
        },
    ]
}
```