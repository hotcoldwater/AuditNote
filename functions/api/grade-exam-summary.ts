function json(data, init) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }
  }

  return '';
}

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const year = typeof payload?.year === 'string' ? payload.year.trim() : '';
  const score = Number(payload?.score ?? 0);
  const questionResults = Array.isArray(payload?.questionResults) ? payload.questionResults : [];
  if (!year || !Number.isFinite(score) || questionResults.length === 0) {
    return json({ error: '연도별 시험 요약 입력이 부족합니다.' }, { status: 400 });
  }

  const apiKey = context.env.OPENAI_API_KEY?.trim();
  const model = context.env.OPENAI_GRADING_MODEL?.trim() || 'gpt-5-mini';
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'advice'],
    properties: {
      summary: { type: 'string' },
      advice: { type: 'string' },
    },
  };

  const prompt = [
    `출제 연도: ${year}`,
    `전체 환산 점수: ${Math.round(score)}점`,
    '문제별 채점 결과:',
    ...questionResults.map((item) => {
      const index = Number(item?.index ?? 0);
      const summary = typeof item?.details?.summary === 'string' ? item.details.summary : '';
      const missing = Array.isArray(item?.details?.missingPoints) ? item.details.missingPoints.join(', ') : '';
      const wrong = Array.isArray(item?.details?.wrongPoints) ? item.details.wrongPoints.join(', ') : '';
      return `${index}번: ${summary} / 누락: ${missing || '없음'} / 오해: ${wrong || '없음'}`;
    }),
  ].join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: [
          '너는 감사 기출시험 전체 결과를 요약하는 평가자다.',
          '문제별 채점 결과를 바탕으로 전체 총평 summary와 다음 복습 advice만 작성한다.',
          'summary는 한 문장 총평이다.',
          'advice는 바로 복습에 도움이 되는 한 문장이다.',
          '반드시 JSON만 반환한다.',
        ].join(' '),
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'auditnote_exam_summary',
            strict: true,
            schema,
          },
          verbosity: 'low',
        },
      }),
    });

    const openaiPayload = await response.json();
    if (!response.ok) {
      return json({ error: openaiPayload?.error?.message || 'OpenAI API가 오류를 반환했습니다.' }, { status: 500 });
    }

    const outputText = extractOutputText(openaiPayload);
    const parsed = JSON.parse(outputText);
    if (typeof parsed?.summary !== 'string' || typeof parsed?.advice !== 'string') {
      return json({ error: 'OpenAI 응답 필드가 올바르지 않습니다.' }, { status: 500 });
    }

    return json({
      summary: parsed.summary.trim(),
      advice: parsed.advice.trim(),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '시험 총평 생성에 실패했습니다.' }, { status: 500 });
  }
}
