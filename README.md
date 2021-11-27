# Hide Files

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

When an element starts with `$`, it marks the element as a profile import (e.g. `$Default` in the hidden property of the `Strict` profile in the example above). These elements import the content of the hidden property of the given profile. In the example above the entire content of the hidden property of the `Default` profile is imported into the hidden property of the `Strict` profile. 

## Using Hide Files
To run hide files, first the configuration file has to be properly located. Make sure it is in the **root directory** of the workspace, **not** in a sub-folder. The file has to be called `hide-files.json`. 

After that, following command has to be run: ```HideFiles: Reload Configuration``` (Windows/Linux: *Ctrl + Shift + P*, MacOS: *⇧ + ⌘ + P*)


![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790423-f990bf61-a1f3-4a37-985d-7998928166d3.png)
![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790484-78160f67-4e9c-4c62-8af6-5216bd1edadc.png)

## Found an issue?
Please create an issue on [GitHub](https://github.com/JeremyFunk/hidefiles) or ask a question on the [extensions page](https://marketplace.visualstudio.com/items?itemName=JeremyFunk.hidefiles).

## Changelog
* V1.0.0 Added proper user feedback and MacOS/Linux support.
* V0.0.2: First stable version.