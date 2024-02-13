import { Client as LibsqlClient, createClient } from "@libsql/client/web";
import { RouterType } from "itty-router";

export interface Env {
    LIBSQL_DB_URL?: string;
    LIBSQL_DB_AUTH_TOKEN?: string;
    DEEP_INFRA_HOST?: string;
    DEEP_INFRA_AUTH_TOKEN?: string;
    router?: RouterType;
}


let client: LibsqlClient | null = null;
export function getClient(env: Env): LibsqlClient {
    if (!client) {
        client = buildLibsqlClient(env);
    }
    return client;
}

function buildLibsqlClient(env: Env): LibsqlClient {
    const url = env.LIBSQL_DB_URL?.trim();
    if (url === undefined) {
        throw new Error("LIBSQL_DB_URL env var is not defined");
    }

    const authToken = env.LIBSQL_DB_AUTH_TOKEN?.trim();
    if (authToken == undefined) {
        throw new Error("LIBSQL_DB_AUTH_TOKEN env var is not defined");
    }

    return createClient({ url, authToken });
}

export function selectWeddingSpeech(id: string): { sql: string, args: any[] } {
    return {
        sql: 'SELECT * FROM wedding_speech WHERE external_id = ?',
        args: [id],
    };
}

export function insertWeddingSpeech(externalId: string, promptInput: string, generatedText: string): { sql: string, args: any[] } {
    return {
        sql: 'INSERT INTO wedding_speech (external_id, prompt, generated_text) VALUES (?, ?, ?)',
        args: [externalId, promptInput, generatedText],
    };
}