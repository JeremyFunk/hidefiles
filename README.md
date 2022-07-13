# Hide Files

Hide Files allows the user to configure profiles to hide all files and folders that are not immediately needed. This makes it much easier to find relevant files.

## Using Hide Files

![Simple](https://i.imgur.com/mNNSGvz.gif)

` Note: since Hide Files V2.1.0 the hide-files.json config is no longer present. Local configuration is managed via the VSCode workspace config.`

` Note: V2.1.1 fixed Hide Files on Linux and MacOS.`

The GIF above shows everything required to use the basic functionality of Hide Files. You should be good to go! The rest of this file is for a more in-depth tutorial. I recommend reading it to get the most out of this extension, but it is not required.

<br><br>

# A step by step introduction

Let's say you are working on a project with a few folders and files you never or very rarely need access to. The unfiltered project structure might look like this (I'm using a NextJS project as an example):

![NextJS unfiltered!](https://i.imgur.com/Kv5WVlc.png)

Most of the folders and files are not required and tend to slow you down when trying to find a file or folder. Let's remove them.

## Setting up Hide Files

After installing Hide Files, a new view in the explorer will open (at the bottom):

![Setup!](https://i.imgur.com/stnNdvC.png)

### Local setup (recommended)

Clicking _Setup Hide Files_: This is the recommended in most cases. It sets up Hide Files for the **current workspace**. All settings will be exclusively saved in the current workspace, and will therefore not be available in any other workspace.

When choosing the first option, all configuration will be save in the VSCode config for the current workspace (.vscode/settings.json).

### Global setup

Clicking _Setup Hide Files Globally_: This sets Hide Files up for global use (global meaning across all projects/workspaces on your current machine). This can be useful if you mostly use one technology. If you, for example, primarily use NextJS, it might make sense to create a few global Hide Files profiles for NextJS so you don't have to repeatedly add all unnecesary files for each individual Hide Files configuration in your NextJS workspaces.

If you choose a global setup, the Hide Files config is stored in the VSCode Settings JSON. To acces it use the command `Preferences: Open Settings (JSON)` (Windows/Linux: _Ctrl + Shift + P_, MacOS: _⇧ + ⌘ + P_)

![Global Config Command!](https://i.imgur.com/pyKxNjP.png)

Search for `"hidefiles.globalConfig"` to find the config.
<br><br>

## Hiding Files

After setting Hide Files up, the `Hidden Files` view at the bottom of the explorer is available:

![Default Profiles!](https://i.imgur.com/j0JsfUs.png)

### Profiles

**Profile are optional**. You can just use one profile and ignore this feature if you like.

Profiles are used to easily switch between different levels of hiding. This way you can be very restrictive with visible files. You can hide anything that is not often needed in a strict profile and anything that is (almost) never needed in a default profile. When you then need a file from the strict profile just switch to the default profile, edit the files and switch back to the strict profile. This way all the temporary build files and one-time configs are still hidden, even when accessing hidden files from the strict profile.

Profiles can be also be helpful for big Monorepo projects. You can have a profile for client- and server developing and testing and switch between these profiles as needed.

The Hide Files config contains two profiles by default: _`Default`_ and _`Strict`_. The _`Default`_ profile contains only the `.vscode/` folder and the _`Strict`_ profile contains a dependency to _`Default`_. A dependency simply states, that the content of some profile will also be hidden in the profile that has a dependency to it. In this example, all the content of the _`Default`_ profile will also be hidden in the _`Strict`_ profile.

### Adding new files

New files will always be added to the currently activated profile. To activate a profile click on the eye icon next to the profile name.

Select all the files you want to add (hint: multiselecting can be achieved by holding down _Ctrl_ on Windows/Linux or _⇧_ on Mac and left clicking all files you want to select), then right click and click `Hide Files`:

![Hiding Files!](https://i.imgur.com/JPia4AC.gif)

### Editing profiles

Editing and linking profiles is trivial. The GIF below shows how to delete the default profiles, and recreate them:

![Profile edit!](https://i.imgur.com/uaH4q8F.gif)

### Un-hiding files

To show previously hidden files you have two options: remove a file permanently from a profile, or "peek" the file, meaning show it temporarily:

![Peeking!](https://i.imgur.com/MKg9EH6.gif)

## The config

**This is information on the config format. It is not required to use the extension but can help with debugging. Please let me know should you run into any issues.**

The newly generated config file will look as follows:

```json
{
    "profiles": [
        {
            "name": "Default",
            "detail": "Hides annoying folders",
            "description": "Only hides stuff you never need",
            "hidden": [".vscode/"]
        },
        {
            "name": "Strict",
            "detail": "Hide everything not immediately required",
            "hidden": ["$Default"]
        }
    ]
}
```

The format of the config is simple. It contains a list of profiles, each profile has a name, a description, detail and an array of hidden files and folders. The name, description and detail are shown when selecting the profile. The detail and description fields are optional (and are only present for backwards compatibility to pre-2.0.0 versions).

The hidden files and folders can have these formats:

-   `someFolder/` Hides entire folder
-   `someFile` Hides file
-   `*.end` Hides all files with given file ending
-   `$Profile` Includes all hidden files and folders from the profile called `Profile`

## Found an issue?

Please create an issue on [GitHub](https://github.com/JeremyFunk/hidefiles) or ask a question on the [extensions page](https://marketplace.visualstudio.com/items?itemName=JeremyFunk.hidefiles).
