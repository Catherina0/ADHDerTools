document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-reading-mode');
    const reader = document.getElementById('reader');
    let readingMode = false;
    let currentPosition = { node: null, offset: 0 };
    let originalContent = reader.innerHTML; // 初始保存原始内容

    toggleButton.addEventListener('click', () => {
        readingMode = !readingMode;
        if (readingMode) {
            toggleButton.textContent = '退出阅读模式';
            reader.contentEditable = false;
            reader.classList.add('reading-mode');
            startTracking();
            
            // 更新 originalContent 为当前内容，以保留用户的修改
            originalContent = reader.innerHTML;
            wrapTextAndAddLineNumbers();

            // 设置默认插入点位置
            const firstTextNode = getFirstTextNode(reader);
            if (firstTextNode) {
                currentPosition = { node: firstTextNode, offset: 0 };
                updateHighlight();
            }
        } else {
            toggleButton.textContent = '进入阅读模式';
            reader.contentEditable = true;
            reader.classList.remove('reading-mode');
            stopTracking();
            removeHighlights();
            unwrapTextAndRemoveLineNumbers();
        }
    });

    function startTracking() {
        reader.addEventListener('click', handleClick);
    }

    function stopTracking() {
        reader.removeEventListener('click', handleClick);
    }

    function handleClick(event) {
        if (readingMode) {
            const range = document.caretRangeFromPoint(event.clientX, event.clientY);
            if (range) {
                currentPosition = { node: range.startContainer, offset: range.startOffset };
                updateHighlight();
            }
        }
    }

    function updateHighlight() {
        removeHighlights();
        if (!currentPosition.node) return;
        const { node, offset } = currentPosition;
        const text = node.textContent;
        const start = Math.max(0, offset - 7);
        const end = Math.min(text.length, offset + 8);

        // 高亮插入点前后7个字符
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const highlight = document.createElement('span');
        highlight.className = 'highlight-chars';
        range.surroundContents(highlight);

        // 高亮整行
        const lineElement = getLineElement(node);
        if (lineElement) {
            lineElement.classList.add('highlight-line');
        }

        // 显示插入点
        const caret = document.createElement('span');
        caret.className = 'caret';
        range.setStart(node, offset);
        range.setEnd(node, offset);
        range.insertNode(caret);
    }

    function removeHighlights() {
        reader.querySelectorAll('.highlight-chars').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
        });
        reader.querySelectorAll('.highlight-line').forEach(el => el.classList.remove('highlight-line'));
        reader.querySelectorAll('.caret').forEach(el => el.remove());
    }

    function getLineElement(node) {
        while (node && node !== reader) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('line')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    function getFirstTextNode(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        return walker.nextNode();
    }

    function wrapTextAndAddLineNumbers() {
        const readerWidth = reader.clientWidth;
        const padding = 60; // 60px 用于行号和间距

        // 恢复原始内容以重新包装
        reader.innerHTML = originalContent;

        const lines = reader.querySelectorAll('p, div, span'); // 根据需要调整选择器
        let wrappedContent = '';
        let lineNumber = 1;

        lines.forEach(element => {
            const text = element.innerText;
            const words = text.split(/(\s+)/); // 包含空白的分割
            let currentLine = '';
            words.forEach(word => {
                const testLine = currentLine + word;
                const testWidth = getTextWidth(testLine);

                if (testWidth > readerWidth - padding) {
                    if (currentLine.trim() !== '') {
                        wrappedContent += `<div class="line"><span class="line-number">${lineNumber}</span><span class="line-content">${currentLine.trim()}</span></div>`;
                        lineNumber++;
                        currentLine = word;
                    } else {
                        // 单个单词超过宽度，强制换行
                        wrappedContent += `<div class="line"><span class="line-number">${lineNumber}</span><span class="line-content">${word}</span></div>`;
                        lineNumber++;
                        currentLine = '';
                    }
                } else {
                    currentLine += word;
                }
            });
            if (currentLine.trim() !== '') {
                wrappedContent += `<div class="line"><span class="line-number">${lineNumber}</span><span class="line-content">${currentLine.trim()}</span></div>`;
                lineNumber++;
            }
            // 保留原有的段落分隔
            wrappedContent += `<div class="paragraph-separator"></div>`;
        });

        reader.innerHTML = wrappedContent;
    }

    function unwrapTextAndRemoveLineNumbers() {
        reader.innerHTML = originalContent;
    }

    function getTextWidth(text) {
        const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        const context = canvas.getContext("2d");
        context.font = window.getComputedStyle(reader).font;
        return context.measureText(text).width;
    }

    // 监听窗口大小变化，重新执行换行和行号计算
    window.addEventListener('resize', () => {
        if (readingMode) {
            wrapTextAndAddLineNumbers();
        }
    });
});