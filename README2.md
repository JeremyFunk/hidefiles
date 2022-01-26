
# Hide Files

Hide Files allows the user to configure profiles to hide unnecessary folders and files. The configuration is defined in a file on the root level of the workspace, called `hide-files.json`.

## Using Hide Files

Let's say you are working on a project with a few folders and files you never or very rarely need to access. The unfiltered project structure might look as follows (I'm using a NextJS project as an example):

![NextJS unfiltered!](https://i.imgur.com/0AyQfEM.png)

Most of the folders and files are not required and tend to slow you down when trying. Let's remove them:

1. Create a ```hide-files.json``` config file
2. Add all unwanted folders and files to the config file.
3. Reload the config.

## Creating the config
You can generate a basic config file using


The config file has to be located in the root directory of your project (**not in a subfolder**) and has to be called ```hide-files.json```.

To run hide files, first the configuration file has to be properly located. Make sure it is in the **root directory** of the workspace, **not** in a sub-folder. The file has to be called `hide-files.json`. 

After that, following command has to be run: ```HideFiles: Reload Configuration``` (Windows/Linux: *Ctrl + Shift + P*, MacOS: *⇧ + ⌘ + P*)


![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790423-f990bf61-a1f3-4a37-985d-7998928166d3.png)
![Run Hide Files!](https://user-images.githubusercontent.com/29690247/140790484-78160f67-4e9c-4c62-8af6-5216bd1edadc.png)



## Found an issue?
Please create an issue on [GitHub](https://github.com/JeremyFunk/hidefiles) or ask a question on the [extensions page](https://marketplace.visualstudio.com/items?itemName=JeremyFunk.hidefiles).

## Changelog
* V1.0.1 Changed message type of errors to make it clearer to users.
* V1.0.0 Added proper user feedback and MacOS/Linux support.
* V0.0.2: First stable version.