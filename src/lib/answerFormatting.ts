export function formatDisplayAnswer(answer: string) {
  if (!answer) {
    return '';
  }

  return answer
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/(^|\s)n\/\s*/g, '$1\n')
    .replace(/([^\n])\s(?=\d+\))/g, '$1\n')
    .replace(/([^\n])\s(?=[①②③④⑤⑥⑦⑧⑨⑩])/g, '$1\n')
    .replace(/([^\n])\s(?=-\s)/g, '$1\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
