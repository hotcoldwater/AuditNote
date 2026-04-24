const RESULT_STATUSES = ['EXCELLENT', 'CORRECT', 'REVIEW', 'WRONG', 'SKIPPED'];
const SKIPPED_ANSWERS = new Set(['', '모르겠어요', '모름']);

function json(data, init) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

function clampScore(score) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveResultStatus(score) {
  if (score >= 90) {
    return 'EXCELLENT';
  }
  if (score >= 75) {
    return 'CORRECT';
  }
  if (score >= 60) {
    return 'REVIEW';
  }
  if (score >= 1) {
    return 'WRONG';
  }
  return 'SKIPPED';
}

function isSkippedAnswer(value) {
  return SKIPPED_ANSWERS.has(String(value ?? '').trim());
}

function normalizeResult(result) {
  const score = clampScore(result?.score);
  const resultStatus = deriveResultStatus(score);
  const reason =
    typeof result?.reason === 'string' && result.reason.trim()
      ? result.reason.trim().split(/\r?\n/)[0]
      : '채점 사유가 제공되지 않았습니다.';

  return {
    score,
    resultStatus,
    reason,
    shouldAddWrongNote:
      resultStatus === 'WRONG' || resultStatus === 'SKIPPED'
        ? true
        : Boolean(result?.shouldAddWrongNote),
  };
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

  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const correctAnswer = typeof payload?.correctAnswer === 'string' ? payload.correctAnswer.trim() : '';
  const userAnswer = typeof payload?.userAnswer === 'string' ? payload.userAnswer.trim() : '';

  if (!correctAnswer) {
    return json({ error: '정답 원문이 없습니다.' }, { status: 400 });
  }

  if (isSkippedAnswer(userAnswer)) {
    const result = normalizeResult({
      score: 0,
      reason: '답안이 작성되지 않았습니다.',
      shouldAddWrongNote: true,
    });

    return json({
      result,
      metadata: {
        gradingMethod: 'rule',
        gradingModel: null,
        rawGradingResult: result,
      },
    });
  }

  const apiKey = context.env.OPENAI_API_KEY?.trim();
  const model = context.env.OPENAI_MODEL?.trim() || 'gpt-5-mini';

  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'resultStatus', 'reason', 'shouldAddWrongNote'],
    properties: {
      score: {
        type: 'number',
      },
      resultStatus: {
        type: 'string',
        enum: RESULT_STATUSES,
      },
      reason: {
        type: 'string',
      },
      shouldAddWrongNote: {
        type: 'boolean',
      },
    },
  };

  const prompt = [
    `기준서 제목: ${title || '제목 없음'}`,
    `정답 원문: ${correctAnswer}`,
    `사용자 답안: ${userAnswer}`,
  ].join('\n\n');

  let openaiResponse;
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: [
          '너는 감사 기준서 암기 답안을 채점하는 평가자다.',
          '정답 원문의 핵심 취지와 사용자 답안을 비교한다.',
          '표현이 달라도 의미가 같으면 인정한다.',
          '핵심 요소가 빠지면 감점한다.',
          '정답과 반대되는 오개념이 있으면 크게 감점한다.',
          '단순 키워드 나열만으로 높은 점수를 주지 않는다.',
          'reason은 반드시 한국어 한 문장으로만 짧게 작성한다.',
          '점수 기준은 90~100 EXCELLENT, 75~89 CORRECT, 60~74 REVIEW, 1~59 WRONG, 0 SKIPPED 이다.',
          '반환 JSON은 score, resultStatus, reason, shouldAddWrongNote 네 필드만 포함한다.',
        ].join(' '),
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'gamsanote_grading',
            strict: true,
            schema,
          },
          verbosity: 'low',
        },
      }),
    });
  } catch {
    return json({ error: 'OpenAI API 호출에 실패했습니다.' }, { status: 502 });
  }

  let openaiPayload;
  try {
    openaiPayload = await openaiResponse.json();
  } catch {
    return json({ error: 'OpenAI 응답을 해석하지 못했습니다.' }, { status: 502 });
  }

  if (!openaiResponse.ok) {
    const message =
      typeof openaiPayload?.error?.message === 'string'
        ? openaiPayload.error.message
        : 'OpenAI API가 오류를 반환했습니다.';
    return json({ error: message }, { status: openaiResponse.status });
  }

  const outputText = extractOutputText(openaiPayload);
  if (!outputText) {
    return json({ error: 'OpenAI 응답 본문이 비어 있습니다.' }, { status: 502 });
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(outputText);
  } catch {
    return json({ error: 'OpenAI JSON 응답을 해석하지 못했습니다.' }, { status: 502 });
  }

  const result = normalizeResult(parsedResult);

  return json({
    result,
    metadata: {
      gradingMethod: 'ai',
      gradingModel: typeof openaiPayload?.model === 'string' ? openaiPayload.model : model,
      rawGradingResult: {
        score: parsedResult?.score,
        resultStatus: parsedResult?.resultStatus,
        reason: parsedResult?.reason,
        shouldAddWrongNote: parsedResult?.shouldAddWrongNote,
      },
    },
  });
}
