function bionicReading(text) {
    const punctuationRegex = /[。，；：？！、]/;
    const chineseCharRegex = /[\u4e00-\u9fa5]/;
    const wordRegex = /[a-zA-Z]+/g;
    let result = '';
    let chineseCharCount = 0;
    let lastPunctuationIndex = -1;

    // 处理英文单词
    text = text.replace(wordRegex, function(word) {
        const midpoint = Math.ceil(word.length / 2);
        return `<strong>${word.slice(0, midpoint)}</strong>${word.slice(midpoint)}`;
    });

    // 处理中文和其他字符
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (chineseCharRegex.test(char)) {
            chineseCharCount++;
            if (chineseCharCount % 8 === 1 || chineseCharCount % 8 === 2) {
                // 每8个字符中的第1个和第2个加粗
                result += `<strong>${char}</strong>`;
            } else {
                result += char;
            }
        } else if (punctuationRegex.test(char)) {
            result += char;
            lastPunctuationIndex = i;
            chineseCharCount = 0;
        } else if (char === '<') {
            // 处理已经加粗的英文单词
            const closingTag = text.indexOf('>', i);
            if (closingTag !== -1) {
                result += text.slice(i, closingTag + 1);
                i = closingTag;
            } else {
                result += char;
            }
        } else if (char === '\n') {
            result += char;
            isNewParagraph = true;
            boldNextTwo = true;  // 新段落重置加粗状态
            boldCount = 0;
            consecutiveChineseCount = 0;
        } else {
            result += char;
            isNewParagraph = false;
            consecutiveChineseCount = 0;
        }
    }
    return result;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('process').addEventListener('click', function() {
        var input = document.getElementById('input').value;
        var output = document.getElementById('output');
        output.innerHTML = bionicReading(input).replace(/\n/g, '<br>');
    });
});
