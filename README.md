# HideFiles

Hide Files allows the user to configure profiles to hide unnecessary folders and files. The configuration is defined in a file in the root level of the workspace, called `hide-files.json`.

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

Folders are marked by the `/` character at the end of the folder name. 

When an element starts with `$`, it marks the element as a profile import (e.g. `$Default` in the hidden property of the `Strict` profile in the example above). These elements import the content of the hidden property of another profile. In the example above the entire content of the hidden property of the `Default` profile is imported into the hidden property of the `Strict` profile. 