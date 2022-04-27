import { Configuration } from "./config";
import { configs } from "./configs/configs.json";
import * as vscode from "vscode";
import * as fs from "fs";

interface Config {
    name: string;
    description?: string;
    details: string;
    content: Configuration;
}

export const getConfigs = (): Config[] => {
    return configs.map((c) => {
        return c;
    });
};
