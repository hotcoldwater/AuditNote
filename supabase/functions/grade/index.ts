import { onRequestPost } from '../../../functions/api/grade.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      },
    });
  }

  const response = await onRequestPost({
    request,
    env: {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ?? '',
      OPENAI_MODEL: Deno.env.get('OPENAI_MODEL') ?? '',
    },
  } as never);

  const nextHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => nextHeaders.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
});
