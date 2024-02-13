import { Env, getClient } from "./databaseUtils";
import { selectWeddingSpeech, insertWeddingSpeech } from "./databaseUtils";
import { Router, RouterType } from "itty-router";
import { v4 as uuidv4 } from "uuid";

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
		try {
			const prompt = await request.json() as { input: string };
			const url = env.DEEP_INFRA_HOST?.trim();
			const authToken = env.DEEP_INFRA_AUTH_TOKEN?.trim();
			const body = {
				input: prompt.input,
			};
			const response = await fetch(url, {
				body: JSON.stringify(body),
				method: "POST",
				headers: {
					"content-type": "application/json;charset=UTF-8",
					"Authorization": `Bearer ${authToken}`
				},
			});

			if (response.status !== 200) {
				console.error("AI Api returned response " + response.status);
				return new Response("Error occurred", { status: 500 });
			}

			const external_id = uuidv4();
			const dbClient = getClient(env)
			const data = await response.json();
			try {
				await dbClient.execute(insertWeddingSpeech(external_id, prompt.input, data.results[0].generated_text));
			} catch (e) {
				console.error(e);
				return new Response("Internal server error", { status: 500 });
			}
			const inferenceResult = {
				'title': 'Wedding Speech',
				'content': data.results[0].generated_text
			}
			return new Response(JSON.stringify(inferenceResult));

		} catch (e) {
			console.error(e);
			return new Response("Internal server error", { status: 500 });
		}

	});

	router.get('/text/:id', async (request) => {
		try {
			const id = request.params.id;
			const dbClient = getClient(env);
			if (id === undefined) {
				return new Response("bad", { status: 400 });
			}

			let rs;
			try {
				rs = await dbClient.execute(selectWeddingSpeech(id));
			} catch (e) {
				console.error(e);
				return new Response("Internal server error", { status: 500 });
			}

			const data = rs.toJSON();
			const inferenceResult = {
				'title': 'Wedding Speech',
				'content': data.rows[0][3]
			}
			return Response.json(inferenceResult);
		} catch (e) {
			console.error(e);
			return new Response("Internal server error", { status: 500 });
		}
	});

	router.all("*", () => new Response("Not Found.", { status: 404 }));

	return router;
}
