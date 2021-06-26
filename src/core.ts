/* eslint-disable @typescript-eslint/semi */

import { Profile } from "./config";
import * as vscode from 'vscode';

export interface Excludes {
	[property: string]: boolean
}

export const hideFiles = (profile: Profile): boolean => {
    //const excludes = vscode.workspace.getConfiguration("files").get('exclude')

	// if(excludes){
	// 	const excludeNames = Object.getOwnPropertyNames(excludes)

    const retExcludes: Excludes = {}
    
    retExcludes["**/.git"] = true
    retExcludes["**/.svn"] = true
    retExcludes["**/.hg"] = true
    retExcludes["**/CVS"] = true
    retExcludes["**/.DS_Store"] = true
    
    profile.hidden.forEach((h) => retExcludes[h] = true)

    vscode.workspace.getConfiguration("files").update('exclude', retExcludes)
	

    return true
}