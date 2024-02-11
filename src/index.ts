import { Client as LibsqlClient, createClient } from "@libsql/client/web";
import { Router, RouterType } from "itty-router";
import { v4 as uuidv4 } from 'uuid';

export interface Env {
	LIBSQL_DB_URL?: string;
	LIBSQL_DB_AUTH_TOKEN?: string;
	DEEP_INFRA_HOST?: string;
	DEEP_INFRA_AUTH_TOKEN?: string;
	router?: RouterType;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (env.router === undefined) {
			env.router = buildRouter(env);
		}
		return env.router.handle(request);
	},
};

function buildRouter(env: Env): RouterType {
	const router = Router();
	router.post("/text", async (request) => {
		/**
		 * Replace url with the host you wish to send requests to
		 * @param {string} url the URL to send the request to
		 */
		const prompt = await request.json() as { input: string };
		const url = env.DEEP_INFRA_HOST?.trim();
		const authToken = env.DEEP_INFRA_AUTH_TOKEN?.trim();
		const body = {
			input: prompt.input,
		};
		const init = {
			body: JSON.stringify(body),
			method: "POST",
			headers: {
				"content-type": "application/json;charset=UTF-8",
				"Authorization": `Bearer ${authToken}`
			},
		};
		const response = await fetch(url, init);
		if (response.status === 200) {
			const external_id = uuidv4();
			const client = buildLibsqlClient(env);
			await client.execute({
				sql: "insert into wedding_speech (external_id, prompt, generated_text) values (?, ?, ?)",
				args: [external_id, prompt.input, data.results[0].generated_text],
			});
			const data = await response.json()
			const inferenceResult = {
				'title': 'Wedding Speech',
				'content': data.results[0].generated_text
			}
			return new Response(JSON.stringify(inferenceResult));
		} else {
			return new Response("Error occurred", { status: response.status });
		}

	});

	router.get('/text/:id', async (request) => {
		const id = request.params.id;
		const client = buildLibsqlClient(env);
		if (id === undefined) {
			return new Response("bad", { status: 400 });
		}
		try {
			const rs = await client.execute({
				sql: 'SELECT * FROM wedding_speech WHERE external_id = ?',
				args: [id],
			});
			return Response.json(rs);
		} catch (e) {
			console.error(e);
			return new Response("database fetch failed");
		}
	});

	router.all("*", () => new Response("Not Found.", { status: 404 }));

	return router;
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

	return createClient({ url, authToken })
}
