export namespace db {
	
	export class Note {
	    id: number;
	    title: string;
	    content: string;
	    noteType: string;
	    metadata: string;
	    createdAt: string;
	    updatedAt: string;
	    pinned: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Note(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.noteType = source["noteType"];
	        this.metadata = source["metadata"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.pinned = source["pinned"];
	    }
	}
	export class Settings {
	    theme: string;
	    fontSize: number;
	    claudeApiKey: string;
	    geminiApiKey: string;
	    grokApiKey: string;
	    groqApiKey: string;
	    preferredAiProvider: string;
	    gdriveRefreshToken: string;
	    gdriveConnected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.fontSize = source["fontSize"];
	        this.claudeApiKey = source["claudeApiKey"];
	        this.geminiApiKey = source["geminiApiKey"];
	        this.grokApiKey = source["grokApiKey"];
	        this.groqApiKey = source["groqApiKey"];
	        this.preferredAiProvider = source["preferredAiProvider"];
	        this.gdriveRefreshToken = source["gdriveRefreshToken"];
	        this.gdriveConnected = source["gdriveConnected"];
	    }
	}

}

export namespace gdrive {
	
	export class BackupFile {
	    id: string;
	    name: string;
	    createdAt: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new BackupFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.createdAt = source["createdAt"];
	        this.size = source["size"];
	    }
	}

}

export namespace updater {
	
	export class UpdateInfo {
	    available: boolean;
	    currentVer: string;
	    latestVer: string;
	    releaseURL: string;
	    releaseBody: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.currentVer = source["currentVer"];
	        this.latestVer = source["latestVer"];
	        this.releaseURL = source["releaseURL"];
	        this.releaseBody = source["releaseBody"];
	    }
	}

}

