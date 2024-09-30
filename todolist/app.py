# app.py
from flask import Flask, render_template, request
from markupsafe import Markup
from openai import OpenAI
from datetime import datetime
import os
import markdown
import bleach
from dotenv import load_dotenv
import openai

# 初始化Flask
app = Flask(__name__)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise ValueError("未找到API key")

# OpenAI api
client = OpenAI(api_key=openai_api_key)

def convert_markdown_to_safe_html(md_text):
    # Markdown转HTML
    html = markdown.markdown(md_text, extensions=['tables'])
    
    # 标签和属性
    allowed_tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
    allowed_attributes = {'a': ['href', 'title']}
    
    clean_html = bleach.clean(html, tags=allowed_tags, attributes=allowed_attributes)
    
    return Markup(clean_html)

@app.route('/', methods=['GET', 'POST'])
def index():
    schedule = None
    checklist = None
    if request.method == 'POST':
        tasks_input = request.form.get('tasks')
        if tasks_input:
            tasks = tasks_input.strip().split('\n')
            tasks = [task.strip() for task in tasks if task.strip()]
            
            # 当前时间
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            prompt = (
                f"当前时间是 {current_time}。请按以下要求使用中文处理任务列表，只提取与大学生作业相关的具体任务信息，忽略概括性或不相关的内容，并将任务进行分段。\n\n"
                f"过滤规则：\n"
                f"- 忽略长度过短或过于笼统的任务描述\n"
                f"- 仅保留包含具体行动项和（或）截止日期的任务\n\n"
                f"1. 生成日程表:\n"
                f"   - 使用Markdown格式\n"
                f"   - 按天分配任务\n"
                f"   - 列出每个任务的截止期限（如果有）\n\n"
                f"2. 生成检查单:\n"
                f"   - 使用Markdown表格格式\n"
                f"   - 按紧迫性和重要性排序\n"
                f"   - 包含序号\n\n"
                f"请确保将日程表和检查单分开，以便后续处理。\n\n"
                f"任务列表:\n"
                f"{chr(10).join([f'- {task}' for task in tasks])}"
            )
            
            try:

                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful assistant.",
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                    model="gpt-3.5-turbo",
                    temperature=0.7,
                    max_tokens=500
                )
                
                assistant_message = chat_completion.choices[0].message.content
                
                # 分割日程表检查单
                parts = assistant_message.split("### 检查单")
                if len(parts) == 2:
                    schedule_markdown = parts[0].strip()
                    checklist_markdown = "### 检查单" + parts[1].strip()
                else:
                    schedule_markdown = assistant_message
                    checklist_markdown = "未能生成检查单。"

                # Markdown转HTML
                schedule = convert_markdown_to_safe_html(schedule_markdown)
                checklist = convert_markdown_to_safe_html(checklist_markdown)
                
            except Exception as e:
                schedule = Markup(f"<p style='color:red;'>发生错误：{str(e)}</p>")
                checklist = ""

    return render_template('index.html', schedule=schedule, checklist=checklist)

if __name__ == '__main__':
    app.run(debug=True)