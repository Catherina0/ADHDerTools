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

# Initialize Flask application
app = Flask(__name__)

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


if not api_key:
    raise ValueError("No API key found. Please set your OPENAI_API_KEY environment variable or provide it in the code.")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def convert_markdown_to_safe_html(md_text):
    # Convert markdown to HTML
    html = markdown.markdown(md_text)
    
    # Define allowed tags and attributes
    allowed_tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
    allowed_attributes = {'a': ['href', 'title']}
    
    # Sanitize the HTML
    clean_html = bleach.clean(html, tags=allowed_tags, attributes=allowed_attributes)
    
    # Mark the cleaned HTML as safe
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
            
            # Get current time
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Define prompt
            prompt = (
                f"当前时间是 {current_time}，请用markdown格式，整理所有的任务，并且按照当前时间将下列事情排入日程表中，"
                f"最后生成一个按照紧迫和重要程度生成的检查单表格。\n\n"
                f"任务列表：\n"
                f"{chr(10).join([f'- {task}' for task in tasks])}"
            )
            
            try:
                # Call OpenAI API
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
                
                # Split into schedule and checklist
                parts = assistant_message.split("### 检查单")
                if len(parts) == 2:
                    schedule_markdown = parts[0].strip()
                    checklist_markdown = "### 检查单" + parts[1].strip()
                else:
                    schedule_markdown = assistant_message
                    checklist_markdown = "未能生成检查单。"

                # Convert markdown to safe HTML
                schedule = convert_markdown_to_safe_html(schedule_markdown)
                checklist = convert_markdown_to_safe_html(checklist_markdown)
                
            except Exception as e:
                schedule = Markup(f"<p style='color:red;'>发生错误：{str(e)}</p>")
                checklist = ""

    return render_template('index.html', schedule=schedule, checklist=checklist)

if __name__ == '__main__':
    app.run(debug=True)