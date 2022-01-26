
# Hide Files

Hide Files allows the user to configure profiles to hide unnecessary files and folders. The configuration is defined in a file on the root level of the workspace, called `hide-files.json`.

## Using Hide Files

Let's say you are working on a project with a few folders and files you never or very rarely need access to. The unfiltered project structure might look as follows (I'm using a NextJS project as an example):

![NextJS unfiltered!](https://i.imgur.com/0AyQfEM.png)

Most of the folders and files are not required and tend to slow you down when trying to find a file or folder. Let's remove them. Three steps are required to remove all unnecessary files and folders:

1. Generate a ```hide-files.json``` config file
2. Add all unwanted folders and files to the config file.
3. Reload the config.

## Creating the config
The basic config file can be generated using the ```Hide Files: Create Configuration``` command (Windows/Linux: *Ctrl + Shift + P*, MacOS: *⇧ + ⌘ + P*):

![Create Config!](https://i.imgur.com/OOtQlUE.png)

Then select the config you want to generate (I will add presets for various project types in the future™):

![Create Config!](https://i.imgur.com/OOtQlUE.png)

The generated config file will be located in the root directory of your project and is called ```hide-files.json```. **Please do not rename, delete or move it**. Hide Files won't be able to find the config.

## Editing the config

The newly generated config file will look as follows:

```json
{
    "profiles": [
        {
            "name": "Default",
            "detail": "Hides annoying folders",
            "description": "Only hides stuff you never need",
            "hidden": [
                ".vscode/"
            ]
        },
        {
            "name": "Strict",
            "detail": "Hide everything not immediately required",
            "hidden": [
                "$Default"
            ]
        }
    ]
}
```

The format of the config is simple. It contains a list of profiles, each profile has a name, a description, details and an array of hidden files and folders. The name, description and detail are shown when selecting the profile. 

Profiles can be used to configure different hiding levels. For example:

- Level 1: Show everything but generated code (build files).
- Level 2: Only show immediately necessary files and folders.
- Level 3: Only show code (no tests, configs etc.).

The hidden files and folders can have these formats:

- ```someFolder/``` Hides entire folder
- ```someFile``` Hides file
- ```*.end``` Hides all files with given file ending
- ```$Profile``` Includes all hidden files and folders from the profile called ```Profile```

## Reload config

To reload the Hide Files config, following command has to be run: ```Hide Files: Reload Configuration``` (Windows/Linux: *Ctrl + Shift + P*, MacOS: *⇧ + ⌘ + P*)

![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790423-f990bf61-a1f3-4a37-985d-7998928166d3.png)

Then select one of the configured profiles.

![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790484-78160f67-4e9c-4c62-8af6-5216bd1edadc.png)



## Found an issue?
Please create an issue on [GitHub](https://github.com/JeremyFunk/hidefiles) or ask a question on the [extensions page](https://marketplace.visualstudio.com/items?itemName=JeremyFunk.hidefiles).

## Changelog
* V1.0.2 Added config creation and better ReadMe.
* V1.0.1 Changed message type of errors to make it clearer to users.
* V1.0.0 Added proper user feedback and MacOS/Linux support.
* V0.0.2: First stable version.
